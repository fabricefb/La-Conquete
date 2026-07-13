-- ═══════════════════════════════════════════════════════════════════════════
-- 15 — Rapports de culte : extension multi-églises + ailes
-- Permet aux pasteurs de soumettre des rapports de culte.
-- Les rapports sont visibles dans l'onglet Protocole de l'admin.
-- Si 2-3 équipes protocole soumettent, les chiffres se fusionnent par aile.
-- RLS désactivé
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Vérifier / créer la table extensions ─────────────────────
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

-- ─── 2. Ajouter extension_id et aile aux rapports de culte ──────
ALTER TABLE cult_reports
  ADD COLUMN IF NOT EXISTS extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL;

ALTER TABLE cult_reports
  ADD COLUMN IF NOT EXISTS aile TEXT DEFAULT 'centrale'
  CHECK (aile IN ('centrale', 'nord', 'sud', 'est', 'ouest', 'autre'));

-- Index pour filtrer par extension et par aile
CREATE INDEX IF NOT EXISTS idx_cult_reports_extension ON cult_reports(extension_id);
CREATE INDEX IF NOT EXISTS idx_cult_reports_aile ON cult_reports(aile);

-- ─── 3. Table ailes de l'église ─────────────────────────────────
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

-- ─── 4. Vue consolidée : fusion des rapports par aile + date ──
-- Quand 2-3 équipes protocole soumettent, les chiffres s'additionnent par aile
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

-- ─── 5. Vue globale : total toutes ailes confondues ────────────
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

-- ═══════════════════════════════════════════════════════════════════════════
-- RÉCAPITULATIF
-- - Table extensions créée si manquante (RLS désactivé)
-- - Colonne extension_id ajoutée à cult_reports
-- - Colonne aile ajoutée à cult_reports (centrale/nord/sud/est/ouest/autre)
-- - Table church_wings créée si manquante (ailes de l'église)
-- - Vue v_cult_reports_consolidated : fusion par aile + date
-- - Vue v_cult_reports_global : fusion toutes ailes par date
-- ═══════════════════════════════════════════════════════════════════════════