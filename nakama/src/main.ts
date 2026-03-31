// Nakama server module entry point

function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
): void {
  logger.info("Tic-Tac-Toe module loaded!");

  // Create leaderboard
  setupLeaderboard(nk, logger);

  // Register match handler
  initializer.registerMatch("tic_tac_toe", {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal,
  });
  logger.info("Match handler 'tic_tac_toe' registered");

  // Register RPCs
  initializer.registerRpc("find_match", rpcFindMatch);
  initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);
  logger.info("RPCs registered: find_match, get_leaderboard");

  // Register matchmaker matched hook
  initializer.registerMatchmakerMatched(matchmakerMatched);
  logger.info("Matchmaker hook registered");
}

// Matchmaker matched callback — creates an authoritative match when players are paired
var matchmakerMatched: nkruntime.MatchmakerMatchedFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  matches: nkruntime.MatchmakerResult[]
): string | void {
  if (!matches || matches.length < 2) {
    logger.warn("Matchmaker matched with fewer than 2 players");
    return;
  }

  // Determine mode from the first player's string properties
  var mode = "classic";
  if (matches[0].properties) {
    var props = (matches[0].properties as any).stringProperties;
    if (props && props.mode === "timed") {
      mode = "timed";
    }
  }

  // Create a new authoritative match
  var matchId = nk.matchCreate("tic_tac_toe", { mode: mode });
  logger.info("Matchmaker created match %s for %d players (mode: %s)", matchId, matches.length, mode);

  return matchId;
};

// Required: this line is NOT used, but InitModule is the entry point recognized by Nakama
!InitModule && InitModule;
