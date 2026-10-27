/* Variantes locales pour les connexions lentes : les photos de reportage
   existent en 800 px et les portraits en 480 px. Les images venues du
   back-office ne sont pas concernées (pas de variante connue). */
const VARIANTS: Record<string, { small: string; smallWidth: number; fullWidth: number }> = {
  '/church-photo-1.webp': { small: '/church-photo-1-800.webp', smallWidth: 800, fullWidth: 1400 },
  '/church-photo-2.webp': { small: '/church-photo-2-800.webp', smallWidth: 800, fullWidth: 1400 },
  '/church-photo-3.webp': { small: '/church-photo-3-800.webp', smallWidth: 800, fullWidth: 1400 },
  '/bible.webp': { small: '/bible-800.webp', smallWidth: 800, fullWidth: 1400 },
  '/predication-1.webp': { small: '/predication-1-800.webp', smallWidth: 800, fullWidth: 1400 },
  '/maurisse-esosa.webp': { small: '/maurisse-esosa-800.webp', smallWidth: 800, fullWidth: 1400 },
  '/hero-priere-eec.webp': { small: '/hero-priere-eec-800.webp', smallWidth: 800, fullWidth: 1600 },
  '/priere.webp': { small: '/priere-600.webp', smallWidth: 600, fullWidth: 900 },
  '/pasteur-romain-kazadi.webp': { small: '/pasteur-romain-kazadi-480.webp', smallWidth: 480, fullWidth: 800 },
  '/pasteur-david-kateba.webp': { small: '/pasteur-david-kateba-480.webp', smallWidth: 480, fullWidth: 800 },
  '/pasteur-richard-mukendi.webp': { small: '/pasteur-richard-mukendi-480.webp', smallWidth: 480, fullWidth: 800 },
};

export function imageSrcSet(src: string): string | undefined {
  /* Le back-office accepte aussi une URL absolue du site : on la ramène au
     chemin local pour retrouver la variante légère. */
  const path = src.startsWith(location.origin) ? src.slice(location.origin.length) : src;
  const v = VARIANTS[path];
  return v ? `${v.small} ${v.smallWidth}w, ${src} ${v.fullWidth}w` : undefined;
}
