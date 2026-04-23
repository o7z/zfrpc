import type { Handle } from '@sveltejs/kit';
import { hashPassword, verifySession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const passwordEnv = process.env.ZFRPC_PASSWORD;
  const passwordHash = passwordEnv ? hashPassword(passwordEnv) : '';

  // Skip auth for login page and static assets
  if (event.url.pathname === '/login' || event.url.pathname.startsWith('/_app/') || event.url.pathname === '/api/auth/check') {
    return resolve(event);
  }

  // If no password set, allow all
  if (!passwordEnv) {
    return resolve(event);
  }

  const token = event.cookies.get('zfrpc_session');
  if (!verifySession(token, passwordHash)) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });
  }

  return resolve(event);
};
