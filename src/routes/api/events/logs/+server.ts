import type { RequestHandler } from './$types';
import { stateEvents, getLogBuffer } from '$lib/server/state';

export const GET: RequestHandler = ({ request }) => {
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
          cleanup();
        }
      };

      const onLog = (entry: unknown) => send({ type: 'log', entry });

      const heartbeat = setInterval(() => {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch {
            closed = true;
            cleanup();
          }
        }
      }, 30000);

      const cleanup = () => {
        stateEvents.off('log', onLog);
        clearInterval(heartbeat);
      };

      stateEvents.on('log', onLog);

      const existingLogs = getLogBuffer();
      send({ type: 'init', logs: existingLogs });

      request.signal.addEventListener('abort', () => {
        closed = true;
        cleanup();
        try { controller.close(); } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
};
