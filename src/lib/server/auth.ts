import { createHash } from 'node:crypto';

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const sessions = new Map<string, { hash: string; expires: number }>();

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function createSession(password: string): string {
  const token = createHash('sha256').update(`${password}-${Date.now()}-${Math.random()}`).digest('hex');
  sessions.set(token, {
    hash: hashPassword(password),
    expires: Date.now() + SESSION_TTL
  });
  return token;
}

export function verifySession(token: string | undefined, passwordHash: string): boolean {
  if (!token || !passwordHash) return true; // no password set
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) {
    sessions.delete(token);
    return false;
  }
  return session.hash === passwordHash;
}

export function cleanupSessions() {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now > session.expires) {
      sessions.delete(token);
    }
  }
}
