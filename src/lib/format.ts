/**
 * Formato de montos y fechas alineado con la app nativa: la configuración
 * regional la define el banco y llega en el mensaje INIT del puente.
 */
let locale = 'es-419';

export function setLocale(value: string): void {
  try {
    [locale] = Intl.getCanonicalLocales(value) as [string];
  } catch {
    // valor inválido: se mantiene el actual
  }
}

export const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amount);

/** Fechas de calendario (YYYY-MM-DD) en UTC para que no se corran un día. */
export function formatDate(value: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: dateOnly ? 'UTC' : undefined,
  }).format(new Date(dateOnly ? `${value}T12:00:00Z` : value));
}

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
