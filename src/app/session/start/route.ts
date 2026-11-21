import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { serverConfig } from '@/lib/server/config';

/**
 * Punto de entrada del micro frontend. La app nativa abre el WebView con un
 * POST (application/x-www-form-urlencoded) que contiene un handoff token de un
 * solo uso: así el token no viaja en la URL, no queda en el historial ni en
 * logs de proxies, y nunca es accesible desde JavaScript.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => undefined);
  const handoffToken = form?.get('handoff');
  if (typeof handoffToken !== 'string' || handoffToken.length < 20 || handoffToken.length > 4096) {
    return NextResponse.redirect(new URL('/session/expired', request.url), 303);
  }

  const res = await fetch(`${serverConfig.bffUrl}/v1/session/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Client-Secret': serverConfig.internalSecret,
      'X-Request-Id': request.headers.get('x-request-id') ?? crypto.randomUUID(),
    },
    body: JSON.stringify({ handoffToken }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5_000),
  }).catch(() => undefined);

  if (!res?.ok) return NextResponse.redirect(new URL('/session/expired', request.url), 303);
  const { sessionToken, expiresIn } = (await res.json()) as { sessionToken: string; expiresIn: number };

  (await cookies()).set(serverConfig.cookieName, sessionToken, {
    httpOnly: true,
    secure: serverConfig.secureCookie,
    sameSite: 'strict',
    path: '/',
    maxAge: expiresIn,
  });
  // 303: el WebView navega con GET y el POST no se re-envía al recargar.
  return NextResponse.redirect(new URL('/', request.url), 303);
}
