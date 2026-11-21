import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, setLocale } from './format';

const nb = (s: string) => s.replace(/[  ]/g, ' ');

describe('formato regional', () => {
  it('usa la configuración regional enviada por la app', () => {
    setLocale('es-419');
    expect(nb(formatMoney(6670.35, 'USD'))).toBe('USD 6,670.35');
    expect(formatDate('2026-12-05')).toBe('5 dic 2026');
  });

  it('ignora configuraciones regionales inválidas', () => {
    setLocale('es-419');
    setLocale('no es un locale!!');
    expect(nb(formatMoney(1, 'USD'))).toBe('USD 1.00');
  });
});
