# spa-recaudos

Micro frontend de **Pago de servicios** — Next.js 16 (App Router) + React 19. Se ejecuta **embebido en la app nativa** (`spa-banca-movil`) mediante WebView y se comunica con ella por un puente tipado, ofreciendo comportamiento nativo (cabecera, atrás, biometría, hápticos, compartir).

Arquitectura completa: [`spa-banca-movil/docs/ARCHITECTURE.md`](https://github.com/jrocafuerte/spa-banca-movil/blob/main/docs/ARCHITECTURE.md) · Seguridad: [`docs/SECURITY.md`](docs/SECURITY.md)

## Cómo funciona

1. La app abre el WebView con `POST /session/start` (form `handoff=<token de un solo uso>`).
2. El route handler canjea el token con `mse-recaudos` (servidor a servidor) y fija la cookie `__Host-rc_sid` (HttpOnly, Secure, SameSite=Strict). El token nunca toca la URL ni JavaScript.
3. El navegador solo llama a `/api/*` (mismo origen). `src/app/api/[...path]/route.ts` aplica una **allowlist** de rutas y reenvía al BFF con el header interno de sesión.
4. Para pagar, el micro frontend pide a la app `REQUEST_STEP_UP`; la app confirma con biometría y devuelve un token ligado a la transacción.

## Estructura

```
src/
  proxy.ts                    # CSP con nonce por request + no-store
  app/
    page.tsx                  # categorías y búsqueda de empresas
    billers/[id]/page.tsx     # referencia → deuda → cuenta → resumen → pago
    receipt/[id]/page.tsx     # comprobante (compartir nativo)
    session/start/route.ts    # canje del handoff (POST)
    api/[...path]/route.ts    # proxy seguro hacia mse-recaudos
  lib/bridge/                 # protocol.ts (contrato compartido), cliente y provider del puente
  lib/server/                 # configuración solo-servidor y política del proxy
  components/                 # pantallas cliente
```

## Desarrollo

```bash
cp .env.example .env
npm ci
npm run dev -- -p 3002      # fuera del WebView el puente usa un simulador (solo dev)
npm test && npm run lint && npm run typecheck && npm run build
```

Contrato del puente: `src/lib/bridge/protocol.ts` debe ser idéntico al de `spa-banca-movil` (verificado en CI con `contracts/bridge-protocol.sha256`).
