/* ═══════════════════════════════════════════════════════════════════════
   COORDONNÉES OFFICIELLES — source unique de vérité
   ───────────────────────────────────────────────────────────────────────
   Toutes les pages publiques, le header, le footer, la bande passante et le
   SEO lisent ce fichier. Aucune valeur de contact ne doit être recopiée dans
   un composant : c'est précisément ce qui avait laissé six numéros de
   téléphone et une ville erronée coexister en production.

   Les champs Supabase `site_settings` peuvent écraser ces valeurs (cas d'un
   réglage fait depuis l'admin), jamais l'inverse.
   ─────────────────────────────────────────────────────────────────────── */

export const CHURCH = {
  name: 'Église Évangélique La Conquête',
  shortName: 'La Conquête',
  acronym: 'E.E.C',

  /** devise officielle — Psaumes 2:8 */
  vision: 'La conquête des âmes, la conquête des terres habitables et cultivables',
  visionReference: 'Psaumes 2:8',

  pastor: {
    name: 'Josué Romain Kazadi',
    title: 'Pasteur principal',
  },

  address: {
    street: "520, Avenue N'Djamena",
    landmark: "à côté de la Cour d'Ordre Militaire",
    city: 'Lubumbashi',
    country: 'RD Congo',
    get full() {
      return `${this.street}, réf. ${this.landmark}, ${this.city}, ${this.country}`;
    },
  },

  /** Un seul numéro publié. Les autres circulaient par erreur. */
  phone: {
    display: '+243 997 030 259',
    /** format tel: — sans espaces ni signes */
    href: 'tel:+243997030259',
  },

  email: 'egliseevangeliquelaconquete@gmail.com',

  social: {
    facebook: 'https://web.facebook.com/laconquete.eec',
    instagram: 'https://www.instagram.com/laconquete_eec/',
    /** `laconquete.org` est aujourd'hui un domaine parking vide :
        ne pas l'afficher tant qu'il ne pointe pas sur ce site. */
    website: '',
  },
} as const;

/** Lit une coordonnée depuis `site_settings` si l'admin l'a définie, sinon la source unique. */
export function churchSetting(
  settingsMap: Record<string, string>,
  key: string,
  fallback: string,
): string {
  const v = settingsMap[key];
  return v && v.trim() ? v.trim() : fallback;
}
