/**
 * Allowlist de rutas que el navegador puede invocar a través del proxy /api.
 * Cualquier otra ruta del BFF (p. ej. /v1/session/exchange) no es alcanzable
 * desde el cliente (defensa en profundidad contra SSRF / path traversal).
 */
const ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: 'GET', pattern: /^v1\/categories$/ },
  { method: 'GET', pattern: /^v1\/billers$/ },
  { method: 'GET', pattern: /^v1\/billers\/blr-\d{3}$/ },
  { method: 'POST', pattern: /^v1\/billers\/blr-\d{3}\/debts$/ },
  { method: 'GET', pattern: /^v1\/source-accounts$/ },
  { method: 'POST', pattern: /^v1\/payment-intents$/ },
  { method: 'POST', pattern: /^v1\/payments$/ },
  { method: 'GET', pattern: /^v1\/payments\/[0-9a-f-]{36}$/ },
  { method: 'DELETE', pattern: /^v1\/session$/ },
];

export function isAllowed(method: string, segments: string[]): boolean {
  if (segments.some((s) => s === '..' || s === '.' || s.includes('%') || s.includes('\\'))) return false;
  const path = segments.join('/');
  return ROUTES.some((r) => r.method === method && r.pattern.test(path));
}

/** Headers que se reenvían al BFF (el resto, incl. Cookie, se descartan). */
export const FORWARDED_HEADERS = [
  'content-type',
  'accept',
  'idempotency-key',
  'x-requested-with',
  'origin',
  'x-request-id',
];
