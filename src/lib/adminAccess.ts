import type { AdminTab } from '../types';

/* Onglets de l'espace pastoral : la vie de l'église et les contenus.
   Comptes, thème, paramètres, direct et validation des chefs de
   département restent dans l'administration. */
export const PASTORAL_TABS: ReadonlySet<AdminTab> = new Set<AdminTab>([
  'dashboard', 'alerts',
  'departments', 'ministries', 'assignments', 'creneaux', 'events',
  'locations', 'media_communication',
  'pipeline', 'onboarding', 'protocol', 'evangelism',
  'contents', 'articles', 'activity_cards', 'predications', 'audio',
  'testimonials', 'messages', 'annonces', 'communiques', 'emissions',
  'visuals', 'homepage_builder', 'guide',
]);
