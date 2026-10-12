export interface TrackingPackage {
  code: string;
  title: string;
}

/** Remove espaços e coloca em maiúsculas: " nl 123456789 br " → "NL123456789BR". */
export function normalizeTrackingCode(code: string): string {
  return (code || '').replace(/\s+/g, '').toUpperCase();
}

export function isValidTrackingCode(code: string): boolean {
  return /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/.test(normalizeTrackingCode(code));
}

export function getCorreiosOfficialUrl(code: string): string {
  return `https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(normalizeTrackingCode(code))}`;
}

/**
 * Adiciona a encomenda (ou a move para o topo, se já existir).
 *
 * Sem apelido novo, mantém o que já estava salvo — salvar de novo o mesmo
 * código não pode apagar o "Tênis Nike" que o usuário escolheu antes.
 */
export function savePackage(
  list: TrackingPackage[],
  code: string,
  title?: string,
): TrackingPackage[] {
  const clean = normalizeTrackingCode(code);
  const existing = list.find((p) => p.code === clean);
  const finalTitle = title?.trim() || existing?.title || clean;
  return [{ code: clean, title: finalTitle }, ...list.filter((p) => p.code !== clean)];
}

/**
 * Lê a lista salva no storage, tolerando o formato antigo (até a v1.1.0
 * cada item também guardava status e eventos vindos do LinkeTrack). Só código
 * e apelido sobrevivem; itens inválidos são descartados.
 */
export function loadPackages(raw: unknown): TrackingPackage[] {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  const result: TrackingPackage[] = [];
  for (const item of parsed) {
    const code = normalizeTrackingCode(String(item?.code ?? ''));
    if (!isValidTrackingCode(code) || result.some((p) => p.code === code)) continue;
    const title = typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : code;
    result.push({ code, title });
  }
  return result;
}
