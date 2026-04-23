<script lang="ts">
  let { checked = false, label = '', inline = false }: { checked: boolean; label?: string; inline?: boolean } = $props();
</script>

<label class="switch-label" class:inline>
  {#if label}<span class="switch-text">{label}</span>{/if}
  <button class="switch" class:on={checked} onclick={() => checked = !checked} role="switch" aria-checked={checked}>
    <span class="switch-thumb"></span>
  </button>
</label>