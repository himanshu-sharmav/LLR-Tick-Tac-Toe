import { useGameStore, LeaderboardEntry } from '../store/gameStore';

interface Props {
  compact?: boolean;
}

export function Leaderboard({ compact = false }: Props) {
  const entries = useGameStore((s) => s.leaderboard);
  const userId = useGameStore((s) => s.userId);

  if (entries.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm py-4">
        No leaderboard data yet. Play some games!
      </div>
    );
  }

  const displayed = compact ? entries.slice(0, 5) : entries;

  return (
    <div className="w-full max-w-[320px] mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-neon-yellow text-lg">&#127942;</span>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Leaderboard
        </h3>
      </div>

      <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_3.5rem_2.5rem_2.5rem] gap-1 px-3 py-2 text-[10px] text-gray-500 uppercase tracking-wider border-b border-dark-border">
          <span>#</span>
          <span>Player</span>
          <span className="text-center">W/L/D</span>
          <span className="text-center">&#128293;</span>
          <span className="text-right">Score</span>
        </div>

        {/* Rows */}
        {displayed.map((entry: LeaderboardEntry, idx: number) => {
          const isMe = entry.userId === userId;
          return (
            <div
              key={entry.userId}
              className={`grid grid-cols-[2rem_1fr_3.5rem_2.5rem_2.5rem] gap-1 px-3 py-2 text-xs transition-colors ${
                isMe ? 'bg-dark-accent' : idx % 2 === 0 ? 'bg-dark-card' : 'bg-dark-bg/30'
              }`}
            >
              <span className="text-gray-400 font-mono">{entry.rank}.</span>
              <span className={`truncate ${isMe ? 'text-neon-cyan font-semibold' : 'text-gray-300'}`}>
                {entry.username} {isMe && '(you)'}
              </span>
              <span className="text-center text-gray-400">
                <span className="text-neon-green">{entry.wins}</span>/
                <span className="text-neon-pink">{entry.losses}</span>/
                <span>{entry.draws}</span>
              </span>
              <span className="text-center text-neon-yellow">
                {entry.streak > 0 ? `${entry.streak}` : '-'}
              </span>
              <span className="text-right font-mono font-semibold text-white">
                {entry.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
