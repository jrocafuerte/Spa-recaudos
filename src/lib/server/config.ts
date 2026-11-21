import 'server-only';

/** Configuración solo de servidor: nunca se expone al bundle del navegador. */
export const serverConfig = {
  bffUrl: process.env.MSE_RECAUDOS_URL ?? 'http://localhost:3001',
  internalSecret: process.env.INTERNAL_CLIENT_SECRET ?? '',
  /** `__Host-` exige Secure + Path=/ + sin Domain (no se comparte con subdominios). */
  cookieName: process.env.NODE_ENV === 'production' ? '__Host-rc_sid' : 'rc_sid',
  secureCookie: process.env.NODE_ENV === 'production',
  sessionTtl: 600,
};
