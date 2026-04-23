import type { LayoutServerLoad } from './$types';
import { hashPassword } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const hasPassword = !!process.env.ZFRPC_PASSWORD;
  const session = cookies.get('zfrpc_session');
  const authenticated = hasPassword ? !!session : true;

  return {
    authenticated,
    hasPassword
  };
};
