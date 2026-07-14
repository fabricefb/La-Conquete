-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION CONSOLIDÉE 10-16 — Église Évangélique La Conquête
-- ═══════════════════════════════════════════════════════════════════════════
-- Exécuter ce fichier EN ENTIER dans l'éditeur SQL de Supabase.
-- Chaque section est idempotente (IF NOT EXISTS, IF NOT EXISTS, ON CONFLICT DO NOTHING).
--
-- CONTENU :
--   10 — Module Protocole (cult_reports, teams, visitors, etc.)
--   11 — Désactiver RLS sur departments/positions/department_members
--   12 — department_requests + 7 départements seed
--   13 — visit_requests
--   14 — Tables manquantes (calendar_events, convertis, etc.)
--   15 — Rapports de culte multi-églises + ailes
--   16 — Fix department_members + auto-réparation
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  HELPER: Fonction trigger update_updated_at()                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  10 — MODULE PROTOCOLE ET ACCUEIL                                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ─── 10.1 cult_reports ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cult_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_name TEXT,
  cult_day TEXT NOT NULL CHECK (cult_day IN ('mercredi','vendredi','samedi','dimanche','autre')),
  cult_date DATE NOT NULL,
  men_count INTEGER NOT NULL DEFAULT 0,
  women_count INTEGER NOT NULL DEFAULT 0,
  children_count INTEGER NOT NULL DEFAULT 0,
  new_comers_count INTEGER NOT NULL DEFAULT 0,
  empty_seats INTEGER NOT NULL DEFAULT 0,
  total_attendance INTEGER GENERATED ALWAYS AS (men_count + women_count + children_count) STORED,
  incidents TEXT,
  team_group TEXT,
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','soumis','valide','rejete')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cult_reports_cult_date ON cult_reports(cult_date);
CREATE INDEX IF NOT EXISTS idx_cult_reports_user_id ON cult_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_cult_reports_cult_day ON cult_reports(cult_day);
CREATE INDEX IF NOT EXISTS idx_cult_reports_status ON cult_reports(status);

-- Trigger updated_at on cult_reports
CREATE OR REPLACE FUNCTION fn_update_cult_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_cult_report_updated_at
    BEFORE UPDATE ON cult_reports
    FOR EACH ROW EXECUTE FUNCTION fn_update_cult_report_updated_at();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

-- ─── 10.2 protocol_teams ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS protocol_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#d4a843',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_protocol_teams_active ON protocol_teams(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_protocol_teams_sort ON protocol_teams(sort_order);

-- ─── 10.3 protocol_team_members ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS protocol_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES protocol_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_team TEXT NOT NULL DEFAULT 'agent' CHECK (role_in_team IN ('agent','responsable','adjoint')),
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ptm_team ON protocol_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_ptm_user ON protocol_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ptm_active ON protocol_team_members(team_id, is_active) WHERE is_active = true;

-- ─── 10.4 protocol_schedules ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS protocol_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES protocol_teams(id) ON DELETE CASCADE,
  cult_day TEXT NOT NULL CHECK (cult_day IN ('mercredi','vendredi','samedi','dimanche')),
  week_number INTEGER,
  month INTEGER,
  year INTEGER,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, cult_day, week_number, year)
);

CREATE INDEX IF NOT EXISTS idx_protocol_schedules_team ON protocol_schedules(team_id);
CREATE INDEX IF NOT EXISTS idx_protocol_schedules_day ON protocol_schedules(cult_day);
CREATE INDEX IF NOT EXISTS idx_protocol_schedules_active ON protocol_schedules(is_active) WHERE is_active = true;

-- ─── 10.5 protocol_dress_code ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS protocol_dress_code (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cult_day TEXT NOT NULL CHECK (cult_day IN ('mercredi','vendredi','samedi','dimanche')) UNIQUE,
  description TEXT NOT NULL,
  required_items TEXT[] DEFAULT '{}',
  formality_level TEXT NOT NULL DEFAULT 'decontracte' CHECK (formality_level IN ('decontracte','correct','formel')),
  icon_hint TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 10.6 new_visitors ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS new_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT,
  visitor_gender TEXT CHECK (visitor_gender IN ('homme','femme')),
  visitor_quartier TEXT,
  how_known TEXT CHECK (how_known IN ('membre_invitation','reseaux_sociaux','passant','media','autre')),
  invited_by TEXT,
  follow_up_type TEXT CHECK (follow_up_type IN ('visite','appel','information','aucun')),
  cult_day TEXT,
  cult_date DATE NOT NULL,
  status TEXT DEFAULT 'nouveau' CHECK (status IN ('nouveau','contacte','suivi_en_cours','integre','perdu')),
  follow_up_notes TEXT,
  follow_up_by UUID REFERENCES auth.users(id),
  follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_new_visitors_cult_date ON new_visitors(cult_date);
CREATE INDEX IF NOT EXISTS idx_new_visitors_recorded_by ON new_visitors(recorded_by);
CREATE INDEX IF NOT EXISTS idx_new_visitors_status ON new_visitors(status);
CREATE INDEX IF NOT EXISTS idx_new_visitors_cult_day ON new_visitors(cult_day);

-- ─── 10.7 event_reminders ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  reminder_time TEXT NOT NULL CHECK (reminder_time IN ('matin','apres_midi','soir')),
  reminder_offset_hours INTEGER NOT NULL DEFAULT 2,
  message_template TEXT,
  target_type TEXT DEFAULT 'all' CHECK (target_type IN ('all','department','team','custom')),
  target_ids TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_reminders_event ON event_reminders(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_reminders_active ON event_reminders(is_active) WHERE is_active = true;

-- RLS désactivé sur toutes les tables du module protocole
ALTER TABLE cult_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_dress_code DISABLE ROW LEVEL SECURITY;
ALTER TABLE new_visitors DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders DISABLE ROW LEVEL SECURITY;

-- Seed : code vestimentaire par jour
INSERT INTO protocol_dress_code (cult_day, description, required_items, formality_level, icon_hint) VALUES
  ('mercredi', 'Tenue de ville décontractée mais correcte (chemise/haut blanc, pantalon/jupe sombre). Badge obligatoire.', '{badge}', 'correct', '👔'),
  ('vendredi', 'Tenue de ville décontractée mais correcte (chemise/haut blanc, pantalon/jupe sombre). Badge obligatoire.', '{badge}', 'correct', '👔'),
  ('samedi', 'Tenue libre et confortable (polo église si disponible, jean propre, baskets).', '{}', 'decontracte', '👕'),
  ('dimanche', 'Uniforme officiel et formel. Costume/cravate pour les hommes, tailleur/robe de cérémonie pour les femmes. Badge bien visible.', '{badge,uniforme,chaussures_fermees}', 'formel', '🎩')
ON CONFLICT (cult_day) DO NOTHING;

-- Seed : équipes par défaut
INSERT INTO protocol_teams (name, description, color, sort_order) VALUES
  ('Équipe Alpha', 'Première équipe de rotation pour le protocole et l''accueil.', '#d4a843', 1),
  ('Équipe Bêta', 'Deuxième équipe de rotation pour le protocole et l''accueil.', '#4a90d9', 2)
ON CONFLICT DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  11 — DÉSACTIVER RLS SUR DEPARTMENTS / POSITIONS / DEPARTMENT_MEMBERS  ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Supprimer toutes les policies existantes
DROP POLICY IF EXISTS departments_public_read ON departments;
DROP POLICY IF EXISTS departments_member_read ON departments;
DROP POLICY IF EXISTS departments_admin_read ON departments;
DROP POLICY IF EXISTS departments_admin_insert ON departments;
DROP POLICY IF EXISTS departments_admin_update ON departments;
DROP POLICY IF EXISTS departments_admin_delete ON departments;

DROP POLICY IF EXISTS positions_public_read ON positions;
DROP POLICY IF EXISTS positions_admin_all ON positions;
DROP POLICY IF EXISTS positions_leader_manage ON positions;
DROP POLICY IF EXISTS positions_leader_update ON positions;

DROP POLICY IF EXISTS dept_members_public_read ON department_members;
DROP POLICY IF EXISTS dept_members_self_read ON department_members;
DROP POLICY IF EXISTS dept_members_self_join ON department_members;
DROP POLICY IF EXISTS dept_members_admin_all ON department_members;
DROP POLICY IF EXISTS dept_members_leader_read ON department_members;
DROP POLICY IF EXISTS dept_members_leader_update ON department_members;
DROP POLICY IF EXISTS dept_members_self_leave ON department_members;

ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE department_members DISABLE ROW LEVEL SECURITY;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  12 — DEPARTMENT_REQUESTS + 7 DÉPARTEMENTS SEED                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

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

ALTER TABLE department_requests DISABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE TRIGGER trg_dept_requests_updated_at
    BEFORE UPDATE ON department_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

-- 7 départements seed
INSERT INTO departments (name, slug, description, icon_name, accent_color, meeting_schedule, mission, activities, requirements, sort_order) VALUES
  ('Évangélisation', 'evangelisation',
    'Porter la Bonne Nouvelle aux nations, faire des disciples et équiper les saints pour l''œuvre du ministère.',
    'Compass', 'gold', 'Samedi à 07h00',
    'Atteindre chaque quartier de Lubumbashi avec l''Évangile, former des évangélistes et assurer le suivi des nouveaux convertis.',
    'Sorties d''évangélisation hebdomadaires, distribution de Bibles et tracts, visites domiciliaires, campagnes de masse.',
    'Être membre actif, avoir suivi les cours de baptême.', 1),
  ('Louange & Adoration', 'louange-adoration',
    'Élever le nom de Jésus à travers la musique, les chants et la danse pour la gloire de Dieu.',
    'Music', 'ember', 'Mercredi à 17h00',
    'Créer une atmosphère de louange qui invite la présence de Dieu lors de chaque culte.',
    'Répétitions hebdomadaires, composition de chants, formations musicales, accompagnement des cultes.',
    'Avoir un talent musical ou vocal, être ponctuel aux répétitions.', 2),
  ('Intercession', 'intercession',
    'Porter les fardeaux dans la prière, intercéder pour l''église, la communauté et les nations.',
    'Heart', 'gold', 'Mardi à 18h00',
    'Être un rempart spirituel par la prière fervente et persévérante.',
    'Veillées de prière, chaînes de jeûne et prière, intercession pour les malades et les besoins de l''église.',
    'Avoir une vie de prière personnelle établie, être disponible pour les veillées.', 3),
  ('Diaconie', 'diaconie',
    'Servir les membres dans leurs besoins pratiques, organiser l''entraide et la solidarité.',
    'HandHeart', 'ember', 'Vendredi à 16h00',
    'Incarner l''amour du Christ par un service pratique et désintéressé envers les membres et la communauté.',
    'Visites aux malades et prisonniers, aide aux nécessiteux, organisation de repas communautaires.',
    'Avoir un cœur de serviteur, être disponible et discret.', 4),
  ('École du Dimanche', 'ecole-du-dimanche',
    'Enseigner la Parole de Dieu aux enfants et aux nouveaux convertis de manière structurée.',
    'GraduationCap', 'gold', 'Dimanche à 08h00',
    'Former des disciples fondés sur la Parole, depuis le plus jeune âge.',
    'Cours bibliques par tranches d''âge, matériel pédagogique, activités ludiques, évaluation trimestrielle.',
    'Aimer les enfants, avoir des connaissances bibliques de base.', 5),
  ('Protocole et Accueil', 'protocole-et-accueil',
    'Le visage de l''église. Planification, accueil des fidèles, comptage, gestion des nouveaux venus.',
    'Shield', 'gold', 'Samedi à 09h00',
    'Garantir la fluidité, l''ordre et l''excellence lors de chaque culte. Être le premier contact des visiteurs.',
    'Gestion des entrées, comptage des présences, accueil des nouveaux venus, rapports de culte, coordination des équipes de rotation.',
    'Être ponctuel, avoir un sens aigu du service, porter l''image de l''église.', 7)
ON CONFLICT (slug) DO NOTHING;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  13 — VISIT_REQUESTS                                                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS visit_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id        UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  requester_name      TEXT,
  requester_phone     TEXT,
  requester_email     TEXT,
  beneficiary_name    TEXT NOT NULL,
  beneficiary_phone   TEXT,
  beneficiary_address TEXT NOT NULL,
  visit_type          TEXT NOT NULL DEFAULT 'pastorale' CHECK (visit_type IN (
    'pastorale', 'evangelisation', 'malade', 'encouragement', 'suivi'
  )),
  reason              TEXT,
  urgency             TEXT NOT NULL DEFAULT 'normale' CHECK (urgency IN (
    'basse', 'normale', 'haute', 'urgente'
  )),
  preferred_date      TIMESTAMPTZ,
  preferred_time      TEXT,
  assigned_to         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  assigned_to_name    TEXT,
  status              TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN (
    'en_attente', 'acceptee', 'planifiee', 'effectuee', 'refusee', 'reprogrammee'
  )),
  pastor_notes        TEXT,
  visited_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE visit_requests DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_visit_req_status ON visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_visit_req_urgency ON visit_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_visit_req_requester ON visit_requests(requester_id) WHERE requester_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visit_req_assigned ON visit_requests(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visit_req_created ON visit_requests(created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER trg_visit_requests_updated_at
    BEFORE UPDATE ON visit_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  14 — TABLES MANQUANTES (calendar_events, convertis, etc.)              ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ─── 14.1 calendar_events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL CHECK (category IN (
    'culte', 'mission', 'jeunesse', 'communion',
    'emission', 'predication', 'reunion', 'formation'
  )),
  event_date      TIMESTAMPTZ NOT NULL,
  end_date        TIMESTAMPTZ,
  start_time      TEXT NOT NULL DEFAULT '00:00',
  end_time        TEXT NOT NULL DEFAULT '23:59',
  location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
  location_name   TEXT,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  image_url       TEXT,
  is_recurring    BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT,
  created_by      UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_cal_evt_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_cal_evt_category ON calendar_events(category);
CREATE INDEX IF NOT EXISTS idx_cal_evt_dept ON calendar_events(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cal_evt_created_by ON calendar_events(created_by);

-- ─── 14.2 event_assignments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_name       TEXT,
  role            TEXT NOT NULL CHECK (role IN (
    'preacher', 'intercessor', 'logistician',
    'worship_leader', 'singer', 'usher',
    'sound_tech', 'camera', 'other'
  )),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  notified        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE event_assignments DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_evt_assign_event ON event_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_evt_assign_user ON event_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_evt_assign_status ON event_assignments(status);

-- ─── 14.3 zones_evangelisation ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS zones_evangelisation (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  coordinator_id  UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  coordinator_name TEXT,
  converti_count  INTEGER NOT NULL DEFAULT 0,
  potential_score INTEGER NOT NULL DEFAULT 5 CHECK (potential_score BETWEEN 1 AND 10),
  last_visited    TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE zones_evangelisation DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_zone_ev_active ON zones_evangelisation(is_active);

-- ─── 14.4 cellules_maison ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cellules_maison (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  leader_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  leader_name     TEXT,
  zone            TEXT,
  quartier        TEXT,
  address         TEXT,
  meeting_day     TEXT NOT NULL DEFAULT 'mercredi' CHECK (meeting_day IN (
    'lundi', 'mardi', 'mercredi', 'jeudi',
    'vendredi', 'samedi', 'dimanche'
  )),
  meeting_time    TEXT NOT NULL DEFAULT '18:00',
  member_count    INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cellules_maison DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cellule_active ON cellules_maison(is_active);
CREATE INDEX IF NOT EXISTS idx_cellule_leader ON cellules_maison(leader_id);
CREATE INDEX IF NOT EXISTS idx_cellule_day ON cellules_maison(meeting_day);

-- ─── 14.5 convertis ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS convertis (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  quartier              TEXT,
  zone                  TEXT,
  address               TEXT,
  gender                TEXT CHECK (gender IN ('homme', 'femme')),
  age_range             TEXT CHECK (age_range IN (
    'moins_18', '18_25', '26_35', '36_50', 'plus_50'
  )),
  request_type          TEXT CHECK (request_type IN (
    'priere', 'conseil', 'visite', 'information', 'relation_aide'
  )),
  needs_pastoral_care   BOOLEAN NOT NULL DEFAULT false,
  evangelist_id         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  evangelist_name       TEXT,
  mentor_id             UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  mentor_name           TEXT,
  pipeline_stage        TEXT NOT NULL DEFAULT 'nouveau' CHECK (pipeline_stage IN (
    'nouveau', 'premier_contact', 'visite_domicile',
    'cellule', 'cours_bapteme', 'membre_actif'
  )),
  pipeline_updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_contact_date    TIMESTAMPTZ,
  first_contact_by      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  visit_date            TIMESTAMPTZ,
  visit_done            BOOLEAN NOT NULL DEFAULT false,
  cellule_id            UUID REFERENCES cellules_maison(id) ON DELETE SET NULL,
  cellule_name          TEXT,
  bapteme_water_date    TIMESTAMPTZ,
  bapteme_saint_esprit  BOOLEAN NOT NULL DEFAULT false,
  became_member_date    TIMESTAMPTZ,
  notes                 TEXT,
  source                TEXT NOT NULL DEFAULT 'evangelisation' CHECK (source IN (
    'evangelisation', 'croisade', 'visite', 'internet', 'ami', 'media', 'autre'
  )),
  event_id              UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  created_by            UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE convertis DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_convertis_updated_at ON convertis;
CREATE TRIGGER trg_convertis_updated_at
  BEFORE UPDATE ON convertis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_converti_stage ON convertis(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_converti_evangelist ON convertis(evangelist_id) WHERE evangelist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_converti_cellule ON convertis(cellule_id) WHERE cellule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_converti_created ON convertis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_converti_source ON convertis(source);

-- ─── 14.6 converti_timeline ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS converti_timeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  converti_id     UUID NOT NULL REFERENCES convertis(id) ON DELETE CASCADE,
  stage_from      TEXT CHECK (stage_from IN (
    'nouveau', 'premier_contact', 'visite_domicile',
    'cellule', 'cours_bapteme', 'membre_actif'
  )),
  stage_to        TEXT NOT NULL CHECK (stage_to IN (
    'nouveau', 'premier_contact', 'visite_domicile',
    'cellule', 'cours_bapteme', 'membre_actif'
  )),
  action          TEXT NOT NULL,
  notes           TEXT,
  done_by         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  done_by_name    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE converti_timeline DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_timeline_converti ON converti_timeline(converti_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created ON converti_timeline(created_at DESC);

-- ─── 14.7 pastoral_alerts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pastoral_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type              TEXT NOT NULL CHECK (type IN (
    'ame_en_danger_72h', 'cas_lourd', 'retard_integration', 'autre'
  )),
  converti_id       UUID NOT NULL REFERENCES convertis(id) ON DELETE CASCADE,
  converti_name     TEXT,
  description       TEXT NOT NULL,
  severity          TEXT NOT NULL DEFAULT 'moyenne' CHECK (severity IN (
    'haute', 'moyenne', 'basse'
  )),
  status            TEXT NOT NULL DEFAULT 'ouverte' CHECK (status IN (
    'ouverte', 'en_cours', 'resolue'
  )),
  assigned_to       UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  assigned_to_name  TEXT,
  resolved_by       UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  resolved_at       TIMESTAMPTZ,
  resolution_notes  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pastoral_alerts DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_pastoral_alerts_updated_at ON pastoral_alerts;
CREATE TRIGGER trg_pastoral_alerts_updated_at
  BEFORE UPDATE ON pastoral_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_past_alert_type ON pastoral_alerts(type);
CREATE INDEX IF NOT EXISTS idx_past_alert_status ON pastoral_alerts(status);
CREATE INDEX IF NOT EXISTS idx_past_alert_severity ON pastoral_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_past_alert_converti ON pastoral_alerts(converti_id);
CREATE INDEX IF NOT EXISTS idx_past_alert_assigned ON pastoral_alerts(assigned_to) WHERE assigned_to IS NOT NULL;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  15 — RAPPORTS DE CULTE : MULTI-ÉGLISES + AILES                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ─── 15.1 Table extensions ───────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'extensions') THEN
    CREATE TABLE extensions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      location TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    RAISE NOTICE 'Table extensions créée';
  END IF;
END $$;

ALTER TABLE extensions DISABLE ROW LEVEL SECURITY;

-- ─── 15.2 Colonnes extension_id + aile sur cult_reports ──────────────
ALTER TABLE cult_reports
  ADD COLUMN IF NOT EXISTS extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL;

ALTER TABLE cult_reports
  ADD COLUMN IF NOT EXISTS aile TEXT DEFAULT 'centrale'
  CHECK (aile IN ('centrale', 'nord', 'sud', 'est', 'ouest', 'autre'));

CREATE INDEX IF NOT EXISTS idx_cult_reports_extension ON cult_reports(extension_id);
CREATE INDEX IF NOT EXISTS idx_cult_reports_aile ON cult_reports(aile);

-- ─── 15.3 Table church_wings (ailes de l'église) ────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'church_wings') THEN
    CREATE TABLE church_wings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#d4a843',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    RAISE NOTICE 'Table church_wings créée';
  END IF;
END $$;

ALTER TABLE church_wings DISABLE ROW LEVEL SECURITY;

-- ─── 15.4 Vue consolidée par aile ────────────────────────────────────
CREATE OR REPLACE VIEW v_cult_reports_consolidated AS
SELECT
  cr.aile,
  cr.cult_day,
  cr.cult_date,
  COUNT(*) AS nb_rapports,
  SUM(cr.men_count) AS men_count,
  SUM(cr.women_count) AS women_count,
  SUM(cr.children_count) AS children_count,
  SUM(cr.new_comers_count) AS new_comers_count,
  SUM(cr.empty_seats) AS empty_seats,
  SUM(cr.men_count + cr.women_count + cr.children_count) AS total_attendance,
  array_agg(DISTINCT cr.reporter_name) AS reporters,
  array_agg(DISTINCT cr.extension_id) AS extension_ids,
  MAX(cr.created_at) AS last_report_at,
  BOOL_AND(cr.status = 'soumis' OR cr.status = 'valide') AS all_submitted
FROM cult_reports cr
GROUP BY cr.aile, cr.cult_day, cr.cult_date;

-- ─── 15.5 Vue globale toutes ailes ───────────────────────────────────
CREATE OR REPLACE VIEW v_cult_reports_global AS
SELECT
  cult_day,
  cult_date,
  COUNT(*) AS nb_rapports,
  SUM(men_count) AS men_count,
  SUM(women_count) AS women_count,
  SUM(children_count) AS children_count,
  SUM(new_comers_count) AS new_comers_count,
  SUM(empty_seats) AS empty_seats,
  SUM(men_count + women_count + children_count) AS total_attendance,
  array_agg(DISTINCT reporter_name) AS reporters,
  MAX(created_at) AS last_report_at
FROM cult_reports
GROUP BY cult_day, cult_date;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  16 — FIX DEPARTMENT_MEMBERS : STRUCTURE + AUTO-RÉPARATION             ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ─── 16.1 Structure ───────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_members') THEN
    CREATE TABLE department_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
      role_in_dept TEXT NOT NULL DEFAULT 'member' CHECK (role_in_dept IN ('member', 'leader', 'assistant')),
      is_active BOOLEAN NOT NULL DEFAULT true,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    RAISE NOTICE 'Table department_members créée';
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'department_members' AND column_name = 'position_id') THEN
      ALTER TABLE department_members ADD COLUMN position_id UUID REFERENCES positions(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'department_members' AND column_name = 'role_in_dept') THEN
      ALTER TABLE department_members ADD COLUMN role_in_dept TEXT NOT NULL DEFAULT 'member';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'department_members' AND column_name = 'is_active') THEN
      ALTER TABLE department_members ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'department_members' AND column_name = 'joined_at') THEN
      ALTER TABLE department_members ADD COLUMN joined_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
    -- Réparer les NULL sur is_active
    UPDATE department_members SET is_active = true WHERE is_active IS NULL;
    RAISE NOTICE 'Table department_members vérifiée et réparée';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dept_members_user ON department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_dept ON department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_active ON department_members(department_id, is_active) WHERE is_active = true;

DO $$
BEGIN
  ALTER TABLE department_members ADD CONSTRAINT uq_dept_members_user_dept UNIQUE (user_id, department_id);
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Contrainte unique déjà existante';
END $$;

ALTER TABLE department_members DISABLE ROW LEVEL SECURITY;

-- ─── 16.2 Auto-réparation : demandes acceptées sans membre ───────────
INSERT INTO department_members (user_id, department_id, role_in_dept, is_active, joined_at)
SELECT dr.user_id, dr.department_id, 'member', true, COALESCE(dr.responded_at, now())
FROM department_requests dr
WHERE dr.status IN ('accepte', 'accepted', 'approuve', 'approved')
  AND NOT EXISTS (
    SELECT 1 FROM department_members dm
    WHERE dm.user_id = dr.user_id AND dm.department_id = dr.department_id
  )
ON CONFLICT (user_id, department_id) DO UPDATE SET is_active = true;

-- ─── 16.3 Auto-réparation : membres inactifs avec demande acceptée ───
UPDATE department_members dm
SET is_active = true
FROM department_requests dr
WHERE dm.user_id = dr.user_id
  AND dm.department_id = dr.department_id
  AND dm.is_active = false
  AND dr.status IN ('accepte', 'accepted', 'approuve', 'approved');

-- ─── 16.4 Auto-réparation : membres actifs sans demande acceptée ─────
UPDATE department_requests
SET status = 'accepte', responded_at = now()
WHERE (user_id, department_id) IN (
  SELECT dm.user_id, dm.department_id
  FROM department_members dm
  WHERE dm.is_active = true
)
AND status = 'en_attente';


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  FIN — TOUT EST PRÊT                                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- Tables créées/fixées : cult_reports, protocol_teams, protocol_team_members,
--   protocol_schedules, protocol_dress_code, new_visitors, event_reminders,
--   department_requests, visit_requests, calendar_events, event_assignments,
--   zones_evangelisation, cellules_maison, convertis, converti_timeline,
--   pastoral_alerts, extensions, church_wings, department_members
-- Vues : v_cult_reports_consolidated, v_cult_reports_global
-- Toutes les tables ont RLS désactivé
-- ═══════════════════════════════════════════════════════════════════════════