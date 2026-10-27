-- ═══════════════════════════════════════════════════════════════════════
-- 30 — RÉPERTOIRES DE FICHE PASTEUR
--
-- Chaque pasteur peut regrouper ses prédications (vidéo ou playlist
-- YouTube/Facebook), ses articles (article du site ou lien externe) et
-- une petite galerie de photos. Le dossier public et le tiroir de fiche
-- lisent cette table ; le back-office l'alimente depuis la fiche du
-- pasteur.
--
-- Politique alignée sur le reste du site : lecture et écriture ouvertes
-- à `anon` / `authenticated`, l'accès administrateur étant contrôlé par
-- l'application.
--
-- Script idempotent — à exécuter dans le SQL Editor Supabase.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pastor_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pastor_id UUID NOT NULL REFERENCES pastors(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'predication'
    CHECK (kind IN ('predication', 'article', 'photo')),
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pastor_items_pastor
  ON pastor_items(pastor_id, kind, sort_order);

DO $$
BEGIN
  ALTER TABLE pastor_items ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS pastor_items_module_access ON pastor_items;
  CREATE POLICY pastor_items_module_access
    ON pastor_items
    FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);
END $$;

SELECT kind, count(*) AS nombre
FROM pastor_items
GROUP BY kind
ORDER BY kind;
