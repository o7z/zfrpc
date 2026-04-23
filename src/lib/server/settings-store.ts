import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const CONFIG_FILE = 'zfrpc-config.json';

function getDefaultDataDir(): string {
  if (process.env.ZFRPC_DIR) return process.env.ZFRPC_DIR;
  const home = process.env.HOME || process.env.USERPROFILE || '';
  switch (process.platform) {
    case 'win32': return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'zfrpc');
    case 'darwin': return path.join(home, 'Library', 'Application Support', 'zfrpc');
    default: return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'zfrpc');
  }
}

function ensureDataDir(): string {
  const dir = getDefaultDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export interface ZfrpcSettings {
  frpcPath: string;
  frpcDir: string;
  frpcStartup: boolean;
}

const DEFAULTS: ZfrpcSettings = {
  frpcPath: '',
  frpcDir: '',
  frpcStartup: false,
};

export function loadSettings(): ZfrpcSettings {
  try {
    const configPath = path.join(ensureDataDir(), CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return { ...DEFAULTS, ...raw };
    }
  } catch {}
  return { ...DEFAULTS };
}

export function saveSettings(settings: Partial<ZfrpcSettings>): ZfrpcSettings {
  const current = loadSettings();
  const merged = { ...current, ...settings };
  try {
    const configPath = path.join(ensureDataDir(), CONFIG_FILE);
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
  } catch {}
  return merged;
}

export function getFrpcPath(): string {
  const settings = loadSettings();
  return settings.frpcPath || process.env.ZFRPC_FRPC_PATH || 'frpc';
}

export interface FrpcPathValidation {
  valid: boolean;
  version?: string;
  error?: string;
  resolvedPath?: string;
}

export function validateFrpcPath(frpcPath: string): FrpcPathValidation {
  if (!frpcPath || frpcPath.trim() === '') {
    return { valid: true, error: '留空则从 PATH 查找' };
  }

  let resolved = path.resolve(frpcPath);

  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    const exeName = process.platform === 'win32' ? 'frpc.exe' : 'frpc';
    const candidate = path.join(resolved, exeName);
    if (fs.existsSync(candidate)) {
      resolved = candidate;
    } else {
      return { valid: false, error: `目录下未找到 ${exeName}` };
    }
  }

  if (!fs.existsSync(resolved)) {
    return { valid: false, error: '文件不存在' };
  }

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    return { valid: false, error: '不是文件' };
  }

  if (process.platform === 'win32' && !/\.(exe|bat|cmd)$/i.test(resolved)) {
    return { valid: false, error: 'Windows 下需要 .exe 后缀' };
  }

  if (process.platform !== 'win32') {
    const mode = stat.mode;
    if (!(mode & 0o111)) {
      return { valid: false, error: '文件无执行权限' };
    }
  }

  try {
    const output = execSync(`"${resolved}" -v`, { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
    return { valid: true, version: output.trim(), resolvedPath: resolved };
  } catch {
    return { valid: false, error: '文件存在但无法执行' };
  }
}
