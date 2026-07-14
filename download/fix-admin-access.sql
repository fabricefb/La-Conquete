-- ═══════════════════════════════════════════════════════════════════
-- FIX ACCÈS ADMIN — Exécuter dans le SQL Editor Supabase
-- Met à jour ton compte pour avoir les droits d'administration
-- ═══════════════════════════════════════════════════════════════════

-- 1. Mettre is_admin = true et role_level = 6 (Admin) pour ton compte
UPDATE user_profiles
SET
  is_admin = true,
  role_level = 6,
  updated_at = now()
WHERE email = 'aimeonginfo@gmail.com';

-- 2. Vérifier le résultat
SELECT id, email, full_name, is_admin, role_level, onboarding_completed
FROM user_profiles
WHERE email = 'aimeonginfo@gmail.com';