#!/usr/bin/env node

import { createServer } from 'node:http';
// @ts-expect-error -- build output
import { handler } from '../build/handler.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const VERSION = '0.1.0';

function getDataDir(): string {
  if (process.env.ZFRPC_DIR) return process.env.ZFRPC_DIR;
  const home = os.homedir();
  switch (process.platform) {
    case 'win32': return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'zfrpc');
    case 'darwin': return path.join(home, 'Library', 'Application Support', 'zfrpc');
    default: return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'zfrpc');
  }
}

function ensureDataDir(): string {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function parseArgs(args: string[]) {
  const opts = {
    port: 11111,
    password: '',
    startup: false,
    stop: false,
    version: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-v' || arg === '--version') {
      opts.version = true;
    } else if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '-p' && args[i + 1]) {
      opts.port = parseInt(args[++i]);
    } else if (arg === '-w' && args[i + 1]) {
      opts.password = args[++i];
    } else if (arg === '--startup') {
      opts.startup = true;
    } else if (arg === '--stop') {
      opts.stop = true;
    }
  }

  return opts;
}

function showHelp() {
  console.log(`
zfrpc v${VERSION} - 本地 frpc 进程与配置管理服务

用法:
  zfrpc [选项]

选项:
  -v, --version      显示版本
  -h, --help         显示帮助
  -p <port>          指定端口 (默认: 11111)
  -w <password>      设置访问密码
  --startup          设置开机自启
  --stop             停止服务

环境变量:
  ZFRPC_PORT         服务端口
  ZFRPC_PASSWORD     访问密码
  ZFRPC_FRPC_PATH    frpc 路径
  ZFRPC_DIR          工作目录
`);
}

async function setupStartup(extraArgs: string[]) {
  const platform = process.platform;
  const scriptPath = process.argv[1];
  const cmd = `node \\"${scriptPath}\\"${extraArgs.length ? ' ' + extraArgs.join(' ') : ''}`;

  if (platform === 'win32') {
    const { execSync } = await import('node:child_process');
    try {
      execSync(`schtasks /Create /TN "zfrpc" /TR "${cmd}" /SC ONLOGON /RL HIGHEST /F`, { stdio: 'inherit' });
      console.log(`开机自启已设置 (Windows 任务计划)`);
      console.log(`启动命令: ${cmd}`);
    } catch (err) {
      console.error('设置失败，请以管理员权限运行');
    }
  } else if (platform === 'linux') {
    const serviceContent = `[Unit]
Description=zfrpc - frpc management service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node ${scriptPath}${extraArgs.length ? ' ' + extraArgs.join(' ') : ''}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
`;
    try {
      const { execSync } = await import('node:child_process');
      fs.writeFileSync('/etc/systemd/system/zfrpc.service', serviceContent);
      execSync('systemctl daemon-reload', { stdio: 'inherit' });
      execSync('systemctl enable zfrpc', { stdio: 'inherit' });
      console.log('开机自启已设置 (systemd)');
    } catch (err) {
      console.error('设置失败，请以 sudo 权限运行');
    }
  } else {
    console.log(`不支持的平台: ${platform}`);
  }
}

async function stopService() {
  const pidFile = path.join(getDataDir(), '.zfrpc.pid');
  if (fs.existsSync(pidFile)) {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf-8'));
    try {
      process.kill(pid);
      fs.unlinkSync(pidFile);
      console.log('服务已停止');
    } catch {
      console.log('进程不存在');
    }
  } else {
    console.log('未找到运行中的服务');
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.version) {
    console.log(VERSION);
    return;
  }

  if (args.help) {
    showHelp();
    return;
  }

  if (args.stop) {
    await stopService();
    return;
  }

  if (args.startup) {
    const startupArgs = process.argv.slice(2).filter(a => a !== '--startup' && a !== '--stop');
    await setupStartup(startupArgs);
  }

  process.env.ZFRPC_PORT = String(args.port);
  if (args.password) {
    process.env.ZFRPC_PASSWORD = args.password;
  }
  process.env.ZFRPC_DIR = ensureDataDir();

  const pidFile = path.join(process.env.ZFRPC_DIR, '.zfrpc.pid');
  fs.writeFileSync(pidFile, String(process.pid));

  // Start server
  const server = createServer(async (req, res) => {
    await handler(req, res);
  });

  const port = args.port;
  server.listen(port, () => {
    console.log(`zfrpc v${VERSION}`);
    console.log(`服务已启动: http://localhost:${port}`);
    if (process.env.ZFRPC_PASSWORD) {
      console.log('访问密码已启用');
    }
  });

  async function shutdown() {
    try {
      // @ts-expect-error -- build output
      const { getManager } = await import('../build/server/chunks/state.js');
      getManager().forceStop();
    } catch {}
    try { fs.unlinkSync(pidFile); } catch {}
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(console.error);
