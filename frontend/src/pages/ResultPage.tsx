import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { leaveMatch, fetchLeaderboard } from '../nakama/socket';
import { Leaderboard } from '../components/Leaderboard';

export function ResultPage() {
  const winner = useGameStore((s) => s.winner);
  const winnerMark = useGameStore((s) => s.winnerMark);
  const reason = useGameStore((s) => s.reason);
  const userId = useGameStore((s) => s.userId);
  const players = useGameStore((s) => s.players);
  const reset = useGameStore((s) => s.reset);

  const isWinner = winner === userId;
  const isDraw = winner === null && reason === 'draw';

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const handlePlayAgain = async () => {
    await leaveMatch();
    reset();
  };

  const getResultText = () => {
    if (isDraw) return 'Draw!';
    if (reason === 'abandon') return isWinner ? 'Opponent Left!' : 'You Left!';
    if (reason === 'forfeit') return isWinner ? 'Opponent Timed Out!' : 'Time\'s Up!';
    return isWinner ? 'You Won!' : 'You Lost!';
  };

  const getSubText = () => {
    if (isDraw) return "It's a tie game";
    if (isWinner && reason === 'win') return '+200 pts';
    if (isWinner) return '+100 pts';
    return 'Better luck next time';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 w-full max-w-[400px]">
      <div className="w-full animate-slide-up">
        {/* Result banner */}
        <div className="text-center mb-8">
          {/* Big mark */}
          {winnerMark && (
            <span
              className={`text-7xl font-bold block mb-2 ${
                winnerMark === 'X' ? 'text-neon-cyan' : 'text-neon-pink'
              }`}
            >
              {winnerMark === 'X' ? '\u2715' : '\u25CB'}
            </span>
          )}
          {isDraw && (
            <span className="text-7xl block mb-2">
              <span className="text-neon-cyan">\u2715</span>
              <span className="text-gray-600">=</span>
              <span className="text-neon-pink">\u25CB</span>
            </span>
          )}

          <h1
            className={`text-3xl font-extrabold mb-1 ${
              isDraw ? 'text-neon-yellow' : isWinner ? 'text-neon-green' : 'text-neon-pink'
            }`}
          >
            {getResultText()}
          </h1>
          <p className="text-gray-400 text-sm">{getSubText()}</p>

          {/* Player score summary */}
          {winner && players[winner] && (
            <p className="text-gray-500 text-xs mt-2">
              Winner: {players[winner].username} ({players[winner].mark})
            </p>
          )}
        </div>

        {/* Leaderboard */}
        <div className="mb-6">
          <Leaderboard compact />
        </div>

        {/* Play again */}
        <button
          onClick={handlePlayAgain}
          className="w-full py-4 rounded-xl text-base font-bold transition-all bg-dark-card border-2 border-dark-border text-white hover:border-neon-cyan hover:text-neon-cyan active:scale-[0.98]"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
