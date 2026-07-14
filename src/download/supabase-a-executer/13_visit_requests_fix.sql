-- ═══════════════════════════════════════════════════════════════
-- FIX: visit_requests — table manquante (erreur "Could not find table")
-- Exécuter APRÈS 12_fix_dept_requests_and_seed.sql
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Créer la table visit_requests ──────────────────────────
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

-- Pas de RLS (même pattern que le reste — user_profiles a RLS désactivé)
ALTER TABLE visit_requests DISABLE ROW LEVEL SECURITY;

-- Index
CREATE INDEX IF NOT EXISTS idx_visit_req_status ON visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_visit_req_urgency ON visit_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_visit_req_requester ON visit_requests(requester_id) WHERE requester_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visit_req_assigned ON visit_requests(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visit_req_created ON visit_requests(created_at DESC);

-- Trigger updated_at
DO $$ BEGIN
  CREATE TRIGGER trg_visit_requests_updated_at
    BEFORE UPDATE ON visit_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- RÉCAPITULATIF
-- ═══════════════════════════════════════════════════════════════
-- Table visit_requests CRÉÉE avec RLS désactivé
-- Le formulaire de demande de visite sur le dashboard fonctionnera
-- ═══════════════════════════════════════════════════════════════