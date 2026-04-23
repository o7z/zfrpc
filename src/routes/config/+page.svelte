<script lang="ts">
  import { onMount } from 'svelte';
  import Switch from '$lib/components/Switch.svelte';
  import { Plus, Trash2, Save, Copy } from 'lucide-svelte';
  import Modal from '$lib/components/Modal.svelte';

  interface ConfigFile {
    name: string;
    path: string;
    format: 'toml';
  }

  let configs = $state<ConfigFile[]>([]);
  let selectedConfig = $state<ConfigFile | null>(null);
  let preview = $state('');
  let saving = $state(false);
  let message = $state<string | null>(null);
  let error = $state<string | null>(null);
  let serverCollapsed = $state(false);

  let frpcForm = $state({
    serverAddr: '127.0.0.1', serverPort: 7000, authMethod: 'token', authToken: '',
    user: '', loginFailExit: true, logLevel: 'info', logFile: './frpc.log',
    logMaxDays: 3, disableLogColor: false, dnsServer: '',
    transportProtocol: 'tcp', dialServerTimeout: 10, dialServerKeepAlive: 7200,
    poolCount: 1, tcpMux: true, tcpMuxKeepaliveInterval: 30,
    webAddr: '127.0.0.1', webPort: 7400,
    proxies: [] as any[], visitors: [] as any[]
  });

  function domainsText(proxy: any): string {
    return Array.isArray(proxy.customDomains) ? proxy.customDomains.join(', ') : '';
  }

  function setDomainsFromText(proxy: any, text: string) {
    proxy.customDomains = text.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  function metaText(proxy: any): string {
    if (!proxy.meta || typeof proxy.meta !== 'object') return '';
    return Object.entries(proxy.meta).map(([k, v]) => `${k}=${v}`).join(', ');
  }

  function setMetaFromText(proxy: any, text: string) {
    const meta: Record<string, string> = {};
    text.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((pair: string) => {
      const eq = pair.indexOf('=');
      if (eq > 0) meta[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
    });
    proxy.meta = meta;
  }

  async function loadConfigs() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      configs = data.configs || [];
      if (configs.length > 0) await selectConfig(configs[0]);
    } catch {}
  }

  async function selectConfig(config: ConfigFile) {
    selectedConfig = config;
    message = null;
    error = null;

    try {
      const res = await fetch(`/api/config?path=${encodeURIComponent(config.path)}`);
      const data = await res.json();
      preview = data.preview || '';

      if (data.config) {
        const c = data.config;
        frpcForm = {
          serverAddr: c.serverAddr || '127.0.0.1',
          serverPort: c.serverPort || 7000,
          authMethod: c.authMethod || 'token',
          authToken: c.authToken || '',
          user: c.user || '',
          loginFailExit: c.loginFailExit !== undefined ? c.loginFailExit : true,
          logLevel: c.logLevel || 'info',
          logFile: c.logFile || './frpc.log',
          logMaxDays: c.logMaxDays || 3,
          disableLogColor: c.disableLogColor || false,
          dnsServer: c.dnsServer || '',
          transportProtocol: c.transport?.protocol || 'tcp',
          dialServerTimeout: c.transport?.dialServerTimeout || 10,
          dialServerKeepAlive: c.transport?.dialServerKeepAlive || 7200,
          poolCount: c.transport?.poolCount || 1,
          tcpMux: c.transport?.tcpMux !== undefined ? c.transport.tcpMux : true,
          tcpMuxKeepaliveInterval: c.transport?.tcpMuxKeepaliveInterval || 30,
          webAddr: c.webServer?.addr || '127.0.0.1',
          webPort: c.webServer?.port || 7400,
          proxies: (c.proxies || []).map((p: any) => ({
            name: p.name || '', type: p.type || 'tcp',
            localIP: p.localIP || '127.0.0.1', localPort: p.localPort || 80,
            remotePort: p.remotePort || 0,
            customDomains: Array.isArray(p.customDomains) ? p.customDomains : [],
            subdomain: p.subdomain || '',
            bandwidthLimit: p.bandwidthLimit || '',
            bandwidthLimitMode: p.bandwidthLimitMode || 'client',
            proxyProtocolVersion: p.proxyProtocolVersion || '',
            useEncryption: p.useEncryption || false,
            useCompression: p.useCompression || false,
            group: p.group || '', groupKey: p.groupKey || '',
            healthCheckType: p.healthCheckType || '',
            healthCheckInterval: p.healthCheckInterval || 10,
            healthCheckTimeout: p.healthCheckTimeout || 3,
            healthCheckMaxFailed: p.healthCheckMaxFailed || 3,
            meta: p.meta || {},
            _collapsed: { domains: true, bandwidth: true, loadbalance: true, healthcheck: true, meta: true }
          })),
          visitors: c.visitors || []
        };
      }
    } catch {}
  }

  async function handleSave() {
    if (!selectedConfig) return;
    saving = true;
    message = null;
    error = null;

    try {
      const config = {
        serverAddr: frpcForm.serverAddr, serverPort: frpcForm.serverPort,
        authMethod: frpcForm.authMethod, authToken: frpcForm.authToken,
        user: frpcForm.user, loginFailExit: frpcForm.loginFailExit,
        logLevel: frpcForm.logLevel, logFile: frpcForm.logFile,
        logMaxDays: frpcForm.logMaxDays, disableLogColor: frpcForm.disableLogColor,
        dnsServer: frpcForm.dnsServer,
        transport: {
          protocol: frpcForm.transportProtocol, dialServerTimeout: frpcForm.dialServerTimeout,
          dialServerKeepAlive: frpcForm.dialServerKeepAlive, poolCount: frpcForm.poolCount,
          tcpMux: frpcForm.tcpMux, tcpMuxKeepaliveInterval: frpcForm.tcpMuxKeepaliveInterval
        },
        webServer: { addr: frpcForm.webAddr, port: frpcForm.webPort },
        proxies: frpcForm.proxies, visitors: frpcForm.visitors
      };

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', filePath: selectedConfig.path, config })
      });
      const data = await res.json();
      if (data.success) {
        message = '配置已保存';
        if (data.preview) preview = data.preview;
      } else {
        error = data.error;
      }
    } finally {
      saving = false;
    }
  }

  async function createConfig() {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' })
      });
      const data = await res.json();
      if (data.success && data.config) {
        configs.push(data.config);
        await selectConfig(data.config);
      }
    } catch {}
  }

  function addProxy() {
    frpcForm.proxies.push({
      name: '', type: 'tcp', localIP: '127.0.0.1', localPort: 80, remotePort: 0,
      customDomains: [], subdomain: '', bandwidthLimit: '', bandwidthLimitMode: 'client',
      proxyProtocolVersion: '', useEncryption: false, useCompression: false,
      group: '', groupKey: '', healthCheckType: '', healthCheckInterval: 10,
      healthCheckTimeout: 3, healthCheckMaxFailed: 3, meta: {},
      _collapsed: { domains: true, bandwidth: true, loadbalance: true, healthcheck: true, meta: true }
    });
  }

  function removeProxy(idx: number) {
    frpcForm.proxies.splice(idx, 1);
  }

  function addVisitor() {
    frpcForm.visitors.push({ name: '', type: 'stcp', serverName: '', bindAddr: '127.0.0.1', bindPort: 0, secretKey: '' });
  }

  function removeVisitor(idx: number) {
    frpcForm.visitors.splice(idx, 1);
  }

  let deleteDialogOpen = $state(false);

  function confirmDelete() {
    deleteDialogOpen = true;
  }

  async function deleteConfig() {
    if (!selectedConfig) return;
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', filePath: selectedConfig.path })
      });
      configs = configs.filter(c => c.path !== selectedConfig.path);
      deleteDialogOpen = false;
      selectedConfig = null;
    } catch {}
  }

  function copyPreview() {
    navigator.clipboard.writeText(preview || '');
  }

  onMount(() => { loadConfigs(); });
</script>

<svelte:head>
  <title>配置管理 - zfrpc</title>
</svelte:head>

<div class="config-page">
  <aside class="config-sidebar">
    <div class="sidebar-header">
      <h2>配置文件</h2>
      <button class="btn-new-config" onclick={createConfig} title="新建配置"><Plus size={16} /></button>
    </div>
    {#if configs.length === 0}
      <p class="muted">未找到配置文件</p>
      <p class="hint">点击 + 创建新配置</p>
    {:else}
      {#each configs as config}
        <div class="config-row">
          <button class="config-item" class:selected={selectedConfig?.path === config.path} onclick={() => selectConfig(config)}>
            <span class="config-name">{config.name}</span>
          </button>
        </div>
      {/each}
    {/if}
  </aside>

  {#if selectedConfig}
    <div class="config-main">
      <div class="config-main-header">
        <h2>表单编辑</h2>
        <div class="header-actions">
          <button onclick={confirmDelete} class="btn-icon-delete" title="删除配置"><Trash2 size={16} /></button>
          <button onclick={handleSave} disabled={saving} class="btn-icon-save" title="保存"><Save size={16} /></button>
        </div>
      </div>

      {#if message}
        <div class="success-banner">{message}</div>
      {/if}
      {#if error}
        <div class="error-banner">{error}</div>
      {/if}

      <div class="config-main-body">
        <div class="server-config" class:collapsed={serverCollapsed}>
          <button type="button" class="section-toggle" onclick={() => serverCollapsed = !serverCollapsed}>
            <h3>服务器配置</h3>
            <span class="toggle-icon">{serverCollapsed ? '▶' : '▼'}</span>
          </button>
          {#if !serverCollapsed}
            <div class="form-section" style="border-bottom: none; margin-bottom: 0;">
              <div class="form-grid">
                <label>服务器地址 <input type="text" bind:value={frpcForm.serverAddr} /></label>
                <label>服务器端口 <input type="number" bind:value={frpcForm.serverPort} /></label>
                <label>认证方式
                  <select bind:value={frpcForm.authMethod}>
                    <option value="token">Token</option>
                    <option value="oidc">OIDC</option>
                    <option value="">无</option>
                  </select>
                </label>
                <label>认证 Token <input type="text" bind:value={frpcForm.authToken} /></label>
                <label>用户名 <input type="text" bind:value={frpcForm.user} /></label>
              </div>
            </div>
            <div class="form-section" style="border-bottom: none; margin-bottom: 0;">
              <h3>传输配置</h3>
              <div class="form-grid">
                <label>协议
                  <select bind:value={frpcForm.transportProtocol}>
                    <option value="tcp">TCP</option>
                    <option value="kcp">KCP</option>
                    <option value="quic">QUIC</option>
                    <option value="websocket">WebSocket</option>
                  </select>
                </label>
                <label>连接池大小 <input type="number" bind:value={frpcForm.poolCount} /></label>
                <label>连接超时(s) <input type="number" bind:value={frpcForm.dialServerTimeout} /></label>
                <label>保活间隔(s) <input type="number" bind:value={frpcForm.dialServerKeepAlive} /></label>
                <label>TCP 多路复用 <Switch bind:checked={frpcForm.tcpMux} /></label>
                <label>多路复用保活(s) <input type="number" bind:value={frpcForm.tcpMuxKeepaliveInterval} /></label>
              </div>
            </div>
            <div class="form-section" style="border-bottom: none; margin-bottom: 0;">
              <h3>日志配置</h3>
              <div class="form-grid">
                <label>日志级别
                  <select bind:value={frpcForm.logLevel}>
                    <option value="trace">Trace</option>
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warn</option>
                    <option value="error">Error</option>
                  </select>
                </label>
                <label>日志文件 <input type="text" bind:value={frpcForm.logFile} /></label>
                <label>保留天数 <input type="number" bind:value={frpcForm.logMaxDays} /></label>
                <label>禁用颜色 <Switch bind:checked={frpcForm.disableLogColor} /></label>
              </div>
            </div>
          {/if}
        </div>

        <div class="proxy-list">
          <div class="proxy-list-header">
            <h3>代理列表 ({frpcForm.proxies.length})</h3>
          </div>
          <div class="proxy-list-scroll">
            {#each frpcForm.proxies as proxy, idx}
              <div class="proxy-card">
                <div class="proxy-header">
                  <span>代理 #{idx + 1}</span>
                  <button class="btn-icon-remove" onclick={() => removeProxy(idx)} title="删除"><Trash2 size={14} /></button>
                </div>
                <div class="form-grid">
                  <label>名称 <input type="text" bind:value={proxy.name} /></label>
                  <label>类型
                    <select bind:value={proxy.type}>
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                      <option value="stcp">STCP</option>
                      <option value="sudp">SUDP</option>
                      <option value="tcpmux">TCPMUX</option>
                    </select>
                  </label>
                  <label>本地 IP <input type="text" bind:value={proxy.localIP} /></label>
                  <label>本地端口 <input type="number" bind:value={proxy.localPort} /></label>
                  {#if proxy.type === 'tcp' || proxy.type === 'udp' || proxy.type === 'stcp' || proxy.type === 'sudp'}
                  <label>远程端口 <input type="number" bind:value={proxy.remotePort} /></label>
                  {/if}
                  <label>加密 <Switch bind:checked={proxy.useEncryption} /></label>
                  <label>压缩 <Switch bind:checked={proxy.useCompression} /></label>
                </div>
                {#if proxy.type === 'http' || proxy.type === 'https'}
                <div class="proxy-field-group">
                  <button type="button" class="section-toggle" onclick={() => proxy._collapsed.domains = !proxy._collapsed.domains}>
                    <h4>域名配置</h4>
                    <span class="toggle-icon">{proxy._collapsed.domains ? '▶' : '▼'}</span>
                  </button>
                  {#if !proxy._collapsed.domains}
                  <div class="form-grid">
                    <label>自定义域名 <input type="text" value={domainsText(proxy)} oninput={(e: any) => setDomainsFromText(proxy, e.target.value)} placeholder="多个域名用逗号分隔" /></label>
                    <label>子域名 <input type="text" bind:value={proxy.subdomain} /></label>
                  </div>
                  {/if}
                </div>
                {/if}
                <div class="proxy-field-group">
                  <button type="button" class="section-toggle" onclick={() => proxy._collapsed.bandwidth = !proxy._collapsed.bandwidth}>
                    <h4>带宽与协议</h4>
                    <span class="toggle-icon">{proxy._collapsed.bandwidth ? '▶' : '▼'}</span>
                  </button>
                  {#if !proxy._collapsed.bandwidth}
                  <div class="form-grid">
                    <label>带宽限制 <input type="text" bind:value={proxy.bandwidthLimit} placeholder="如 100MB" /></label>
                    <label>带宽限制模式
                      <select bind:value={proxy.bandwidthLimitMode}>
                        <option value="client">Client</option>
                        <option value="server">Server</option>
                      </select>
                    </label>
                    <label>代理协议版本
                      <select bind:value={proxy.proxyProtocolVersion}>
                        <option value="">无</option>
                        <option value="v1">V1</option>
                        <option value="v2">V2</option>
                      </select>
                    </label>
                  </div>
                  {/if}
                </div>
                <div class="proxy-field-group">
                  <button type="button" class="section-toggle" onclick={() => proxy._collapsed.loadbalance = !proxy._collapsed.loadbalance}>
                    <h4>负载均衡</h4>
                    <span class="toggle-icon">{proxy._collapsed.loadbalance ? '▶' : '▼'}</span>
                  </button>
                  {#if !proxy._collapsed.loadbalance}
                  <div class="form-grid">
                    <label>分组 <input type="text" bind:value={proxy.group} /></label>
                    <label>分组密钥 <input type="text" bind:value={proxy.groupKey} /></label>
                  </div>
                  {/if}
                </div>
                <div class="proxy-field-group">
                  <button type="button" class="section-toggle" onclick={() => proxy._collapsed.healthcheck = !proxy._collapsed.healthcheck}>
                    <h4>健康检查</h4>
                    <span class="toggle-icon">{proxy._collapsed.healthcheck ? '▶' : '▼'}</span>
                  </button>
                  {#if !proxy._collapsed.healthcheck}
                  <div class="form-grid">
                    <label>检查类型
                      <select bind:value={proxy.healthCheckType}>
                        <option value="">无</option>
                        <option value="tcp">TCP</option>
                        <option value="http">HTTP</option>
                      </select>
                    </label>
                    <label>检查间隔(s) <input type="number" bind:value={proxy.healthCheckInterval} /></label>
                    <label>超时(s) <input type="number" bind:value={proxy.healthCheckTimeout} /></label>
                    <label>最大失败次数 <input type="number" bind:value={proxy.healthCheckMaxFailed} /></label>
                  </div>
                  {/if}
                </div>
                <div class="proxy-field-group">
                  <button type="button" class="section-toggle" onclick={() => proxy._collapsed.meta = !proxy._collapsed.meta}>
                    <h4>元数据</h4>
                    <span class="toggle-icon">{proxy._collapsed.meta ? '▶' : '▼'}</span>
                  </button>
                  {#if !proxy._collapsed.meta}
                  <div class="form-grid">
                    <label>自定义元数据 <input type="text" value={metaText(proxy)} oninput={(e: any) => setMetaFromText(proxy, e.target.value)} placeholder="key1=val1, key2=val2" /></label>
                  </div>
                  {/if}
                </div>
              </div>
            {/each}
            <button class="btn-add-proxy" onclick={addProxy}><Plus size={14} /> 添加代理</button>
          </div>
        </div>

        <div class="visitor-list">
          <div class="visitor-list-header">
            <h3>访问者列表 ({frpcForm.visitors.length})</h3>
          </div>
          {#each frpcForm.visitors as visitor, idx}
            <div class="proxy-card">
              <div class="proxy-header">
                <span>访问者 #{idx + 1}</span>
                <button class="btn-icon-remove" onclick={() => removeVisitor(idx)} title="删除"><Trash2 size={14} /></button>
              </div>
              <div class="form-grid">
                <label>名称 <input type="text" bind:value={visitor.name} /></label>
                <label>类型
                  <select bind:value={visitor.type}>
                    <option value="stcp">STCP</option>
                    <option value="sudp">SUDP</option>
                    <option value="xtcp">XTCP</option>
                  </select>
                </label>
                <label>服务名称 <input type="text" bind:value={visitor.serverName} /></label>
                <label>绑定地址 <input type="text" bind:value={visitor.bindAddr} /></label>
                <label>绑定端口 <input type="number" bind:value={visitor.bindPort} /></label>
                <label>密钥 <input type="text" bind:value={visitor.secretKey} /></label>
              </div>
            </div>
          {/each}
          <button class="btn-add-proxy" onclick={addVisitor}><Plus size={14} /> 添加访问者</button>
        </div>
      </div>
    </div>

    <div class="config-preview">
      <h2>预览</h2>
      <div class="preview-container">
        <button class="btn-copy" onclick={copyPreview} title="复制"><Copy size={14} /></button>
        <pre>{preview || '无预览内容'}</pre>
      </div>
    </div>
  {:else}
    <div class="config-empty">
      <p>选择一个配置文件开始编辑</p>
    </div>
  {/if}
</div>

<Modal title="确认删除" bind:open={deleteDialogOpen} width="400px">
  <p>确定要删除配置文件 <strong>{selectedConfig?.name}</strong> 吗？此操作不可撤销。</p>
  <div class="dialog-footer">
    <button onclick={() => deleteDialogOpen = false} class="btn-cancel">取消</button>
    <button onclick={deleteConfig} class="btn-confirm-delete">删除</button>
  </div>
</Modal>

<style>
  .config-page { display: flex; height: 100%; overflow: hidden; }
  .config-sidebar { width: 240px; background: var(--color-surface); border-right: 1px solid var(--color-border); padding: 1rem; flex-shrink: 0; overflow-y: auto; }
  .sidebar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
  .sidebar-header h2 { font-size: 0.95rem; margin-bottom: 0; }
  .btn-new-config { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius); border: 1px solid var(--color-border); background: none; color: var(--color-text-muted); cursor: pointer; }
  .btn-new-config:hover { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-surface-hover); }
  .config-row { display: flex; align-items: center; gap: 0.25rem; margin-bottom: 0.25rem; }
  .config-item { display: flex; align-items: center; gap: 0.5rem; flex: 1; padding: 0.5rem; border-radius: var(--radius); cursor: pointer; background: none; border: none; color: var(--color-text); text-align: left; }
  .config-item:hover { background: var(--color-surface-hover); }
  .config-item.selected { background: var(--color-primary); color: white; }
  .config-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem; }
  .config-main { flex: 1; display: flex; flex-direction: column; min-width: 0; border-right: 1px solid var(--color-border); }
  .config-main-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
  .config-main-header h2 { font-size: 0.95rem; margin: 0; }

  .header-actions { display: flex; gap: 0.5rem; }

  .btn-icon-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius);
    border: none;
    background: var(--color-error);
    color: white;
    cursor: pointer;
  }

  .btn-icon-delete:hover { background: #dc2626; }

  .btn-icon-save {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius);
    border: none;
    background: var(--color-primary);
    color: white;
    cursor: pointer;
  }

  .btn-icon-save:hover:not(:disabled) { background: var(--color-primary-hover); }

  .config-main-body { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }

  .server-config { flex-shrink: 0; padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-border); overflow-y: auto; max-height: 50%; }
  .server-config.collapsed { max-height: none; overflow: visible; }
  .section-toggle { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; user-select: none; margin-bottom: 0.5rem; background: none; border: none; color: var(--color-text); font-family: inherit; padding: 0; }
  .section-toggle h3 { margin: 0; }
  .toggle-icon { font-size: 0.7rem; color: var(--color-text-muted); }

  .proxy-list { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; padding: 0.75rem 1rem; }
  .proxy-list-header { display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; margin-bottom: 0.5rem; }
  .proxy-list-header h3 { margin: 0; }
  .proxy-list-scroll { flex: 1; overflow-y: auto; min-height: 0; padding-bottom: 0.5rem; }

  .visitor-list { flex-shrink: 0; padding: 0.75rem 1rem; border-top: 1px solid var(--color-border); max-height: 30%; overflow-y: auto; }
  .visitor-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .visitor-list-header h3 { margin: 0; }

  .btn-add-proxy {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    width: 100%;
    padding: 0.6rem;
    border-radius: var(--radius);
    border: 1px dashed var(--color-border);
    background: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 0.8rem;
    margin-top: 0.5rem;
  }

  .btn-add-proxy:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .btn-icon-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: none;
    background: none;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .btn-icon-remove:hover { color: var(--color-error); background: rgba(239, 68, 68, 0.1); }

  .proxy-field-group { margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px dashed var(--color-border); }
  .proxy-field-group h4 { font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 0.3rem; font-weight: 700; }
  .proxy-field-group .section-toggle { display: flex; align-items: center; gap: 0.4rem; cursor: pointer; user-select: none; background: none; border: none; color: var(--color-text); font-family: inherit; padding: 0; margin-bottom: 0.3rem; }
  .proxy-field-group .section-toggle h4 { margin: 0; }
  .proxy-field-group .toggle-icon { font-size: 0.65rem; color: var(--color-text-muted); }

  .config-preview { width: 420px; flex-shrink: 0; display: flex; flex-direction: column; padding: 1rem; overflow: hidden; }
  .config-preview h2 { font-size: 0.95rem; margin-bottom: 0.5rem; flex-shrink: 0; }
  .preview-container { flex: 1; overflow: auto; min-height: 0; position: relative; }
  .btn-copy { position: absolute; top: 0.5rem; right: 0.5rem; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius); border: none; background: var(--color-surface); color: var(--color-text-muted); cursor: pointer; opacity: 0; transition: opacity 0.2s; z-index: 1; }
  .preview-container:hover .btn-copy { opacity: 1; }
  .btn-copy:hover { background: var(--color-surface-hover); color: var(--color-primary); }
  .config-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 0.9rem; }

  .dialog-footer { display: flex; justify-content: flex-end; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--color-border); margin-top: 1rem; }
  .btn-cancel { padding: 0.4rem 1rem; border-radius: var(--radius); border: 1px solid var(--color-border); background: none; color: var(--color-text); cursor: pointer; font-size: 0.85rem; }
  .btn-cancel:hover { background: var(--color-surface-hover); }
  .btn-confirm-delete { padding: 0.4rem 1rem; border-radius: var(--radius); border: none; background: var(--color-error); color: white; cursor: pointer; font-size: 0.85rem; }
  .btn-confirm-delete:hover { background: #dc2626; }
</style>
