// Server-authoritative Tic-Tac-Toe match handler

const TICK_RATE = 5;                  // 5 ticks per second
const TURN_TIMEOUT_TICKS = 150;       // 30 seconds (150 / 5)
const TIMER_RESYNC_TICKS = 25;        // resync timer every 5 seconds
const END_GRACE_TICKS = 25;           // 5 seconds after game ends before match closes

var matchInit: nkruntime.MatchInitFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string }
): { state: MatchState; tickRate: number; label: string } {

  var mode: "classic" | "timed" = (params && params["mode"] === "timed") ? "timed" : "classic";

  var state: MatchState = {
    board: [null, null, null, null, null, null, null, null, null],
    marks: {},
    currentTurn: "",
    winner: null,
    gameOver: false,
    deadlineTick: 0,
    mode: mode,
    playerCount: 0,
    presences: {},
    usernames: {},
    endTick: 0,
  };

  var label = JSON.stringify({ mode: mode, open: 1 });

  logger.info("Match created. Mode: %s", mode);

  return { state: state, tickRate: TICK_RATE, label: label };
};

var matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: any }
): { state: MatchState; accept: boolean; rejectMessage?: string } | null {

  if (state.gameOver) {
    return { state: state, accept: false, rejectMessage: "Game is already over" };
  }

  if (state.playerCount >= 2) {
    return { state: state, accept: false, rejectMessage: "Match is full" };
  }

  // Prevent duplicate joins
  var sessionIds = Object.keys(state.presences);
  for (var i = 0; i < sessionIds.length; i++) {
    if (state.presences[sessionIds[i]].userId === presence.userId) {
      return { state: state, accept: false, rejectMessage: "Already in this match" };
    }
  }

  return { state: state, accept: true };
};

var matchJoin: nkruntime.MatchJoinFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  presences: nkruntime.Presence[]
): { state: MatchState } | null {

  for (var i = 0; i < presences.length; i++) {
    var p = presences[i];
    state.presences[p.sessionId] = p;
    state.playerCount++;

    // Assign marks: first player = X, second = O
    if (Object.keys(state.marks).length === 0) {
      state.marks[p.userId] = "X";
    } else if (!state.marks[p.userId]) {
      state.marks[p.userId] = "O";
    }

    state.usernames[p.userId] = p.username;

    logger.info("Player joined: %s (%s) as %s", p.username, p.userId, state.marks[p.userId]);
  }

  // Start game when 2 players are in
  if (state.playerCount === 2) {
    // X always goes first — find who has X
    var userIds = Object.keys(state.marks);
    for (var j = 0; j < userIds.length; j++) {
      if (state.marks[userIds[j]] === "X") {
        state.currentTurn = userIds[j];
        break;
      }
    }

    // Set deadline for timed mode
    if (state.mode === "timed") {
      state.deadlineTick = tick + TURN_TIMEOUT_TICKS;
    }

    // Close match to new players
    var label = JSON.stringify({ mode: state.mode, open: 0 });
    dispatcher.matchLabelUpdate(label);

    // Broadcast START to all players
    var startMsg: StartMessage = {
      marks: state.marks,
      usernames: state.usernames,
      currentTurn: state.currentTurn,
      deadline: state.mode === "timed" ? 30 : 0,
      mode: state.mode,
    };
    dispatcher.broadcastMessage(OpCode.START, JSON.stringify(startMsg));

    logger.info("Game started! %s vs %s", userIds[0], userIds[1]);
  }

  return { state: state };
};

var matchLeave: nkruntime.MatchLeaveFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  presences: nkruntime.Presence[]
): { state: MatchState } | null {

  for (var i = 0; i < presences.length; i++) {
    var p = presences[i];
    delete state.presences[p.sessionId];
    state.playerCount--;

    logger.info("Player left: %s (%s)", p.username, p.userId);

    // If game is active and a player leaves, the other wins by abandonment
    if (!state.gameOver && state.playerCount > 0 && Object.keys(state.marks).length === 2) {
      var remainingUserId = "";
      var sessionIds = Object.keys(state.presences);
      if (sessionIds.length > 0) {
        remainingUserId = state.presences[sessionIds[0]].userId;
      }

      if (remainingUserId) {
        state.gameOver = true;
        state.winner = remainingUserId;
        state.endTick = tick;

        dispatcher.broadcastMessage(OpCode.OPPONENT_LEFT, JSON.stringify({}));

        var doneMsg: DoneMessage = {
          board: state.board,
          winner: remainingUserId,
          winnerMark: state.marks[remainingUserId] || null,
          reason: "abandon",
          winLine: null,
        };
        dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(doneMsg));

        // Update leaderboard
        updateLeaderboard(nk, logger, state, remainingUserId, "abandon");
      }
    }
  }

  // If no players left, end the match
  if (state.playerCount <= 0) {
    return null;
  }

  return { state: state };
};

var matchLoop: nkruntime.MatchLoopFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  messages: nkruntime.MatchMessage[]
): { state: MatchState } | null {

  // Grace period after game ends — allow clients to receive final state
  if (state.gameOver) {
    if (state.endTick > 0 && tick > state.endTick + END_GRACE_TICKS) {
      return null; // End match
    }
    return { state: state };
  }

  // Don't process anything until 2 players are in
  if (state.playerCount < 2) {
    return { state: state };
  }

  // Timer check — auto-forfeit in timed mode
  if (state.mode === "timed" && state.deadlineTick > 0 && tick >= state.deadlineTick) {
    // Current player loses by timeout
    var timedOutUser = state.currentTurn;
    var otherUserIds = Object.keys(state.marks);
    var winnerId = "";
    for (var w = 0; w < otherUserIds.length; w++) {
      if (otherUserIds[w] !== timedOutUser) {
        winnerId = otherUserIds[w];
        break;
      }
    }

    state.gameOver = true;
    state.winner = winnerId;
    state.endTick = tick;

    var forfeitMsg: DoneMessage = {
      board: state.board,
      winner: winnerId,
      winnerMark: state.marks[winnerId] || null,
      reason: "forfeit",
      winLine: null,
    };
    dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(forfeitMsg));

    updateLeaderboard(nk, logger, state, winnerId, "forfeit");

    logger.info("Player %s forfeited by timeout. Winner: %s", timedOutUser, winnerId);
    return { state: state };
  }

  // Timer resync broadcast (every 5 seconds in timed mode)
  if (state.mode === "timed" && state.deadlineTick > 0 && tick % TIMER_RESYNC_TICKS === 0) {
    var remainingTicks = state.deadlineTick - tick;
    var secondsLeft = Math.max(0, Math.ceil(remainingTicks / TICK_RATE));
    var timerMsg: TimerTickMessage = { secondsLeft: secondsLeft };
    dispatcher.broadcastMessage(OpCode.TIMER_TICK, JSON.stringify(timerMsg));
  }

  // Process player messages
  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];

    // Only process MOVE opcode
    if (msg.opCode !== OpCode.MOVE) {
      continue;
    }

    var senderId = msg.sender.userId;
    var data: MoveMessage;
    try {
      data = JSON.parse(nk.binaryToString(msg.data));
    } catch (e) {
      dispatcher.broadcastMessage(
        OpCode.REJECTED,
        JSON.stringify({ reason: "Invalid message format" } as RejectedMessage),
        [msg.sender]
      );
      continue;
    }

    // Validate the move
    var validation = validateMove(state, senderId, data.position);
    if (!validation.valid) {
      dispatcher.broadcastMessage(
        OpCode.REJECTED,
        JSON.stringify({ reason: validation.reason } as RejectedMessage),
        [msg.sender]
      );
      logger.debug("Move rejected for %s: %s", senderId, validation.reason);
      continue;
    }

    // Apply the move
    state.board[data.position] = state.marks[senderId];

    logger.info("Move: %s placed %s at position %d", senderId, state.marks[senderId], data.position);

    // Check for winner
    var result = checkWinner(state.board);
    if (result !== null) {
      state.gameOver = true;
      state.winner = senderId;
      state.endTick = tick;

      var winMsg: DoneMessage = {
        board: state.board,
        winner: senderId,
        winnerMark: result.winner,
        reason: "win",
        winLine: result.line,
      };
      dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(winMsg));

      updateLeaderboard(nk, logger, state, senderId, "win");

      logger.info("Game won by %s (%s)!", senderId, result.winner);
      return { state: state };
    }

    // Check for draw
    if (checkDraw(state.board)) {
      state.gameOver = true;
      state.winner = null;
      state.endTick = tick;

      var drawMsg: DoneMessage = {
        board: state.board,
        winner: null,
        winnerMark: null,
        reason: "draw",
        winLine: null,
      };
      dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(drawMsg));

      updateLeaderboard(nk, logger, state, null, "draw");

      logger.info("Game ended in a draw!");
      return { state: state };
    }

    // Switch turns
    var userIds = Object.keys(state.marks);
    for (var j = 0; j < userIds.length; j++) {
      if (userIds[j] !== senderId) {
        state.currentTurn = userIds[j];
        break;
      }
    }

    // Reset deadline for timed mode
    if (state.mode === "timed") {
      state.deadlineTick = tick + TURN_TIMEOUT_TICKS;
    }

    // Broadcast updated state
    var updateMsg: UpdateMessage = {
      board: state.board,
      currentTurn: state.currentTurn,
      deadline: state.mode === "timed" ? 30 : 0,
      moveIndex: data.position,
    };
    dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify(updateMsg));
  }

  return { state: state };
};

var matchTerminate: nkruntime.MatchTerminateFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  graceSeconds: number
): { state: MatchState } | null {
  logger.info("Match terminating with %d seconds grace period", graceSeconds);
  return { state: state };
};

var matchSignal: nkruntime.MatchSignalFunction<MatchState> = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: MatchState,
  data: string
): { state: MatchState; data?: string } | null {
  return { state: state, data: "ok" };
};
