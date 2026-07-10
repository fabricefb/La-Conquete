-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 4 — Création du compte Admin
-- ═══════════════════════════════════════════════════════════════

INSERT INTO auth.users (
  id,
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
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'aimeonginfo@gmail.com',
  crypt('Waze@Patt007', gen_salt('bf')),
  now(),
  '{"full_name": "Admin La Conquête"}',
  'authenticated',
  'authenticated',
  '',
  ''
) RETURNING id, email;

UPDATE user_profiles 
SET is_admin = true, updated_at = now() 
WHERE email = 'aimeonginfo@gmail.com';

SELECT id, email, is_admin FROM user_profiles WHERE email = 'aimeonginfo@gmail.com';