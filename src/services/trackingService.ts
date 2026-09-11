import type { INetworkService } from './cepService';

export interface TrackingEvent {
  date: string;
  location: string;
  status: string;
  subStatus?: string;
}

export interface TrackingPackage {
  code: string;
  title: string;
  lastStatus?: string;
  updatedAt?: string;
  events?: TrackingEvent[];
}

export interface TrackingCredentials {
  user?: string;
  token?: string;
}

export function isValidTrackingCode(code: string): boolean {
  const clean = code.trim().toUpperCase();
  return /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/.test(clean);
}

export function getCorreiosOfficialUrl(code: string): string {
  const clean = code.trim().toUpperCase();
  return `https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(clean)}`;
}

export async function fetchTrackingStatus(
  code: string,
  network?: INetworkService,
  credentials?: TrackingCredentials,
): Promise<TrackingPackage> {
  const clean = code.trim().toUpperCase();
  if (!isValidTrackingCode(clean)) {
    throw new Error('Código de rastreio inválido. Exemplo correto: AA123456789BR');
  }

  const user = credentials?.user?.trim();
  const token = credentials?.token?.trim();

  if (!user || !token) {
    throw new Error(
      'Para rastrear encomendas no Asyar, informe seu usuário e token do LinkeTrack nas preferências da extensão (linketrack.com) ou consulte no site oficial dos Correios.',
    );
  }

  const url = `https://api.linketrack.com/track/json?user=${encodeURIComponent(user)}&token=${encodeURIComponent(token)}&codigo=${clean}`;

  let data: any = null;
  let lastError: Error | null = null;

  // 1. Tentar através do serviço de rede nativo do Asyar
  if (network && typeof network.fetch === 'function') {
    try {
      const res = await network.fetch(url, { timeout: 15000 });
      if (res) {
        if (!res.ok) {
          if (res.status === 429) {
            throw new Error('Limite de requisições excedido na API LinkeTrack. Aguarde alguns instantes.');
          }
          if (res.status === 401 || res.status === 403) {
            throw new Error('Usuário ou token do LinkeTrack inválidos. Verifique nas preferências da extensão.');
          }
          if (res.status === 404) {
            throw new Error('Encomenda não encontrada ou código ainda não registrado no sistema dos Correios.');
          }
          throw new Error(`Erro na consulta de rastreamento (HTTP ${res.status}).`);
        }
        if (res.body) {
          data = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
        }
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // 2. Fallback para fetch do navegador/webview com timeout
  if (!data) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Limite de requisições excedido na API LinkeTrack. Aguarde alguns instantes.');
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error('Usuário ou token do LinkeTrack inválidos. Verifique nas preferências da extensão.');
        }
        if (res.status === 404) {
          throw new Error('Encomenda não encontrada ou código ainda não registrado no sistema dos Correios.');
        }
        throw new Error(`Erro na consulta de rastreamento (HTTP ${res.status}).`);
      }
      data = await res.json();
    } catch (err: any) {
      throw lastError || err;
    }
  }

  if (data && (data.eventos || data.codigo)) {
    const eventos: TrackingEvent[] = (data.eventos || []).map((e: any) => ({
      date: e.data && e.hora ? `${e.data} ${e.hora}` : e.data || '',
      location: e.local || 'Local não informado',
      status: e.status || '',
      subStatus: Array.isArray(e.subStatus) ? e.subStatus.join(' - ') : e.subStatus || undefined,
    }));

    const latest = eventos[0];
    return {
      code: clean,
      title: clean,
      lastStatus: latest ? latest.status : 'Aguardando atualização',
      updatedAt: latest ? latest.date : new Date().toLocaleString('pt-BR'),
      events: eventos,
    };
  }

  throw new Error('Encomenda não encontrada ou serviço indisponível.');
}
