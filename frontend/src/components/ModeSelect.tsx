import { useGameStore } from '../store/gameStore';

export function ModeSelect() {
  const mode = useGameStore((s) => s.mode);
  const setMode = useGameStore((s) => s.setMode);

  return (
    <div className="flex items-center gap-2 w-full max-w-[320px] mx-auto">
      <button
        className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
          mode === 'classic'
            ? 'bg-neon-cyan text-dark-bg'
            : 'bg-dark-card text-gray-400 border border-dark-border hover:border-neon-cyan'
        }`}
        onClick={() => setMode('classic')}
      >
        Classic
      </button>
      <button
        className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
          mode === 'timed'
            ? 'bg-neon-pink text-white'
            : 'bg-dark-card text-gray-400 border border-dark-border hover:border-neon-pink'
        }`}
        onClick={() => setMode('timed')}
      >
        Timed (30s)
      </button>
    </div>
  );
}
