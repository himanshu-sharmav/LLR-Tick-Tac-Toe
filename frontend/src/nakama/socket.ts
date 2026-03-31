import { Match, MatchData, MatchPresenceEvent, MatchmakerMatched, Session, Socket } from '@heroiclabs/nakama-js';
import { getClient } from './client';
import { useGameStore } from '../store/gameStore';

// OpCodes — must match server
export const OpCode = {
  START: 1,
  UPDATE: 2,
  DONE: 3,
  MOVE: 4,
  REJECTED: 5,
  OPPONENT_LEFT: 6,
  TIMER_TICK: 7,
} as const;

let socket: Socket | null = null;
let currentMatchId: string | null = null;
let matchmakerTicket: string | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export async function connectSocket(session: Session): Promise<Socket> {
  const client = getClient();
  const useSSL = import.meta.env.VITE_NAKAMA_SSL === 'true';
  socket = client.createSocket(useSSL);

  socket.ondisconnect = () => {
    useGameStore.getState().setConnected(false);
    console.warn('Disconnected from server');
    // Attempt reconnect with exponential backoff
    attemptReconnect(session);
  };

  socket.onmatchdata = (matchData: MatchData) => {
    const store = useGameStore.getState();
    const data = matchData.data ? JSON.parse(new TextDecoder().decode(matchData.data as Uint8Array)) : {};

    switch (matchData.op_code) {
      case OpCode.START:
        store.handleStart(data);
        break;
      case OpCode.UPDATE:
        store.handleUpdate(data);
        break;
      case OpCode.DONE:
        store.handleDone(data);
        break;
      case OpCode.REJECTED:
        store.handleRejected(data);
        break;
      case OpCode.OPPONENT_LEFT:
        store.handleOpponentLeft();
        break;
      case OpCode.TIMER_TICK:
        store.handleTimerTick(data);
        break;
    }
  };

  socket.onmatchpresence = (event: MatchPresenceEvent) => {
    if (event.leaves && event.leaves.length > 0) {
      console.log('Presence left:', event.leaves.map(p => p.username));
    }
    if (event.joins && event.joins.length > 0) {
      console.log('Presence joined:', event.joins.map(p => p.username));
    }
  };

  socket.onmatchmakermatched = async (matched: MatchmakerMatched) => {
    console.log('Matchmaker found match:', matched.match_id);
    matchmakerTicket = null;
    if (matched.match_id && matched.token) {
      const match = await socket!.joinMatch(matched.match_id, matched.token);
      handleMatchJoined(match);
    }
  };

  await socket.connect(session, true);
  useGameStore.getState().setConnected(true);
  console.log('Connected to Nakama');

  return socket;
}

let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;

function attemptReconnect(session: Session): void {
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
  reconnectAttempts++;

  setTimeout(async () => {
    try {
      if (socket) {
        await socket.connect(session, true);
        useGameStore.getState().setConnected(true);
        reconnectAttempts = 0;
        console.log('Reconnected to server');
      }
    } catch {
      console.warn(`Reconnect attempt ${reconnectAttempts} failed, retrying...`);
      attemptReconnect(session);
    }
  }, delay);
}

function handleMatchJoined(match: Match): void {
  currentMatchId = match.match_id;
  useGameStore.getState().setMatchId(match.match_id);
  if (useGameStore.getState().phase !== 'playing') {
    useGameStore.getState().setPhase('waiting');
  }
  console.log('Joined match:', match.match_id);
}

export async function findMatch(mode: 'classic' | 'timed'): Promise<void> {
  const client = getClient();
  const store = useGameStore.getState();

  try {
    const session = store.session!;
    const result = await client.rpc(session, 'find_match', JSON.stringify({ mode }));
    const payloadData = typeof result.payload === 'string' ? JSON.parse(result.payload) : result.payload;
    const { matchId } = payloadData;

    const match = await socket!.joinMatch(matchId);
    handleMatchJoined(match);
  } catch (err) {
    console.error('Failed to find match:', err);
    throw err;
  }
}

export async function addToMatchmaker(mode: 'classic' | 'timed'): Promise<void> {
  if (!socket) throw new Error('Socket not connected');

  const ticket = await socket.addMatchmaker('*', 2, 2, { mode }, {});
  matchmakerTicket = ticket.ticket;
  useGameStore.getState().setPhase('waiting');
  console.log('Added to matchmaker, ticket:', matchmakerTicket);
}

export async function cancelMatchmaker(): Promise<void> {
  if (!socket || !matchmakerTicket) return;

  try {
    await socket.removeMatchmaker(matchmakerTicket);
    matchmakerTicket = null;
    useGameStore.getState().setPhase('lobby');
    console.log('Cancelled matchmaker');
  } catch (err) {
    console.error('Failed to cancel matchmaker:', err);
  }
}

export async function sendMove(position: number): Promise<void> {
  if (!socket || !currentMatchId) return;

  const payload = JSON.stringify({ position });
  await socket.sendMatchState(currentMatchId, OpCode.MOVE, payload);
}

export async function leaveMatch(): Promise<void> {
  if (!socket || !currentMatchId) return;

  try {
    await socket.leaveMatch(currentMatchId);
  } catch {
    // Match may already be closed
  }

  currentMatchId = null;
  matchmakerTicket = null;
}

export async function fetchLeaderboard(limit: number = 20): Promise<void> {
  const client = getClient();
  const store = useGameStore.getState();

  try {
    const session = store.session!;
    const result = await client.rpc(session, 'get_leaderboard', JSON.stringify({ limit }));
    const payloadData = typeof result.payload === 'string' ? JSON.parse(result.payload) : result.payload;
    const data = payloadData;
    store.setLeaderboard(data.entries || []);
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect(false);
    socket = null;
  }
  currentMatchId = null;
  matchmakerTicket = null;
}
