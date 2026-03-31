import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { findMatch, leaveMatch, fetchLeaderboard } from '../nakama/socket';
import { ModeSelect } from '../components/ModeSelect';
import { Leaderboard } from '../components/Leaderboard';

export function LobbyPage() {
  const phase = useGameStore((s) => s.phase);
  const mode = useGameStore((s) => s.mode);
  const username = useGameStore((s) => s.username);

  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const handleFindMatch = async () => {
    setSearching(true);
    setError('');
    try {
      await findMatch(mode);
    } catch (err: unknown) {
      setError('Failed to find match. Try again.');
      setSearching(false);
      console.error('Find match error:', err);
    }
  };

  const handleCancel = async () => {
    setSearching(false);
    await leaveMatch();
    useGameStore.getState().setPhase('lobby');
  };

  // Waiting state
  if (phase === 'waiting' || searching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 w-full max-w-[400px]">
        <div className="bg-dark-card rounded-2xl p-8 border border-dark-border w-full text-center animate-slide-up">
          {/* Spinner */}
          <div className="w-16 h-16 mx-auto mb-6 border-4 border-dark-border border-t-neon-cyan rounded-full animate-spin-slow" />

          <h2 className="text-xl font-bold text-white mb-2">Finding a random player...</h2>
          <p className="text-gray-500 text-sm mb-6">It usually takes 25 seconds.</p>

          <button
            onClick={handleCancel}
            className="px-6 py-2 rounded-xl text-sm font-semibold bg-dark-accent text-gray-300 border border-dark-border hover:border-neon-pink hover:text-neon-pink transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Lobby
  return (
    <div className="flex flex-col items-center min-h-screen p-6 w-full max-w-[400px] pt-12">
      <div className="animate-slide-up w-full">
        {/* Welcome */}
        <div className="text-center mb-8">
          <p className="text-gray-500 text-sm">Welcome back,</p>
          <h2 className="text-2xl font-bold text-white">{username}</h2>
        </div>

        {/* Mode selector */}
        <div className="mb-6">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2 text-center">
            Game Mode
          </p>
          <ModeSelect />
        </div>

        {/* Find Match button */}
        <button
          onClick={handleFindMatch}
          className="w-full py-4 rounded-xl text-base font-bold transition-all bg-gradient-to-r from-neon-cyan to-neon-green text-dark-bg hover:brightness-110 active:scale-[0.98] mb-2"
        >
          Find Match
        </button>

        {error && (
          <p className="text-neon-pink text-xs text-center mb-4">{error}</p>
        )}

        {/* Leaderboard */}
        <div className="mt-8">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}
