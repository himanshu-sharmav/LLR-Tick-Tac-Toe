import { useGameStore } from '../store/gameStore';
import { sendMove } from '../nakama/socket';
import { Cell } from './Cell';

export function Board() {
  const board = useGameStore((s) => s.board);
  const winLine = useGameStore((s) => s.winLine);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const userId = useGameStore((s) => s.userId);
  const gameOver = useGameStore((s) => s.phase === 'result');

  const isMyTurn = currentTurn === userId && !gameOver;

  const handleCellClick = (index: number) => {
    if (!isMyTurn || board[index] !== null) return;
    sendMove(index);
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-[320px] mx-auto">
      {board.map((cell, index) => (
        <Cell
          key={index}
          value={cell}
          index={index}
          isWinCell={winLine ? winLine.includes(index) : false}
          isMyTurn={isMyTurn}
          onClick={handleCellClick}
        />
      ))}
    </div>
  );
}
