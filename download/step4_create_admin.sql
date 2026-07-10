-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 4 — Création du compte Admin
-- À exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Créer l'utilisateur dans auth.users
INSERT INTO auth.users (
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  aud,
  role,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'aimeonginfo@gmail.com',
  crypt('Waze@Patt007', gen_salt('bfm')),
  now(),
  '{"full_name": "Admin La Conquête"}',
  'authenticated',
  'authenticated',
  '',
  ''
) RETURNING id, email;

-- 2. Activer le flag admin sur son profil
-- (le trigger a déjà créé le profil, on met juste is_admin = true)
UPDATE user_profiles 
SET is_admin = true, updated_at = now() 
WHERE email = 'aimeonginfo@gmail.com';

-- 3. Vérification
SELECT id, email, is_admin FROM user_profiles WHERE email = 'aimeonginfo@gmail.com';