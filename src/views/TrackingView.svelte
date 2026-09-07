<script lang="ts">
  import {
    isValidTrackingCode,
    fetchTrackingStatus,
    getCorreiosOfficialUrl,
    type TrackingPackage,
  } from '../services/trackingService';
  import type { INetworkService } from '../services/cepService';
  import type { ExtensionContext } from 'asyar-sdk/view';
  import type { IFeedbackService, IStorageService } from 'asyar-sdk/contracts';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const feedback = $derived(context.getService<IFeedbackService>('feedback'));
  const storage = $derived(context.getService<IStorageService>('storage'));
  const network = $derived(context.getService<INetworkService>('network'));

  let codeInput = $state('');
  let titleInput = $state('');
  let loading = $state(false);
  let errorMsg = $state<string | null>(null);
  let currentPackage = $state<TrackingPackage | null>(null);
  let savedPackages = $state<TrackingPackage[]>([]);

  // Carregar pacotes salvos
  $effect(() => {
    void (async () => {
      try {
        if (storage) {
          const raw = await storage.get('saved_packages');
          if (raw && typeof raw === 'string') {
            savedPackages = JSON.parse(raw);
          }
        }
      } catch {}
    })();
  });

  async function handleTrack() {
    const clean = codeInput.trim().toUpperCase();
    if (!isValidTrackingCode(clean)) {
      errorMsg = 'Código inválido. Formato esperado: 2 letras + 9 números + 2 letras (ex: AA123456789BR).';
      return;
    }

    loading = true;
    errorMsg = null;
    try {
      const res = await fetchTrackingStatus(clean, network);
      if (titleInput.trim()) {
        res.title = titleInput.trim();
      }
      currentPackage = res;

      // Atualizar ou adicionar nos salvos
      const idx = savedPackages.findIndex((p) => p.code === res.code);
      if (idx >= 0) {
        savedPackages[idx] = res;
      } else {
        savedPackages = [res, ...savedPackages];
      }
      try {
        if (storage) {
          await storage.set('saved_packages', JSON.stringify(savedPackages));
        }
      } catch (storageErr) {
        console.warn('[Correios & CEP] Erro ao salvar encomenda recente:', storageErr);
      }
      codeInput = '';
      titleInput = '';
    } catch (err: any) {
      errorMsg = err.message || 'Erro ao consultar encomenda.';
    } finally {
      loading = false;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && codeInput.trim()) {
      void handleTrack();
    }
  }

  async function removePackage(code: string, e: MouseEvent) {
    e.stopPropagation();
    savedPackages = savedPackages.filter((p) => p.code !== code);
    if (currentPackage?.code === code) {
      currentPackage = null;
    }
    if (storage) {
      await storage.set('saved_packages', JSON.stringify(savedPackages));
    }
    feedback?.toast?.({ message: 'Pacote removido da lista.' });
  }

  function selectPackage(pkg: TrackingPackage) {
    currentPackage = pkg;
    errorMsg = null;
  }

  function openOfficial(code: string) {
    window.open(getCorreiosOfficialUrl(code), '_blank');
  }

  async function copyTrackingCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      feedback?.toast?.({ message: `Código ${code} copiado!` });
    } catch {}
  }
</script>

<div class="tracking-container">
  <!-- Add / Search Form -->
  <div class="add-form">
    <div class="inputs-grid">
      <div class="input-wrap">
        <asyar-icon name="box" size="16" class="icon-input"></asyar-icon>
        <input
          type="text"
          class="input-field"
          placeholder="Código de Rastreio (ex: NL123456789BR)"
          bind:value={codeInput}
          onkeydown={handleKeyDown}
          maxlength="13"
        />
      </div>

      <div class="input-wrap secondary">
        <input
          type="text"
          class="input-field"
          placeholder="Apelido / Descrição (opcional)"
          bind:value={titleInput}
          onkeydown={handleKeyDown}
        />
      </div>

      <button class="btn-track" onclick={handleTrack} disabled={loading || !codeInput.trim()}>
        {#if loading}
          <span class="spinner"></span>
        {:else}
          <asyar-icon name="search" size="14"></asyar-icon>
          <span>Rastrear</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Error Banner -->
  {#if errorMsg}
    <div class="error-banner">
      <asyar-icon name="alert-circle" size="18"></asyar-icon>
      <div class="error-text">
        <strong>Erro ao rastrear</strong>
        <span>{errorMsg}</span>
      </div>
    </div>
  {/if}

  <!-- Package Details Card -->
  {#if currentPackage}
    <div class="package-card">
      <div class="package-header">
        <div>
          <h2 class="package-title">{currentPackage.title}</h2>
          <button class="package-code-btn" onclick={() => copyTrackingCode(currentPackage!.code)} title="Clique para copiar">
            <span>{currentPackage.code}</span>
            <asyar-icon name="copy" size="12"></asyar-icon>
          </button>
        </div>
        <button class="btn-external" onclick={() => openOfficial(currentPackage!.code)}>
          <asyar-icon name="external-link" size="14"></asyar-icon>
          <span>Abrir no site oficial</span>
        </button>
      </div>

      <div class="events-timeline">
        {#if currentPackage.events && currentPackage.events.length > 0}
          {#each currentPackage.events as ev, i}
            <div class="timeline-step {i === 0 ? 'active' : ''}">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-meta">
                  <span class="event-date">{ev.date}</span>
                  <span class="event-loc">{ev.location}</span>
                </div>
                <div class="event-status">{ev.status}</div>
                {#if ev.subStatus}
                  <div class="event-sub">{ev.subStatus}</div>
                {/if}
              </div>
            </div>
          {/each}
        {:else}
          <p class="no-events">Nenhum evento registrado ainda.</p>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Saved Packages List -->
  {#if savedPackages.length > 0}
    <div class="saved-section">
      <div class="saved-header">
        <h3 class="section-title">Pacotes Salvos ({savedPackages.length})</h3>
      </div>

      <div class="packages-list">
        {#each savedPackages as item}
          <div
            class="package-item {currentPackage?.code === item.code ? 'selected' : ''}"
            role="button"
            tabindex="0"
            onclick={() => selectPackage(item)}
            onkeydown={(e) => { if (e.key === 'Enter') selectPackage(item); }}
          >
            <div class="package-item-main">
              <div class="pkg-info">
                <span class="pkg-title">{item.title}</span>
                <span class="pkg-code">{item.code}</span>
              </div>
              <span class="pkg-status">{item.lastStatus || 'Registrado'}</span>
            </div>
            <button
              class="btn-delete"
              onclick={(e) => removePackage(item.code, e)}
              title="Remover pacote"
            >
              <asyar-icon name="trash" size="14"></asyar-icon>
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .tracking-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 760px;
    margin: 0 auto;
    width: 100%;
  }

  .add-form {
    display: flex;
    flex-direction: column;
  }

  .inputs-grid {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .input-wrap {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 200px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0 14px;
    transition: all 0.2s ease;
  }

  .input-wrap.secondary {
    flex: 0.8;
  }

  .input-wrap:focus-within {
    border-color: #0070f3;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(0, 112, 243, 0.2);
  }

  .input-wrap :global(.icon-input) {
    color: #38bdf8;
    margin-right: 10px;
    flex-shrink: 0;
  }

  .input-field {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: #ffffff;
    font-size: 14px;
    padding: 10px 0;
  }

  .input-field::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .btn-track {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #0070f3;
    color: #ffffff;
    border: none;
    border-radius: 10px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 2px 8px rgba(0, 112, 243, 0.35);
  }

  .btn-track:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .btn-track:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

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

  .package-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .package-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
  }

  .package-title {
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 6px 0;
  }

  .package-code-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: #38bdf8;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 13px;
    font-family: monospace;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .package-code-btn:hover {
    background: rgba(56, 189, 248, 0.2);
  }

  .btn-external {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.85);
    padding: 7px 12px;
    border-radius: 8px;
    font-size: 12px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.15s ease;
  }

  .btn-external:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  .events-timeline {
    display: flex;
    flex-direction: column;
    position: relative;
    padding-left: 6px;
  }

  .timeline-step {
    position: relative;
    display: flex;
    gap: 14px;
    padding-bottom: 18px;
  }

  .timeline-step:last-child {
    padding-bottom: 0;
  }

  .timeline-step::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 14px;
    bottom: 0;
    width: 2px;
    background: rgba(255, 255, 255, 0.1);
  }

  .timeline-step:last-child::before {
    display: none;
  }

  .timeline-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.25);
    margin-top: 4px;
    flex-shrink: 0;
  }

  .timeline-step.active .timeline-dot {
    background: #38bdf8;
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.6);
  }

  .timeline-content {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .timeline-meta {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
  }

  .event-status {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
  }

  .event-sub {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  .no-events {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.45);
  }

  .saved-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 6px;
  }

  .section-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.45);
    margin: 0;
  }

  .packages-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .package-item {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .package-item:hover {
    border-color: rgba(0, 112, 243, 0.4);
    background: rgba(255, 255, 255, 0.06);
  }

  .package-item.selected {
    border-color: #0070f3;
    background: rgba(0, 112, 243, 0.1);
  }

  .package-item-main {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
  }

  .pkg-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .pkg-title {
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
  }

  .pkg-code {
    font-size: 11px;
    color: #38bdf8;
    font-family: monospace;
  }

  .pkg-status {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .btn-delete {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.35);
    padding: 10px 14px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-delete:hover {
    color: #f87171;
    background: rgba(239, 68, 68, 0.1);
  }
</style>
