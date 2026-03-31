import { useGameStore } from '../store/gameStore';
import { Board } from '../components/Board';
import { PlayerInfo } from '../components/PlayerInfo';
import { Timer } from '../components/Timer';

export function GamePage() {
  const errorMessage = useGameStore((s) => s.errorMessage);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const userId = useGameStore((s) => s.userId);
  const mode = useGameStore((s) => s.mode);

  const isMyTurn = currentTurn === userId;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 w-full max-w-[400px]">
      <div className="w-full animate-slide-up">
        {/* Player info */}
        <PlayerInfo />

        {/* Turn indicator */}
        <div className="text-center mb-4">
          <span
            className={`text-sm font-semibold px-4 py-1 rounded-full ${
              isMyTurn
                ? 'bg-neon-cyan/20 text-neon-cyan'
                : 'bg-dark-card text-gray-400'
            }`}
          >
            {isMyTurn ? 'Your turn!' : "Opponent's turn..."}
          </span>
        </div>

        {/* Board */}
        <Board />

        {/* Timer */}
        {mode === 'timed' && <Timer />}

        {/* Error message */}
        {errorMessage && (
          <div className="mt-3 text-center">
            <span className="text-neon-pink text-xs bg-neon-pink/10 px-3 py-1 rounded-full">
              {errorMessage}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
