-- ═══════════════════════════════════════════════════════════════════════
-- 28 — RECOMMANDATIONS SUR LES FORMULAIRES ORATEUR
--
-- Le département Média et le bureau pastoral commentent le formulaire
-- soumis par l'orateur. Chaque recommandation est adressée soit au
-- département, soit à l'orateur lui-même (visible sur son lien public).
--
-- Comme le reste du module culte, les politiques sont ouvertes à
-- `anon` : l'orateur n'a pas de compte et consulte son formulaire via
-- un lien à jeton.
--
-- Script idempotent — à exécuter dans le SQL Editor Supabase.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS worship_form_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES worship_orator_forms(id) ON DELETE CASCADE,
  author_id UUID,
  author_name TEXT NOT NULL,
  author_role TEXT,
  target TEXT NOT NULL DEFAULT 'department'
    CHECK (target IN ('department', 'orator')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worship_reco_form
  ON worship_form_recommendations(form_id, created_at DESC);

DO $$
BEGIN
  ALTER TABLE worship_form_recommendations ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS worship_form_recommendations_module_access ON worship_form_recommendations;
  CREATE POLICY worship_form_recommendations_module_access
    ON worship_form_recommendations
    FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);
END $$;

SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'worship_form_recommendations';
