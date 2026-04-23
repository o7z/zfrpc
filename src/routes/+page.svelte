<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Switch from '$lib/components/Switch.svelte';

  let status = $state({ running: false });
  let configPath = $state<string | null>(null);
  let actionLoading = $state<string | null>(null);
  let statusEventSource: EventSource | null = null;
  let logEventSource: EventSource | null = null;
  let configs = $state<{ name: string; path: string }[]>([]);

  let logs = $state<LogEntry[]>([]);
  let levelFilter = $state('all');
  let autoScroll = $state(true);
  let logContainer: HTMLElement | null = null;

  interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    source?: 'frpc' | 'zfrpc';
  }

  async function handleAction(action: string) {
    actionLoading = action;
    try {
      await fetch('/api/frpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, configPath })
      });
    } finally {
      actionLoading = null;
    }
  }

  function formatUptime(ms?: number): string {
    if (!ms) return '-';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }

  function scrollToBottom() {
    if (autoScroll && logContainer) {
      setTimeout(() => logContainer?.scrollTo(0, logContainer.scrollHeight), 50);
    }
  }

  function getFilteredLogs(): LogEntry[] {
    let result = logs;
    if (levelFilter !== 'all') result = result.filter(l => l.level === levelFilter);
    return result;
  }

  async function loadConfigs() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      configs = data.configs || [];
      if (!configPath && configs.length > 0) {
        configPath = configs[0].path;
      }
    } catch {}
  }

  onMount(() => {
    loadConfigs();

    statusEventSource = new EventSource('/api/events/status');
    statusEventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        status = data.status;
        if (data.configPath) configPath = data.configPath;
      } catch {}
    };

    logEventSource = new EventSource('/api/events/logs');
    logEventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'init') {
          logs = data.logs || [];
          scrollToBottom();
        } else if (data.type === 'log') {
          logs = [...logs, data.entry];
          scrollToBottom();
        }
      } catch {}
    };
  });

  onDestroy(() => {
    statusEventSource?.close();
    logEventSource?.close();
  });
</script>

<div class="home">
  <div class="status-bar card">
    <div class="status-left">
      <h2>frpc</h2>
      <span class={`badge ${status.running ? 'running' : 'stopped'}`}>
        {status.running ? '运行中' : '已停止'}
      </span>
      {#if status.running}
        <span class="status-info">PID: {status.pid || '-'}</span>
        <span class="status-info">运行时长: {formatUptime(status.uptime)}</span>
        <span class="status-info">配置: {configPath}</span>
      {:else}
        {#if configs.length > 0}
          <select bind:value={configPath} class="config-select">
            {#each configs as c}
              <option value={c.path}>{c.name}</option>
            {/each}
          </select>
        {:else}
          <span class="status-info muted">未找到配置文件</span>
        {/if}
      {/if}
    </div>
    <div class="actions">
      {#if status.running}
        <button class="btn-stop" onclick={() => handleAction('stop')} disabled={!!actionLoading}>
          {actionLoading === 'stop' ? '停止中...' : '停止'}
        </button>
        <button class="btn-restart" onclick={() => handleAction('restart')} disabled={!!actionLoading}>
          {actionLoading === 'restart' ? '重启中...' : '重启'}
        </button>
      {:else}
        <button class="btn-start" onclick={() => handleAction('start')} disabled={!!actionLoading || !configPath}>
          {actionLoading === 'start' ? '启动中...' : '启动'}
        </button>
      {/if}
    </div>
  </div>

  <div class="logs-section">
    <div class="logs-toolbar">
      <h2>日志</h2>
      <select bind:value={levelFilter} class="level-select">
        <option value="all">全部级别</option>
        <option value="info">INFO</option>
        <option value="warn">WARN</option>
        <option value="error">ERROR</option>
        <option value="debug">DEBUG</option>
      </select>
      <Switch bind:checked={autoScroll} label="自动滚动" inline />
    </div>
    <div class="logs-container" bind:this={logContainer}>
      {#each getFilteredLogs() as log}
        <div class={`log-line log-${log.level}`}>
          <span class="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
          <span class="log-level">[{log.level.toUpperCase().padEnd(5)}]</span>
          {#if log.source === 'zfrpc'}
            <span class="log-source zfrpc">zfrpc</span>
          {/if}
          <span class="log-msg">{log.message}</span>
        </div>
      {/each}
      {#if getFilteredLogs().length === 0}
        <p class="muted">暂无日志</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .home {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
    overflow: hidden;
  }

  .status-bar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: nowrap;
    padding: 0.75rem 1rem;
  }

  .status-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: nowrap;
    overflow: hidden;
  }

  .status-left h2 {
    margin: 0;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .badge {
    flex-shrink: 0;
  }

  .status-info {
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .config-select {
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.85rem;
    width: auto;
    min-width: 0;
    flex-shrink: 1;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .logs-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .logs-toolbar {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
    margin-bottom: 0.5rem;
  }

  .logs-toolbar h2 {
    margin-bottom: 0;
    white-space: nowrap;
  }

  .level-select {
    padding: 0.35rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.85rem;
  }

  .logs-container {
    flex: 1;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.6rem;
    overflow-y: auto;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    min-height: 0;
  }

  .log-source {
    padding: 0 0.3rem;
    border-radius: 3px;
    font-size: 0.65rem;
    font-weight: 600;
    white-space: nowrap;
    line-height: 1.4;
  }

  .log-source.zfrpc {
    background: rgba(99, 102, 241, 0.2);
    color: var(--color-primary-hover);
  }
</style>
