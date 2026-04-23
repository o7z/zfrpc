<script lang="ts">
  import { page } from '$app/stores';
  import '../app.css';
  import type { LayoutData } from './$types';
  import { Zap, LayoutDashboard, Settings, LogOut, Folder, FileText, FolderSearch, Save } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import Modal from '$lib/components/Modal.svelte';

  let { data, children }: { data: LayoutData; children: any } = $props();

  const navItems = [
    { path: '/', label: '主页', icon: LayoutDashboard },
    { path: '/config', label: '配置管理', icon: Settings }
  ];

  function isActive(path: string): boolean {
    return $page.url.pathname === path;
  }

  let settingsDialogOpen = $state(false);
  let settings = $state({
    frpcPath: '',
    frpcDir: '',
    frpcStartup: false,
    activeFrpcConfig: '',
    hasPassword: false
  });
  let saved = $state(false);
  let browsing = $state(false);
  let dirList = $state<{ name: string; isDir: boolean; path: string }[]>([]);
  let browseDir = $state('');
  let browseError = $state('');
  let frpcValidation = $state<{ valid: boolean; version?: string; error?: string } | null>(null);
  let validating = $state(false);
  let validateTimer: ReturnType<typeof setTimeout> | null = null;

  function openSettings() {
    loadSettings();
    settingsDialogOpen = true;
  }

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      settings = data;
    } catch {}
  }

  async function handleSave() {
    saved = false;
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      saved = true;
      setTimeout(() => saved = false, 3000);
    } catch {}
  }

  async function validatePath(path: string) {
    validating = true;
    try {
      const res = await fetch('/api/validate-frpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frpcPath: path })
      });
      frpcValidation = await res.json();
      if (frpcValidation?.valid && frpcValidation.resolvedPath) {
        settings.frpcPath = frpcValidation.resolvedPath;
      }
    } catch {
      frpcValidation = { valid: false, error: '验证请求失败' };
    } finally {
      validating = false;
    }
  }

  function onFrpcPathChange() {
    if (validateTimer) clearTimeout(validateTimer);
    frpcValidation = null;
    if (settings.frpcPath.trim()) {
      validateTimer = setTimeout(() => validatePath(settings.frpcPath), 500);
    }
  }

  async function browseDirectory(dir: string) {
    browseDir = dir;
    browseError = '';
    try {
      const res = await fetch(`/api/browse?path=${encodeURIComponent(dir)}`);
      const data = await res.json();
      if (data.error) {
        browseError = data.error;
        dirList = [];
      } else {
        dirList = data.entries || [];
      }
    } catch {
      browseError = '请求失败';
      dirList = [];
    }
  }

  function selectFrpcPath(file: string) {
    settings.frpcPath = file;
    browsing = false;
    validatePath(file);
  }

  $effect(() => {
    if (browsing && !browseDir) {
      browseDirectory(settings.frpcDir || '.');
    }
  });
</script>

{#if data.authenticated}
  <div class="app">
    <header class="topbar">
      <div class="topbar-brand"><Zap size={20} /> zfrpc</div>
      <nav class="topbar-nav">
        {#each navItems as item}
          <a href={item.path} class="nav-item" class:active={isActive(item.path)}>
            <item.icon size={16} />
            {item.label}
          </a>
        {/each}
      </nav>
      <div class="topbar-end">
        <button class="topbar-btn" onclick={openSettings} title="设置"><Settings size={16} /></button>
        {#if data.hasPassword}
          <a href="/api/auth/logout" class="topbar-btn" title="退出"><LogOut size={16} /></a>
        {/if}
      </div>
    </header>
    <main class="page-container">
      {@render children()}
    </main>
  </div>

  <Modal title="设置" bind:open={settingsDialogOpen}>
    {#if saved}
      <div class="success-banner">设置已保存</div>
    {/if}

    <div class="setting-item">
      <label>frpc 程序路径</label>
      <div class="path-input-row">
        <input type="text" bind:value={settings.frpcPath} oninput={onFrpcPathChange} placeholder="留空则从 PATH 查找 frpc" />
        <button onclick={() => { browsing = !browsing; if (browsing && !browseDir) browseDirectory(settings.frpcDir || '.'); }} class="btn-icon-browse" title="浏览"><FolderSearch size={16} /></button>
      </div>

      {#if validating}
        <p class="validation-info">验证中...</p>
      {:else if frpcValidation}
        {#if frpcValidation.valid}
          {#if frpcValidation.version}
            <p class="validation-success">✓ {frpcValidation.version}</p>
          {:else}
            <p class="validation-info">✓ {frpcValidation.error}</p>
          {/if}
        {:else}
          <p class="validation-error">✗ {frpcValidation.error}</p>
        {/if}
      {/if}

      <p class="hint">指定 frpc 可执行文件的完整路径，留空则从系统 PATH 查找</p>

      {#if browsing}
        <div class="browser">
          <div class="browser-header">
            <span class="browser-path">{browseDir}</span>
            <button onclick={() => browsing = false} class="btn-close">×</button>
          </div>
          {#if browseError}
            <p class="browser-error">{browseError}</p>
          {/if}
          <div class="browser-list">
            {#if dirList.length === 0 && !browseError}
              <p class="muted">空目录</p>
            {:else}
              {#if browseDir !== '.'}
                <button class="browser-item" onclick={() => {
                  const parent = browseDir.split(/[\\/]/).slice(0, -1).join('/') || '.';
                  browseDirectory(parent);
                }}><Folder size={14} /> ..</button>
              {/if}
              {#each dirList as entry}
                {#if entry.isDir}
                  <button class="browser-item" onclick={() => browseDirectory(entry.path)}><Folder size={14} /> {entry.name}</button>
                {:else if entry.name.startsWith('frpc')}
                  <button class="browser-item file" onclick={() => selectFrpcPath(entry.path)}><FileText size={14} /> {entry.name}</button>
                {/if}
              {/each}
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <div class="setting-item">
      <label>工作目录</label>
      <input type="text" bind:value={settings.frpcDir} placeholder="留空使用当前目录" />
      <p class="hint">配置文件扫描目录</p>
    </div>

    <div class="dialog-footer">
      <button onclick={handleSave} class="btn-icon-save" title="保存设置"><Save size={16} /></button>
    </div>
  </Modal>
{/if}

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .topbar {
    display: flex;
    align-items: center;
    height: var(--nav-height);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    padding: 0 1rem;
    flex-shrink: 0;
    gap: 1rem;
  }

  .topbar-brand {
    font-size: 1rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .topbar-nav {
    display: flex;
    gap: 0.25rem;
    flex: 1;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    border-radius: var(--radius);
    color: var(--color-text-muted);
    font-size: 0.9rem;
    transition: all 0.15s;
  }

  .nav-item:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .nav-item.active {
    background: var(--color-primary);
    color: white;
  }

  .topbar-end {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
  }

  .topbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 0.6rem;
    color: var(--color-text-muted);
    border-radius: var(--radius);
    border: none;
    background: none;
    cursor: pointer;
  }

  .topbar-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .page-container {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }

  .dialog-footer {
    padding: 0.75rem 0;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: flex-end;
  }

  .setting-item {
    margin-bottom: 1rem;
  }

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

  .btn-icon-save:hover { background: var(--color-primary-hover); }

  .path-input-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .path-input-row input { flex: 1; }

  .btn-icon-browse {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .btn-icon-browse:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: var(--color-surface-hover);
  }

  .validation-info { color: var(--color-text-muted); font-size: 0.8rem; margin-top: 0.35rem; }
  .validation-success { color: var(--color-success); font-size: 0.8rem; margin-top: 0.35rem; }
  .validation-error { color: var(--color-error); font-size: 0.8rem; margin-top: 0.35rem; }

  .browser {
    margin-top: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: var(--color-bg);
    max-height: 200px;
    overflow-y: auto;
  }

  .browser-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4rem 0.6rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .browser-path {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-close {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 1.1rem;
    cursor: pointer;
    padding: 0 0.25rem;
  }

  .browser-error { color: var(--color-error); padding: 0.4rem; font-size: 0.8rem; }
  .browser-list { padding: 0.2rem; }

  .browser-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
    text-align: left;
    padding: 0.3rem 0.4rem;
    background: none;
    border: none;
    color: var(--color-text);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .browser-item:hover { background: var(--color-surface-hover); }
  .browser-item.file { color: var(--color-success); }
</style>
