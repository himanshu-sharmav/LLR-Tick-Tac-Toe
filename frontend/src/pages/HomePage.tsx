import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { authenticate } from '../nakama/client';
import { connectSocket } from '../nakama/socket';

export function HomePage() {
  const setSession = useGameStore((s) => s.setSession);
  const setUsername = useGameStore((s) => s.setUsername);
  const setPhase = useGameStore((s) => s.setPhase);

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (trimmed.length > 20) {
      setError('Name must be 20 characters or less');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const session = await authenticate(trimmed);
      setSession(session);
      setUsername(trimmed);
      await connectSocket(session);
      setPhase('lobby');
    } catch (err: unknown) {
      setError('Failed to connect. Is the server running?');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleContinue();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 w-full max-w-[400px] animate-slide-up">
      {/* Title */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold mb-2">
          <span className="text-neon-cyan">Tic</span>
          <span className="text-gray-500">-</span>
          <span className="text-neon-pink">Tac</span>
          <span className="text-gray-500">-</span>
          <span className="text-neon-green">Toe</span>
        </h1>
        <p className="text-gray-500 text-sm">Multiplayer</p>
      </div>

      {/* Input card */}
      <div className="w-full bg-dark-card rounded-2xl p-6 border border-dark-border">
        <div className="flex items-center justify-between mb-6">
          <label className="text-gray-400 text-sm">Who are you?</label>
          <span className="text-gray-600 text-xs">{name.length}/20</span>
        </div>

        <input
          type="text"
          placeholder="Nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={20}
          className="w-full bg-dark-bg border-2 border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-neon-cyan focus:outline-none transition-colors text-center text-lg"
          autoFocus
          disabled={loading}
        />

        {error && (
          <p className="text-neon-pink text-xs mt-2 text-center">{error}</p>
        )}

        <button
          onClick={handleContinue}
          disabled={loading || name.trim().length < 2}
          className="w-full mt-4 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-neon-cyan text-dark-bg hover:brightness-110 active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-dark-bg border-t-transparent rounded-full animate-spin-slow" />
              Connecting...
            </span>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
}
