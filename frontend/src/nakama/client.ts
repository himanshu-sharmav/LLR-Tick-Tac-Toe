import { Client, Session } from '@heroiclabs/nakama-js';

const NAKAMA_HOST = import.meta.env.VITE_NAKAMA_HOST || '127.0.0.1';
const NAKAMA_PORT = import.meta.env.VITE_NAKAMA_PORT || '7350';
const NAKAMA_KEY = import.meta.env.VITE_NAKAMA_KEY || 'defaultkey';
const NAKAMA_SSL = import.meta.env.VITE_NAKAMA_SSL === 'true';

const client = new Client(NAKAMA_KEY, NAKAMA_HOST, NAKAMA_PORT, NAKAMA_SSL);

const SESSION_KEY = 'nakama_session';
const REFRESH_KEY = 'nakama_refresh';
const DEVICE_KEY = 'nakama_device_id';

function generateDeviceId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_KEY, deviceId);
  }
  return deviceId;
}

export async function authenticate(username: string): Promise<Session> {
  const deviceId = getDeviceId();

  // Try to restore existing session
  const savedToken = localStorage.getItem(SESSION_KEY);
  const savedRefresh = localStorage.getItem(REFRESH_KEY);
  if (savedToken && savedRefresh) {
    try {
      const restored = Session.restore(savedToken, savedRefresh);
      if (!restored.isexpired(Date.now() / 1000)) {
        return restored;
      }
    } catch {
      // Session invalid, re-authenticate
    }
  }

  const session = await client.authenticateDevice(deviceId, true, username);
  localStorage.setItem(SESSION_KEY, session.token);
  localStorage.setItem(REFRESH_KEY, session.refresh_token);

  // Update username if provided
  if (username) {
    try {
      await client.updateAccount(session, {
        username: username,
      });
    } catch {
      // Username may already be taken or unchanged
    }
  }

  return session;
}

export function getClient(): Client {
  return client;
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
