// Pure game logic functions — no Nakama dependencies

const WIN_COMBINATIONS: number[][] = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // middle column
  [2, 5, 8], // right column
  [0, 4, 8], // diagonal top-left
  [2, 4, 6], // diagonal top-right
];

function checkWinner(board: (Mark | null)[]): { winner: Mark; line: number[] } | null {
  for (var i = 0; i < WIN_COMBINATIONS.length; i++) {
    var combo = WIN_COMBINATIONS[i];
    var a = board[combo[0]];
    var b = board[combo[1]];
    var c = board[combo[2]];
    if (a !== null && a === b && b === c) {
      return { winner: a, line: combo };
    }
  }
  return null;
}

function checkDraw(board: (Mark | null)[]): boolean {
  for (var i = 0; i < board.length; i++) {
    if (board[i] === null) return false;
  }
  return true;
}

function validateMove(
  state: MatchState,
  userId: string,
  position: number
): { valid: boolean; reason?: string } {
  if (state.gameOver) {
    return { valid: false, reason: "Game is already over" };
  }
  if (state.currentTurn !== userId) {
    return { valid: false, reason: "Not your turn" };
  }
  if (position < 0 || position > 8 || Math.floor(position) !== position) {
    return { valid: false, reason: "Invalid position (must be 0-8)" };
  }
  if (state.board[position] !== null) {
    return { valid: false, reason: "Cell is already occupied" };
  }
  return { valid: true };
}
