'use client';

import {
  BRIDGE_VERSION,
  type NativeEnvelope,
  type NativeToWeb,
  type WebToNative,
  parseNativeMessage,
} from './protocol';

type Listener = (msg: NativeEnvelope) => void;

declare global {
  interface Window {
    /** Inyectado por react-native-webview. */
    ReactNativeWebView?: { postMessage(message: string): void };
    /** Punto de entrada que la app nativa invoca vía injectJavaScript. */
    __BANCA_BRIDGE__?: { receive(raw: string): void };
  }
}

const newId = () => crypto.randomUUID();

/**
 * Cliente del puente. Toda entrada se valida con Zod (no se confía en el
 * contenido aunque provenga de la app). Expone `send` (fire & forget) y
 * `request` (espera la respuesta con `replyTo` y timeout).
 */
class NativeBridge {
  private listeners = new Set<Listener>();
  private pending = new Map<string, { resolve: (m: NativeEnvelope) => void; timer: ReturnType<typeof setTimeout> }>();

  install(): void {
    if (typeof window === 'undefined' || window.__BANCA_BRIDGE__) return;
    Object.defineProperty(window, '__BANCA_BRIDGE__', {
      value: Object.freeze({ receive: (raw: string) => this.receive(raw) }),
      writable: false,
      configurable: false,
    });
  }

  get isEmbedded(): boolean {
    return typeof window !== 'undefined' && !!window.ReactNativeWebView;
  }

  send(message: WebToNative, replyTo?: string): string {
    const id = newId();
    const envelope = { v: BRIDGE_VERSION, id, ts: Date.now(), source: 'recaudos-web' as const, replyTo, ...message };
    const raw = JSON.stringify(envelope);
    if (this.isEmbedded) window.ReactNativeWebView!.postMessage(raw);
    else devFallback(envelope as never, (m) => this.receive(JSON.stringify(m)));
    return id;
  }

  request<T extends NativeToWeb['type']>(
    message: WebToNative,
    expect: T,
    timeoutMs = 90_000,
  ): Promise<Extract<NativeEnvelope, { type: T }>> {
    return new Promise((resolve, reject) => {
      const id = this.send(message);
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('BRIDGE_TIMEOUT'));
      }, timeoutMs);
      this.pending.set(id, {
        timer,
        resolve: (m) =>
          m.type === expect
            ? resolve(m as Extract<NativeEnvelope, { type: T }>)
            : reject(new Error('BRIDGE_UNEXPECTED')),
      });
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private receive(raw: string): void {
    const msg = parseNativeMessage(raw);
    if (!msg) return; // mensajes inválidos se descartan silenciosamente
    if (msg.replyTo && this.pending.has(msg.replyTo)) {
      const p = this.pending.get(msg.replyTo)!;
      clearTimeout(p.timer);
      this.pending.delete(msg.replyTo);
      p.resolve(msg);
      return;
    }
    this.listeners.forEach((l) => l(msg));
  }
}

/**
 * Fuera del WebView (desarrollo en navegador) se simula la app nativa.
 * Nunca se activa en producción: allí el micro frontend solo funciona embebido.
 */
function devFallback(envelope: WebToNative & { id: string }, reply: (m: unknown) => void): void {
  if (process.env.NODE_ENV === 'production') return;
  const base = { v: BRIDGE_VERSION, id: newId(), ts: Date.now(), source: 'banca-app', replyTo: envelope.id };
  if (envelope.type === 'REQUEST_STEP_UP') {
    // En dev el step-up se obtiene del BFF de pruebas; aquí solo se simula una cancelación.
    setTimeout(
      () =>
        reply({ ...base, type: 'STEP_UP_RESULT', payload: { status: 'failed', reason: 'Solo disponible en la app' } }),
      300,
    );
  }
  console.info('[bridge:dev]', envelope.type);
}

export const bridge = new NativeBridge();
