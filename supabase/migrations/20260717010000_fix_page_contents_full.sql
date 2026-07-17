-- ═══════════════════════════════════════════════════════════════════
-- FIX COMPLET page_contents — Église Évangélique La Conquête
-- Date: 2026-07-17
-- Problèmes résolus:
--   1. RLS bloquait toutes les écritures depuis la clé anon
--   2. CHECK constraint limitait à 6 pages (manquait departments, emissions, etc.)
--   3. Anciennes graines avec mauvaises clés (image_url vs bg_image, etc.)
--   4. Ajout du champ topbar manquant
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. DÉSACTIVER RLS sur page_contents ──────────────────────────
-- L'autorisation est gérée dans le code applicatif (comme user_profiles)
ALTER TABLE page_contents DISABLE ROW LEVEL SECURITY;

-- ─── 2. ÉTENDRE le CHECK constraint pour toutes les pages ──────────
ALTER TABLE page_contents DROP CONSTRAINT IF EXISTS page_contents_page_check;
ALTER TABLE page_contents ADD CONSTRAINT page_contents_page_check
  CHECK (page IN (
    'home', 'about', 'activities', 'events', 'media', 'contact',
    'departments', 'emissions', 'predications', 'dons'
  ));

-- ─── 3. SUPPRIMER les anciennes graines mal alignées ───────────────
-- Le code utilise des clés différentes de celles du schema initial
DELETE FROM page_contents WHERE page = 'home';

-- ─── 4. RESEED avec les BONNES clés (celles que le code lit) ─────
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order) VALUES
  -- HOME: Topbar
  ('home', 'topbar', 'phone', '+243 00 000 0000', 'text', 'Téléphone bande passante', 0),
  ('home', 'topbar', 'email', 'contact@laconquete.cd', 'text', 'Email bande passante', 1),

  -- HOME: Hero
  ('home', 'hero', 'bg_image', '', 'image_url', 'Image de fond héro', 10),
  ('home', 'hero', 'bg_images', '', 'text', 'Images diaporama (séparées par ,)', 11),
  ('home', 'hero', 'subtitle', 'Une communauté de foi qui transforme des vies', 'text', 'Sous-titre héro', 12),

  -- HOME: Pillars
  ('home', 'pillars', 'pillar_1_title', 'Foi', 'text', 'Pilier 1 — Titre', 20),
  ('home', 'pillars', 'pillar_1_desc', '', 'text', 'Pilier 1 — Description', 21),
  ('home', 'pillars', 'pillar_2_title', 'Communauté', 'text', 'Pilier 2 — Titre', 22),
  ('home', 'pillars', 'pillar_2_desc', '', 'text', 'Pilier 2 — Description', 23),
  ('home', 'pillars', 'pillar_3_title', 'Mission', 'text', 'Pilier 3 — Titre', 24),
  ('home', 'pillars', 'pillar_3_desc', '', 'text', 'Pilier 3 — Description', 25),

  -- HOME: About (section "unique" sur la page)
  ('home', 'about', 'text_1', '', 'text', 'Texte principal Qui sommes-nous', 30),
  ('home', 'about', 'text_2', '', 'text', 'Texte secondaire Qui sommes-nous', 31),
  ('home', 'about', 'bible_text', '', 'text', 'Citation biblique Qui sommes-nous', 32),
  ('home', 'about', 'image', '', 'image_url', 'Photo Qui sommes-nous', 33),

  -- HOME: Quote
  ('home', 'quote', 'text', '', 'text', 'Texte de la citation', 40),
  ('home', 'quote', 'reference', '', 'text', 'Référence de la citation', 41)
ON CONFLICT (page, section_key, field_key) DO UPDATE SET
  value = EXCLUDED.value,
  type = EXCLUDED.type,
  label = EXCLUDED.label,
  updated_at = now();

-- ─── 5. RESEED pages secondaires avec les clés que le code lit ────
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order) VALUES
  -- ABOUT PAGE
  ('about', 'hero', 'badge', 'Notre Identité', 'text', 'Badge', 0),
  ('about', 'hero', 'title', 'Qui sommes-nous', 'text', 'Titre', 1),
  ('about', 'hero', 'subtitle', '', 'text', 'Sous-titre', 2),
  ('about', 'vision', 'text', 'La Conquête des âmes, La Conquête des terres habitables et cultivables.', 'text', 'Texte vision', 5),
  ('about', 'mission', 'text', 'Nous œuvrons au moyen de la Parole de Dieu, à gagner les âmes pour Jésus. Nous les équipons, les instruisons et les envoyons comme agents de transformation dans les nations.', 'text', 'Texte mission', 6),
  ('about', 'values', 'title', 'Nos Valeurs', 'text', 'Titre valeurs', 10),
  ('about', 'values', 'subtitle', '', 'text', 'Sous-titre valeurs', 11),

  -- ACTIVITIES PAGE
  ('activities', 'hero', 'badge', 'Communauté', 'text', 'Badge', 0),
  ('activities', 'hero', 'title', '', 'text', 'Titre', 1),
  ('activities', 'hero', 'subtitle', '', 'text', 'Sous-titre', 2),
  ('activities', 'ministries', 'title', '', 'text', 'Titre ministères', 10),
  ('activities', 'ministries', 'subtitle', '', 'text', 'Sous-titre ministères', 11),
  ('activities', 'cta', 'title', '', 'text', 'Titre CTA', 20),
  ('activities', 'cta', 'description', '', 'text', 'Description CTA', 21),

  -- EVENTS PAGE
  ('events', 'hero', 'badge', 'Calendrier', 'text', 'Badge', 0),
  ('events', 'hero', 'title', '', 'text', 'Titre', 1),
  ('events', 'hero', 'subtitle', '', 'text', 'Sous-titre', 2),

  -- CONTACT PAGE
  ('contact', 'hero', 'subtitle', '', 'text', 'Sous-titre', 0),

  -- DEPARTMENTS PAGE
  ('departments', 'hero', 'subtitle', '', 'text', 'Sous-titre', 0),

  -- MEDIA PAGE
  ('media', 'hero', 'subtitle', '', 'text', 'Sous-titre', 0),

  -- EMISSIONS PAGE
  ('emissions', 'hero', 'subtitle', '', 'text', 'Sous-titre', 0),

  -- PREDICATIONS PAGE
  ('predications', 'hero', 'subtitle', '', 'text', 'Sous-titre', 0)
ON CONFLICT (page, section_key, field_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- FIN — Exécuter ce script dans le SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════════