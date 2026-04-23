export interface FrpcProcessStatus {
  running: boolean;
  pid?: number;
  uptime?: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: 'frpc' | 'zfrpc';
}

export interface ConfigFile {
  name: string;
  path: string;
  format: 'toml';
  type: 'frps' | 'frpc' | 'unknown';
}

export interface AppSettings {
  port: number;
  frpcPath: string;
  frpcDir: string;
  zfrpcStartup: boolean;
  frpcStartup: boolean;
}
