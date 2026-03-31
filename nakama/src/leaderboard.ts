// Leaderboard management

var LEADERBOARD_ID = "tic_tac_toe_wins";

function setupLeaderboard(nk: nkruntime.Nakama, logger: nkruntime.Logger): void {
  try {
    nk.leaderboardCreate(
      LEADERBOARD_ID,      // id
      true,                // authoritative
      nkruntime.SortOrder.DESCENDING,
      nkruntime.Operator.INCREMENTAL,
      undefined,           // resetSchedule (no reset)
      undefined            // metadata
    );
    logger.info("Leaderboard '%s' created or already exists", LEADERBOARD_ID);
  } catch (e) {
    logger.error("Failed to create leaderboard: %s", e);
  }
}

function updateLeaderboard(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  state: MatchState,
  winnerId: string | null,
  reason: string
): void {
  var userIds = Object.keys(state.marks);

  for (var i = 0; i < userIds.length; i++) {
    var uid = userIds[i];
    var username = state.usernames[uid] || "unknown";

    // Read existing record to get current metadata
    var existingMeta: { wins: number; losses: number; draws: number; streak: number } = { wins: 0, losses: 0, draws: 0, streak: 0 };
    try {
      var records = nk.leaderboardRecordsList(LEADERBOARD_ID, [uid], 1);
      if (records && records.records && records.records.length > 0) {
        var meta = records.records[0].metadata;
        if (meta) {
          existingMeta = {
            wins: (meta as any).wins || 0,
            losses: (meta as any).losses || 0,
            draws: (meta as any).draws || 0,
            streak: (meta as any).streak || 0,
          };
        }
      }
    } catch (e) {
      logger.warn("Could not read existing leaderboard record for %s: %s", uid, e);
    }

    if (reason === "draw") {
      existingMeta.draws++;
      existingMeta.streak = 0;
      try {
        nk.leaderboardRecordWrite(
          LEADERBOARD_ID,
          uid,
          username,
          0,
          0,
          existingMeta as any
        );
      } catch (e) {
        logger.error("Failed to write draw record for %s: %s", uid, e);
      }
    } else if (uid === winnerId) {
      existingMeta.wins++;
      existingMeta.streak++;
      try {
        nk.leaderboardRecordWrite(
          LEADERBOARD_ID,
          uid,
          username,
          1,
          existingMeta.streak,
          existingMeta as any
        );
      } catch (e) {
        logger.error("Failed to write win record for %s: %s", uid, e);
      }
    } else {
      existingMeta.losses++;
      existingMeta.streak = 0;
      try {
        nk.leaderboardRecordWrite(
          LEADERBOARD_ID,
          uid,
          username,
          0,
          0,
          existingMeta as any
        );
      } catch (e) {
        logger.error("Failed to write loss record for %s: %s", uid, e);
      }
    }

    logger.info("Leaderboard updated for %s: %s", username, JSON.stringify(existingMeta));
  }
}
