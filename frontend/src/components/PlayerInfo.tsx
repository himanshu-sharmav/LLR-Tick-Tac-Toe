import { useGameStore } from '../store/gameStore';

export function PlayerInfo() {
  const players = useGameStore((s) => s.players);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const userId = useGameStore((s) => s.userId);

  const playerEntries = Object.entries(players);
  if (playerEntries.length < 2) return null;

  return (
    <div className="flex items-center justify-between w-full max-w-[320px] mx-auto mb-4">
      {playerEntries.map(([uid, player]) => {
        const isMe = uid === userId;
        const isTurn = uid === currentTurn;

        return (
          <div
            key={uid}
            className={`flex flex-col items-center px-3 py-2 rounded-lg transition-all ${
              isTurn ? 'bg-dark-accent border border-dark-border scale-105' : 'opacity-70'
            }`}
          >
            <span
              className={`text-2xl font-bold ${
                player.mark === 'X' ? 'text-neon-cyan' : 'text-neon-pink'
              }`}
            >
              {player.mark === 'X' ? '\u2715' : '\u25CB'}
            </span>
            <span className="text-xs text-gray-300 mt-1 max-w-[80px] truncate">
              {player.username}
            </span>
            <span className="text-[10px] text-gray-500">
              {isMe ? '(you)' : '(opp)'}
            </span>
          </div>
        );
      })}

      <div className="flex flex-col items-center">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {currentTurn === userId ? 'Your' : 'Opp'}
        </span>
        <span className="text-sm font-semibold text-white">Turn</span>
      </div>
    </div>
  );
}
