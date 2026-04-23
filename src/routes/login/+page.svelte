<script lang="ts">
  import { onMount } from 'svelte';

  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  onMount(async () => {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      if (!data.hasPassword) {
        window.location.href = '/';
      }
    } catch {}
  });

  async function handleSubmit() {
    if (!password) return;
    loading = true;
    error = '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        window.location.href = '/';
      } else {
        error = '密码错误';
      }
    } catch {
      error = '网络错误，请重试';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>登录 - zfrpc</title>
</svelte:head>

<div class="login-container">
  <div class="login-card card">
    <h1>zfrpc</h1>
    <p class="subtitle">输入访问密码</p>
    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <input
        type="password"
        bind:value={password}
        placeholder="密码"
        autocomplete="current-password"
      />
      {#if error}
        <p class="error">{error}</p>
      {/if}
      <button type="submit" disabled={loading || !password}>
        {loading ? '验证中...' : '登录'}
      </button>
    </form>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: var(--color-bg);
  }

  .login-card {
    padding: 2.5rem;
    width: 100%;
    max-width: 360px;
    text-align: center;
  }

  .login-card h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
  .subtitle { color: var(--color-text-muted); margin-bottom: 1.5rem; }
  .login-card form { display: flex; flex-direction: column; gap: 1rem; }
  .login-card input { padding: 0.75rem 1rem; font-size: 1rem; }
  .error { color: var(--color-error); font-size: 0.875rem; }
  .login-card button { padding: 0.75rem; border-radius: var(--radius); border: none; background: var(--color-primary); color: white; font-size: 1rem; font-weight: 500; }
  .login-card button:hover:not(:disabled) { background: var(--color-primary-hover); }
</style>
