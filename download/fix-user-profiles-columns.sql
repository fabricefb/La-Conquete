-- ═══════════════════════════════════════════════════════════════
-- FIX RAPIDE : Ajouter les colonnes manquantes à user_profiles
-- Exécutez ce script dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  -- 1. onboarding_completed (requis pour l'onboarding)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- 2. phone (requis pour SMS)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone TEXT;
  END IF;

  -- 3. address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN address TEXT;
  END IF;

  -- 4. gender
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other'));
  END IF;

  -- 5. birth_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN birth_date DATE;
  END IF;

  -- 6. Mettre à jour les utilisateurs existants comme onboarding complété
  -- (pour éviter que les anciens membres soient bloqués)
  UPDATE user_profiles SET onboarding_completed = true WHERE onboarding_completed = false;

END $$;