import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hashPassword, createSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { password } = await request.json();
  const envPassword = process.env.ZFRPC_PASSWORD;

  if (!envPassword) {
    return json({ error: 'No password set' }, { status: 400 });
  }

  if (hashPassword(password) !== hashPassword(envPassword)) {
    return json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = createSession(password);
  cookies.set('zfrpc_session', token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60
  });

  return json({ success: true });
};
