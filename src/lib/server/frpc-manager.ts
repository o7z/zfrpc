import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { FrpcProcessStatus, LogEntry } from '$lib/types';

export class FrpcManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private configPath: string | null = null;
  private frpcPath: string;
  private startTime: number | null = null;

  constructor(frpcPath: string = 'frpc') {
    super();
    this.frpcPath = frpcPath;
  }

  getStatus(): FrpcProcessStatus {
    if (!this.process || this.process.killed || this.process.pid === undefined) {
      return { running: false };
    }
    return {
      running: true,
      pid: this.process.pid,
      uptime: this.startTime ? Date.now() - this.startTime : 0
    };
  }

  private emitLog(entry: Omit<LogEntry, 'source'> & { source?: LogEntry['source'] }) {
    this.emit('log', { ...entry, source: entry.source || 'frpc' });
  }

  start(configPath: string): boolean {
    if (this.process && !this.process.killed) {
      return false;
    }

    this.configPath = configPath;
    this.startTime = Date.now();

    try {
      this.process = spawn(this.frpcPath, ['-c', configPath], {
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.process.stdout?.on('data', (data) => {
        this.emitLog({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: data.toString().trim()
        });
      });

      this.process.stderr?.on('data', (data) => {
        this.emitLog({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: data.toString().trim()
        });
      });

      this.process.on('exit', (code, signal) => {
        const msg = code !== null
          ? `frpc 进程已退出 (exit code: ${code})`
          : `frpc 进程被信号终止 (signal: ${signal})`;
        this.emitLog({
          timestamp: new Date().toISOString(),
          level: code === 0 ? 'info' : 'warn',
          message: msg,
          source: 'zfrpc'
        });
        this.emit('exit', { code, signal });
        this.process = null;
        this.startTime = null;
      });

      this.process.on('error', (err) => {
        this.emitLog({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `frpc 启动失败: ${err.message}`,
          source: 'zfrpc'
        });
        this.process = null;
        this.startTime = null;
      });

      return true;
    } catch (err) {
      this.emitLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `启动异常: ${(err as Error).message}`,
        source: 'zfrpc'
      });
      return false;
    }
  }

  stop(): boolean {
    if (!this.process || this.process.killed) {
      return false;
    }

    try {
      this.process.kill('SIGTERM');
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
      return true;
    } catch {
      return false;
    }
  }

  forceStop(): void {
    if (!this.process || this.process.killed) return;
    try {
      this.process.kill('SIGKILL');
    } catch {}
  }

  restart(): boolean {
    const config = this.configPath;
    this.stop();
    if (config) {
      setTimeout(() => this.start(config), 1000);
      return true;
    }
    return false;
  }

  getConfigPath(): string | null {
    return this.configPath;
  }
}
