import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getManager, addLog, stateEvents, getStatus } from '$lib/server/state';

export const GET: RequestHandler = () => {
  const manager = getManager();
  const status = manager.getStatus();
  const configPath = manager.getConfigPath();
  return json({ status, configPath });
};

export const POST: RequestHandler = async ({ request }) => {
  const manager = getManager();
  const body = await request.json();
  const { action } = body;

  let success = false;
  switch (action) {
    case 'start': {
      const configPath = body.configPath;
      if (configPath) {
        success = manager.start(configPath);
      }
      break;
    }
    case 'stop':
      success = manager.stop();
      break;
    case 'restart': {
      const configPath = manager.getConfigPath();
      if (configPath) {
        manager.stop();
        setTimeout(() => {
          manager.start(configPath);
        }, 1000);
        success = true;
      }
      break;
    }
  }

  if (success) {
    addLog({ timestamp: new Date().toISOString(), level: 'info', message: `已执行: frpc ${action}` });
    stateEvents.emit('status', getStatus());
  }

  return json({ success, status: manager.getStatus() });
};
