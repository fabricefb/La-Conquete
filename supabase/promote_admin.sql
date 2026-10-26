-- ═══════════════════════════════════════════════════════════════════════════
-- LA CONQUÊTE — PROMOTION DU COMPTE ADMINISTRATEUR
-- À exécuter dans le SQL Editor Supabase, APRÈS avoir créé le compte admin
-- (Dashboard → Authentication → Users → Add user, ou inscription).
-- Remplacer 'ADMIN_EMAIL' ci-dessous par l'adresse du compte à promouvoir.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE public.user_profiles
SET is_admin = true,
    role_level = 5,
    onboarding_completed = true,
    updated_at = now()
WHERE lower(email) = lower('ADMIN_EMAIL');

-- Vérification : doit renvoyer une ligne avec is_admin = true
SELECT id, email, full_name, is_admin, role_level
FROM public.user_profiles
WHERE lower(email) = lower('ADMIN_EMAIL');
