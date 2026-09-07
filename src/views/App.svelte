<script lang="ts">
  import type { ExtensionContext } from 'asyar-sdk/view';
  import type { ILogService } from 'asyar-sdk/contracts';
  import CepView from './CepView.svelte';
  import TrackingView from './TrackingView.svelte';

  interface Props {
    context: ExtensionContext;
    logger?: ILogService;
    initialTab?: 'cep' | 'tracking';
  }
  let { context, logger, initialTab = 'cep' }: Props = $props();

  let activeTab = $state<'cep' | 'tracking'>('cep');

  $effect(() => {
    if (initialTab) {
      activeTab = initialTab;
    }
  });
</script>

<div class="app-root">
  <header class="app-header">
    <div class="brand">
      <span class="brand-icon">📮</span>
      <div class="brand-text">
        <h1 class="brand-title">Correios & CEP</h1>
        <span class="brand-sub">Utilitários para o dia a dia</span>
      </div>
    </div>

    <nav class="tabs-nav">
      <button
        class="tab-btn {activeTab === 'cep' ? 'active' : ''}"
        onclick={() => (activeTab = 'cep')}
      >
        <asyar-icon name="map-pin" size="14"></asyar-icon>
        Buscar CEP
      </button>
      <button
        class="tab-btn {activeTab === 'tracking' ? 'active' : ''}"
        onclick={() => (activeTab = 'tracking')}
      >
        <asyar-icon name="box" size="14"></asyar-icon>
        Rastrear Encomenda
      </button>
    </nav>
  </header>

  <main class="app-content">
    {#if activeTab === 'cep'}
      <CepView {context} />
    {:else}
      <TrackingView {context} />
    {/if}
  </main>
</div>

<style>
  .app-root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding: 16px 20px;
    background: var(--bg-primary, #0b0e14);
    color: var(--text-primary, #ffffff);
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 14px;
    margin-bottom: 18px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-icon {
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }

  .brand-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .brand-title {
    font-size: 16px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.01em;
    color: var(--text-primary, #ffffff);
  }

  .brand-sub {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
  }

  .tabs-nav {
    display: flex;
    gap: 4px;
    background: rgba(255, 255, 255, 0.04);
    padding: 4px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tab-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.05);
  }

  .tab-btn.active {
    background: #0070f3;
    color: #ffffff;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 112, 243, 0.35);
  }

  .app-content {
    flex: 1;
  }
</style>
