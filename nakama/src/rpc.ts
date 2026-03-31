// RPC handlers for match finding and leaderboard queries

var rpcFindMatch: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  var input: { mode?: string } = {};
  if (payload && payload.length > 0) {
    try {
      input = JSON.parse(payload);
    } catch (e) {
      throw new Error("Invalid JSON payload");
    }
  }

  var mode = input.mode === "timed" ? "timed" : "classic";

  // Search for an open match with matching mode
  var limit = 10;
  var isAuthoritative = true;
  var label = "";
  var minSize = 0;
  var maxSize = 1; // Only matches with 0-1 players (still open)

  var matches: nkruntime.Match[];
  try {
    var result = nk.matchList(limit, isAuthoritative, label, minSize, maxSize, "+label.open:1 +label.mode:" + mode);
    matches = result || [];
  } catch (e) {
    logger.error("Failed to list matches: %s", e);
    matches = [];
  }

  // Join existing open match if available
  if (matches.length > 0) {
    var matchId = matches[0].matchId;
    logger.info("Found open match: %s", matchId);
    return JSON.stringify({ matchId: matchId });
  }

  // Create a new match
  var matchId = nk.matchCreate("tic_tac_toe", { mode: mode });
  logger.info("Created new match: %s (mode: %s)", matchId, mode);
  return JSON.stringify({ matchId: matchId });
};

var rpcGetLeaderboard: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  var input: { limit?: number } = {};
  if (payload && payload.length > 0) {
    try {
      input = JSON.parse(payload);
    } catch (e) {
      // Use defaults
    }
  }

  var limit = input.limit || 20;
  if (limit > 100) limit = 100;

  try {
    var result = nk.leaderboardRecordsList(LEADERBOARD_ID, [], limit);
    var records = result.records || [];

    var entries: Array<{
      userId: string;
      username: string;
      score: number;
      streak: number;
      wins: number;
      losses: number;
      draws: number;
      rank: number;
    }> = [];

    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var meta = { wins: 0, losses: 0, draws: 0, streak: 0 };
      if (r.metadata) {
        meta = {
          wins: (r.metadata as any).wins || 0,
          losses: (r.metadata as any).losses || 0,
          draws: (r.metadata as any).draws || 0,
          streak: (r.metadata as any).streak || 0,
        };
      }

      entries.push({
        userId: r.ownerId,
        username: r.username || "unknown",
        score: r.score,
        streak: meta.streak,
        wins: meta.wins,
        losses: meta.losses,
        draws: meta.draws,
        rank: r.rank,
      });
    }

    return JSON.stringify({ entries: entries });
  } catch (e) {
    logger.error("Failed to get leaderboard: %s", e);
    return JSON.stringify({ entries: [] });
  }
};
