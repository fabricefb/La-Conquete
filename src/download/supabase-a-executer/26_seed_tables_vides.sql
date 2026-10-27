-- ═══════════════════════════════════════════════════════════════════════════
-- 26 — PRÉ-REMPLISSAGE DES TABLES VIDES
--
-- Contexte : en production, le site s'affiche correctement mais `site_settings`,
-- `pastors` et `activity_cards` sont vides. Le public voit donc les valeurs de
-- secours du code, et le back-office démarre avec des listes et des champs
-- vides. Ce script recopie ces valeurs réelles dans la base, une seule fois.
--
-- Idempotent : `ON CONFLICT DO NOTHING` / garde `WHERE NOT EXISTS`.
-- Une valeur déjà enregistrée depuis le back-office n'est jamais écrasée.
--
-- NON RENSEIGNÉS VOLONTAIREMENT :
--   • `testimonials` — aucune parole de membre réelle n'est disponible.
--   • `events`       — aucun événement à venir réellement daté n'est disponible.
--   Les sections correspondantes restent masquées tant que le bureau pastoral
--   n'a pas saisi de vrais contenus dans le back-office.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Réglages du site ──────────────────────────────────────────────────
INSERT INTO site_settings (key, value, type, category, label, description, sort_order, updated_at)
VALUES
  ('church_name', 'Église Évangélique La Conquête', 'text', 'general',
   'Nom de l''église', 'Affiché dans l''en-tête, le pied de page et les métadonnées.', 10, now()),

  ('site_logo_url', '/logo-conquete.png', 'url', 'general',
   'Logo du site', 'Chemin ou URL du logo affiché dans l''en-tête et le pied de page.', 20, now()),

  ('hero_default_exhortation', 'Que la paix du Seigneur soit avec vous aujourd''hui !', 'text', 'general',
   'Exhortation par défaut', 'Message d''accueil utilisé par le tableau de bord.', 30, now()),

  ('phone', '+243 997 030 259', 'text', 'contact',
   'Téléphone principal', 'Numéro public unique de l''église.', 110, now()),

  ('church_phone', '+243 997 030 259', 'text', 'contact',
   'Téléphone (dons)', 'Numéro affiché sur la page des dons.', 120, now()),

  ('email', 'egliseevangeliquelaconquete@gmail.com', 'text', 'contact',
   'Adresse e-mail', 'Adresse de contact publique.', 130, now()),

  ('address', '520, Avenue N''Djamena, coin Mama Yemo', 'text', 'contact',
   'Adresse', 'Adresse du temple.', 140, now()),

  ('city', 'Lubumbashi, RD Congo', 'text', 'contact',
   'Ville', 'Ville et pays affichés avec l''adresse.', 150, now()),

  ('facebook_url', 'https://web.facebook.com/laconquete.eec', 'url', 'social',
   'Facebook', 'Laisser vide pour masquer le bouton. Format : https://facebook.com/…', 500, now()),

  ('instagram_url', 'https://www.instagram.com/laconquete_eec/', 'url', 'social',
   'Instagram', 'Laisser vide pour masquer le bouton. Format : https://instagram.com/…', 501, now()),

  ('youtube_url', 'https://www.youtube.com/@LaconqueteEEC', 'url', 'social',
   'YouTube', 'Laisser vide pour masquer le bouton. Format : https://youtube.com/@…', 502, now()),

  ('whatsapp_url', 'https://wa.me/243997030259', 'url', 'social',
   'WhatsApp', 'Message direct. Format : https://wa.me/243…', 503, now()),

  ('whatsapp_channel_url', '', 'url', 'social',
   'Canal WhatsApp', 'Laisser vide pour masquer ce bouton. Format : https://whatsapp.com/channel/…', 504, now()),

  ('tiktok_url', '', 'url', 'social',
   'TikTok', 'Laisser vide pour masquer ce bouton. Format : https://tiktok.com/@…', 505, now()),

  ('x_url', '', 'url', 'social',
   'X (Twitter)', 'Laisser vide pour masquer ce bouton. Format : https://x.com/…', 506, now()),

  ('linkedin_url', '', 'url', 'social',
   'LinkedIn', 'Laisser vide pour masquer ce bouton. Format : https://linkedin.com/company/…', 507, now()),

  ('telegram_url', '', 'url', 'social',
   'Telegram', 'Laisser vide pour masquer ce bouton. Format : https://t.me/…', 508, now())
ON CONFLICT (key) DO NOTHING;

-- ─── 2. Bureau pastoral (3 pasteurs réels) ───────────────────────────────
INSERT INTO pastors (name, role, bio, photo_url, thought, sort_order, is_main, is_active)
SELECT
  'Josué Romain Kazadi',
  'Pasteur Principal',
  'Homme de Dieu visionnaire et passionné, il conduit l''église avec sagesse et détermination.',
  '/pasteur-romain-kazadi.webp',
  'La Parole de Dieu est notre boussole.',
  0, true, true
WHERE NOT EXISTS (SELECT 1 FROM pastors WHERE name = 'Josué Romain Kazadi');

INSERT INTO pastors (name, role, bio, photo_url, thought, sort_order, is_main, is_active)
SELECT
  'Dr David Kateba',
  '1er Pasteur Assistant',
  '',
  '/pasteur-david-kateba.webp',
  '',
  1, false, true
WHERE NOT EXISTS (SELECT 1 FROM pastors WHERE name = 'Dr David Kateba');

INSERT INTO pastors (name, role, bio, photo_url, thought, sort_order, is_main, is_active)
SELECT
  'Richard Mukendi',
  '2e Pasteur Assistant',
  '',
  '/pasteur-richard-mukendi.webp',
  '',
  2, false, true
WHERE NOT EXISTS (SELECT 1 FROM pastors WHERE name = 'Richard Mukendi');

-- ─── 3. Cartes d'activités de l'accueil ──────────────────────────────────
INSERT INTO activity_cards (card_key, title, stat_label, image_url, target_page, sort_order, is_active, updated_at)
VALUES
  ('predications', 'Prédications', 'Messages récents', '/predication-1.webp', 'predications', 1, true, now()),
  ('events',       'Événements',   'L''agenda',        '/priere.webp',        'events',       2, true, now()),
  ('ministries',   'Ministères',   'Les départements', '/church-photo-2.webp','ministeres',   3, true, now()),
  ('medias',       'Médias',       'Vidéos & podcasts','/bible.webp',         'media',        4, true, now()),
  ('actualites',   'Actualités',   'Dernières nouvelles','/church-photo-1.webp','blog',       5, true, now())
ON CONFLICT (card_key) DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION (après exécution) :
--   SELECT count(*) FROM site_settings;      -- attendu : 17
--   SELECT count(*) FROM pastors;            -- attendu : 3 (ou plus)
--   SELECT count(*) FROM activity_cards;     -- attendu : 5 (ou plus)
--   SELECT count(*) FROM testimonials;       -- 0 tant que rien n'est saisi
--   SELECT count(*) FROM events;             -- 0 tant que rien n'est saisi
--
-- Pour ajouter un témoignage réel : back-office → Témoignages.
-- Pour ajouter un événement réel  : back-office → Événements (date obligatoire).
-- ═══════════════════════════════════════════════════════════════════════════
