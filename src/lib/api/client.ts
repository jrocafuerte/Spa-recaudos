'use client';

import { bridge } from '../bridge/bridge';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Cliente HTTP del navegador. Solo habla con el mismo origen (/api/*): el
 * servidor Next adjunta la sesión (cookie HttpOnly) y reenvía al BFF.
 */
export async function api<T>(
  path: string,
  init: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown; idempotent?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'X-Requested-With': 'recaudos-spa', Accept: 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (init.idempotent) headers['Idempotency-Key'] = crypto.randomUUID();

  const res = await fetch(`/api/${path.replace(/^\//, '')}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (res.status === 401) {
    bridge.send({ type: 'SESSION_EXPIRED' });
    throw new ApiError(401, 'Tu sesión expiró');
  }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : undefined;
  if (!res.ok)
    throw new ApiError(res.status, (data as { detail?: string })?.detail ?? 'No pudimos completar la operación');
  return data as T;
}

/** Para reintentos seguros: la misma Idempotency-Key se reutiliza dentro de una operación. */
export function apiWithKey<T>(path: string, body: unknown, key: string): Promise<T> {
  return fetch(`/api/${path}`, {
    method: 'POST',
    headers: {
      'X-Requested-With': 'recaudos-spa',
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
  }).then(async (res) => {
    const data = await res.json().catch(() => undefined);
    if (res.status === 401) bridge.send({ type: 'SESSION_EXPIRED' });
    if (!res.ok) throw new ApiError(res.status, data?.detail ?? 'No pudimos completar la operación');
    return data as T;
  });
}
