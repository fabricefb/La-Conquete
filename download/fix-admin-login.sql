-- ═══════════════════════════════════════════════════════════════════
-- FIX ADMIN LOGIN — Exécuter dans Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN

  -- 1. Ajouter les colonnes manquantes à user_profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'phone') THEN
    ALTER TABLE user_profiles ADD COLUMN phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'address') THEN
    ALTER TABLE user_profiles ADD COLUMN address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'gender') THEN
    ALTER TABLE user_profiles ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'birth_date') THEN
    ALTER TABLE user_profiles ADD COLUMN birth_date DATE;
  END IF;

  -- 2. S'assurer que l'admin est bien marqué comme admin ET onboarding complété
  UPDATE user_profiles
  SET is_admin = true,
      onboarding_completed = true,
      updated_at = now()
  WHERE email = 'aimeonginfo@gmail.com';

  -- 3. Si le profil admin n'existe pas dans user_profiles, le créer
  INSERT INTO user_profiles (id, email, full_name, is_admin, onboarding_completed)
  SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', 'Admin'), true, true
  FROM auth.users u
  WHERE u.email = 'aimeonginfo@gmail.com'
    AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = u.id);

END $$;