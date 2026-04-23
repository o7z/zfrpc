<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    open = $bindable(false),
    width = '520px',
    children
  }: {
    title: string;
    open?: boolean;
    width?: string;
    children: Snippet;
  } = $props();

  let dialog: HTMLDialogElement | null = $state(null);

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  function onBackdropClick(e: MouseEvent) {
    if (e.target === dialog) open = false;
  }

  function onClose() {
    open = false;
  }
</script>

<dialog bind:this={dialog} class="modal" style:max-width={width} onclick={onBackdropClick} onclose={onClose}>
  <div class="modal-content">
    <div class="modal-header">
      <h2>{title}</h2>
      <button class="modal-close" onclick={() => open = false}>×</button>
    </div>
    <div class="modal-body">
      {@render children()}
    </div>
  </div>
</dialog>

<style>
  .modal {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    color: var(--color-text);
    padding: 0;
    width: 90%;
    box-shadow: var(--shadow);
    margin: auto;
  }

  .modal::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }

  .modal-content {
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1rem;
  }

  .modal-close {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 1.3rem;
    cursor: pointer;
    padding: 0 0.25rem;
    line-height: 1;
  }

  .modal-close:hover {
    color: var(--color-text);
  }

  .modal-body {
    padding: 1.25rem;
    overflow-y: auto;
    max-height: 60vh;
  }
</style>
