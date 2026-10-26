-- ═══════════════════════════════════════════════════════════════════════════
-- 23 — VERROUILLAGE RLS DE user_profiles (à exécuter avant la mise en ligne)
--
-- Aujourd'hui la table est lisible/modifiable par n'importe quel visiteur
-- (clé anon publique) : emails, téléphones et adresses de tous les membres.
--
-- Ce script :
--   1. Crée lookup_email_by_phone() : recherche d'email côté serveur pour le
--      parcours « mot de passe oublié par WhatsApp » (téléphone exact), sans
--      exposer la table.
--   2. Active RLS et limite chaque membre à son propre profil ; les admins
--      gardent l'accès complet (fonction is_super_admin() SECURITY DEFINER).
--
-- Prérequis : is_super_admin() existe (voir supabase-migrations.sql).
-- Sans risque pour l'inscription : si la confirmation d'email empêche la
-- création du profil à l'inscription, AuthContext.autoCreateProfile() le crée
-- à la première connexion (session authentifiée autorisée ci-dessous).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Recherche d'email par téléphone (exact, côté serveur) ─────────────
CREATE OR REPLACE FUNCTION lookup_email_by_phone(p_phone TEXT)
RETURNS TEXT AS $$
  SELECT email
  FROM user_profiles
  WHERE email IS NOT NULL
    AND regexp_replace(coalesce(phone, ''), '[\s\-\+\(\)]', '', 'g')
      = regexp_replace(coalesce(p_phone, ''), '[\s\-\+\(\)]', '', 'g')
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION lookup_email_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_email_by_phone(TEXT) TO anon, authenticated;

-- ─── 2. RLS ───────────────────────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Lecture : son propre profil, ou tout pour un admin.
DROP POLICY IF EXISTS up_select_own ON user_profiles;
CREATE POLICY up_select_own ON user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_super_admin());

-- Création : uniquement son propre profil (autoCreateProfile, inscription).
DROP POLICY IF EXISTS up_insert_own ON user_profiles;
CREATE POLICY up_insert_own ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Modification : son propre profil, ou tout pour un admin.
DROP POLICY IF EXISTS up_update_own ON user_profiles;
CREATE POLICY up_update_own ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_super_admin())
  WITH CHECK (id = auth.uid() OR is_super_admin());

-- Suppression : admins uniquement.
DROP POLICY IF EXISTS up_delete_admin ON user_profiles;
CREATE POLICY up_delete_admin ON user_profiles
  FOR DELETE TO authenticated
  USING (is_super_admin());

COMMIT;

-- Vérification rapide après exécution :
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'user_profiles';  -- true
