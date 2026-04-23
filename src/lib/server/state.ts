import { FrpcManager } from './frpc-manager';
import type { LogEntry, FrpcProcessStatus } from '$lib/types';
import { getFrpcPath } from './settings-store';
import { EventEmitter } from 'node:events';

class StateEvents extends EventEmitter {}
export const stateEvents = new StateEvents();

let manager: FrpcManager | null = null;
const logBuffer: LogEntry[] = [];
const MAX_LOG_BUFFER = 500;

export function getManager(): FrpcManager {
  if (!manager) {
    manager = new FrpcManager(getFrpcPath());
    manager.on('log', (entry: LogEntry) => {
      logBuffer.push(entry);
      if (logBuffer.length > MAX_LOG_BUFFER) logBuffer.shift();
      stateEvents.emit('log', entry);
    });
    manager.on('exit', () => {
      stateEvents.emit('status', getStatus());
    });
  }
  return manager;
}

export function getStatus(): { status: FrpcProcessStatus; configPath: string | null } {
  const mgr = getManager();
  return {
    status: mgr.getStatus(),
    configPath: mgr.getConfigPath()
  };
}

export function getLogBuffer(): LogEntry[] {
  return [...logBuffer];
}

export function addLog(entry: LogEntry) {
  const withSource = { source: 'zfrpc' as const, ...entry };
  logBuffer.push(withSource);
  if (logBuffer.length > MAX_LOG_BUFFER) logBuffer.shift();
  stateEvents.emit('log', withSource);
}

export function reloadManager() {
  if (manager) {
    manager.stop();
  }
  manager = null;
  getManager();
}

process.on('uncaughtException', (err: Error) => {
  addLog({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: `zfrpc 内部错误: ${err.message}`
  });
});

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  addLog({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: `zfrpc 未处理的异步错误: ${message}`
  });
});
