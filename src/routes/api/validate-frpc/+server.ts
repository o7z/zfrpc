import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateFrpcPath } from '$lib/server/settings-store';

export const POST: RequestHandler = async ({ request }) => {
  const { frpcPath } = await request.json();
  const result = validateFrpcPath(frpcPath);
  return json(result);
};
