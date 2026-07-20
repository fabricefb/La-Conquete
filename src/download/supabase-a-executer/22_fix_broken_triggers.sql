-- ═══════════════════════════════════════════════════════════════════
-- 22_fix_broken_triggers.sql
-- CORRIGE : Les triggers fn_worship_set_link_expiry et
-- fn_worship_propagate_delay référencent la colonne
-- form_deadline_at qui n'existe pas dans la table.
--
-- Les fonctionnalités sont maintenant gérées côté client :
--   - expires_at est calculé et passé explicitement à l'insert
--   - Le report de deadline est fait par update client-side
--
-- À EXÉCUTER dans le SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Supprimer le trigger qui set expires_at à l'insert (réfère form_deadline_at)
DROP TRIGGER IF EXISTS trg_wfl_set_expiry ON worship_form_links;
DROP FUNCTION IF EXISTS fn_worship_set_link_expiry();

-- 2. Supprimer le trigger qui propage le retard (réfère NEW.form_deadline_at)
DROP TRIGGER IF EXISTS trg_ws_propagate_delay ON worship_services;
DROP FUNCTION IF EXISTS fn_worship_propagate_delay();

-- 3. (Optionnel) Si vous voulez tout de même la colonne GENERATED, exécutez
--    le fichier 21_add_form_deadline_column.sql APRÈS celui-ci,
--    puis recréez les triggers avec la colonne existante.