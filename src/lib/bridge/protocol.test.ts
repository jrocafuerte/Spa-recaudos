import { describe, expect, it } from 'vitest';
import { MAX_MESSAGE_BYTES, parseNativeMessage, parseWebMessage } from './protocol';

const base = { v: 1, id: 'abcdef12-0000', ts: Date.now() };

describe('bridge protocol', () => {
  it('acepta mensajes nativos válidos', () => {
    const msg = parseNativeMessage(JSON.stringify({ ...base, source: 'banca-app', type: 'BACK_PRESSED' }));
    expect(msg?.type).toBe('BACK_PRESSED');
  });

  it('descarta versión, origen o tipo desconocidos', () => {
    expect(
      parseNativeMessage(JSON.stringify({ ...base, v: 2, source: 'banca-app', type: 'BACK_PRESSED' })),
    ).toBeUndefined();
    expect(parseNativeMessage(JSON.stringify({ ...base, source: 'evil', type: 'BACK_PRESSED' }))).toBeUndefined();
    expect(
      parseNativeMessage(JSON.stringify({ ...base, source: 'banca-app', type: 'EVAL', payload: 'alert(1)' })),
    ).toBeUndefined();
  });

  it('descarta mensajes demasiado grandes o malformados', () => {
    expect(parseNativeMessage('x'.repeat(MAX_MESSAGE_BYTES + 1))).toBeUndefined();
    expect(parseNativeMessage('{not json')).toBeUndefined();
  });

  it('OPEN_NATIVE solo admite rutas de la allowlist', () => {
    const ok = parseWebMessage(
      JSON.stringify({ ...base, source: 'recaudos-web', type: 'OPEN_NATIVE', payload: { route: 'position' } }),
    );
    const bad = parseWebMessage(
      JSON.stringify({
        ...base,
        source: 'recaudos-web',
        type: 'OPEN_NATIVE',
        payload: { route: 'settings/delete-account' },
      }),
    );
    expect(ok).toBeDefined();
    expect(bad).toBeUndefined();
  });

  it('REQUEST_STEP_UP exige hash sha256', () => {
    const bad = parseWebMessage(
      JSON.stringify({
        ...base,
        source: 'recaudos-web',
        type: 'REQUEST_STEP_UP',
        payload: { intentHash: 'x', amount: 1, currency: 'USD', billerName: 'a', reference: 'b' },
      }),
    );
    expect(bad).toBeUndefined();
  });
});
