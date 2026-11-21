# Seguridad — spa-recaudos

Marco general y pipeline: [`spa-banca-movil/docs/SECURITY.md`](https://github.com/jrocafuerte/spa-banca-movil/blob/main/docs/SECURITY.md).

## Controles de este micro frontend

| Control | Dónde |
|---|---|
| CSP estricta por request: nonce + `strict-dynamic`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'` | `src/proxy.ts` |
| HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP/CORP | `next.config.ts` |
| Sesión en cookie `__Host-rc_sid` HttpOnly + Secure + SameSite=Strict (nunca accesible desde JS) | `src/app/session/start/route.ts` |
| Handoff token por POST (fuera de URL, historial y logs) | `session/start/route.ts` |
| Proxy same-origin con allowlist de rutas/métodos, anti path traversal, body ≤ 16 KB, timeout | `src/lib/server/proxy-policy.ts`, `src/app/api/[...path]/route.ts` |
| Configuración solo-servidor (`server-only`), sin `NEXT_PUBLIC_*` sensibles | `src/lib/server/config.ts` |
| Puente validado con Zod (versión, origen, tamaño, tipos) | `src/lib/bridge/protocol.ts` |
| Pago confirmado en la app nativa (biometría + step-up), nunca en el WebView | `src/components/PayBillFlow.tsx` |
| Difuminado de datos cuando la app pasa a segundo plano | `src/lib/bridge/BridgeProvider.tsx` |
| Sin `dangerouslySetInnerHTML`, sin `localStorage` para sesión, sin estilos inline (CSP) | reglas `.semgrep/rules.yml` |
| Sin source maps en producción, `poweredByHeader: false`, salida `standalone` en imagen no-root | `next.config.ts`, `Dockerfile` |
