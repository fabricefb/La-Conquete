-- ═══════════════════════════════════════════════════════════════════
-- 25 — Statut d'église + départements ouverts aux inscriptions
-- À exécuter dans Supabase → SQL Editor.
-- Idempotent : peut être relancé sans erreur.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Statut déclaré à l'inscription (visiteur / membre / en découverte)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS church_status text NOT NULL DEFAULT 'member';

DO $$
BEGIN
  ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_church_status_check
    CHECK (church_status IN ('member', 'visitor', 'seeker'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN user_profiles.church_status IS
  'Statut déclaré : member = membre, visitor = visiteur, seeker = en découverte.';

-- 2. Média & Communication (premier département ouvert)
INSERT INTO departments (name, slug, description, icon_name, accent_color, meeting_schedule, sort_order, is_active)
SELECT
  'Média & Communication',
  'media-communication',
  'Captation, diffusion et communication des activités de l''église.',
  'MonitorPlay',
  'gold',
  NULL,
  0,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM departments
  WHERE slug = 'media-communication'
     OR name ILIKE 'média%'
     OR name ILIKE 'media%'
);

-- 3. Évangélisation (second département ouvert)
INSERT INTO departments (name, slug, description, icon_name, accent_color, meeting_schedule, mission, activities, requirements, sort_order, is_active)
SELECT
  'Évangélisation',
  'evangelisation',
  'Porter la Bonne Nouvelle aux nations, faire des disciples et équiper les saints pour l''œuvre du ministère.',
  'Compass',
  'gold',
  'Samedi à 07h00',
  'Atteindre chaque quartier de Lubumbashi avec l''Évangile, former des évangélistes et assurer le suivi des nouveaux convertis.',
  'Sorties d''évangélisation hebdomadaires, distribution de Bibles et tracts, visites domiciliaires, campagnes de masse.',
  'Être membre actif, avoir suivi les cours de baptême.',
  1,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM departments
  WHERE slug = 'evangelisation'
     OR name ILIKE '%évangélis%'
);

UPDATE departments
SET is_active = true
WHERE slug IN ('media-communication', 'evangelisation');
