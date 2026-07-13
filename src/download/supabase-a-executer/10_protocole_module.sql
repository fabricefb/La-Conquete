-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE PROTOCOLE ET ACCUEIL — Église Évangélique La Conquête
-- Tables: cult_reports, protocol_teams, protocol_team_members,
--         protocol_schedules, protocol_dress_code, new_visitors, event_reminders
-- RLS désactivé (même pattern que user_profiles)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. cult_reports — Rapports de Culte ────────────────────────────
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

-- ─── 2. protocol_teams — Équipes de Rotation ─────────────────────────
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

-- ─── 3. protocol_team_members — Membres des Équipes ──────────────────
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

-- ─── 4. protocol_schedules — Planning de Service ─────────────────────
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

-- ─── 5. protocol_dress_code — Code Vestimentaire par Jour ────────────
CREATE TABLE IF NOT EXISTS protocol_dress_code (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cult_day TEXT NOT NULL CHECK (cult_day IN ('mercredi','vendredi','samedi','dimanche')) UNIQUE,
  description TEXT NOT NULL,
  required_items TEXT[] DEFAULT '{}',
  formality_level TEXT NOT NULL DEFAULT 'decontracte' CHECK (formality_level IN ('decontracte','correct','formel')),
  icon_hint TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 6. new_visitors — Nouveaux Venus (remplace Google Forms) ────────
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

-- ─── 7. event_reminders — Configuration des Rappels d'Événements ────
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

-- ═══════════════════════════════════════════════════════════════════════
-- TRIGGER — auto-update updated_at on cult_reports
-- ═══════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════
-- RLS — DÉSACTIVÉ sur toutes les tables (même pattern que user_profiles)
-- ═══════════════════════════════════════════════════════════════════════
-- RLS est intentionnellement désactivé sur ces tables pour éviter les
-- problèmes de récursion liés à user_profiles. L'accès est contrôlé
-- au niveau applicatif.

ALTER TABLE cult_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_dress_code DISABLE ROW LEVEL SECURITY;
ALTER TABLE new_visitors DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════
-- SEED DATA — Code vestimentaire par jour
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO protocol_dress_code (cult_day, description, required_items, formality_level, icon_hint) VALUES
  (
    'mercredi',
    'Tenue de ville décontractée mais correcte (chemise/haut blanc, pantalon/jupe sombre). Badge obligatoire.',
    '{badge}',
    'correct',
    '👔'
  ),
  (
    'vendredi',
    'Tenue de ville décontractée mais correcte (chemise/haut blanc, pantalon/jupe sombre). Badge obligatoire.',
    '{badge}',
    'correct',
    '👔'
  ),
  (
    'samedi',
    'Tenue libre et confortable (polo église si disponible, jean propre, baskets).',
    '{}',
    'decontracte',
    '👕'
  ),
  (
    'dimanche',
    'Uniforme officiel et formel. Costume/cravate pour les hommes, tailleur/robe de cérémonie pour les femmes. Badge bien visible.',
    '{badge,uniforme,chaussures_fermees}',
    'formel',
    '🎩'
  )
ON CONFLICT (cult_day) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- SEED DATA — Équipes par défaut
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO protocol_teams (name, description, color, sort_order) VALUES
  ('Équipe Alpha', 'Première équipe de rotation pour le protocole et l''accueil.', '#d4a843', 1),
  ('Équipe Bêta', 'Deuxième équipe de rotation pour le protocole et l''accueil.', '#4a90d9', 2)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- RÉCAPITULATIF
-- ═══════════════════════════════════════════════════════════════════════
-- Tables créées :
--   1. cult_reports          — Rapports de culte (avec total_attendance GENERATED)
--   2. protocol_teams        — Équipes de rotation
--   3. protocol_team_members — Membres des équipes
--   4. protocol_schedules    — Planning de service
--   5. protocol_dress_code   — Code vestimentaire par jour
--   6. new_visitors          — Nouveaux venus (remplace Google Forms)
--   7. event_reminders       — Configuration des rappels d'événements
-- RLS : désactivé sur toutes les tables
-- Trigger : update_cult_report_updated_at sur cult_reports
-- Seed : 4 codes vestimentaires + 2 équipes par défaut
-- ═══════════════════════════════════════════════════════════════════════