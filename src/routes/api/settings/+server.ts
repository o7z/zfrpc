import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadSettings, saveSettings } from '$lib/server/settings-store';
import { reloadManager } from '$lib/server/state';

export const GET: RequestHandler = () => {
  const settings = loadSettings();
  return json({
    frpcPath: settings.frpcPath,
    frpcDir: settings.frpcDir || process.env.ZFRPC_DIR || process.cwd(),
    frpcStartup: settings.frpcStartup,
    hasPassword: !!process.env.ZFRPC_PASSWORD
  });
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const saved = saveSettings(body);

  if (body.frpcPath !== undefined) {
    reloadManager();
  }

  return json({ success: true, settings: saved });
};
