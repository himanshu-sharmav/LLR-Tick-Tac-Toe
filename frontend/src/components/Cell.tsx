import { Mark } from '../store/gameStore';

interface CellProps {
  value: Mark | null;
  index: number;
  isWinCell: boolean;
  isMyTurn: boolean;
  onClick: (index: number) => void;
}

export function Cell({ value, index, isWinCell, isMyTurn, onClick }: CellProps) {
  const canClick = !value && isMyTurn;

  return (
    <button
      className={`
        w-full aspect-square rounded-xl text-4xl sm:text-5xl font-bold
        flex items-center justify-center transition-all duration-200
        ${canClick ? 'cursor-pointer hover:bg-dark-accent active:scale-95' : 'cursor-default'}
        ${isWinCell ? 'animate-win-pulse bg-dark-accent' : 'bg-dark-card'}
        border-2 ${isWinCell ? 'border-neon-green' : 'border-dark-border'}
      `}
      onClick={() => canClick && onClick(index)}
      disabled={!canClick}
      aria-label={`Cell ${index}: ${value || 'empty'}`}
    >
      {value && (
        <span
          className={`animate-pop-in ${
            value === 'X' ? 'text-neon-cyan' : 'text-neon-pink'
          }`}
        >
          {value === 'X' ? '\u2715' : '\u25CB'}
        </span>
      )}
    </button>
  );
}
