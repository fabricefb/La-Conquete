-- ═══════════════════════════════════════════════════════════════
-- FIX COMPLET: department_requests + RLS + departments existants
-- Exécuter APRÈS 11_fix_departments_rls.sql
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Créer la table department_requests (manquante !) ───────
CREATE TABLE IF NOT EXISTS department_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'accepte', 'refuse')),
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dept_requests_user ON department_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_requests_dept ON department_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_requests_status ON department_requests(status);

-- Pas de RLS (même pattern que le reste)
ALTER TABLE department_requests DISABLE ROW LEVEL SECURITY;

-- Trigger updated_at
DO $$ BEGIN
  CREATE TRIGGER trg_dept_requests_updated_at
    BEFORE UPDATE ON department_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

-- ─── 2. Vérifier/insérer le département Évangélisation ───────
INSERT INTO departments (name, slug, description, icon_name, accent_color, meeting_schedule, mission, activities, requirements, sort_order)
VALUES (
  'Évangélisation', 'evangelisation',
  'Porter la Bonne Nouvelle aux nations, faire des disciples et équiper les saints pour l''œuvre du ministère.',
  'Compass', 'gold', 'Samedi à 07h00',
  'Atteindre chaque quartier de Lubumbashi avec l''Évangile, former des évangélistes et assurer le suivi des nouveaux convertis.',
  'Sorties d''évangélisation hebdomadaires, distribution de Bibles et tracts, visites domiciliaires, campagnes de masse.',
  'Être membre actif, avoir suivi les cours de baptême.',
  1
) ON CONFLICT (slug) DO NOTHING;

-- ─── 3. Vérifier/insérer Protocole et Accueil ─────────────────
INSERT INTO departments (name, slug, description, icon_name, accent_color, meeting_schedule, mission, activities, requirements, sort_order)
VALUES (
  'Protocole et Accueil', 'protocole-et-accueil',
  'Le visage de l''église. Planification, accueil des fidèles, comptage, gestion des nouveaux venus.',
  'Shield', 'gold', 'Samedi à 09h00',
  'Garantir la fluidité, l''ordre et l''excellence lors de chaque culte. Être le premier contact des visiteurs.',
  'Gestion des entrées, comptage des présences, accueil des nouveaux venus, rapports de culte, coordination des équipes de rotation.',
  'Être ponctuel, avoir un sens aigu du service, porter l''image de l''église.',
  7
) ON CONFLICT (slug) DO NOTHING;

-- ─── 4. Vérifier les 4 autres départements de base ────────────
INSERT INTO departments (name, slug, description, icon_name, accent_color, meeting_schedule, mission, activities, requirements, sort_order) VALUES
  ('Louange & Adoration', 'louange-adoration', 'Élever le nom de Jésus à travers la musique, les chants et la danse pour la gloire de Dieu.', 'Music', 'ember', 'Mercredi à 17h00', 'Créer une atmosphère de louange qui invite la présence de Dieu lors de chaque culte.', 'Répétitions hebdomadaires, composition de chants, formations musicales, accompagnement des cultes.', 'Avoir un talent musical ou vocal, être ponctuel aux répétitions.', 2),
  ('Intercession', 'intercession', 'Porter les fardeaux dans la prière, intercéder pour l''église, la communauté et les nations.', 'Heart', 'gold', 'Mardi à 18h00', 'Être un rempart spirituel par la prière fervente et persévérante.', 'Veillées de prière, chaînes de jeûne et prière, intercession pour les malades et les besoins de l''église.', 'Avoir une vie de prière personnelle établie, être disponible pour les veillées.', 3),
  ('Diaconie', 'diaconie', 'Servir les membres dans leurs besoins pratiques, organiser l''entraide et la solidarité.', 'HandHeart', 'ember', 'Vendredi à 16h00', 'Incarner l''amour du Christ par un service pratique et désintéressé envers les membres et la communauté.', 'Visites aux malades et prisonniers, aide aux nécessiteux, organisation de repas communautaires.', 'Avoir un cœur de serviteur, être disponible et discret.', 4),
  ('École du Dimanche', 'ecole-du-dimanche', 'Enseigner la Parole de Dieu aux enfants et aux nouveaux convertis de manière structurée.', 'GraduationCap', 'gold', 'Dimanche à 08h00', 'Former des disciples fondés sur la Parole, depuis le plus jeune âge.', 'Cours bibliques par tranches d''âge, matériel pédagogique, activités ludiques, évaluation trimestrielle.', 'Aimer les enfants, avoir des connaissances bibliques de base.', 5)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- RÉCAPITULATIF
-- ═══════════════════════════════════════════════════════════════
-- Table department_requests CRÉÉE (c'était ça le bug !)
-- 7 départements insérés (dont Protocole et Accueil)
-- RLS désactivé sur department_requests
-- ═══════════════════════════════════════════════════════════════