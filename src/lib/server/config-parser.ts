import * as fs from 'node:fs';
import * as path from 'node:path';
import * as toml from '@iarna/toml';
import { loadSettings } from './settings-store';

export interface FrpcClientConfig {
  serverAddr: string;
  serverPort: number;
  authMethod: 'token' | 'oidc' | '';
  authToken: string;
  user: string;
  loginFailExit: boolean;
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  logFile: string;
  logMaxDays: number;
  disableLogColor: boolean;
  dnsServer: string;
  transport: {
    protocol: 'tcp' | 'kcp' | 'quic' | 'websocket';
    dialServerTimeout: number;
    dialServerKeepAlive: number;
    connectServerLocalProxy: string;
    poolCount: number;
    tcpMux: boolean;
    tcpMuxKeepaliveInterval: number;
  };
  webServer: {
    addr: string;
    port: number;
  };
  proxies: FrpcProxy[];
  visitors: FrpcVisitor[];
}

export interface FrpcProxy {
  name: string;
  type: 'tcp' | 'udp' | 'http' | 'https' | 'stcp' | 'sudp' | 'tcpmux';
  localIP: string;
  localPort: number;
  remotePort: number;
  customDomains: string[];
  subdomain: string;
  bandwidthLimit: string;
  bandwidthLimitMode: 'client' | 'server';
  proxyProtocolVersion: 'v1' | 'v2' | '';
  useEncryption: boolean;
  useCompression: boolean;
  group: string;
  groupKey: string;
  healthCheckType: 'tcp' | 'http' | '';
  healthCheckInterval: number;
  healthCheckTimeout: number;
  healthCheckMaxFailed: number;
  meta: Record<string, string>;
}

export interface FrpcVisitor {
  name: string;
  type: 'stcp' | 'sudp' | 'xtcp';
  serverName: string;
  bindAddr: string;
  bindPort: number;
  secretKey: string;
}

export interface ConfigFile {
  name: string;
  path: string;
  format: 'toml';
  active: boolean;
}

const COMMON_PATHS = [
  '/etc/frp',
  path.join(process.env.HOME || process.env.USERPROFILE || '.', '.frp'),
];

function getScanDirs(): string[] {
  const settings = loadSettings();
  const dirs = [...COMMON_PATHS];
  if (settings.frpcDir && !dirs.includes(settings.frpcDir)) {
    dirs.unshift(settings.frpcDir);
  }
  if (!dirs.includes(process.cwd())) {
    dirs.push(process.cwd());
  }
  return dirs;
}

export function scanConfigs(): ConfigFile[] {
  const configs: ConfigFile[] = [];
  const seen = new Set<string>();

  for (const dir of getScanDirs()) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (/^frpc.*\.toml$/.test(file)) {
          const fullPath = path.join(dir, file);
          if (seen.has(fullPath)) continue;
          seen.add(fullPath);
          const name = file.replace(/\.toml$/, '');
          configs.push({ name, path: fullPath, format: 'toml', active: false });
        }
      }
    } catch {}
  }
  return configs;
}

export function parseFrpcConfig(filePath: string): FrpcClientConfig | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const raw = parseRaw(content);
    return normalizeFrpc(raw);
  } catch {
    return null;
  }
}

export function generateFrpcConfig(config: FrpcClientConfig): string {
  return tomlStringify(frpcToToml(config));
}

export function validateConfig(content: string): string | null {
  try {
    toml.parse(content);
    return null;
  } catch (err) {
    return (err as Error).message;
  }
}

export function previewConfig(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

export function writeFile(filePath: string, content: string): boolean {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

// ==================== Internal ====================

function parseRaw(content: string): Record<string, any> {
  return toml.parse(content);
}

function normalizeFrpc(raw: Record<string, any>): FrpcClientConfig {
  const src = raw.common || raw;
  return {
    serverAddr: src.serverAddr || src.server_addr || '127.0.0.1',
    serverPort: src.serverPort || src.server_port || 7000,
    authMethod: src.auth?.method || src['auth.method'] || src.authentication_method || '',
    authToken: src.auth?.token || src['auth.token'] || src.token || '',
    user: src.user || '',
    loginFailExit: src.loginFailExit !== undefined ? src.loginFailExit : (src.login_fail_exit !== undefined ? src.login_fail_exit : true),
    logLevel: src.log?.level || src.log_level || 'info',
    logFile: src.log?.to || src.log_file || './frpc.log',
    logMaxDays: src.log?.maxDays || src.log_max_days || 3,
    disableLogColor: src.log?.disablePrintColor || src.disable_log_color || false,
    dnsServer: src.dnsServer || src.dns_server || '',
    transport: {
      protocol: src.transport?.protocol || src.protocol || 'tcp',
      dialServerTimeout: src.transport?.dialServerTimeout || src.dial_server_timeout || 10,
      dialServerKeepAlive: src.transport?.dialServerKeepAlive || src.dial_server_keepalive || 7200,
      connectServerLocalProxy: src.transport?.connectServerLocalProxy || src.connect_server_local_proxy || '',
      poolCount: src.transport?.poolCount || src.pool_count || 1,
      tcpMux: src.transport?.tcpMux !== undefined ? src.transport.tcpMux : (src.tcp_mux !== undefined ? src.tcp_mux : true),
      tcpMuxKeepaliveInterval: src.transport?.tcpMuxKeepaliveInterval || src.tcp_mux_keepalive_interval || 30
    },
    webServer: {
      addr: src.webServer?.addr || '127.0.0.1',
      port: src.webServer?.port || 7400
    },
    proxies: extractProxies(raw),
    visitors: extractVisitors(raw)
  };
}

function extractProxies(raw: Record<string, any>): FrpcProxy[] {
  const proxies: FrpcProxy[] = [];
  if (Array.isArray(raw.proxies)) {
    return raw.proxies.map((p: any) => normalizeProxy(p));
  }
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== 'object' || !value) continue;
    const isProxy = key.startsWith('proxy/') || key.startsWith('proxy.') || (key !== 'common' && key !== 'log' && key !== 'transport' && key !== 'webServer' && key !== 'auth' && 'type' in (value as any) && !key.startsWith('visitor'));
    if (isProxy) {
      const name = (value as any).name || key.replace(/^proxy[/.]/, '');
      proxies.push(normalizeProxy(value as Record<string, any>, name));
    }
  }
  return proxies;
}

function normalizeProxy(raw: Record<string, any>, fallbackName?: string): FrpcProxy {
  return {
    name: raw.name || fallbackName || '',
    type: raw.type || 'tcp',
    localIP: raw.localIP || raw.local_ip || '127.0.0.1',
    localPort: raw.localPort || raw.local_port || 80,
    remotePort: raw.remotePort || raw.remote_port || 0,
    customDomains: Array.isArray(raw.customDomains || raw.custom_domains) ? raw.customDomains || raw.custom_domains : (raw.customDomains || raw.custom_domains || '').split(',').filter(Boolean),
    subdomain: raw.subdomain || '',
    bandwidthLimit: raw.bandwidthLimit || raw.bandwidth_limit || '',
    bandwidthLimitMode: raw.bandwidthLimitMode || raw.bandwidth_limit_mode || 'client',
    proxyProtocolVersion: raw.proxyProtocolVersion || raw.proxy_protocol_version || '',
    useEncryption: raw.useEncryption || raw.use_encryption || false,
    useCompression: raw.useCompression || raw.use_compression || false,
    group: raw.group || '',
    groupKey: raw.groupKey || raw.group_key || '',
    healthCheckType: raw.healthCheck?.type || raw.health_check_type || '',
    healthCheckInterval: raw.healthCheck?.interval || raw.health_check_interval_s || 10,
    healthCheckTimeout: raw.healthCheck?.timeout || raw.health_check_timeout_s || 3,
    healthCheckMaxFailed: raw.healthCheck?.maxFailed || raw.health_check_max_failed || 3,
    meta: raw.meta || {}
  };
}

function extractVisitors(raw: Record<string, any>): FrpcVisitor[] {
  const visitors: FrpcVisitor[] = [];
  if (Array.isArray(raw.visitors)) {
    return raw.visitors.map((v: any) => normalizeVisitor(v));
  }
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== 'object' || !value) continue;
    if (key.startsWith('visitor/') || key.startsWith('visitor.')) {
      const name = (value as any).name || key.replace(/^visitor[/.]/, '');
      visitors.push(normalizeVisitor(value as Record<string, any>, name));
    }
  }
  return visitors;
}

function normalizeVisitor(raw: Record<string, any>, fallbackName?: string): FrpcVisitor {
  return {
    name: raw.name || fallbackName || '',
    type: raw.type || 'stcp',
    serverName: raw.serverName || raw.server_name || '',
    bindAddr: raw.bindAddr || raw.bind_addr || '127.0.0.1',
    bindPort: raw.bindPort || raw.bind_port || 0,
    secretKey: raw.secretKey || raw.sk || ''
  };
}

function frpcToToml(c: FrpcClientConfig): Record<string, any> {
  const obj: Record<string, any> = {
    serverAddr: c.serverAddr,
    serverPort: Number(c.serverPort)
  };
  if (c.authMethod === 'token' && c.authToken) {
    obj.auth = { token: c.authToken };
  }
  if (c.user) obj.user = c.user;
  if (!c.loginFailExit) obj.loginFailExit = false;
  if (c.dnsServer) obj.dnsServer = c.dnsServer;
  if (c.logLevel !== 'info') obj.log = { ...obj.log, level: c.logLevel };
  if (c.logFile !== './frpc.log') obj.log = { ...obj.log, to: c.logFile };
  if (c.logMaxDays !== 3) obj.log = { ...obj.log, maxDays: Number(c.logMaxDays) };
  if (c.disableLogColor) obj.log = { ...obj.log, disablePrintColor: true };
  if (c.transport.protocol !== 'tcp' || c.transport.dialServerTimeout !== 10 || c.transport.dialServerKeepAlive !== 7200 || c.transport.poolCount !== 1 || !c.transport.tcpMux || c.transport.tcpMuxKeepaliveInterval !== 30) {
    obj.transport = {
      protocol: c.transport.protocol,
      dialServerTimeout: Number(c.transport.dialServerTimeout),
      dialServerKeepAlive: Number(c.transport.dialServerKeepAlive),
      poolCount: Number(c.transport.poolCount),
      tcpMux: c.transport.tcpMux,
      tcpMuxKeepaliveInterval: Number(c.transport.tcpMuxKeepaliveInterval)
    };
  }
  if (c.webServer.addr !== '127.0.0.1' || c.webServer.port !== 7400) {
    obj.webServer = { addr: c.webServer.addr, port: Number(c.webServer.port) };
  }
  if (c.proxies.length) obj.proxies = c.proxies.map(p => proxyToToml(p));
  if (c.visitors.length) obj.visitors = c.visitors.map(v => visitorToToml(v));
  return obj;
}

function proxyToToml(p: FrpcProxy): Record<string, any> {
  const obj: Record<string, any> = {
    name: p.name,
    type: p.type
  };
  if (p.localIP !== '127.0.0.1') obj.localIP = p.localIP;
  if (p.localPort != 80) obj.localPort = Number(p.localPort);
  if ((p.type === 'tcp' || p.type === 'udp' || p.type === 'stcp' || p.type === 'sudp') && p.remotePort) obj.remotePort = Number(p.remotePort);
  if (p.type === 'http' || p.type === 'https') {
    if (p.customDomains.length) obj.customDomains = p.customDomains;
    if (p.subdomain) obj.subdomain = p.subdomain;
  }
  if (p.bandwidthLimit) obj.bandwidthLimit = p.bandwidthLimit;
  if (p.bandwidthLimitMode && p.bandwidthLimitMode !== 'client') obj.bandwidthLimitMode = p.bandwidthLimitMode;
  if (p.proxyProtocolVersion) obj.proxyProtocolVersion = p.proxyProtocolVersion;
  if (p.useEncryption) obj.useEncryption = true;
  if (p.useCompression) obj.useCompression = true;
  if (p.group) obj.group = p.group;
  if (p.groupKey) obj.groupKey = p.groupKey;
  if (p.healthCheckType) obj.healthCheck = { type: p.healthCheckType, interval: p.healthCheckInterval, timeout: p.healthCheckTimeout, maxFailed: p.healthCheckMaxFailed };
  if (Object.keys(p.meta).length) obj.meta = p.meta;
  return obj;
}

function visitorToToml(v: FrpcVisitor): Record<string, any> {
  return { name: v.name, type: v.type, serverName: v.serverName, bindAddr: v.bindAddr, bindPort: Number(v.bindPort), secretKey: v.secretKey };
}

function tomlStringify(obj: Record<string, any>): string {
  const { proxies, visitors, ...topLevel } = obj;
  let out = stripNumUnderscores(toml.stringify(topLevel as any));
  if (Array.isArray(proxies)) {
    for (const p of proxies) {
      out += '\n[[proxies]]\n' + stripNumUnderscores(toml.stringify(p as any));
    }
  }
  if (Array.isArray(visitors)) {
    for (const v of visitors) {
      out += '\n[[visitors]]\n' + stripNumUnderscores(toml.stringify(v as any));
    }
  }
  return out;
}

function stripNumUnderscores(tomlStr: string): string {
  return tomlStr.replace(/\b(\d[\d_]*\d)\b/g, m => m.replace(/_/g, ''));
}
