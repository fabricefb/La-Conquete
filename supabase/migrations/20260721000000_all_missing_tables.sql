-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260721000000_all_missing_tables.sql
-- Description: Create ALL missing DB tables referenced in the application code.
--              Each table includes RLS policies, useful indexes, and CHECK
--              constraints matching the TypeScript type definitions.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1 — WORSHIP / CULT PLANNING (Planification de Culte)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. worship_services
CREATE TABLE IF NOT EXISTS worship_services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date              DATE NOT NULL,
  time              TEXT NOT NULL DEFAULT '10:00',
  type              TEXT NOT NULL
    CHECK (type IN (
      'enseignement_priere','jeune_priere','jeune_gen_espoir','adoration_louange',
      'seminaire','veillee','culte_special','conference','exposition','retraite','autre'
    )),
  orator_name       TEXT,
  president_name    TEXT,
  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','planned','orator_submitted','president_submitted','completed','cancelled')),
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_delayed        BOOLEAN NOT NULL DEFAULT false,
  delayed_at        TIMESTAMPTZ,
  delayed_minutes   INTEGER NOT NULL DEFAULT 0,
  form_deadline_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ws_date ON worship_services(date);
CREATE INDEX IF NOT EXISTS idx_ws_type ON worship_services(type);
CREATE INDEX IF NOT EXISTS idx_ws_status ON worship_services(status);
DO $$ BEGIN ALTER TABLE worship_services ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "ws_public_select" ON worship_services;
CREATE POLICY "ws_public_select" ON worship_services FOR SELECT USING (true);
DROP POLICY IF EXISTS "ws_admin_all" ON worship_services;
CREATE POLICY "ws_admin_all" ON worship_services FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 2. worship_form_links
CREATE TABLE IF NOT EXISTS worship_form_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      UUID NOT NULL REFERENCES worship_services(id) ON DELETE CASCADE,
  link_type       TEXT NOT NULL CHECK (link_type IN ('orator','president')),
  token           TEXT NOT NULL UNIQUE,
  recipient_name  TEXT,
  recipient_phone TEXT,
  is_used         BOOLEAN NOT NULL DEFAULT false,
  sent_at         TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wfl_service ON worship_form_links(service_id);
CREATE INDEX IF NOT EXISTS idx_wfl_token  ON worship_form_links(token);
DO $$ BEGIN ALTER TABLE worship_form_links ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "wfl_public_select" ON worship_form_links;
CREATE POLICY "wfl_public_select" ON worship_form_links FOR SELECT USING (true);
DROP POLICY IF EXISTS "wfl_admin_all" ON worship_form_links;
CREATE POLICY "wfl_admin_all" ON worship_form_links FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 3. worship_orator_forms
CREATE TABLE IF NOT EXISTS worship_orator_forms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id    UUID NOT NULL REFERENCES worship_services(id) ON DELETE CASCADE,
  orator_name   TEXT NOT NULL,
  theme         TEXT NOT NULL,
  sub_theme     TEXT,
  bible_book    TEXT,
  bible_chapter TEXT,
  bible_verses  TEXT,
  summary       TEXT,
  remarks       TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wof_service ON worship_orator_forms(service_id);
DO $$ BEGIN ALTER TABLE worship_orator_forms ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "wof_public_select" ON worship_orator_forms;
CREATE POLICY "wof_public_select" ON worship_orator_forms FOR SELECT USING (true);
DROP POLICY IF EXISTS "wof_admin_all" ON worship_orator_forms;
CREATE POLICY "wof_admin_all" ON worship_orator_forms FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 4. worship_order_items
CREATE TABLE IF NOT EXISTS worship_order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id       UUID NOT NULL REFERENCES worship_services(id) ON DELETE CASCADE,
  item_type        TEXT NOT NULL
    CHECK (item_type IN (
      'louange','adoration','offrande','communique','predication',
      'temoignage','sainte_cene','priere_nouveaux','accueil_invites',
      'intervention_speciale','priere_finale','autre'
    )),
  custom_label     TEXT,
  notes            TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 5,
  position         INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_woi_service ON worship_order_items(service_id);
DO $$ BEGIN ALTER TABLE worship_order_items ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "woi_public_select" ON worship_order_items;
CREATE POLICY "woi_public_select" ON worship_order_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "woi_admin_all" ON worship_order_items;
CREATE POLICY "woi_admin_all" ON worship_order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 5. worship_orator_points
CREATE TABLE IF NOT EXISTS worship_orator_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id     UUID NOT NULL REFERENCES worship_orator_forms(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wop_form ON worship_orator_points(form_id);
DO $$ BEGIN ALTER TABLE worship_orator_points ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "wop_public_select" ON worship_orator_points;
CREATE POLICY "wop_public_select" ON worship_orator_points FOR SELECT USING (true);
DROP POLICY IF EXISTS "wop_admin_all" ON worship_orator_points;
CREATE POLICY "wop_admin_all" ON worship_orator_points FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2 — PROTOCOL (Protocol / Accueil)
-- ═══════════════════════════════════════════════════════════════════════════

-- 6. protocol_teams
CREATE TABLE IF NOT EXISTS protocol_teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#3b82f6',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
DO $$ BEGIN ALTER TABLE protocol_teams ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "pt_public_select" ON protocol_teams;
CREATE POLICY "pt_public_select" ON protocol_teams FOR SELECT USING (true);
DROP POLICY IF EXISTS "pt_admin_all" ON protocol_teams;
CREATE POLICY "pt_admin_all" ON protocol_teams FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 7. protocol_team_members
CREATE TABLE IF NOT EXISTS protocol_team_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES protocol_teams(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_team  TEXT NOT NULL DEFAULT 'agent' CHECK (role_in_team IN ('agent','responsable','adjoint')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ptm_team ON protocol_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_ptm_user ON protocol_team_members(user_id);
DO $$ BEGIN ALTER TABLE protocol_team_members ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "ptm_public_select" ON protocol_team_members;
CREATE POLICY "ptm_public_select" ON protocol_team_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "ptm_admin_all" ON protocol_team_members;
CREATE POLICY "ptm_admin_all" ON protocol_team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 8. protocol_dress_code
CREATE TABLE IF NOT EXISTS protocol_dress_code (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cult_day         TEXT NOT NULL CHECK (cult_day IN ('mercredi','vendredi','samedi','dimanche','autre')),
  description      TEXT NOT NULL,
  required_items   TEXT[] NOT NULL DEFAULT '{}',
  formality_level  TEXT NOT NULL DEFAULT 'decontracte'
    CHECK (formality_level IN ('decontracte','correct','habille','formel')),
  icon_hint        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cult_day)
);
DO $$ BEGIN ALTER TABLE protocol_dress_code ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "pdc_public_select" ON protocol_dress_code;
CREATE POLICY "pdc_public_select" ON protocol_dress_code FOR SELECT USING (true);
DROP POLICY IF EXISTS "pdc_admin_all" ON protocol_dress_code;
CREATE POLICY "pdc_admin_all" ON protocol_dress_code FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 9. protocol_schedules
CREATE TABLE IF NOT EXISTS protocol_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES protocol_teams(id) ON DELETE CASCADE,
  cult_day    TEXT NOT NULL CHECK (cult_day IN ('mercredi','vendredi','samedi','dimanche','autre')),
  week_number INTEGER,
  month       INTEGER CHECK (month BETWEEN 1 AND 12),
  year        INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_psch_team ON protocol_schedules(team_id);
CREATE INDEX IF NOT EXISTS idx_psch_day_year ON protocol_schedules(cult_day, year);
DO $$ BEGIN ALTER TABLE protocol_schedules ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "psch_public_select" ON protocol_schedules;
CREATE POLICY "psch_public_select" ON protocol_schedules FOR SELECT USING (true);
DROP POLICY IF EXISTS "psch_admin_all" ON protocol_schedules;
CREATE POLICY "psch_admin_all" ON protocol_schedules FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 10. cult_reports
CREATE TABLE IF NOT EXISTS cult_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_name    TEXT NOT NULL,
  cult_day         TEXT NOT NULL CHECK (cult_day IN ('mercredi','vendredi','samedi','dimanche','autre')),
  cult_date        DATE NOT NULL,
  men_count        INTEGER NOT NULL DEFAULT 0,
  women_count      INTEGER NOT NULL DEFAULT 0,
  children_count   INTEGER NOT NULL DEFAULT 0,
  new_comers_count INTEGER NOT NULL DEFAULT 0,
  empty_seats      INTEGER NOT NULL DEFAULT 0,
  total_attendance INTEGER NOT NULL DEFAULT 0,
  incidents        TEXT,
  team_group       TEXT,
  extension_id     UUID REFERENCES extensions(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (status IN ('brouillon','soumis','valide','rejete')),
  reviewed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  admin_notes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cr_date ON cult_reports(cult_date);
CREATE INDEX IF NOT EXISTS idx_cr_day  ON cult_reports(cult_day);
CREATE INDEX IF NOT EXISTS idx_cr_status ON cult_reports(status);
CREATE INDEX IF NOT EXISTS idx_cr_user ON cult_reports(user_id);
DO $$ BEGIN ALTER TABLE cult_reports ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "cr_authenticated_select" ON cult_reports;
CREATE POLICY "cr_authenticated_select" ON cult_reports FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "cr_admin_all" ON cult_reports;
CREATE POLICY "cr_admin_all" ON cult_reports FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3 — EVANGELISM (Évangélisation)
-- ═══════════════════════════════════════════════════════════════════════════

-- 11. evangelism_outings
CREATE TABLE IF NOT EXISTS evangelism_outings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  description        TEXT,
  outing_date        DATE NOT NULL,
  start_time         TEXT NOT NULL,
  end_time           TEXT,
  location           TEXT NOT NULL,
  location_quartier  TEXT,
  objective          TEXT NOT NULL DEFAULT 'autre'
    CHECK (objective IN (
      'porte_a_porte','marche','campagne','rue','hopital','prison','ecole','stade','autre'
    )),
  status             TEXT NOT NULL DEFAULT 'planifiee'
    CHECK (status IN ('planifiee','en_cours','terminee','annulee')),
  responsible_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responsible_name   TEXT,
  notes              TEXT,
  team_member_ids    UUID[] DEFAULT NULL,
  team_member_names  TEXT[] DEFAULT NULL,
  expected_attendees INTEGER NOT NULL DEFAULT 0,
  actual_attendees   INTEGER NOT NULL DEFAULT 0,
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eo_date   ON evangelism_outings(outing_date);
CREATE INDEX IF NOT EXISTS idx_eo_status ON evangelism_outings(status);
CREATE INDEX IF NOT EXISTS idx_eo_resp  ON evangelism_outings(responsible_id);
DO $$ BEGIN ALTER TABLE evangelism_outings ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "eo_public_select" ON evangelism_outings;
CREATE POLICY "eo_public_select" ON evangelism_outings FOR SELECT USING (true);
DROP POLICY IF EXISTS "eo_admin_all" ON evangelism_outings;
CREATE POLICY "eo_admin_all" ON evangelism_outings FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 12. evangelism_contacts
CREATE TABLE IF NOT EXISTS evangelism_contacts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outing_id               UUID REFERENCES evangelism_outings(id) ON DELETE SET NULL,
  full_name               TEXT NOT NULL,
  phone                   TEXT,
  whatsapp                TEXT,
  address                 TEXT,
  quartier                TEXT,
  decision                TEXT NOT NULL DEFAULT 'a_suivre'
    CHECK (decision IN (
      'interesse','en_savoir_plus','accepte_christ','veut_venir_eglise',
      'deja_croyant','pas_interesse','a_suivre'
    )),
  needs                   TEXT,
  prayer_request          TEXT,
  notes                   TEXT,
  status                  TEXT NOT NULL DEFAULT 'a_contacter'
    CHECK (status IN ('a_contacter','contacte','en_suivi','integre_eglise','perdu_de_vue')),
  assigned_to             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name        TEXT,
  first_contact_at        TIMESTAMPTZ,
  first_call_at           TIMESTAMPTZ,
  first_visit_at          TIMESTAMPTZ,
  invited_culte_id        UUID,
  invited_culte_date      DATE,
  came_to_culte           BOOLEAN NOT NULL DEFAULT false,
  culte_notes             TEXT,
  baptized                BOOLEAN NOT NULL DEFAULT false,
  baptism_date            DATE,
  created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  pipeline_stage          TEXT NOT NULL DEFAULT 'nouveau_contact'
    CHECK (pipeline_stage IN (
      'nouveau_contact','premier_contact','rdv_planifie','en_suivi',
      'venu_culte','etude_biblique','affermi','integre_eglise','baptise','perdu_de_vue'
    )),
  rdv_date                DATE,
  rdv_time                TEXT,
  rdv_type                TEXT NOT NULL DEFAULT 'autre'
    CHECK (rdv_type IN ('visite','appel','etude_biblique','prie_domicile','cafe_chretien','autre')),
  rdv_notes               TEXT,
  rdv_status              TEXT NOT NULL DEFAULT 'planifie'
    CHECK (rdv_status IN ('planifie','confirme','realise','annule','reporte')),
  source                  TEXT NOT NULL DEFAULT 'evangelisme'
    CHECK (source IN ('evangelisme','culte','evenement','recommandation','internet','autre')),
  source_culte_id         UUID,
  is_new_visitor          BOOLEAN NOT NULL DEFAULT false,
  discipleship_start_date DATE,
  discipleship_notes      TEXT
);
CREATE INDEX IF NOT EXISTS idx_ec_outing   ON evangelism_contacts(outing_id);
CREATE INDEX IF NOT EXISTS idx_ec_status   ON evangelism_contacts(status);
CREATE INDEX IF NOT EXISTS idx_ec_assigned ON evangelism_contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ec_pipeline ON evangelism_contacts(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_ec_baptized ON evangelism_contacts(baptized);
DO $$ BEGIN ALTER TABLE evangelism_contacts ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "ec_public_select" ON evangelism_contacts;
CREATE POLICY "ec_public_select" ON evangelism_contacts FOR SELECT USING (true);
DROP POLICY IF EXISTS "ec_admin_all" ON evangelism_contacts;
CREATE POLICY "ec_admin_all" ON evangelism_contacts FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 13. evangelism_followups
CREATE TABLE IF NOT EXISTS evangelism_followups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id     UUID NOT NULL REFERENCES evangelism_contacts(id) ON DELETE CASCADE,
  followup_type  TEXT NOT NULL DEFAULT 'appel'
    CHECK (followup_type IN (
      'appel','visite','message','invitation_culte','etude_biblique','prière','autre'
    )),
  scheduled_date DATE NOT NULL,
  completed_at   TIMESTAMPTZ,
  notes          TEXT,
  result         TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (result IN ('positif','neutre','negatif','a_reporter','en_attente')),
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ef_contact ON evangelism_followups(contact_id);
CREATE INDEX IF NOT EXISTS idx_ef_date    ON evangelism_followups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_ef_result  ON evangelism_followups(result);
DO $$ BEGIN ALTER TABLE evangelism_followups ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "ef_public_select" ON evangelism_followups;
CREATE POLICY "ef_public_select" ON evangelism_followups FOR SELECT USING (true);
DROP POLICY IF EXISTS "ef_admin_all" ON evangelism_followups;
CREATE POLICY "ef_admin_all" ON evangelism_followups FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 14. zones_evangelisation
CREATE TABLE IF NOT EXISTS zones_evangelisation (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT,
  coordinator_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  coordinator_name TEXT,
  converti_count   INTEGER NOT NULL DEFAULT 0,
  potential_score  INTEGER NOT NULL DEFAULT 5 CHECK (potential_score BETWEEN 1 AND 10),
  last_visited     DATE,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ze_active ON zones_evangelisation(is_active);
DO $$ BEGIN ALTER TABLE zones_evangelisation ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "ze_public_select" ON zones_evangelisation;
CREATE POLICY "ze_public_select" ON zones_evangelisation FOR SELECT USING (true);
DROP POLICY IF EXISTS "ze_admin_all" ON zones_evangelisation;
CREATE POLICY "ze_admin_all" ON zones_evangelisation FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4 — CONVERTI PIPELINE (CRM Spirituel)
-- ═══════════════════════════════════════════════════════════════════════════


-- 33. cellules_maison (House cells / small groups)
CREATE TABLE IF NOT EXISTS cellules_maison (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  leader_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_name  TEXT,
  zone         TEXT,
  quartier     TEXT,
  address      TEXT,
  meeting_day  TEXT NOT NULL
    CHECK (meeting_day IN (
      'lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'
    )),
  meeting_time TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cmaison_leader ON cellules_maison(leader_id);
CREATE INDEX IF NOT EXISTS idx_cmaison_active ON cellules_maison(is_active);
CREATE INDEX IF NOT EXISTS idx_cmaison_day    ON cellules_maison(meeting_day);
DO $$ BEGIN ALTER TABLE cellules_maison ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "cmaison_public_select" ON cellules_maison;
CREATE POLICY "cmaison_public_select" ON cellules_maison FOR SELECT USING (true);
DROP POLICY IF EXISTS "cmaison_admin_all" ON cellules_maison;
CREATE POLICY "cmaison_admin_all" ON cellules_maison FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);


-- 15. convertis
CREATE TABLE IF NOT EXISTS convertis (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  quartier              TEXT,
  zone                  TEXT,
  address               TEXT,
  gender                TEXT CHECK (gender IN ('homme','femme')),
  age_range             TEXT CHECK (age_range IN ('moins_18','18_25','26_35','36_50','plus_50')),
  request_type          TEXT CHECK (request_type IN ('priere','conseil','visite','information','relation_aide')),
  needs_pastoral_care   BOOLEAN NOT NULL DEFAULT false,
  evangelist_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evangelist_name       TEXT,
  mentor_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mentor_name           TEXT,
  pipeline_stage        TEXT NOT NULL DEFAULT 'nouveau'
    CHECK (pipeline_stage IN (
      'nouveau','premier_contact','visite_domicile','cellule','cours_bapteme','membre_actif'
    )),
  pipeline_updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_contact_date    DATE,
  first_contact_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visit_date            DATE,
  visit_done            BOOLEAN NOT NULL DEFAULT false,
  cellule_id            UUID REFERENCES cellules_maison(id) ON DELETE SET NULL,
  cellule_name          TEXT,
  bapteme_water_date    DATE,
  bapteme_saint_esprit  BOOLEAN NOT NULL DEFAULT false,
  became_member_date    DATE,
  notes                 TEXT,
  source                TEXT NOT NULL DEFAULT 'evangelisation'
    CHECK (source IN ('evangelisation','croisade','visite','internet','ami','media','autre')),
  event_id              UUID,
  created_by            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conv_stage     ON convertis(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_conv_evangelist ON convertis(evangelist_id);
CREATE INDEX IF NOT EXISTS idx_conv_mentor    ON convertis(mentor_id);
CREATE INDEX IF NOT EXISTS idx_conv_source    ON convertis(source);
DO $$ BEGIN ALTER TABLE convertis ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "conv_authenticated_select" ON convertis;
CREATE POLICY "conv_authenticated_select" ON convertis FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "conv_admin_all" ON convertis;
CREATE POLICY "conv_admin_all" ON convertis FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 16. converti_timeline
CREATE TABLE IF NOT EXISTS converti_timeline (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  converti_id  UUID NOT NULL REFERENCES convertis(id) ON DELETE CASCADE,
  stage_from   TEXT CHECK (stage_from IN (
    'nouveau','premier_contact','visite_domicile','cellule','cours_bapteme','membre_actif'
  )),
  stage_to     TEXT NOT NULL CHECK (stage_to IN (
    'nouveau','premier_contact','visite_domicile','cellule','cours_bapteme','membre_actif'
  )),
  action       TEXT NOT NULL,
  notes        TEXT,
  done_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  done_by_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ct_converti ON converti_timeline(converti_id);
CREATE INDEX IF NOT EXISTS idx_ct_date     ON converti_timeline(created_at);
DO $$ BEGIN ALTER TABLE converti_timeline ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "ct_authenticated_select" ON converti_timeline;
CREATE POLICY "ct_authenticated_select" ON converti_timeline FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ct_admin_all" ON converti_timeline;
CREATE POLICY "ct_admin_all" ON converti_timeline FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5 — VISITORS & DEPARTMENTS
-- ═══════════════════════════════════════════════════════════════════════════

-- 17. new_visitors
CREATE TABLE IF NOT EXISTS new_visitors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_name     TEXT NOT NULL,
  visitor_phone    TEXT,
  visitor_gender   TEXT CHECK (visitor_gender IN ('homme','femme')),
  visitor_quartier TEXT,
  how_known        TEXT CHECK (how_known IN ('membre_invitation','reseaux_sociaux','passant','media','autre')),
  invited_by       TEXT,
  follow_up_type   TEXT CHECK (follow_up_type IN ('visite','appel','information','aucun')),
  cult_day         TEXT CHECK (cult_day IN ('mercredi','vendredi','samedi','dimanche','autre')),
  cult_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status           TEXT NOT NULL DEFAULT 'nouveau'
    CHECK (status IN ('nouveau','contacte','suivi_en_cours','integre','perdu')),
  follow_up_notes  TEXT,
  follow_up_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  follow_up_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nv_date   ON new_visitors(cult_date);
CREATE INDEX IF NOT EXISTS idx_nv_status ON new_visitors(status);
CREATE INDEX IF NOT EXISTS idx_nv_rec    ON new_visitors(recorded_by);
DO $$ BEGIN ALTER TABLE new_visitors ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "nv_authenticated_select" ON new_visitors;
CREATE POLICY "nv_authenticated_select" ON new_visitors FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "nv_admin_all" ON new_visitors;
CREATE POLICY "nv_admin_all" ON new_visitors FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 18. department_notes
CREATE TABLE IF NOT EXISTS department_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  content       TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, department_id)
);
CREATE INDEX IF NOT EXISTS idx_dn_user_dept ON department_notes(user_id, department_id);
DO $$ BEGIN ALTER TABLE department_notes ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "dn_owner_all" ON department_notes;
CREATE POLICY "dn_owner_all" ON department_notes FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "dn_admin_all" ON department_notes;
CREATE POLICY "dn_admin_all" ON department_notes FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6 — DAILY VERSE
-- ═══════════════════════════════════════════════════════════════════════════

-- 19. daily_verses
CREATE TABLE IF NOT EXISTS daily_verses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verse_date  DATE NOT NULL,
  reference   TEXT NOT NULL,
  content     TEXT NOT NULL,
  exhortation TEXT,
  plan_id     UUID,
  day_number  INTEGER,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(verse_date)
);
CREATE INDEX IF NOT EXISTS idx_dv_date ON daily_verses(verse_date);
DO $$ BEGIN ALTER TABLE daily_verses ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "dv_public_select" ON daily_verses;
CREATE POLICY "dv_public_select" ON daily_verses FOR SELECT USING (true);
DROP POLICY IF EXISTS "dv_admin_all" ON daily_verses;
CREATE POLICY "dv_admin_all" ON daily_verses FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7 — VISIT REQUESTS
-- ═══════════════════════════════════════════════════════════════════════════

-- 20. visit_requests
CREATE TABLE IF NOT EXISTS visit_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name      TEXT,
  requester_phone     TEXT,
  requester_email     TEXT,
  beneficiary_name    TEXT NOT NULL,
  beneficiary_phone   TEXT,
  beneficiary_address TEXT NOT NULL,
  visit_type          TEXT NOT NULL DEFAULT 'pastorale'
    CHECK (visit_type IN ('pastorale','evangelisation','malade','encouragement','suivi')),
  reason              TEXT,
  urgency             TEXT NOT NULL DEFAULT 'normale'
    CHECK (urgency IN ('basse','normale','haute','urgente')),
  preferred_date      DATE,
  preferred_time      TEXT,
  assigned_to         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name    TEXT,
  status              TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (status IN (
      'en_attente','acceptee','planifiee','effectuee','refusee','reprogrammee'
    )),
  pastor_notes        TEXT,
  visited_at          TIMESTAMPTZ,
  response            TEXT,
  responded_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vr_status    ON visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_vr_requester ON visit_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_vr_assigned  ON visit_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_vr_urgency   ON visit_requests(urgency);
DO $$ BEGIN ALTER TABLE visit_requests ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "vr_owner_select" ON visit_requests;
CREATE POLICY "vr_owner_select" ON visit_requests FOR SELECT USING (
  requester_id = auth.uid() OR
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);
DROP POLICY IF EXISTS "vr_authenticated_insert" ON visit_requests;
CREATE POLICY "vr_authenticated_insert" ON visit_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "vr_admin_all" ON visit_requests;
CREATE POLICY "vr_admin_all" ON visit_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8 — PASTORAL (Espace Pastoral / Supervision)
-- ═══════════════════════════════════════════════════════════════════════════

-- 21. pastor_schedule
CREATE TABLE IF NOT EXISTS pastor_schedule (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pastor_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pastor_name  TEXT,
  date         DATE NOT NULL,
  start_time   TEXT NOT NULL,
  end_time     TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'autre'
    CHECK (type IN ('visite','entretien','culte','reunion','formation','personnel','autre')),
  title        TEXT NOT NULL,
  description  TEXT,
  location     TEXT,
  is_available BOOLEAN NOT NULL DEFAULT false,
  status       TEXT NOT NULL DEFAULT 'planifie'
    CHECK (status IN ('planifie','confirme','termine','annule')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ps_pastor ON pastor_schedule(pastor_id);
CREATE INDEX IF NOT EXISTS idx_ps_date   ON pastor_schedule(date);
CREATE INDEX IF NOT EXISTS idx_ps_status ON pastor_schedule(status);
DO $$ BEGIN ALTER TABLE pastor_schedule ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "ps_authenticated_select" ON pastor_schedule;
CREATE POLICY "ps_authenticated_select" ON pastor_schedule FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ps_admin_all" ON pastor_schedule;
CREATE POLICY "ps_admin_all" ON pastor_schedule FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 22. pastoral_alerts
CREATE TABLE IF NOT EXISTS pastoral_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT NOT NULL DEFAULT 'autre'
    CHECK (type IN ('ame_en_danger_72h','cas_lourd','retard_integration','autre')),
  converti_id      UUID REFERENCES convertis(id) ON DELETE SET NULL,
  converti_name    TEXT,
  description      TEXT NOT NULL,
  severity         TEXT NOT NULL DEFAULT 'moyenne'
    CHECK (severity IN ('haute','moyenne','basse')),
  status           TEXT NOT NULL DEFAULT 'ouverte'
    CHECK (status IN ('ouverte','en_cours','resolue')),
  assigned_to      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  resolved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at      TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pa_status   ON pastoral_alerts(status);
CREATE INDEX IF NOT EXISTS idx_pa_severity ON pastoral_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_pa_assigned ON pastoral_alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pa_converti ON pastoral_alerts(converti_id);
DO $$ BEGIN ALTER TABLE pastoral_alerts ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "pa_pastor_select" ON pastoral_alerts;
CREATE POLICY "pa_pastor_select" ON pastoral_alerts FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 4)
);
DROP POLICY IF EXISTS "pa_admin_all" ON pastoral_alerts;
CREATE POLICY "pa_admin_all" ON pastoral_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 23. spiritual_assessments
CREATE TABLE IF NOT EXISTS spiritual_assessments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name      TEXT,
  period         TEXT NOT NULL,
  prayer_life    INTEGER NOT NULL DEFAULT 5 CHECK (prayer_life BETWEEN 1 AND 10),
  bible_study    INTEGER NOT NULL DEFAULT 5 CHECK (bible_study BETWEEN 1 AND 10),
  fellowship     INTEGER NOT NULL DEFAULT 5 CHECK (fellowship BETWEEN 1 AND 10),
  evangelism     INTEGER NOT NULL DEFAULT 5 CHECK (evangelism BETWEEN 1 AND 10),
  giving         INTEGER NOT NULL DEFAULT 5 CHECK (giving BETWEEN 1 AND 10),
  service        INTEGER NOT NULL DEFAULT 5 CHECK (service BETWEEN 1 AND 10),
  overall_score  INTEGER NOT NULL DEFAULT 5 CHECK (overall_score BETWEEN 1 AND 10),
  strengths      TEXT,
  areas_to_grow  TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sa_user   ON spiritual_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_sa_period ON spiritual_assessments(period);
DO $$ BEGIN ALTER TABLE spiritual_assessments ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "sa_owner_select" ON spiritual_assessments;
CREATE POLICY "sa_owner_select" ON spiritual_assessments FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "sa_admin_all" ON spiritual_assessments;
CREATE POLICY "sa_admin_all" ON spiritual_assessments FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 24. spiritual_evaluations (simplified self-evaluation from dashboard)
CREATE TABLE IF NOT EXISTS spiritual_evaluations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name      TEXT,
  period         TEXT NOT NULL,
  overall_score  INTEGER NOT NULL DEFAULT 0,
  want_interview BOOLEAN NOT NULL DEFAULT false,
  answers        JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_se_user ON spiritual_evaluations(user_id);
DO $$ BEGIN ALTER TABLE spiritual_evaluations ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "se_owner_all" ON spiritual_evaluations;
CREATE POLICY "se_owner_all" ON spiritual_evaluations FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "se_admin_all" ON spiritual_evaluations;
CREATE POLICY "se_admin_all" ON spiritual_evaluations FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 9 — REPORTS & STATISTICS
-- ═══════════════════════════════════════════════════════════════════════════

-- 25. impact_counters
CREATE TABLE IF NOT EXISTS impact_counters (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period                 TEXT NOT NULL CHECK (period IN ('jour','semaine','mois','trimestre','annee')),
  period_value           TEXT NOT NULL,
  persons_contacted      INTEGER NOT NULL DEFAULT 0,
  decisions              INTEGER NOT NULL DEFAULT 0,
  bibles_distributed     INTEGER NOT NULL DEFAULT 0,
  baptisms_water         INTEGER NOT NULL DEFAULT 0,
  baptisms_holy_spirit   INTEGER NOT NULL DEFAULT 0,
  new_active_members     INTEGER NOT NULL DEFAULT 0,
  prayer_requests_answered INTEGER NOT NULL DEFAULT 0,
  zone_id                UUID,
  zone_name              TEXT,
  department_id          UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ic_period ON impact_counters(period, period_value);
DO $$ BEGIN ALTER TABLE impact_counters ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "ic_public_select" ON impact_counters;
CREATE POLICY "ic_public_select" ON impact_counters FOR SELECT USING (true);
DROP POLICY IF EXISTS "ic_admin_all" ON impact_counters;
CREATE POLICY "ic_admin_all" ON impact_counters FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 26. mission_reports
CREATE TABLE IF NOT EXISTS mission_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID,
  event_title         TEXT,
  zone_id             UUID,
  zone_name           TEXT,
  report_date         DATE NOT NULL,
  persons_contacted   INTEGER NOT NULL DEFAULT 0,
  decisions_count     INTEGER NOT NULL DEFAULT 0,
  bibles_distributed  INTEGER NOT NULL DEFAULT 0,
  tracts_distributed  INTEGER NOT NULL DEFAULT 0,
  new_contacts_count  INTEGER NOT NULL DEFAULT 0,
  highlights          TEXT NOT NULL DEFAULT '',
  challenges          TEXT NOT NULL DEFAULT '',
  testimonies         TEXT,
  photos              TEXT[] DEFAULT NULL,
  reported_by         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_by_name    TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed')),
  reviewed_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  reviewer_notes      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mr_date   ON mission_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_mr_status ON mission_reports(status);
DO $$ BEGIN ALTER TABLE mission_reports ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "mr_public_select" ON mission_reports;
CREATE POLICY "mr_public_select" ON mission_reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "mr_admin_all" ON mission_reports;
CREATE POLICY "mr_admin_all" ON mission_reports FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 27. mission_finances
CREATE TABLE IF NOT EXISTS mission_finances (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_report_id  UUID REFERENCES mission_reports(id) ON DELETE SET NULL,
  event_id           UUID,
  event_title        TEXT,
  budget_allocated   NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_costs    NUMERIC(12,2) NOT NULL DEFAULT 0,
  material_costs     NUMERIC(12,2) NOT NULL DEFAULT 0,
  special_offering   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_expenses     NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance            NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','CDF','EUR')),
  notes              TEXT,
  created_by         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mf_report ON mission_finances(mission_report_id);
CREATE INDEX IF NOT EXISTS idx_mf_event  ON mission_finances(event_id);
DO $$ BEGIN ALTER TABLE mission_finances ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "mf_public_select" ON mission_finances;
CREATE POLICY "mf_public_select" ON mission_finances FOR SELECT USING (true);
DROP POLICY IF EXISTS "mf_admin_all" ON mission_finances;
CREATE POLICY "mf_admin_all" ON mission_finances FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 10 — EVENTS (Assignments, Minutes, Reminders)
-- ═══════════════════════════════════════════════════════════════════════════

-- 28. event_assignments
CREATE TABLE IF NOT EXISTS event_assignments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   TEXT NOT NULL,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name  TEXT,
  role       TEXT NOT NULL DEFAULT 'other'
    CHECK (role IN (
      'preacher','intercessor','logistician','worship_leader','singer',
      'usher','sound_tech','camera','other'
    )),
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined')),
  notified   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ea_event ON event_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_ea_user  ON event_assignments(user_id);
DO $$ BEGIN ALTER TABLE event_assignments ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "ea_public_select" ON event_assignments;
CREATE POLICY "ea_public_select" ON event_assignments FOR SELECT USING (true);
DROP POLICY IF EXISTS "ea_admin_all" ON event_assignments;
CREATE POLICY "ea_admin_all" ON event_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 29. event_minutes
CREATE TABLE IF NOT EXISTS event_minutes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         TEXT NOT NULL,
  time_slot        TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  responsible_id   UUID,
  responsible_name TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_completed     BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emin_event ON event_minutes(event_id);
DO $$ BEGIN ALTER TABLE event_minutes ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "emin_public_select" ON event_minutes;
CREATE POLICY "emin_public_select" ON event_minutes FOR SELECT USING (true);
DROP POLICY IF EXISTS "emin_admin_all" ON event_minutes;
CREATE POLICY "emin_admin_all" ON event_minutes FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 30. event_reminders
CREATE TABLE IF NOT EXISTS event_reminders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              TEXT NOT NULL,
  reminder_time         TEXT NOT NULL CHECK (reminder_time IN ('matin','apres_midi','soir')),
  reminder_offset_hours INTEGER NOT NULL DEFAULT 1,
  message_template      TEXT,
  target_type           TEXT NOT NULL DEFAULT 'all'
    CHECK (target_type IN ('all','department','team','custom')),
  target_ids            UUID[] DEFAULT '{}',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_er_event ON event_reminders(event_id);
DO $$ BEGIN ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "er_public_select" ON event_reminders;
CREATE POLICY "er_public_select" ON event_reminders FOR SELECT USING (true);
DROP POLICY IF EXISTS "er_admin_all" ON event_reminders;
CREATE POLICY "er_admin_all" ON event_reminders FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 11 — COMMUNICATION & CONTENT
-- ═══════════════════════════════════════════════════════════════════════════

-- 31. newsletters
CREATE TABLE IF NOT EXISTS newsletters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  audience        TEXT NOT NULL DEFAULT 'all'
    CHECK (audience IN ('all','members','pastors','department')),
  department_id   UUID,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','sent')),
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nl_status ON newsletters(status);
DO $$ BEGIN ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "nl_public_select" ON newsletters;
CREATE POLICY "nl_public_select" ON newsletters FOR SELECT USING (status = 'sent');
DROP POLICY IF EXISTS "nl_admin_all" ON newsletters;
CREATE POLICY "nl_admin_all" ON newsletters FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 32. member_testimonies
CREATE TABLE IF NOT EXISTS member_testimonies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN (
      'general','guerison','finance','maternite','delivrance','miracle','salut','famille','autre'
    )),
  is_anonymous   BOOLEAN NOT NULL DEFAULT false,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','published')),
  reviewed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  reviewer_notes TEXT,
  admin_comment  TEXT,
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mt_user   ON member_testimonies(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_status ON member_testimonies(status);
DO $$ BEGIN ALTER TABLE member_testimonies ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "mt_public_select" ON member_testimonies;
CREATE POLICY "mt_public_select" ON member_testimonies FOR SELECT USING (status = 'published');
DROP POLICY IF EXISTS "mt_owner_insert" ON member_testimonies;
CREATE POLICY "mt_owner_insert" ON member_testimonies FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "mt_admin_all" ON member_testimonies;
CREATE POLICY "mt_admin_all" ON member_testimonies FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 34. chat_messages (Community chat)
CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name  TEXT NOT NULL DEFAULT '',
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cmsg_chat_created ON chat_messages(created_at);
DO $$ BEGIN ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "chat_authenticated_select" ON chat_messages;
CREATE POLICY "chat_authenticated_select" ON chat_messages FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "chat_authenticated_insert" ON chat_messages;
CREATE POLICY "chat_authenticated_insert" ON chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "chat_admin_all" ON chat_messages;
CREATE POLICY "chat_admin_all" ON chat_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 35. communication_messages
CREATE TABLE IF NOT EXISTS communication_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  channel         TEXT NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('sms','whatsapp','email','push','in_app')),
  target_type     TEXT NOT NULL DEFAULT 'all'
    CHECK (target_type IN ('all','equipe','department','cellule','role','custom')),
  target_ids      UUID[] DEFAULT '{}',
  target_label    TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','sent','failed')),
  sent_by         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_by_name    TEXT,
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  delivery_count  INTEGER NOT NULL DEFAULT 0,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commmsg_status ON communication_messages(status);
CREATE INDEX IF NOT EXISTS idx_commmsg_sent_by ON communication_messages(sent_by);
DO $$ BEGIN ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "commmsg_admin_all" ON communication_messages;
CREATE POLICY "commmsg_admin_all" ON communication_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- 36. media_library
CREATE TABLE IF NOT EXISTS media_library (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL DEFAULT 'autre'
    CHECK (category IN ('tract','guide','affiche','photo','video','document','autre')),
  file_url       TEXT NOT NULL,
  thumbnail_url  TEXT,
  file_type      TEXT NOT NULL DEFAULT '',
  file_size      BIGINT,
  access_role    TEXT NOT NULL DEFAULT 'admin'
    CHECK (access_role IN ('admin','pasteur','membre','public')),
  department_id  UUID,
  tags           TEXT[] DEFAULT '{}',
  download_count INTEGER NOT NULL DEFAULT 0,
  created_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ml_category ON media_library(category);
CREATE INDEX IF NOT EXISTS idx_ml_access  ON media_library(access_role);
DO $$ BEGIN ALTER TABLE media_library ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS "ml_public_select" ON media_library;
CREATE POLICY "ml_public_select" ON media_library FOR SELECT USING (
  access_role = 'public' OR auth.uid() IS NOT NULL
);
DROP POLICY IF EXISTS "ml_admin_all" ON media_library;
CREATE POLICY "ml_admin_all" ON media_library FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 12 — VIEW: Evangelism Statistics
-- ═══════════════════════════════════════════════════════════════════════════

-- 37. v_evangelism_stats
CREATE OR REPLACE VIEW v_evangelism_stats AS
SELECT
  (SELECT COUNT(*) FROM evangelism_outings WHERE status != 'annulee')::int AS total_outings,
  (SELECT COUNT(*) FROM evangelism_contacts)::int AS total_contacts,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE decision IN ('accepte_christ', 'veut_venir_eglise'))::int AS decisions,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE status = 'integre_eglise')::int AS integrated,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE came_to_culte = true)::int AS came_to_culte,
  (SELECT COUNT(*) FROM evangelism_followups
    WHERE completed_at IS NOT NULL)::int AS followups_done,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE status IN ('a_contacter', 'contacte', 'en_suivi'))::int AS active_followups,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE baptized = true)::int AS baptized,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE pipeline_stage = 'nouveau_contact')::int AS new_visitors,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE rdv_status = 'planifie')::int AS rdv_pending,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE discipleship_start_date IS NOT NULL)::int AS in_discipleship,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE rdv_status = 'realise')::int AS rdv_completed;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 13 — REALTIME: Enable realtime for chat_messages
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
