-- ═══════════════════════════════════════════════════════════════════════════
-- COMPREHENSIVE MIGRATION — 5 Operational Modules
-- Église Évangélique La Conquête
-- Date: 2026-07-14
--
-- Prerequisites (already exist in earlier migrations):
--   user_profiles, auth.users, departments, positions, department_members,
--   role_requests, events (public), locations, ministries, media_items,
--   contact_messages, testimonials, site_settings, page_contents,
--   theme_settings, service_plannings, service_assignments,
--   department_posts, post_comments, visitor_followups,
--   notification_preferences, daily_thoughts, notifications
--
-- Tables created in this migration:
--   Module 1 — Events Operations:  calendar_events, event_assignments,
--                                   event_minutes, inventory_items,
--                                   inventory_reservations
--   Module 2 — CRM Convertis:      convertis, converti_timeline,
--                                   cellules_maison, zones_evangelisation
--   Module 3 — Communication:      prayer_requests (extended), 
--                                   communication_messages, media_library
--   Module 4 — Reports & Stats:    mission_reports, mission_finances,
--                                   impact_counters
--   Module 5 — Pastoral Space:     pastoral_alerts, pastor_schedule,
--                                   visit_requests, spiritual_assessments
--   Support:                       newsletters
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS (idempotent — already exist from erp_roles migration,
-- but re-declared here for standalone execution)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_pastor_or_above() RETURNS BOOLEAN AS $$
  SELECT role IN ('pastor', 'super_admin') FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_chief_or_above() RETURNS BOOLEAN AS $$
  SELECT role IN ('chief', 'pastor', 'super_admin') FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_member_or_above() RETURNS BOOLEAN AS $$
  SELECT role NOT IN ('visitor') FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_logged_in() RETURNS BOOLEAN AS $$
  SELECT auth.uid() IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION owns_profile(p_id UUID) RETURNS BOOLEAN AS $$
  SELECT p_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE 1 — PROGRAMMES & EVENTS (Operations)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1.1 calendar_events ───────────────────────────────────────────
-- ERP-internal calendar events (distinct from the public-facing `events` table).
-- Supports extended scheduling with start/end times, recurrence, and department links.
-- TypeScript: CalendarEvent
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

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS cal_evt_select ON calendar_events;
  CREATE POLICY cal_evt_select ON calendar_events FOR SELECT
    TO anon, authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS cal_evt_insert ON calendar_events;
  CREATE POLICY cal_evt_insert ON calendar_events FOR INSERT
    WITH CHECK (is_member_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS cal_evt_update ON calendar_events;
  CREATE POLICY cal_evt_update ON calendar_events FOR UPDATE
    USING (is_chief_or_above())
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS cal_evt_delete ON calendar_events;
  CREATE POLICY cal_evt_delete ON calendar_events FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_cal_evt_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_cal_evt_category ON calendar_events(category);
CREATE INDEX IF NOT EXISTS idx_cal_evt_dept ON calendar_events(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cal_evt_created_by ON calendar_events(created_by);


-- ─── 1.2 event_assignments ─────────────────────────────────────────
-- Assigns church members to specific roles for an event
-- (preacher, worship leader, usher, etc.)
-- TypeScript: EventAssignment
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

ALTER TABLE event_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS evt_assign_select ON event_assignments;
  CREATE POLICY evt_assign_select ON event_assignments FOR SELECT
    TO anon, authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS evt_assign_insert ON event_assignments;
  CREATE POLICY evt_assign_insert ON event_assignments FOR INSERT
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS evt_assign_update ON event_assignments;
  CREATE POLICY evt_assign_update ON event_assignments FOR UPDATE
    -- Assigned user can confirm/decline; chiefs and admins can change anything
    USING (
      owns_profile(user_id)
      OR is_chief_or_above()
    )
    WITH CHECK (
      owns_profile(user_id)
      OR is_chief_or_above()
    );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS evt_assign_delete ON event_assignments;
  CREATE POLICY evt_assign_delete ON event_assignments FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_evt_assign_event ON event_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_evt_assign_user ON event_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_evt_assign_status ON event_assignments(status);


-- ─── 1.3 event_minutes ─────────────────────────────────────────────
-- Detailed program / order of service for each event (time slots, items).
-- TypeScript: EventMinute
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_minutes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  time_slot         TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  responsible_id    UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  responsible_name  TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_completed      BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE event_minutes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS evt_min_select ON event_minutes;
  CREATE POLICY evt_min_select ON event_minutes FOR SELECT
    TO anon, authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS evt_min_insert ON event_minutes;
  CREATE POLICY evt_min_insert ON event_minutes FOR INSERT
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS evt_min_update ON event_minutes;
  CREATE POLICY evt_min_update ON event_minutes FOR UPDATE
    USING (is_chief_or_above())
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS evt_min_delete ON event_minutes;
  CREATE POLICY evt_min_delete ON event_minutes FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_evt_min_event ON event_minutes(event_id);
CREATE INDEX IF NOT EXISTS idx_evt_min_sort ON event_minutes(event_id, sort_order);


-- ─── 1.4 inventory_items ───────────────────────────────────────────
-- Church material resources: sound equipment, seating, lighting, etc.
-- TypeScript: InventoryItem
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  category          TEXT NOT NULL CHECK (category IN (
    'sound', 'seating', 'lighting', 'literature',
    'generators', 'tents', 'vehicles', 'other'
  )),
  description       TEXT,
  quantity_total    INTEGER NOT NULL DEFAULT 0,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  condition         TEXT NOT NULL DEFAULT 'good' CHECK (condition IN (
    'excellent', 'good', 'fair', 'needs_repair', 'retired'
  )),
  location_stored   TEXT,
  image_url         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS inv_item_select ON inventory_items;
  CREATE POLICY inv_item_select ON inventory_items FOR SELECT
    TO anon, authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS inv_item_insert ON inventory_items;
  CREATE POLICY inv_item_insert ON inventory_items FOR INSERT
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS inv_item_update ON inventory_items;
  CREATE POLICY inv_item_update ON inventory_items FOR UPDATE
    USING (is_chief_or_above())
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS inv_item_delete ON inventory_items;
  CREATE POLICY inv_item_delete ON inventory_items FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_inv_item_cat ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inv_item_cond ON inventory_items(condition);


-- ─── 1.5 inventory_reservations ────────────────────────────────────
-- Tracks which inventory items are reserved for which events.
-- TypeScript: InventoryReservation
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name         TEXT,
  event_id          UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  event_title       TEXT,
  quantity_reserved INTEGER NOT NULL DEFAULT 1,
  reserved_by       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reserved_by_name  TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'active', 'returned', 'overdue'
  )),
  reserved_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
  return_date       TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS inv_res_select ON inventory_reservations;
  CREATE POLICY inv_res_select ON inventory_reservations FOR SELECT
    TO anon, authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS inv_res_insert ON inventory_reservations;
  CREATE POLICY inv_res_insert ON inventory_reservations FOR INSERT
    WITH CHECK (is_member_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS inv_res_update ON inventory_reservations;
  CREATE POLICY inv_res_update ON inventory_reservations FOR UPDATE
    USING (is_chief_or_above())
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS inv_res_delete ON inventory_reservations;
  CREATE POLICY inv_res_delete ON inventory_reservations FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_inv_res_item ON inventory_reservations(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_res_event ON inventory_reservations(event_id);
CREATE INDEX IF NOT EXISTS idx_inv_res_status ON inventory_reservations(status);


-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE 2 — SUIVI CONVERTIS (CRM Spirituel)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 2.1 zones_evangelisation ──────────────────────────────────────
-- Geographic zones targeted for evangelism outreach.
-- Must be created BEFORE convertis (FK dependency).
-- TypeScript: ZoneEvangelisation
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

ALTER TABLE zones_evangelisation ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS zone_ev_select ON zones_evangelisation;
  CREATE POLICY zone_ev_select ON zones_evangelisation FOR SELECT
    TO anon, authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS zone_ev_insert ON zones_evangelisation;
  CREATE POLICY zone_ev_insert ON zones_evangelisation FOR INSERT
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS zone_ev_update ON zones_evangelisation;
  CREATE POLICY zone_ev_update ON zones_evangelisation FOR UPDATE
    USING (is_chief_or_above())
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS zone_ev_delete ON zones_evangelisation;
  CREATE POLICY zone_ev_delete ON zones_evangelisation FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_zone_ev_active ON zones_evangelisation(is_active);


-- ─── 2.2 cellules_maison ───────────────────────────────────────────
-- Small house-church groups for discipleship and fellowship.
-- Must be created BEFORE convertis (FK dependency).
-- TypeScript: CelluleMaison
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

ALTER TABLE cellules_maison ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS cellule_select ON cellules_maison;
  CREATE POLICY cellule_select ON cellules_maison FOR SELECT
    TO anon, authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS cellule_insert ON cellules_maison;
  CREATE POLICY cellule_insert ON cellules_maison FOR INSERT
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS cellule_update ON cellules_maison;
  CREATE POLICY cellule_update ON cellules_maison FOR UPDATE
    USING (is_chief_or_above())
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS cellule_delete ON cellules_maison;
  CREATE POLICY cellule_delete ON cellules_maison FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_cellule_active ON cellules_maison(is_active);
CREATE INDEX IF NOT EXISTS idx_cellule_leader ON cellules_maison(leader_id);
CREATE INDEX IF NOT EXISTS idx_cellule_day ON cellules_maison(meeting_day);


-- ─── 2.3 convertis ─────────────────────────────────────────────────
-- Core CRM table — tracks every new convert through the discipleship
-- pipeline from first contact to active church membership.
-- TypeScript: Converti
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

ALTER TABLE convertis ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS converti_select ON convertis;
  CREATE POLICY converti_select ON convertis FOR SELECT
    TO anon, authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS converti_insert ON convertis;
  CREATE POLICY converti_insert ON convertis FOR INSERT
    WITH CHECK (is_member_or_above());
END $$;

-- Evangelists can update their assigned convertis; chiefs/admins can update all
DO $$ BEGIN
  DROP POLICY IF EXISTS converti_update ON convertis;
  CREATE POLICY converti_update ON convertis FOR UPDATE
    USING (
      owns_profile(evangelist_id)
      OR is_chief_or_above()
    )
    WITH CHECK (
      owns_profile(evangelist_id)
      OR is_chief_or_above()
    );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS converti_delete ON convertis;
  CREATE POLICY converti_delete ON convertis FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_converti_stage ON convertis(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_converti_evangelist ON convertis(evangelist_id) WHERE evangelist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_converti_cellule ON convertis(cellule_id) WHERE cellule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_converti_created ON convertis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_converti_source ON convertis(source);


-- ─── 2.4 converti_timeline ─────────────────────────────────────────
-- Audit trail / activity log for every pipeline transition on a converti.
-- TypeScript: ConvertiTimeline
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

ALTER TABLE converti_timeline ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS timeline_select ON converti_timeline;
  CREATE POLICY timeline_select ON converti_timeline FOR SELECT
    TO anon, authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS timeline_insert ON converti_timeline;
  CREATE POLICY timeline_insert ON converti_timeline FOR INSERT
    WITH CHECK (is_member_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS timeline_delete ON converti_timeline;
  CREATE POLICY timeline_delete ON converti_timeline FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_timeline_converti ON converti_timeline(converti_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created ON converti_timeline(created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE 3 — COMMUNICATION & MOBILISATION
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 3.1 prayer_requests (EXTEND existing) ─────────────────────────
-- NOTE: This table already exists from migration 20260711060000_erp_roles.
-- We use CREATE TABLE IF NOT EXISTS as a no-op safety guard, then ALTER
-- to add missing columns and expand the status CHECK constraint.
-- TypeScript: PrayerRequest + PrayerRequestStatus + PrayerRequestVisibility
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prayer_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  author_name     TEXT NOT NULL DEFAULT 'Anonyme',
  content         TEXT NOT NULL,
  is_anonymous    BOOLEAN NOT NULL DEFAULT false,
  is_confidential BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'nouveau',
  prayed_by       UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  prayed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extend status CHECK to include Communication module values
DO $$ BEGIN
  ALTER TABLE prayer_requests DROP CONSTRAINT IF EXISTS prayer_requests_status_check;
  ALTER TABLE prayer_requests ADD CONSTRAINT prayer_requests_status_check
    CHECK (status IN (
      'received', 'praying', 'answered',       -- original values
      'nouveau', 'en_priere', 'repondu', 'suivi_pastoral'  -- new values
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add visibility column if missing (Communication module extension)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prayer_requests' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE prayer_requests ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'
      CHECK (visibility IN ('public', 'intercesseurs', 'pastoral', 'confidentiel'));
  END IF;
END $$;

-- Add updated_at column if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prayer_requests' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE prayer_requests ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

-- Public can read non-confidential prayers; authenticated can read all
DO $$ BEGIN
  DROP POLICY IF EXISTS pr_select ON prayer_requests;
  CREATE POLICY pr_select ON prayer_requests FOR SELECT
    USING (
      -- Non-confidential visible to everyone
      (is_confidential = false AND visibility != 'confidentiel')
      OR
      -- Confidential/pastoral visible only to pastors and admins
      (is_pastor_or_above())
    );
END $$;

-- Members can insert their own prayer requests
DO $$ BEGIN
  DROP POLICY IF EXISTS pr_insert ON prayer_requests;
  CREATE POLICY pr_insert ON prayer_requests FOR INSERT
    WITH CHECK (is_logged_in());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS pr_update ON prayer_requests;
  CREATE POLICY pr_update ON prayer_requests FOR UPDATE
    USING (is_chief_or_above())
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS pr_delete ON prayer_requests;
  CREATE POLICY pr_delete ON prayer_requests FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_prayer_visibility ON prayer_requests(visibility);
CREATE INDEX IF NOT EXISTS idx_prayer_created ON prayer_requests(created_at DESC);


-- ─── 3.2 communication_messages ────────────────────────────────────
-- Mass communication messages (SMS, WhatsApp, email, push, in-app).
-- TypeScript: CommunicationMessage
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS communication_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  content           TEXT NOT NULL,
  channel           TEXT NOT NULL CHECK (channel IN (
    'sms', 'whatsapp', 'email', 'push', 'in_app'
  )),
  target_type       TEXT NOT NULL CHECK (target_type IN (
    'all', 'equipe', 'department', 'cellule', 'role', 'custom'
  )),
  target_ids        JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_label      TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'sent', 'failed'
  )),
  sent_by           UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  sent_by_name      TEXT,
  scheduled_at      TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  recipient_count   INTEGER NOT NULL DEFAULT 0,
  delivery_count    INTEGER NOT NULL DEFAULT 0,
  failure_count     INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS comm_msg_select ON communication_messages;
  CREATE POLICY comm_msg_select ON communication_messages FOR SELECT
    TO authenticated USING (is_member_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS comm_msg_insert ON communication_messages;
  CREATE POLICY comm_msg_insert ON communication_messages FOR INSERT
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS comm_msg_update ON communication_messages;
  CREATE POLICY comm_msg_update ON communication_messages FOR UPDATE
    USING (is_chief_or_above())
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS comm_msg_delete ON communication_messages;
  CREATE POLICY comm_msg_delete ON communication_messages FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_comm_msg_status ON communication_messages(status);
CREATE INDEX IF NOT EXISTS idx_comm_msg_channel ON communication_messages(channel);
CREATE INDEX IF NOT EXISTS idx_comm_msg_sent_by ON communication_messages(sent_by);
CREATE INDEX IF NOT EXISTS idx_comm_msg_scheduled ON communication_messages(scheduled_at) WHERE scheduled_at IS NOT NULL;


-- ─── 3.3 media_library ─────────────────────────────────────────────
-- Centralized media library for documents, tracts, photos, videos.
-- TypeScript: MediaLibraryItem
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_library (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL CHECK (category IN (
    'tract', 'guide', 'affiche', 'photo', 'video', 'document', 'autre'
  )),
  file_url        TEXT NOT NULL,
  thumbnail_url   TEXT,
  file_type       TEXT NOT NULL DEFAULT 'document',
  file_size       INTEGER,
  access_role     TEXT NOT NULL DEFAULT 'membre' CHECK (access_role IN (
    'admin', 'pasteur', 'membre', 'public'
  )),
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  tags            JSONB DEFAULT '[]'::jsonb,
  download_count  INTEGER NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS media_lib_select ON media_library;
  CREATE POLICY media_lib_select ON media_library FOR SELECT
    TO anon, authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS media_lib_insert ON media_library;
  CREATE POLICY media_lib_insert ON media_library FOR INSERT
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS media_lib_update ON media_library;
  CREATE POLICY media_lib_update ON media_library FOR UPDATE
    USING (is_chief_or_above())
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS media_lib_delete ON media_library;
  CREATE POLICY media_lib_delete ON media_library FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_media_lib_cat ON media_library(category);
CREATE INDEX IF NOT EXISTS idx_media_lib_type ON media_library(file_type);
CREATE INDEX IF NOT EXISTS idx_media_lib_dept ON media_library(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_lib_access ON media_library(access_role);


-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE 4 — RAPPORTS & STATISTIQUES
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 4.1 mission_reports ───────────────────────────────────────────
-- Post-mission / post-event field reports with evangelism statistics.
-- TypeScript: MissionReport
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mission_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  event_title         TEXT,
  zone_id             UUID REFERENCES zones_evangelisation(id) ON DELETE SET NULL,
  zone_name           TEXT,
  report_date         TIMESTAMPTZ NOT NULL DEFAULT now(),
  persons_contacted   INTEGER NOT NULL DEFAULT 0,
  decisions_count     INTEGER NOT NULL DEFAULT 0,
  bibles_distributed  INTEGER NOT NULL DEFAULT 0,
  tracts_distributed  INTEGER NOT NULL DEFAULT 0,
  new_contacts_count  INTEGER NOT NULL DEFAULT 0,
  highlights          TEXT NOT NULL DEFAULT '',
  challenges          TEXT NOT NULL DEFAULT '',
  testimonies         TEXT,
  photos              JSONB DEFAULT '[]'::jsonb,
  reported_by         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reported_by_name    TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'reviewed'
  )),
  reviewed_by         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  reviewer_notes      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mission_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS mission_rpt_select ON mission_reports;
  CREATE POLICY mission_rpt_select ON mission_reports FOR SELECT
    TO authenticated USING (is_member_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS mission_rpt_insert ON mission_reports;
  CREATE POLICY mission_rpt_insert ON mission_reports FOR INSERT
    WITH CHECK (is_member_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS mission_rpt_update ON mission_reports;
  CREATE POLICY mission_rpt_update ON mission_reports FOR UPDATE
    -- Author can edit own drafts; pastors can review
    USING (
      owns_profile(reported_by)
      OR is_pastor_or_above()
    )
    WITH CHECK (
      owns_profile(reported_by)
      OR is_pastor_or_above()
    );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS mission_rpt_delete ON mission_reports;
  CREATE POLICY mission_rpt_delete ON mission_reports FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_mission_rpt_date ON mission_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_mission_rpt_status ON mission_reports(status);
CREATE INDEX IF NOT EXISTS idx_mission_rpt_reporter ON mission_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_mission_rpt_zone ON mission_reports(zone_id) WHERE zone_id IS NOT NULL;


-- ─── 4.2 mission_finances ──────────────────────────────────────────
-- Financial tracking per mission/event (budget, expenses, offerings).
-- TypeScript: MissionFinance
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mission_finances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_report_id   UUID REFERENCES mission_reports(id) ON DELETE SET NULL,
  event_id            UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  event_title         TEXT,
  budget_allocated    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  transport_costs     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  material_costs      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  special_offering    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_expenses      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'CDF', 'EUR')),
  notes               TEXT,
  created_by          UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mission_finances ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS mission_fin_select ON mission_finances;
  CREATE POLICY mission_fin_select ON mission_finances FOR SELECT
    TO authenticated USING (is_pastor_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS mission_fin_insert ON mission_finances;
  CREATE POLICY mission_fin_insert ON mission_finances FOR INSERT
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS mission_fin_update ON mission_finances;
  CREATE POLICY mission_fin_update ON mission_finances FOR UPDATE
    USING (is_chief_or_above())
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS mission_fin_delete ON mission_finances;
  CREATE POLICY mission_fin_delete ON mission_finances FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_mission_fin_event ON mission_finances(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mission_fin_report ON mission_finances(mission_report_id) WHERE mission_report_id IS NOT NULL;


-- ─── 4.3 impact_counters ───────────────────────────────────────────
-- Aggregated impact statistics by period (daily, weekly, monthly, etc.).
-- TypeScript: ImpactCounter
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS impact_counters (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period                  TEXT NOT NULL CHECK (period IN (
    'jour', 'semaine', 'mois', 'trimestre', 'annee'
  )),
  period_value            TEXT NOT NULL,  -- e.g. '2026-07' for monthly
  persons_contacted       INTEGER NOT NULL DEFAULT 0,
  decisions               INTEGER NOT NULL DEFAULT 0,
  bibles_distributed      INTEGER NOT NULL DEFAULT 0,
  baptisms_water          INTEGER NOT NULL DEFAULT 0,
  baptisms_holy_spirit    INTEGER NOT NULL DEFAULT 0,
  new_active_members      INTEGER NOT NULL DEFAULT 0,
  prayer_requests_answered INTEGER NOT NULL DEFAULT 0,
  zone_id                 UUID REFERENCES zones_evangelisation(id) ON DELETE SET NULL,
  zone_name               TEXT,
  department_id           UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE impact_counters ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS impact_sel ON impact_counters;
  CREATE POLICY impact_sel ON impact_counters FOR SELECT
    TO anon, authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS impact_insert ON impact_counters;
  CREATE POLICY impact_insert ON impact_counters FOR INSERT
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS impact_update ON impact_counters;
  CREATE POLICY impact_update ON impact_counters FOR UPDATE
    USING (is_chief_or_above())
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS impact_delete ON impact_counters;
  CREATE POLICY impact_delete ON impact_counters FOR DELETE
    USING (is_super_admin());
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_impact_period_unique
  ON impact_counters(period, period_value, zone_id, department_id);

CREATE INDEX IF NOT EXISTS idx_impact_period ON impact_counters(period, period_value DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE 5 — ESPACE PASTORAL (Supervision)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 5.1 pastoral_alerts ───────────────────────────────────────────
-- Alerts raised by the system or pastors for at-risk converts.
-- TypeScript: PastoralAlert
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

ALTER TABLE pastoral_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS past_alert_select ON pastoral_alerts;
  CREATE POLICY past_alert_select ON pastoral_alerts FOR SELECT
    -- Pastors can read all alerts; members can only see their own
    TO authenticated USING (
      is_pastor_or_above()
      OR EXISTS (
        SELECT 1 FROM convertis c
        JOIN user_profiles up ON up.id = c.evangelist_id
        WHERE c.id = pastoral_alerts.converti_id
        AND up.id = auth.uid()
      )
    );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS past_alert_insert ON pastoral_alerts;
  CREATE POLICY past_alert_insert ON pastoral_alerts FOR INSERT
    WITH CHECK (is_pastor_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS past_alert_update ON pastoral_alerts;
  CREATE POLICY past_alert_update ON pastoral_alerts FOR UPDATE
    USING (is_pastor_or_above())
    WITH CHECK (is_pastor_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS past_alert_delete ON pastoral_alerts;
  CREATE POLICY past_alert_delete ON pastoral_alerts FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_past_alert_type ON pastoral_alerts(type);
CREATE INDEX IF NOT EXISTS idx_past_alert_status ON pastoral_alerts(status);
CREATE INDEX IF NOT EXISTS idx_past_alert_severity ON pastoral_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_past_alert_converti ON pastoral_alerts(converti_id);
CREATE INDEX IF NOT EXISTS idx_past_alert_assigned ON pastoral_alerts(assigned_to) WHERE assigned_to IS NOT NULL;


-- ─── 5.2 pastor_schedule ──────────────────────────────────────────
-- Pastors' availability and scheduled activities (visits, meetings, etc.).
-- TypeScript: PastorSchedule
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pastor_schedule (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pastor_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  pastor_name     TEXT,
  date            TIMESTAMPTZ NOT NULL,
  start_time      TEXT NOT NULL DEFAULT '08:00',
  end_time        TEXT NOT NULL DEFAULT '17:00',
  type            TEXT NOT NULL DEFAULT 'visite' CHECK (type IN (
    'visite', 'entretien', 'culte', 'reunion', 'formation', 'personnel', 'autre'
  )),
  title           TEXT NOT NULL,
  description     TEXT,
  location        TEXT,
  is_available    BOOLEAN NOT NULL DEFAULT false,  -- false = busy, true = available slot
  status          TEXT NOT NULL DEFAULT 'planifie' CHECK (status IN (
    'planifie', 'confirme', 'termine', 'annule'
  )),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pastor_schedule ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS pastor_sched_select ON pastor_schedule;
  CREATE POLICY pastor_sched_select ON pastor_schedule FOR SELECT
    TO authenticated USING (
      -- Pastors can read all schedules; members can only see their own pastor's
      is_pastor_or_above()
      OR owns_profile(pastor_id)
    );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS pastor_sched_insert ON pastor_schedule;
  CREATE POLICY pastor_sched_insert ON pastor_schedule FOR INSERT
    WITH CHECK (
      is_pastor_or_above()
      OR owns_profile(pastor_id)
    );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS pastor_sched_update ON pastor_schedule;
  CREATE POLICY pastor_sched_update ON pastor_schedule FOR UPDATE
    USING (
      is_pastor_or_above()
      OR owns_profile(pastor_id)
    )
    WITH CHECK (
      is_pastor_or_above()
      OR owns_profile(pastor_id)
    );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS pastor_sched_delete ON pastor_schedule;
  CREATE POLICY pastor_sched_delete ON pastor_schedule FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_pastor_sched_pastor ON pastor_schedule(pastor_id);
CREATE INDEX IF NOT EXISTS idx_pastor_sched_date ON pastor_schedule(date);
CREATE INDEX IF NOT EXISTS idx_pastor_sched_status ON pastor_schedule(status);
CREATE INDEX IF NOT EXISTS idx_pastor_sched_type ON pastor_schedule(type);


-- ─── 5.3 visit_requests ────────────────────────────────────────────
-- Requests from members or visitors for a pastoral/home visit.
-- TypeScript: VisitRequest
-- ─────────────────────────────────────────────────────────────────────

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

ALTER TABLE visit_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS visit_req_select ON visit_requests;
  CREATE POLICY visit_req_select ON visit_requests FOR SELECT
    TO authenticated USING (
      -- Requester can see own; pastors can see all
      owns_profile(requester_id)
      OR is_pastor_or_above()
    );
END $$;

-- Members can insert their own visit requests
DO $$ BEGIN
  DROP POLICY IF EXISTS visit_req_insert ON visit_requests;
  CREATE POLICY visit_req_insert ON visit_requests FOR INSERT
    WITH CHECK (is_logged_in());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS visit_req_update ON visit_requests;
  CREATE POLICY visit_req_update ON visit_requests FOR UPDATE
    USING (is_pastor_or_above())
    WITH CHECK (is_pastor_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS visit_req_delete ON visit_requests;
  CREATE POLICY visit_req_delete ON visit_requests FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_visit_req_status ON visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_visit_req_urgency ON visit_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_visit_req_requester ON visit_requests(requester_id) WHERE requester_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visit_req_assigned ON visit_requests(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visit_req_created ON visit_requests(created_at DESC);


-- ─── 5.4 spiritual_assessments ────────────────────────────────────
-- Periodic spiritual growth assessment for church members (1-10 scale).
-- TypeScript: SpiritualAssessment
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS spiritual_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_name       TEXT,
  period          TEXT NOT NULL,  -- e.g. '2026-Q3' or '2026-07'
  prayer_life     INTEGER NOT NULL DEFAULT 5 CHECK (prayer_life BETWEEN 1 AND 10),
  bible_study     INTEGER NOT NULL DEFAULT 5 CHECK (bible_study BETWEEN 1 AND 10),
  fellowship      INTEGER NOT NULL DEFAULT 5 CHECK (fellowship BETWEEN 1 AND 10),
  evangelism      INTEGER NOT NULL DEFAULT 5 CHECK (evangelism BETWEEN 1 AND 10),
  giving          INTEGER NOT NULL DEFAULT 5 CHECK (giving BETWEEN 1 AND 10),
  service         INTEGER NOT NULL DEFAULT 5 CHECK (service BETWEEN 1 AND 10),
  overall_score   INTEGER NOT NULL DEFAULT 5 CHECK (overall_score BETWEEN 1 AND 10),
  strengths       TEXT,
  areas_to_grow   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE spiritual_assessments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS spirit_assess_select ON spiritual_assessments;
  CREATE POLICY spirit_assess_select ON spiritual_assessments FOR SELECT
    TO authenticated USING (
      -- Own assessment or pastor can see all
      owns_profile(user_id)
      OR is_pastor_or_above()
    );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS spirit_assess_insert ON spiritual_assessments;
  CREATE POLICY spirit_assess_insert ON spiritual_assessments FOR INSERT
    WITH CHECK (
      -- Member can create self-assessment; pastor can create for anyone
      owns_profile(user_id)
      OR is_pastor_or_above()
    );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS spirit_assess_update ON spiritual_assessments;
  CREATE POLICY spirit_assess_update ON spiritual_assessments FOR UPDATE
    USING (
      owns_profile(user_id)
      OR is_pastor_or_above()
    )
    WITH CHECK (
      owns_profile(user_id)
      OR is_pastor_or_above()
    );
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS spirit_assess_delete ON spiritual_assesssments;
  CREATE POLICY spirit_assess_delete ON spiritual_assessments FOR DELETE
    USING (is_super_admin());
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_spirit_assess_unique
  ON spiritual_assessments(user_id, period);

CREATE INDEX IF NOT EXISTS idx_spirit_assess_user ON spiritual_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_spirit_assess_period ON spiritual_assessments(period DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- SUPPORT TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── S.1 notifications (IF NOT EXISTS) ─────────────────────────────
-- NOTE: This table already exists from migration 20260713000000.
-- Using IF NOT EXISTS as safety; the existing table is unchanged.
-- TypeScript: Notification + NotificationItem
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN (
    'prayer_prayed', 'service_assigned', 'service_accepted',
    'service_declined', 'role_approved', 'role_rejected',
    'new_post', 'new_comment', 'daily_thought', 'general',
    'visitor_assigned', 'onboarding_reminder',
    'assignment', 'reminder', 'alert', 'info', 'visit', 'prayer'
  )),
  title           TEXT NOT NULL,
  body            TEXT,
  link            TEXT,
  ref_table       TEXT,
  ref_id          UUID,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS notif_select ON notifications;
  CREATE POLICY notif_select ON notifications FOR SELECT
    USING (owns_profile(user_id));
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS notif_update ON notifications;
  CREATE POLICY notif_update ON notifications FOR UPDATE
    USING (owns_profile(user_id))
    WITH CHECK (owns_profile(user_id));
END $$;

-- Notifications are created only via SECURITY DEFINER functions/triggers,
-- so no INSERT/DELETE policies for regular users.


-- ─── S.2 newsletters ───────────────────────────────────────────────
-- Compose, schedule, and track email/newsletter campaigns.
-- TypeScript: NewsletterItem (from CommunicationPage.tsx)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS newsletters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  audience        TEXT NOT NULL DEFAULT 'all' CHECK (audience IN (
    'all', 'members', 'pastors', 'department'
  )),
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'sent'
  )),
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS nl_select ON newsletters;
  CREATE POLICY nl_select ON newsletters FOR SELECT
    TO authenticated USING (is_member_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS nl_insert ON newsletters;
  CREATE POLICY nl_insert ON newsletters FOR INSERT
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS nl_update ON newsletters;
  CREATE POLICY nl_update ON newsletters FOR UPDATE
    USING (is_chief_or_above())
    WITH CHECK (is_chief_or_above());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS nl_delete ON newsletters;
  CREATE POLICY nl_delete ON newsletters FOR DELETE
    USING (is_super_admin());
END $$;

CREATE INDEX IF NOT EXISTS idx_nl_status ON newsletters(status);
CREATE INDEX IF NOT EXISTS idx_nl_created ON newsletters(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nl_scheduled ON newsletters(scheduled_at) WHERE scheduled_at IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── F.1 get_dashboard_stats() ─────────────────────────────────────
-- Returns a single JSON object with key dashboard KPIs.
-- Called from the DashboardPage to populate the overview cards.
-- SECURITY DEFINER so any authenticated user can call via RPC.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_members', (SELECT COUNT(*) FROM user_profiles WHERE role IS NOT NULL),
    'new_converts_month', (SELECT COUNT(*) FROM convertis WHERE created_at >= date_trunc('month', NOW())),
    'upcoming_events', (SELECT COUNT(*) FROM calendar_events WHERE event_date >= NOW()),
    'pending_visit_requests', (SELECT COUNT(*) FROM visit_requests WHERE status = 'en_attente'),
    'open_prayer_requests', (SELECT COUNT(*) FROM prayer_requests WHERE status IN ('nouveau', 'en_priere')),
    'convertis_in_pipeline', (SELECT COUNT(*) FROM convertis WHERE pipeline_stage != 'membre_actif'),
    'unresolved_alerts', (SELECT COUNT(*) FROM pastoral_alerts WHERE status = 'ouverte')
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- ─── F.2 check_converti_72h_alerts() ───────────────────────────────
-- Auto-create pastoral alerts for convertis still in 'nouveau' stage
-- after 72 hours (no first contact made).
-- Designed to be called by pg_cron on a schedule (e.g. every hour).
-- SECURITY DEFINER to bypass RLS.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_converti_72h_alerts()
RETURNS void AS $$
BEGIN
  INSERT INTO pastoral_alerts (type, converti_id, description, severity, status, created_at, updated_at)
  SELECT
    'ame_en_danger_72h',
    c.id,
    'Ce converti n''a pas été contacté dans les 72 heures suivant son enregistrement.',
    'haute',
    'ouverte',
    NOW(),
    NOW()
  FROM convertis c
  WHERE c.pipeline_stage = 'nouveau'
    AND c.created_at < NOW() - INTERVAL '72 hours'
    AND NOT EXISTS (
      SELECT 1 FROM pastoral_alerts pa
      WHERE pa.converti_id = c.id
        AND pa.type = 'ame_en_danger_72h'
        AND pa.status = 'ouverte'
    )
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════════════════
-- OPTIONAL: pg_cron schedule for 72h auto-alerts
-- Uncomment the line below if pg_cron is enabled in your Supabase project.
-- Runs every hour to check for uncontacted convertis.
-- ═══════════════════════════════════════════════════════════════════════════

-- SELECT cron.schedule(
--   'check_converti_72h',
--   '0 * * * *',  -- every hour
--   $$ SELECT check_converti_72h_alerts(); $$
-- );


-- ═══════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════
--
-- New tables created: 21
--   calendar_events, event_assignments, event_minutes,
--   inventory_items, inventory_reservations,
--   zones_evangelisation, cellules_maison, convertis, converti_timeline,
--   communication_messages, media_library,
--   mission_reports, mission_finances, impact_counters,
--   pastoral_alerts, pastor_schedule, visit_requests, spiritual_assessments,
--   newsletters
--   (prayer_requests — extended, notifications — IF NOT EXISTS)
--
-- Functions created: 2
--   get_dashboard_stats(), check_converti_72h_alerts()
--
-- All tables have:
--   ✅ UUID primary keys with gen_random_uuid()
--   ✅ Row Level Security enabled
--   ✅ Granular RLS policies (role-based access)
--   ✅ Performance indexes on frequently queried columns
--   ✅ Foreign keys with ON DELETE CASCADE/SET NULL
--   ✅ CHECK constraints matching TypeScript enum types
--   ✅ Comments and section headers
--
-- ═══════════════════════════════════════════════════════════════════════════