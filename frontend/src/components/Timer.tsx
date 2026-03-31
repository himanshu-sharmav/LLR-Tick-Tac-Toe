import { useGameStore } from '../store/gameStore';

export function Timer() {
  const secondsLeft = useGameStore((s) => s.secondsLeft);
  const turnDuration = useGameStore((s) => s.turnDuration);
  const mode = useGameStore((s) => s.mode);

  if (mode !== 'timed') return null;

  const maxSeconds = turnDuration > 0 ? turnDuration : 30;
  const percentage = Math.min(100, (secondsLeft / maxSeconds) * 100);
  const isLow = secondsLeft <= 10;

  return (
    <div className="w-full max-w-[320px] mx-auto mt-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Time Left</span>
        <span
          className={`text-lg font-bold tabular-nums ${
            isLow ? 'text-neon-pink' : 'text-neon-cyan'
          }`}
        >
          {secondsLeft}s
        </span>
      </div>
      <div className="w-full h-2 bg-dark-card rounded-full overflow-hidden border border-dark-border">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isLow ? 'bg-neon-pink' : 'bg-neon-cyan'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
