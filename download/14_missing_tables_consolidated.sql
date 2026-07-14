-- ═══════════════════════════════════════════════════════════════════════════
-- 14_missing_tables_consolidated.sql
--
-- Tables from supabase-migrations.sql that were NOT executed by the
-- individual migrations in supabase/migrations/ (01 through 13).
--
-- Tables in this file:
--   Module 1 — Events Operations:  calendar_events, event_assignments
--   Module 2 — CRM Convertis:      zones_evangelisation, cellules_maison,
--                                   convertis, converti_timeline
--   Module 5 — Pastoral Space:     pastoral_alerts
--
-- SKIPPED (already handled):
--   - visit_requests        → 13_visit_requests_fix.sql
--   - departments/positions/department_members → 11_fix_departments_rls.sql
--   - department_requests   → 12_fix_dept_requests_and_seed.sql
--   - notifications, prayer_requests, etc. → already exist in executed migrations
--
-- RLS: All tables use DISABLE ROW LEVEL SECURITY (no policies).
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER: updated_at trigger function (idempotent)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE 1 — PROGRAMMES & EVENTS (Operations)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1.1 calendar_events ───────────────────────────────────────────
-- ERP-internal calendar events (distinct from the public-facing `events` table).
-- Supports extended scheduling with start/end times, recurrence, and department links.
-- ─────────────────────────────────────────────────────────────────────

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


-- ─── 1.2 event_assignments ─────────────────────────────────────────
-- Assigns church members to specific roles for an event
-- (preacher, worship leader, usher, etc.)
-- ─────────────────────────────────────────────────────────────────────

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


-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE 2 — SUIVI CONVERTIS (CRM Spirituel)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 2.1 zones_evangelisation ──────────────────────────────────────
-- Geographic zones targeted for evangelism outreach.
-- Must be created BEFORE convertis (FK dependency).
-- ─────────────────────────────────────────────────────────────────────

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


-- ─── 2.2 cellules_maison ───────────────────────────────────────────
-- Small house-church groups for discipleship and fellowship.
-- Must be created BEFORE convertis (FK dependency).
-- ─────────────────────────────────────────────────────────────────────

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


-- ─── 2.3 convertis ─────────────────────────────────────────────────
-- Core CRM table — tracks every new convert through the discipleship
-- pipeline from first contact to active church membership.
-- ─────────────────────────────────────────────────────────────────────

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


-- ─── 2.4 converti_timeline ─────────────────────────────────────────
-- Audit trail / activity log for every pipeline transition on a converti.
-- ─────────────────────────────────────────────────────────────────────

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


-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE 5 — ESPACE PASTORAL (Supervision)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 5.1 pastoral_alerts ───────────────────────────────────────────
-- Alerts raised by the system or pastors for at-risk converts.
-- ─────────────────────────────────────────────────────────────────────

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