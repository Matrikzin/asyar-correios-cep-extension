<script lang="ts">
  import {
    isValidTrackingCode,
    getCorreiosOfficialUrl,
    savePackage,
    loadPackages,
    type TrackingPackage,
  } from '../services/trackingService';
  import type { ExtensionContext } from 'asyar-sdk/view';
  import type { IClipboardService, IFeedbackService, IStorageService } from 'asyar-sdk/contracts';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const feedback = $derived(context.getService<IFeedbackService>('feedback'));
  const storage = $derived(context.getService<IStorageService>('storage'));
  const clipboard = $derived(context.getService<IClipboardService>('clipboard'));

  let codeInput = $state('');
  let titleInput = $state('');
  let errorMsg = $state<string | null>(null);
  let savedPackages = $state<TrackingPackage[]>([]);

  // Carregar pacotes salvos (aceita o formato antigo, da v1.1.0)
  $effect(() => {
    void (async () => {
      try {
        if (storage) {
          savedPackages = loadPackages(await storage.get('saved_packages'));
        }
      } catch {}
    })();
  });

  async function persist() {
    try {
      if (storage) {
        await storage.set('saved_packages', JSON.stringify(savedPackages));
      }
    } catch (storageErr) {
      console.warn('[Correios & CEP] Erro ao salvar encomendas:', storageErr);
    }
  }

  function openOfficial(code: string) {
    window.open(getCorreiosOfficialUrl(code), '_blank');
  }

  async function handleTrack() {
    if (!isValidTrackingCode(codeInput)) {
      errorMsg = 'Código inválido. Formato esperado: 2 letras + 9 números + 2 letras (ex: AA123456789BR).';
      return;
    }

    errorMsg = null;
    savedPackages = savePackage(savedPackages, codeInput, titleInput);
    // Abrir antes de salvar: o navegador só permite abrir janelas logo após o clique
    openOfficial(savedPackages[0].code);
    codeInput = '';
    titleInput = '';
    await persist();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && codeInput.trim()) {
      void handleTrack();
    }
  }

  async function removePackage(code: string, e: MouseEvent) {
    e.stopPropagation();
    savedPackages = savedPackages.filter((p) => p.code !== code);
    await persist();
    feedback?.toast?.({ message: 'Pacote removido da lista.' });
  }

  async function copyTrackingCode(code: string, e: MouseEvent) {
    e.stopPropagation();
    try {
      if (clipboard && typeof clipboard.writeText === 'function') {
        await clipboard.writeText(code);
      } else {
        await navigator.clipboard.writeText(code);
      }
      feedback?.toast?.({ message: `Código ${code} copiado!` });
    } catch {
      feedback?.toast?.({ message: 'Não foi possível copiar o código.' });
    }
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
          maxlength="20"
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

      <button class="btn-track" onclick={handleTrack} disabled={!codeInput.trim()}>
        <asyar-icon name="external-link" size="14"></asyar-icon>
        <span>Rastrear</span>
      </button>
    </div>
    <p class="hint">
      O rastreio abre no site oficial dos Correios. A encomenda fica salva aqui para você consultar de novo
      com um clique.
    </p>
  </div>

  <!-- Error Banner -->
  {#if errorMsg}
    <div class="error-banner">
      <asyar-icon name="alert-circle" size="18"></asyar-icon>
      <div class="error-text">
        <strong>Aviso de Rastreamento</strong>
        <span>{errorMsg}</span>
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
        {#each savedPackages as item (item.code)}
          <div
            class="package-item"
            role="button"
            tabindex="0"
            title="Abrir no site oficial dos Correios"
            onclick={() => openOfficial(item.code)}
            onkeydown={(e) => {
              if (e.key === 'Enter') openOfficial(item.code);
            }}
          >
            <div class="package-item-main">
              <div class="pkg-info">
                <span class="pkg-title">{item.title}</span>
                <span class="pkg-code">{item.code}</span>
              </div>
            </div>
            <button class="btn-icon" onclick={(e) => copyTrackingCode(item.code, e)} title="Copiar código">
              <asyar-icon name="copy" size="14"></asyar-icon>
            </button>
            <button
              class="btn-icon btn-delete"
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

  .hint {
    margin-top: 8px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
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

  .btn-icon {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.35);
    padding: 10px 14px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-icon:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.08);
  }

  .btn-delete:hover {
    color: #f87171;
    background: rgba(239, 68, 68, 0.1);
  }
</style>
