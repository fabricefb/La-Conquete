import type { Theme } from '../types';

/* Deux verrous de marque : le blanc sur fond sombre, le navy sur fond clair.
   Les réglages back-office priment quand ils sont remplis. */
export const LOGO_DARK = '/logo-conquete.png';
export const LOGO_LIGHT = '/logo-couleur.png';

export function resolveLogo(
  theme: Theme | undefined,
  darkOverride?: string | null,
  lightOverride?: string | null,
): string {
  const isLight = theme === 'light';
  const custom = (isLight ? lightOverride : darkOverride)?.trim();
  if (custom) return custom;
  return isLight ? LOGO_LIGHT : LOGO_DARK;
}
