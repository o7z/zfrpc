import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLogBuffer } from '$lib/server/state';

export const GET: RequestHandler = async ({ url }) => {
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const logs = getLogBuffer();
  return json({ logs: logs.slice(-limit) });
};
