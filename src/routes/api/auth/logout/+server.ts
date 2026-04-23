import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
  cookies.delete('zfrpc_session', { path: '/' });
  throw redirect(302, '/login');
};
