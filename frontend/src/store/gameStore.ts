import { create } from 'zustand';
import { Session } from '@heroiclabs/nakama-js';

export type Phase = 'home' | 'lobby' | 'waiting' | 'playing' | 'result';
export type Mark = 'X' | 'O';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  streak: number;
  wins: number;
  losses: number;
  draws: number;
  rank: number;
}

interface StartPayload {
  marks: Record<string, Mark>;
  usernames: Record<string, string>;
  currentTurn: string;
  deadline: number;
  mode: string;
}

interface UpdatePayload {
  board: (Mark | null)[];
  currentTurn: string;
  deadline: number;
  moveIndex: number;
}

interface DonePayload {
  board: (Mark | null)[];
  winner: string | null;
  winnerMark: Mark | null;
  reason: 'win' | 'draw' | 'forfeit' | 'abandon';
  winLine: number[] | null;
}

interface GameState {
  // Session
  session: Session | null;
  connected: boolean;

  // Navigation
  phase: Phase;

  // Player
  username: string;
  userId: string;

  // Match
  matchId: string | null;
  mode: 'classic' | 'timed';

  // Game state
  board: (Mark | null)[];
  myMark: Mark | null;
  currentTurn: string;
  players: Record<string, { username: string; mark: Mark }>;
  winner: string | null;
  winnerMark: Mark | null;
  winLine: number[] | null;
  reason: string | null;

  // Timer
  secondsLeft: number;
  turnDuration: number;   // total seconds per turn (0 = no limit)
  timerInterval: ReturnType<typeof setInterval> | null;

  // Leaderboard
  leaderboard: LeaderboardEntry[];

  // Error
  errorMessage: string | null;

  // Actions
  setSession: (session: Session) => void;
  setConnected: (connected: boolean) => void;
  setPhase: (phase: Phase) => void;
  setUsername: (username: string) => void;
  setMatchId: (matchId: string) => void;
  setMode: (mode: 'classic' | 'timed') => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;

  // Server event handlers
  handleStart: (data: StartPayload) => void;
  handleUpdate: (data: UpdatePayload) => void;
  handleDone: (data: DonePayload) => void;
  handleRejected: (data: { reason: string }) => void;
  handleOpponentLeft: () => void;
  handleTimerTick: (data: { secondsLeft: number }) => void;

  // Reset
  reset: () => void;
}

const initialGameState = {
  board: Array(9).fill(null) as (Mark | null)[],
  myMark: null as Mark | null,
  currentTurn: '',
  players: {} as Record<string, { username: string; mark: Mark }>,
  winner: null as string | null,
  winnerMark: null as Mark | null,
  winLine: null as number[] | null,
  reason: null as string | null,
  secondsLeft: 0,
  turnDuration: 0,
  timerInterval: null as ReturnType<typeof setInterval> | null,
  errorMessage: null as string | null,
};

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  session: null,
  connected: false,
  phase: 'home',
  username: '',
  userId: '',
  matchId: null,
  mode: 'classic',
  leaderboard: [],
  ...initialGameState,

  // Setters
  setSession: (session) => set({ session, userId: session.user_id! }),
  setConnected: (connected) => set({ connected }),
  setPhase: (phase) => set({ phase }),
  setUsername: (username) => set({ username }),
  setMatchId: (matchId) => set({ matchId }),
  setMode: (mode) => set({ mode }),
  setLeaderboard: (entries) => set({ leaderboard: entries }),

  // Handle START from server
  handleStart: (data) => {
    const userId = get().userId;
    const myMark = data.marks[userId] || null;

    // Build players map
    const players: Record<string, { username: string; mark: Mark }> = {};
    for (const uid of Object.keys(data.marks)) {
      players[uid] = {
        username: data.usernames[uid] || 'Unknown',
        mark: data.marks[uid],
      };
    }

    // Start client-side timer for timed mode
    const interval = get().timerInterval;
    if (interval) clearInterval(interval);

    let timerInterval: ReturnType<typeof setInterval> | null = null;
    if (data.mode === 'timed' && data.deadline > 0) {
      timerInterval = setInterval(() => {
        const s = get().secondsLeft;
        if (s > 0) {
          set({ secondsLeft: s - 1 });
        }
      }, 1000);
    }

    set({
      phase: 'playing',
      board: Array(9).fill(null),
      myMark,
      currentTurn: data.currentTurn,
      players,
      secondsLeft: data.deadline,
      turnDuration: data.deadline,
      timerInterval,
      mode: data.mode as 'classic' | 'timed',
      errorMessage: null,
    });
  },

  // Handle UPDATE from server
  handleUpdate: (data) => {
    const state = get();

    // In timed mode, restart the countdown interval for the new turn
    if (state.mode === 'timed' && data.deadline > 0) {
      if (state.timerInterval) clearInterval(state.timerInterval);
      const timerInterval = setInterval(() => {
        const s = get().secondsLeft;
        if (s > 0) set({ secondsLeft: s - 1 });
      }, 1000);
      set({
        board: data.board,
        currentTurn: data.currentTurn,
        secondsLeft: data.deadline,
        timerInterval,
        errorMessage: null,
      });
    } else {
      set({
        board: data.board,
        currentTurn: data.currentTurn,
        secondsLeft: data.deadline > 0 ? data.deadline : state.secondsLeft,
        errorMessage: null,
      });
    }
  },

  // Handle DONE from server
  handleDone: (data) => {
    const interval = get().timerInterval;
    if (interval) clearInterval(interval);

    set({
      phase: 'result',
      board: data.board,
      winner: data.winner,
      winnerMark: data.winnerMark,
      winLine: data.winLine,
      reason: data.reason,
      timerInterval: null,
    });
  },

  // Handle REJECTED from server
  handleRejected: (data) => {
    set({ errorMessage: data.reason });
    // Clear error after 2 seconds
    setTimeout(() => set({ errorMessage: null }), 2000);
  },

  // Handle OPPONENT_LEFT from server
  handleOpponentLeft: () => {
    // The DONE message will follow with the actual result
    console.log('Opponent left the match');
  },

  // Handle TIMER_TICK resync from server
  handleTimerTick: (data) => {
    set({ secondsLeft: data.secondsLeft });
  },

  // Reset game state for replay
  reset: () => {
    const interval = get().timerInterval;
    if (interval) clearInterval(interval);

    set({
      ...initialGameState,
      phase: 'lobby',
      matchId: null,
    });
  },
}));
