-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE ÉVANGÉLISATION — Département d'Évangélisation
-- Tables: evangelism_outings, evangelism_contacts, evangelism_followups
-- RLS désactivé (même pattern que worship_planning)
--
-- IDÉMPOTENT : peut être ré-exécuté sans erreur.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. evangelism_outings — Sorties d'évangélisation ────────────
CREATE TABLE IF NOT EXISTS evangelism_outings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  outing_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME,
  location TEXT NOT NULL,
  location_quartier TEXT,
  objective TEXT NOT NULL DEFAULT 'porte_a_porte' CHECK (objective IN (
    'porte_a_porte', 'marche', 'campagne', 'rue', 'hopital', 'prison',
    'ecole', 'stade', 'autre'
  )),
  status TEXT NOT NULL DEFAULT 'planifiee' CHECK (status IN (
    'planifiee', 'en_cours', 'terminee', 'annulee'
  )),
  responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responsible_name TEXT,
  notes TEXT,
  team_member_ids UUID[] DEFAULT '{}',
  team_member_names TEXT[] DEFAULT '{}',
  expected_attendees INTEGER DEFAULT 0,
  actual_attendees INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evangelism_outings_date ON evangelism_outings(outing_date DESC);
CREATE INDEX IF NOT EXISTS idx_evangelism_outings_status ON evangelism_outings(status);
CREATE INDEX IF NOT EXISTS idx_evangelism_outings_responsible ON evangelism_outings(responsible_id);

-- ─── 2. evangelism_contacts — Personnes rencontrées ─────────────
CREATE TABLE IF NOT EXISTS evangelism_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outing_id UUID REFERENCES evangelism_outings(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  quartier TEXT,
  decision TEXT NOT NULL DEFAULT 'interesse' CHECK (decision IN (
    'interesse', 'en_savoir_plus', 'accepte_christ', 'veut_venir_eglise',
    'deja_croyant', 'pas_interesse', 'a_suivre'
  )),
  needs TEXT,
  prayer_request TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'a_contacter' CHECK (status IN (
    'a_contacter', 'contacte', 'en_suivi', 'integre_eglise', 'perdu_de_vue'
  )),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  first_contact_at TIMESTAMPTZ,
  first_call_at TIMESTAMPTZ,
  first_visit_at TIMESTAMPTZ,
  invited_culte_id UUID,
  invited_culte_date TEXT,
  came_to_culte BOOLEAN DEFAULT FALSE,
  culte_notes TEXT,
  baptized BOOLEAN DEFAULT FALSE,
  baptism_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evangelism_contacts_outing ON evangelism_contacts(outing_id);
CREATE INDEX IF NOT EXISTS idx_evangelism_contacts_status ON evangelism_contacts(status);
CREATE INDEX IF NOT EXISTS idx_evangelism_contacts_decision ON evangelism_contacts(decision);
CREATE INDEX IF NOT EXISTS idx_evangelism_contacts_assigned ON evangelism_contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_evangelism_contacts_quartier ON evangelism_contacts(quartier);

-- ─── 3. evangelism_followups — Actions de suivi ──────────────────
CREATE TABLE IF NOT EXISTS evangelism_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES evangelism_contacts(id) ON DELETE CASCADE,
  followup_type TEXT NOT NULL DEFAULT 'appel' CHECK (followup_type IN (
    'appel', 'visite', 'message', 'invitation_culte', 'etude_biblique',
    'prière', 'autre'
  )),
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  result TEXT CHECK (result IN (
    'positif', 'neutre', 'negatif', 'a_reporter', 'en_attente'
  )) DEFAULT 'en_attente',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evangelism_followups_contact ON evangelism_followups(contact_id);
CREATE INDEX IF NOT EXISTS idx_evangelism_followups_date ON evangelism_followups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_evangelism_followups_type ON evangelism_followups(followup_type);

-- ═══════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION fn_evangelism_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_eo_updated
    BEFORE UPDATE ON evangelism_outings
    FOR EACH ROW EXECUTE FUNCTION fn_evangelism_update_updated_at();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_ec_updated
    BEFORE UPDATE ON evangelism_contacts
    FOR EACH ROW EXECUTE FUNCTION fn_evangelism_update_updated_at();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_ef_updated
    BEFORE UPDATE ON evangelism_followups
    FOR EACH ROW EXECUTE FUNCTION fn_evangelism_update_updated_at();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- RLS — DÉSACTIVÉ
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE evangelism_outings DISABLE ROW LEVEL SECURITY;
ALTER TABLE evangelism_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE evangelism_followups DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════
-- VUE RAPPORT — Statistiques d'évangélisation
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_evangelism_stats AS
SELECT
  (SELECT COUNT(*) FROM evangelism_outings WHERE status != 'annulee')::int AS total_outings,
  (SELECT COUNT(*) FROM evangelism_contacts)::int AS total_contacts,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE decision IN ('accepte_christ', 'veut_venir_eglise'))::int AS decisions,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE status = 'integre_eglise')::int AS integrated,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE came_to_culte = true)::int AS came_to_culte,
  (SELECT COUNT(*) FROM evangelism_followups WHERE completed_at IS NOT NULL)::int AS followups_done,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE status IN ('a_contacter', 'contacte', 'en_suivi'))::int AS active_followups,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE baptized = true)::int AS baptized;