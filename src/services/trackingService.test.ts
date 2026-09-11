import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isValidTrackingCode,
  getCorreiosOfficialUrl,
  fetchTrackingStatus,
} from './trackingService';

describe('trackingService', () => {
  it('isValidTrackingCode validates standard 13-character S10 pattern', () => {
    expect(isValidTrackingCode('NL123456789BR')).toBe(true);
    expect(isValidTrackingCode('aa123456789br')).toBe(true);
    expect(isValidTrackingCode('123456789')).toBe(false);
    expect(isValidTrackingCode('NL12345678BR')).toBe(false);
    expect(isValidTrackingCode('NL1234567890BR')).toBe(false);
  });

  it('getCorreiosOfficialUrl generates correct link', () => {
    const url = getCorreiosOfficialUrl('NL123456789BR');
    expect(url).toBe('https://rastreamento.correios.com.br/app/index.php?codigo=NL123456789BR');
  });

  describe('fetchTrackingStatus', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('throws error for invalid tracking code', async () => {
      await expect(fetchTrackingStatus('invalid')).rejects.toThrow('Código de rastreio inválido');
    });

    it('throws error when credentials are not configured', async () => {
      await expect(fetchTrackingStatus('NL123456789BR')).rejects.toThrow(
        'informe seu usuário e token do LinkeTrack',
      );
    });

    it('returns structured events when tracking API succeeds', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          eventos: [
            {
              data: '07/09/2026',
              hora: '10:00',
              local: 'São Paulo / SP',
              status: 'Objeto saiu para entrega ao destinatário',
            },
          ],
        }),
      });

      const res = await fetchTrackingStatus('NL123456789BR', undefined, {
        user: 'user@example.com',
        token: 'secret-token',
      });
      expect(res.code).toBe('NL123456789BR');
      expect(res.lastStatus).toBe('Objeto saiu para entrega ao destinatário');
      expect(res.events?.length).toBe(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('user=user%40example.com&token=secret-token'),
        expect.any(Object),
      );
    });

    it('propagates actual error when remote API fails instead of fabricating events', async () => {
      globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network offline'));

      await expect(
        fetchTrackingStatus('NL123456789BR', undefined, {
          user: 'user@example.com',
          token: 'secret-token',
        }),
      ).rejects.toThrow('Network offline');
    });

    it('propagates rate limit error when API returns HTTP 429', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      await expect(
        fetchTrackingStatus('NL123456789BR', undefined, {
          user: 'user@example.com',
          token: 'secret-token',
        }),
      ).rejects.toThrow('Limite de requisições excedido');
    });
  });
});
