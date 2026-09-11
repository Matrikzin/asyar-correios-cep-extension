import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cleanCep,
  formatCep,
  isValidCep,
  formatFullAddress,
  fetchCep,
  type CepResult,
} from './cepService';

describe('cepService', () => {
  it('cleanCep removes non-digits', () => {
    expect(cleanCep('01001-000')).toBe('01001000');
    expect(cleanCep('01.001-000')).toBe('01001000');
    expect(cleanCep('abc 123 456 78 xyz')).toBe('12345678');
  });

  it('formatCep formats 8 digits into 00000-000', () => {
    expect(formatCep('01001000')).toBe('01001-000');
    expect(formatCep('123')).toBe('123');
  });

  it('isValidCep validates length', () => {
    expect(isValidCep('01001-000')).toBe(true);
    expect(isValidCep('01001000')).toBe(true);
    expect(isValidCep('12345')).toBe(false);
    expect(isValidCep('123456789')).toBe(false);
  });

  it('formatFullAddress formats nicely', () => {
    const mock: CepResult = {
      cep: '01001000',
      formattedCep: '01001-000',
      street: 'Praça da Sé',
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP',
      provider: 'BrasilAPI',
    };
    const formatted = formatFullAddress(mock);
    expect(formatted).toBe('Praça da Sé, Sé, São Paulo - SP, CEP: 01001-000');
  });

  describe('fetchCep', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('throws error when cep is invalid', async () => {
      await expect(fetchCep('123')).rejects.toThrow('CEP deve conter exatamente 8 dígitos numéricos.');
    });

    it('returns formatted result from BrasilAPI when successful', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          street: 'Praça da Sé',
          neighborhood: 'Sé',
          city: 'São Paulo',
          state: 'SP',
        }),
      });

      const res = await fetchCep('01001-000');
      expect(res.cep).toBe('01001000');
      expect(res.formattedCep).toBe('01001-000');
      expect(res.city).toBe('São Paulo');
      expect(res.provider).toBe('BrasilAPI');
    });

    it('falls back to ViaCEP when BrasilAPI fails', async () => {
      globalThis.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('BrasilAPI down'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            logradouro: 'Avenida Paulista',
            bairro: 'Bela Vista',
            localidade: 'São Paulo',
            uf: 'SP',
          }),
        });

      const res = await fetchCep('01311000');
      expect(res.street).toBe('Avenida Paulista');
      expect(res.neighborhood).toBe('Bela Vista');
      expect(res.city).toBe('São Paulo');
      expect(res.provider).toBe('ViaCEP');
    });
  });
});
