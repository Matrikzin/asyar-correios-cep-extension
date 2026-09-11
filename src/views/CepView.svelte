<script lang="ts">
  import {
    cleanCep,
    formatCep,
    isValidCep,
    fetchCep,
    formatFullAddress,
    type CepResult,
    type INetworkService,
  } from '../services/cepService';
  import type { ExtensionContext } from 'asyar-sdk/view';
  import type { IClipboardService, IFeedbackService, IStorageService } from 'asyar-sdk/contracts';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const feedback = $derived(context.getService<IFeedbackService>('feedback'));
  const storage = $derived(context.getService<IStorageService>('storage'));
  const network = $derived(context.getService<INetworkService>('network'));
  const clipboard = $derived(context.getService<IClipboardService>('clipboard'));

  let cepInput = $state('');
  let loading = $state(false);
  let errorMsg = $state<string | null>(null);
  let currentResult = $state<CepResult | null>(null);
  let recentCeps = $state<CepResult[]>([]);
  let copiedAddress = $state(false);
  let copiedCep = $state(false);

  // Sugestões rápidas
  const examples = [
    { label: 'Av. Paulista', cep: '01310-100' },
    { label: 'Praça da Sé', cep: '01001-000' },
    { label: 'Copacabana', cep: '22070-010' },
    { label: 'Brasília', cep: '70040-010' },
  ];

  // Carregar histórico salvo no storage
  $effect(() => {
    void (async () => {
      try {
        if (storage) {
          const raw = await storage.get('recent_ceps');
          if (raw && typeof raw === 'string') {
            recentCeps = JSON.parse(raw);
          }
        }
      } catch {}
    })();
  });

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const clean = cleanCep(target.value);
    cepInput = formatCep(clean);
    errorMsg = null;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (clean.length === 8) {
      debounceTimer = setTimeout(() => {
        void searchCep(clean);
      }, 200);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      const clean = cleanCep(cepInput);
      if (clean.length === 8) {
        void searchCep(clean);
      }
    }
  }

  async function searchCep(digits: string) {
    if (!isValidCep(digits)) {
      errorMsg = 'Digite um CEP completo com 8 números.';
      return;
    }

    loading = true;
    errorMsg = null;
    try {
      const res = await fetchCep(digits, network);
      currentResult = res;

      // Salvar no histórico
      try {
        const filtered = recentCeps.filter((c) => c.cep !== res.cep);
        recentCeps = [res, ...filtered.slice(0, 4)];
        if (storage) {
          await storage.set('recent_ceps', JSON.stringify(recentCeps));
        }
      } catch (storageErr) {
        console.warn('[Correios & CEP] Erro ao salvar histórico recente:', storageErr);
      }

      if (context.preferences?.values?.autoCopy) {
        await copyAddress(res);
      }
    } catch (err: any) {
      errorMsg = err.message || 'Não foi possível localizar este CEP.';
      currentResult = null;
    } finally {
      loading = false;
    }
  }

  async function copyAddress(res: CepResult) {
    const text = formatFullAddress(res);
    try {
      if (clipboard && typeof clipboard.writeText === 'function') {
        await clipboard.writeText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      copiedAddress = true;
      setTimeout(() => (copiedAddress = false), 2000);
      feedback?.toast?.({ message: 'Endereço copiado!' });
    } catch {}
  }

  async function copyCepOnly(cep: string) {
    try {
      if (clipboard && typeof clipboard.writeText === 'function') {
        await clipboard.writeText(cep);
      } else {
        await navigator.clipboard.writeText(cep);
      }
      copiedCep = true;
      setTimeout(() => (copiedCep = false), 2000);
      feedback?.toast?.({ message: `CEP ${cep} copiado!` });
    } catch {}
  }

  function openInMaps(res: CepResult) {
    const query = encodeURIComponent(
      `${res.street}, ${res.neighborhood}, ${res.city} - ${res.state}, ${res.formattedCep}`,
    );
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }

  function selectPreset(cep: string) {
    cepInput = cep;
    void searchCep(cleanCep(cep));
  }

  function clearInput() {
    cepInput = '';
    currentResult = null;
    errorMsg = null;
  }
</script>

<div class="cep-container">
  <!-- Search Box -->
  <div class="search-section">
    <div class="input-wrapper">
      <asyar-icon name="search" size="18" class="search-icon"></asyar-icon>
      <input
        type="text"
        placeholder="Digite o CEP (ex: 01001-000 ou 70040-010)..."
        value={cepInput}
        oninput={handleInput}
        onkeydown={handleKeyDown}
        maxlength="9"
      />
      {#if cepInput}
        <button class="btn-clear" onclick={clearInput} title="Limpar">
          <asyar-icon name="x" size="14"></asyar-icon>
        </button>
      {/if}
      {#if loading}
        <span class="spinner"></span>
      {:else}
        <span class="badge-enter">↵</span>
      {/if}
    </div>

    {#if !currentResult}
      <div class="presets-row">
        <span class="presets-label">Sugestões:</span>
        <div class="presets-list">
          {#each examples as ex}
            <button class="preset-chip" onclick={() => selectPreset(ex.cep)}>
              <span>{ex.label}</span>
              <span class="preset-cep">{ex.cep}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Error Banner -->
  {#if errorMsg}
    <div class="error-banner">
      <asyar-icon name="alert-circle" size="18"></asyar-icon>
      <div class="error-text">
        <strong>Não foi possível localizar</strong>
        <span>{errorMsg}</span>
      </div>
    </div>
  {/if}

  <!-- Result Card -->
  {#if currentResult}
    <div class="result-card">
      <div class="result-header">
        <div class="cep-tag">
          <asyar-icon name="map-pin" size="16"></asyar-icon>
          <span>{currentResult.formattedCep}</span>
        </div>
        <div class="provider-badge">
          <span class="dot-green"></span>
          Fonte: {currentResult.provider}
        </div>
      </div>

      <div class="address-details">
        <h2 class="street-name">{currentResult.street || 'Endereço Geral / Área Central'}</h2>

        <div class="address-grid">
          <div class="grid-item">
            <span class="grid-label">Bairro</span>
            <span class="grid-value">{currentResult.neighborhood || 'Central / Sem bairro'}</span>
          </div>
          <div class="grid-item">
            <span class="grid-label">Cidade / Estado</span>
            <span class="grid-value highlight">{currentResult.city} - {currentResult.state}</span>
          </div>
          <div class="grid-item">
            <span class="grid-label">País</span>
            <span class="grid-value">Brasil 🇧🇷</span>
          </div>
        </div>
      </div>

      <div class="actions-row">
        <button
          class="btn-action primary {copiedAddress ? 'copied' : ''}"
          onclick={() => copyAddress(currentResult!)}
        >
          {#if copiedAddress}
            <span>✓ Copiado!</span>
          {:else}
            <asyar-icon name="copy" size="14"></asyar-icon>
            <span>Copiar Endereço</span>
          {/if}
        </button>

        <button
          class="btn-action secondary {copiedCep ? 'copied' : ''}"
          onclick={() => copyCepOnly(currentResult!.formattedCep)}
        >
          {#if copiedCep}
            <span>✓ CEP Copiado</span>
          {:else}
            <span>Copiar CEP</span>
          {/if}
        </button>

        <button class="btn-action secondary" onclick={() => openInMaps(currentResult!)}>
          <asyar-icon name="external-link" size="14"></asyar-icon>
          <span>Ver no Google Maps</span>
        </button>
      </div>
    </div>
  {/if}

  <!-- Recent Queries -->
  {#if recentCeps.length > 0 && !currentResult}
    <div class="recents-section">
      <div class="recents-header">
        <div class="recents-title-wrap">
          <asyar-icon name="clock" size="14"></asyar-icon>
          <span class="section-title">Consultas Recentes</span>
        </div>
        <span class="recents-count">{recentCeps.length} salvos</span>
      </div>

      <div class="recents-grid">
        {#each recentCeps as item}
          <button class="recent-card" onclick={() => selectPreset(item.formattedCep)}>
            <div class="recent-card-top">
              <span class="recent-cep">{item.formattedCep}</span>
              <span class="recent-state">{item.state}</span>
            </div>
            <p class="recent-street">{item.street || item.neighborhood || 'Área Central'}</p>
            <p class="recent-city">{item.city}</p>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .cep-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 760px;
    margin: 0 auto;
    width: 100%;
  }

  .search-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 9px 14px;
    transition: all 0.2s ease;
  }

  .input-wrapper:focus-within {
    border-color: #0070f3;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(0, 112, 243, 0.2);
  }

  .input-wrapper :global(.search-icon) {
    color: #38bdf8;
    margin-right: 10px;
    flex-shrink: 0;
  }

  .input-wrapper input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #ffffff;
    font-size: 15px;
    font-weight: 500;
  }

  .input-wrapper input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .btn-clear {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    margin-right: 8px;
    transition: all 0.15s ease;
  }

  .btn-clear:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.2);
  }

  .badge-enter {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 5px;
    padding: 2px 7px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(0, 112, 243, 0.2);
    border-top-color: #38bdf8;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Presets */
  .presets-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 0 2px;
  }

  .presets-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.45);
  }

  .presets-list {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .preset-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 7px;
    padding: 4px 10px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.75);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .preset-chip:hover {
    background: rgba(0, 112, 243, 0.15);
    border-color: rgba(0, 112, 243, 0.4);
    color: #38bdf8;
    transform: translateY(-1px);
  }

  .preset-cep {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
    font-family: monospace;
  }

  /* Error Banner */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.28);
    border-radius: 10px;
    padding: 12px 16px;
    color: #f87171;
  }

  .error-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
  }

  .error-text strong {
    font-size: 14px;
    font-weight: 600;
  }

  /* Result Card */
  .result-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .cep-tag {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(0, 112, 243, 0.15);
    border: 1px solid rgba(0, 112, 243, 0.3);
    color: #38bdf8;
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .provider-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .dot-green {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 6px #10b981;
  }

  .street-name {
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 14px 0;
    color: #ffffff;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  .address-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
  }

  .grid-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .grid-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.45);
  }

  .grid-value {
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
  }

  .grid-value.highlight {
    color: #38bdf8;
  }

  .actions-row {
    display: flex;
    gap: 10px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    flex-wrap: wrap;
  }

  .btn-action {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    font-size: 13px;
    border-radius: 8px;
    cursor: pointer;
    border: none;
    font-weight: 500;
    transition: all 0.15s ease;
  }

  .btn-action.primary {
    background: #0070f3;
    color: #ffffff;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 112, 243, 0.35);
  }

  .btn-action.primary:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .btn-action.primary.copied {
    background: #10b981;
  }

  .btn-action.secondary {
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .btn-action.secondary:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .btn-action.secondary.copied {
    color: #10b981;
    border-color: #10b981;
  }

  /* Recents Section */
  .recents-section {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .recents-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .recents-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.6);
  }

  .section-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .recents-count {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
  }

  .recents-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 8px;
  }

  .recent-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 10px 12px;
    cursor: pointer;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 3px;
    transition: all 0.15s ease;
  }

  .recent-card:hover {
    border-color: #0070f3;
    background: rgba(0, 112, 243, 0.08);
    transform: translateY(-1px);
  }

  .recent-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .recent-cep {
    font-size: 12px;
    font-weight: 700;
    color: #38bdf8;
    font-family: monospace;
  }

  .recent-state {
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.45);
  }

  .recent-street {
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    margin: 2px 0 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .recent-city {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.55);
    margin: 0;
  }
</style>
