// OpCodes for client-server communication
const OpCode = {
  START: 1,        // S→C: Game started, mark assignments
  UPDATE: 2,       // S→C: Board updated after valid move
  DONE: 3,         // S→C: Game over (win/draw/forfeit/abandon)
  MOVE: 4,         // C→S: Player makes a move
  REJECTED: 5,     // S→C: Move rejected with reason
  OPPONENT_LEFT: 6,// S→C: Opponent disconnected
  TIMER_TICK: 7,   // S→C: Timer resync (every 5s in timed mode)
} as const;

type Mark = "X" | "O";

interface MatchState {
  board: (Mark | null)[];
  marks: { [userId: string]: Mark };
  currentTurn: string;
  winner: string | null;
  gameOver: boolean;
  deadlineTick: number;
  mode: "classic" | "timed";
  playerCount: number;
  presences: { [sessionId: string]: nkruntime.Presence };
  usernames: { [userId: string]: string };
  endTick: number;       // tick when game ended (for grace period)
}

interface MoveMessage {
  position: number;
}

interface StartMessage {
  marks: { [userId: string]: Mark };
  usernames: { [userId: string]: string };
  currentTurn: string;
  deadline: number;
  mode: string;
}

interface UpdateMessage {
  board: (Mark | null)[];
  currentTurn: string;
  deadline: number;
  moveIndex: number;
}

interface DoneMessage {
  board: (Mark | null)[];
  winner: string | null;
  winnerMark: Mark | null;
  reason: "win" | "draw" | "forfeit" | "abandon";
  winLine: number[] | null;
}

interface RejectedMessage {
  reason: string;
}

interface TimerTickMessage {
  secondsLeft: number;
}
