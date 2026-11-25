import { config, type IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBolt,
  faChevronRight,
  faCircleCheck,
  faDroplet,
  faFileInvoiceDollar,
  faGraduationCap,
  faShareNodes,
  faWifi,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Los estilos de Font Awesome se importan como CSS estático en el layout: inyectarlos en
// tiempo de ejecución (<style> sin nonce) sería bloqueado por la CSP.
config.autoAddCss = false;

/** Íconos Font Awesome (los mismos del Design System Beat; hoy el set Free). */
const ICONS = {
  bolt: faBolt,
  water: faDroplet,
  wifi: faWifi,
  school: faGraduationCap,
  services: faFileInvoiceDollar,
  'chevron-right': faChevronRight,
  success: faCircleCheck,
  share: faShareNodes,
} satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;

/** Ícono decorativo por defecto (oculto a lectores de pantalla); con `label` es informativo. */
export function Icon({ name, label, className }: { name: string; label?: string; className?: string }) {
  const icon = ICONS[name as IconName] ?? ICONS.services;
  return label ? (
    <FontAwesomeIcon icon={icon} className={className} title={label} role="img" aria-label={label} />
  ) : (
    <FontAwesomeIcon icon={icon} className={className} aria-hidden="true" />
  );
}
