import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { serverConfig } from '@/lib/server/config';
import { FORWARDED_HEADERS, isAllowed } from '@/lib/server/proxy-policy';

const MAX_BODY = 16 * 1024;

/**
 * Proxy same-origin hacia mse-recaudos. El BFF no se expone a Internet: solo
 * este servidor lo alcanza por red privada. Aquí se traduce la cookie HttpOnly
 * en el header interno de sesión y se aplica una allowlist de rutas.
 */
async function handler(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!isAllowed(request.method, path)) {
    return NextResponse.json({ status: 404, detail: 'No encontrado' }, { status: 404 });
  }

  const jar = await cookies();
  const session = jar.get(serverConfig.cookieName)?.value;
  if (!session) return NextResponse.json({ status: 401, detail: 'Sesión no válida' }, { status: 401 });

  const headers = new Headers();
  for (const h of FORWARDED_HEADERS) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set('x-recaudos-session', session);

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    body = await request.text();
    if (body.length > MAX_BODY)
      return NextResponse.json({ status: 413, detail: 'Payload demasiado grande' }, { status: 413 });
  }

  const upstream = await fetch(`${serverConfig.bffUrl}/${path.join('/')}${request.nextUrl.search}`, {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  }).catch(() => undefined);

  if (!upstream) return NextResponse.json({ status: 502, detail: 'Servicio no disponible' }, { status: 502 });
  if (upstream.status === 401 || (request.method === 'DELETE' && upstream.ok)) jar.delete(serverConfig.cookieName);

  return new NextResponse(upstream.status === 204 ? null : await upstream.text(), {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
  });
}

export { handler as GET, handler as POST, handler as DELETE };
