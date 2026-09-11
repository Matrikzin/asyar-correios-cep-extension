export interface CepResult {
  cep: string;
  formattedCep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  provider: 'BrasilAPI' | 'ViaCEP' | 'OpenCEP';
}

export interface INetworkService {
  fetch(url: string, options?: any): Promise<{ ok: boolean; status: number; statusText?: string; body: string | any }>;
}

export function cleanCep(cep: string): string {
  return (cep || '').replace(/\D/g, '');
}

export function formatCep(cep: string): string {
  const digits = cleanCep(cep);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

export function isValidCep(cep: string): boolean {
  return cleanCep(cep).length === 8;
}

export function formatFullAddress(result: CepResult): string {
  const parts: string[] = [];
  if (result.street) parts.push(result.street);
  if (result.neighborhood) parts.push(result.neighborhood);
  if (result.city && result.state) {
    parts.push(`${result.city} - ${result.state}`);
  } else if (result.city) {
    parts.push(result.city);
  }
  if (result.formattedCep) parts.push(`CEP: ${result.formattedCep}`);
  return parts.join(', ');
}

async function requestJson(url: string, network?: INetworkService): Promise<any> {
  let networkError: any = null;

  // 1. Tentar através do serviço de rede nativo do Asyar (ignora CSP e CORS da WebView)
  if (network && typeof network.fetch === 'function') {
    try {
      const res = await network.fetch(url, { timeout: 15000 });
      if (res) {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status || 'Erro'}`);
        }
        if (res.body) {
          return typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
        }
      }
    } catch (err: any) {
      networkError = err;
      console.warn(`[Correios & CEP] Asyar network.fetch falhou para ${url}:`, err);
    }
  }

  // 2. Fallback para fetch do navegador/webview
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.warn(`[Correios & CEP] window.fetch falhou para ${url}:`, err);
    throw networkError || err;
  }
}

export async function fetchCep(input: string, network?: INetworkService): Promise<CepResult> {
  const digits = cleanCep(input);
  if (!isValidCep(digits)) {
    throw new Error('CEP deve conter exatamente 8 dígitos numéricos.');
  }

  // 1. Tentar BrasilAPI
  try {
    const data = await requestJson(`https://brasilapi.com.br/api/cep/v2/${digits}`, network);
    if (data && (data.city || data.localidade || data.street)) {
      return {
        cep: digits,
        formattedCep: formatCep(digits),
        street: data.street || '',
        neighborhood: data.neighborhood || '',
        city: data.city || data.localidade || '',
        state: data.state || data.uf || '',
        provider: 'BrasilAPI',
      };
    }
  } catch {
    // Falhou BrasilAPI, tenta ViaCEP
  }

  // 2. Tentar ViaCEP
  try {
    const data = await requestJson(`https://viacep.com.br/ws/${digits}/json/`, network);
    if (data && !data.erro && (data.localidade || data.logradouro)) {
      return {
        cep: digits,
        formattedCep: formatCep(digits),
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        provider: 'ViaCEP',
      };
    }
  } catch {
    // Falhou ViaCEP, tenta OpenCEP
  }

  // 3. Tentar OpenCEP
  try {
    const data = await requestJson(`https://opencep.com/v1/${digits}`, network);
    if (data && !data.erro && (data.localidade || data.logradouro)) {
      return {
        cep: digits,
        formattedCep: formatCep(digits),
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        provider: 'OpenCEP',
      };
    }
  } catch {
    // Falhou todos
  }

  throw new Error('Não foi possível localizar este CEP. Verifique o número digitado ou sua conexão com a internet.');
}
