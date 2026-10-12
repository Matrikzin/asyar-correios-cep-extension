import { describe, it, expect } from 'vitest';
import {
  normalizeTrackingCode,
  isValidTrackingCode,
  getCorreiosOfficialUrl,
  savePackage,
  loadPackages,
} from './trackingService';

describe('trackingService', () => {
  it('isValidTrackingCode validates standard 13-character S10 pattern', () => {
    expect(isValidTrackingCode('NL123456789BR')).toBe(true);
    expect(isValidTrackingCode('aa123456789br')).toBe(true);
    expect(isValidTrackingCode('123456789')).toBe(false);
    expect(isValidTrackingCode('NL12345678BR')).toBe(false);
    expect(isValidTrackingCode('NL1234567890BR')).toBe(false);
  });

  it('accepts codes pasted with spaces', () => {
    expect(normalizeTrackingCode(' nl 123456789 br ')).toBe('NL123456789BR');
    expect(isValidTrackingCode('NL 123 456 789 BR')).toBe(true);
  });

  it('getCorreiosOfficialUrl generates correct link', () => {
    const url = getCorreiosOfficialUrl('nl123456789br');
    expect(url).toBe('https://rastreamento.correios.com.br/app/index.php?codigo=NL123456789BR');
  });

  describe('savePackage', () => {
    it('adds a new package at the top with its nickname', () => {
      const list = savePackage([{ code: 'AA111111111BR', title: 'Livro' }], 'nl123456789br', 'Tênis');

      expect(list).toEqual([
        { code: 'NL123456789BR', title: 'Tênis' },
        { code: 'AA111111111BR', title: 'Livro' },
      ]);
    });

    it('falls back to the code when no nickname is given', () => {
      expect(savePackage([], 'NL123456789BR')).toEqual([
        { code: 'NL123456789BR', title: 'NL123456789BR' },
      ]);
    });

    it('keeps the existing nickname when the same code is saved again without one', () => {
      const saved = [
        { code: 'AA111111111BR', title: 'Livro' },
        { code: 'NL123456789BR', title: 'Tênis Nike' },
      ];

      const list = savePackage(saved, 'NL123456789BR', '   ');

      expect(list).toEqual([
        { code: 'NL123456789BR', title: 'Tênis Nike' },
        { code: 'AA111111111BR', title: 'Livro' },
      ]);
    });

    it('replaces the nickname when a new one is given', () => {
      const list = savePackage([{ code: 'NL123456789BR', title: 'Tênis' }], 'NL123456789BR', 'Presente');

      expect(list).toEqual([{ code: 'NL123456789BR', title: 'Presente' }]);
    });
  });

  describe('loadPackages', () => {
    it('reads the v1.1.0 format and drops the stale LinkeTrack status', () => {
      const raw = JSON.stringify([
        {
          code: 'NL123456789BR',
          title: 'Tênis',
          lastStatus: 'Objeto postado',
          updatedAt: '07/09/2026',
          events: [{ date: '07/09/2026', location: 'SP', status: 'Objeto postado' }],
        },
      ]);

      expect(loadPackages(raw)).toEqual([{ code: 'NL123456789BR', title: 'Tênis' }]);
    });

    it('discards invalid and duplicate entries', () => {
      const raw = JSON.stringify([
        { code: 'NL123456789BR', title: 'Tênis' },
        { code: 'nl123456789br', title: 'Duplicado' },
        { code: 'invalido', title: 'X' },
        { code: 42 },
        null,
        { code: 'AA111111111BR' },
      ]);

      expect(loadPackages(raw)).toEqual([
        { code: 'NL123456789BR', title: 'Tênis' },
        { code: 'AA111111111BR', title: 'AA111111111BR' },
      ]);
    });

    it('returns an empty list for missing or corrupted data', () => {
      expect(loadPackages(undefined)).toEqual([]);
      expect(loadPackages('{não é json')).toEqual([]);
      expect(loadPackages('{"code":"NL123456789BR"}')).toEqual([]);
    });
  });
});
