import { describe, expect, it } from 'vitest';
import { isAllowed } from './proxy-policy';

describe('proxy allowlist', () => {
  it('permite rutas del contrato', () => {
    expect(isAllowed('GET', ['v1', 'categories'])).toBe(true);
    expect(isAllowed('POST', ['v1', 'billers', 'blr-001', 'debts'])).toBe(true);
  });

  it('bloquea rutas internas, métodos no permitidos y traversal', () => {
    expect(isAllowed('POST', ['v1', 'session', 'exchange'])).toBe(false);
    expect(isAllowed('DELETE', ['v1', 'categories'])).toBe(false);
    expect(isAllowed('GET', ['v1', '..', 'health'])).toBe(false);
    expect(isAllowed('GET', ['v1', 'billers%2F..'])).toBe(false);
  });
});
