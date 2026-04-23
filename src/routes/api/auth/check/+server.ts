import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
  return json({ hasPassword: !!process.env.ZFRPC_PASSWORD });
};
