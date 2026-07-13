-- ═══════════════════════════════════════════════════════════════════════════
-- 15 — Ajouter extension_id aux rapports de culte (multi-églises)
-- Permet de distinguer les rapports par antenne/extension et de les fusionner
-- RLS désactivé
-- ═══════════════════════════════════════════════════════════════════════════

-- Ajouter la colonne extension_id
ALTER TABLE cult_reports
  ADD COLUMN IF NOT EXISTS extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL;

-- Index pour filtrer par extension
CREATE INDEX IF NOT EXISTS idx_cult_reports_extension ON cult_reports(extension_id);

-- Vue consolidée : fusion des rapports par date + jour de culte
-- Cette vue additionne les chiffres de toutes les extensions pour la même date
CREATE OR REPLACE VIEW v_cult_reports_consolidated AS
SELECT
  cult_day,
  cult_date,
  COUNT(*) AS nb_extensions,
  SUM(men_count) AS men_count,
  SUM(women_count) AS women_count,
  SUM(children_count) AS children_count,
  SUM(new_comers_count) AS new_comers_count,
  SUM(empty_seats) AS empty_seats,
  SUM(men_count + women_count + children_count) AS total_attendance,
  array_agg(DISTINCT reporter_name) AS reporters,
  array_agg(DISTINCT extension_id) AS extension_ids,
  MAX(created_at) AS last_report_at,
  BOOL_AND(status = 'soumis' OR status = 'valide') AS all_submitted
FROM cult_reports
GROUP BY cult_day, cult_date;

-- ═══════════════════════════════════════════════════════════════════════════
-- RÉCAPITULATIF
-- - Colonne extension_id ajoutée à cult_reports
-- - Index idx_cult_reports_extension créé
-- - Vue v_cult_reports_consolidated créée pour la fusion multi-églises
-- ═══════════════════════════════════════════════════════════════════════════