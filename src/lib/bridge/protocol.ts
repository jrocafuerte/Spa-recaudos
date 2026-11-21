import { z } from 'zod';

/**
 * Contrato del puente WebView ↔ App nativa (versión 1).
 *
 * IMPORTANTE: este archivo es el contrato compartido. Su copia en
 * `spa-banca-movil/src/features/service-payments/bridge/protocol.ts` debe
 * mantenerse idéntica (CI verifica el hash del contrato en ambos repos).
 * Cambios incompatibles ⇒ incrementar BRIDGE_VERSION y soportar N-1.
 */
export const BRIDGE_VERSION = 1 as const;

const Currency = z.enum(['USD', 'PEN', 'COP', 'MXN']);

/** Mensajes que el micro frontend envía a la app nativa. */
export const WebToNativeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('READY') }),
  z.object({
    type: z.literal('SET_HEADER'),
    payload: z.object({ title: z.string().max(40), canGoBack: z.boolean() }),
  }),
  z.object({
    type: z.literal('REQUEST_STEP_UP'),
    payload: z.object({
      intentHash: z.string().regex(/^[a-f0-9]{64}$/),
      amount: z.number().positive(),
      currency: Currency,
      billerName: z.string().max(60),
      reference: z.string().max(20),
    }),
  }),
  z.object({ type: z.literal('SHARE_RECEIPT'), payload: z.object({ text: z.string().max(500) }) }),
  z.object({
    type: z.literal('HAPTIC'),
    payload: z.object({ style: z.enum(['light', 'success', 'warning', 'error']) }),
  }),
  z.object({ type: z.literal('SESSION_EXPIRED') }),
  z.object({ type: z.literal('CLOSE'), payload: z.object({ reason: z.enum(['done', 'cancel']) }) }),
  /** Navegación a pantallas nativas: solo rutas de una allowlist cerrada. */
  z.object({ type: z.literal('OPEN_NATIVE'), payload: z.object({ route: z.enum(['position', 'transfers']) }) }),
]);

/** Mensajes que la app nativa envía al micro frontend. */
export const NativeToWebSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('INIT'),
    payload: z.object({
      locale: z.string().max(10),
      theme: z.enum(['light', 'dark']),
      platform: z.enum(['ios', 'android']),
      appVersion: z.string().max(20),
    }),
  }),
  z.object({
    type: z.literal('STEP_UP_RESULT'),
    payload: z.discriminatedUnion('status', [
      z.object({ status: z.literal('approved'), stepUpToken: z.string().min(20).max(4096) }),
      z.object({ status: z.literal('cancelled') }),
      z.object({ status: z.literal('failed'), reason: z.string().max(100).optional() }),
    ]),
  }),
  z.object({ type: z.literal('BACK_PRESSED') }),
  z.object({ type: z.literal('APP_STATE'), payload: z.object({ state: z.enum(['active', 'background']) }) }),
]);

const EnvelopeBase = z.object({
  v: z.literal(BRIDGE_VERSION),
  id: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
  /** id del mensaje al que responde (request/response). */
  replyTo: z
    .string()
    .regex(/^[A-Za-z0-9-]{8,64}$/)
    .optional(),
  ts: z.number().int().positive(),
});

export const WebEnvelopeSchema = EnvelopeBase.extend({ source: z.literal('recaudos-web') }).and(WebToNativeSchema);
export const NativeEnvelopeSchema = EnvelopeBase.extend({ source: z.literal('banca-app') }).and(NativeToWebSchema);

export type WebToNative = z.infer<typeof WebToNativeSchema>;
export type NativeToWeb = z.infer<typeof NativeToWebSchema>;
export type WebEnvelope = z.infer<typeof WebEnvelopeSchema>;
export type NativeEnvelope = z.infer<typeof NativeEnvelopeSchema>;

/** Límite de tamaño de mensaje para evitar abuso de memoria en el puente. */
export const MAX_MESSAGE_BYTES = 8 * 1024;

export function parseNativeMessage(raw: unknown): NativeEnvelope | undefined {
  if (typeof raw !== 'string' || raw.length > MAX_MESSAGE_BYTES) return undefined;
  try {
    const result = NativeEnvelopeSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

export function parseWebMessage(raw: unknown): WebEnvelope | undefined {
  if (typeof raw !== 'string' || raw.length > MAX_MESSAGE_BYTES) return undefined;
  try {
    const result = WebEnvelopeSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
