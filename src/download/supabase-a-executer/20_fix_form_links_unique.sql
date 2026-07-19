-- ═══════════════════════════════════════════════════════════════════
-- 20_fix_form_links_unique.sql
-- URgence : corrige l'erreur "no unique or exclusion constraint
--   matching the conflict specification" quand un membre genere
--   un lien pour l'orateur ou le president de culte.
--
-- Cause : worship_form_links avait un INDEX simple sur (service_id, link_type)
--   mais PAS de contrainte UNIQUE. Le upsert avec onConflict exige une
--   contrainte UNIQUE.
--
-- Correction :
--   1. Supprime l'index simple
--   2. Ajoute une contrainte UNIQUE sur (service_id, link_type)
-- ═══════════════════════════════════════════════════════════════════

-- Supprimer l'index simple (non unique) s'il existe
DROP INDEX IF EXISTS idx_worship_form_links_service;

-- Ajouter la contrainte UNIQUE requise par le upsert
DO $$
BEGIN
  ALTER TABLE worship_form_links
    ADD CONSTRAINT worship_form_links_service_type_unique
    UNIQUE (service_id, link_type);
EXCEPTION WHEN duplicate_object THEN
  -- La contrainte existe deja, pas d'erreur
  RAISE NOTICE 'Contrainte UNIQUE deja existante, ignorée.';
END $$;

-- Recreer l'index en tant qu'index unique pour les performances
CREATE UNIQUE INDEX IF NOT EXISTS idx_worship_form_links_service_unique
  ON worship_form_links(service_id, link_type);