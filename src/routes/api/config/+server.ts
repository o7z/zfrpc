import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { scanConfigs, parseFrpcConfig, generateFrpcConfig, validateConfig, previewConfig, writeFile } from '$lib/server/config-parser';
import { getManager, addLog } from '$lib/server/state';
import { saveSettings, loadSettings } from '$lib/server/settings-store';
import * as path from 'node:path';
import * as fs from 'node:fs';

export const GET: RequestHandler = async ({ url }) => {
  const filePath = url.searchParams.get('path');

  if (filePath) {
    const config = parseFrpcConfig(filePath);
    if (!config) return json({ error: 'Failed to parse frpc config' }, { status: 400 });
    return json({ config, preview: previewConfig(filePath) });
  }

  const configs = scanConfigs();
  const settings = loadSettings();
  const activePath = getManager().getConfigPath() || settings.activeFrpcConfig;
  for (const c of configs) c.active = c.path === activePath;

  return json({ configs, activeFrpcConfig: settings.activeFrpcConfig });
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { action, filePath, config } = body;

  if (action === 'validate') {
    const error = validateConfig(config);
    return json({ valid: !error, error });
  }

  if (action === 'save' && filePath && config) {
    const content = generateFrpcConfig(config);
    const error = validateConfig(content);
    if (error) return json({ success: false, error }, { status: 400 });

    const success = writeFile(filePath, content);
    if (success) {
      addLog({ timestamp: new Date().toISOString(), level: 'info', message: `frpc 配置已保存: ${filePath}` });
      saveSettings({ activeFrpcConfig: filePath });
    }
    return json({ success, preview: success ? content : undefined });
  }

  if (action === 'setActive') {
    saveSettings({ activeFrpcConfig: filePath });
    return json({ success: true });
  }

  if (action === 'create') {
    const settings = loadSettings();
    const dir = settings.frpcDir || process.cwd();
    const template = `serverAddr = "127.0.0.1"
serverPort = 7000

[auth]
token = ""

[[proxies]]
name = "example-tcp"
type = "tcp"
localIP = "127.0.0.1"
localPort = 80
remotePort = 6000

[[proxies]]
name = "example-http"
type = "http"
localPort = 80
customDomains = ["your-domain.com"]
`;
    const filePath = path.join(dir, 'frpc.toml');
    let finalPath = filePath;
    let counter = 1;
    while (fs.existsSync(finalPath)) {
      finalPath = path.join(dir, `frpc-${counter}.toml`);
      counter++;
    }
    const success = writeFile(finalPath, template);
    if (success) {
      addLog({ timestamp: new Date().toISOString(), level: 'info', message: `新建配置文件: ${finalPath}` });
      const name = path.basename(finalPath, '.toml');
      return json({ success: true, config: { name, path: finalPath, format: 'toml' as const, active: false } });
    }
    return json({ success: false, error: '无法创建配置文件' }, { status: 500 });
  }

  return json({ error: 'Invalid action' }, { status: 400 });
};
