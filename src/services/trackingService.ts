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
): Promise<TrackingPackage> {
  const clean = code.trim().toUpperCase();
  if (!isValidTrackingCode(clean)) {
    throw new Error('Código de rastreio inválido. Exemplo correto: AA123456789BR');
  }

  const url = `https://api.linketrack.com/track/json?user=teste&token=1ed0925276a212313542a24f6e0b88e35cb4f613e634dc83ac300e1616195b4f&codigo=${clean}`;

  try {
    let data: any = null;
    if (network && typeof network.fetch === 'function') {
      try {
        const res = await network.fetch(url, { timeout: 15000 });
        if (res && res.ok && res.body) {
          data = JSON.parse(res.body);
        }
      } catch {}
    }

    if (!data) {
      const res = await fetch(url);
      if (res.ok) {
        data = await res.json();
      }
    }

    if (data) {
      const eventos: TrackingEvent[] = (data.eventos || []).map((e: any) => ({
        date: `${e.data} ${e.hora}`,
        location: e.local || 'Local não informado',
        status: e.status || '',
        subStatus: e.subStatus ? e.subStatus.join(' - ') : undefined,
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
  } catch {}

  return {
    code: clean,
    title: clean,
    lastStatus: 'Acompanhe no site oficial dos Correios',
    updatedAt: new Date().toLocaleDateString('pt-BR'),
    events: [
      {
        date: new Date().toLocaleDateString('pt-BR'),
        location: 'Correios Brasil',
        status: 'Objeto registrado',
        subStatus: 'Clique para abrir no portal de rastreamento dos Correios',
      },
    ],
  };
}
