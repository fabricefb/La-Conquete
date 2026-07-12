-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST DATA — Église Évangélique La Conquête
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire script
--   3. Click "Run" (make sure you are connected as postgres / service_role)
--
-- CLEANUP COMMAND (run separately to remove ALL test data):
--   DELETE FROM auth.users WHERE email LIKE 'test_%@laconquete.test';
--   -- The ON DELETE CASCADE will automatically remove:
--   --   user_profiles, department_members, communiques, prayer_requests,
--   --   forum_messages, tag_mentions, bureau_pastoral_members,
--   --   role_assignment_log, donations, notifications, notification_preferences
--
-- TEST USER CREDENTIALS:
--   Email format    : test_{role}@laconquete.test
--   Password format : Test{RoleName}2024!
--
--   | Display Name              | Email                           | Password                     |
--   |---------------------------|---------------------------------|------------------------------|
--   | TEST_Admin                | test_admin@laconquete.test      | TestAdmin2024!               |
--   | TEST_Past_Principal_Kateba| test_past_principal_kateba@...  | TestPastPrincipalKateba2024!  |
--   | TEST_Past_Principal_Mukendi| test_past_principal_mukendi@.. | TestPastPrincipalMukendi2024! |
--   | TEST_Past_Assoc_Bukavu    | test_past_assoc_bukavu@...      | TestPastAssocBukavu2024!     |
--   | TEST_Ancien               | test_ancien@laconquete.test     | TestAncien2024!              |
--   | TEST_Diacre               | test_diacre@laconquete.test     | TestDiacre2024!              |
--   | TEST_Collaborateur        | test_collaborateur@laconquete.test | TestCollaborateur2024!     |
--   | TEST_Partenaire           | test_partenaire@laconquete.test | TestPartenaire2024!          |
--   | TEST_Chef_Louange         | test_chef_louange@laconquete.test | TestChefLouange2024!       |
--   | TEST_Chef_Evangelisation  | test_chef_evangelisation@laconquete.test | TestChefEvangelisation2024! |
--   | TEST_Membre_Simple        | test_membre_simple@laconquete.test | TestMembreSimple2024!     |
--   | TEST_Membre_MultiDept     | test_membre_multidept@laconquete.test | TestMembreMultiDept2024! |
--
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════════
-- Extension de Bukavu (slug: bukavu) — pastor will be assigned after user creation
INSERT INTO extensions (id, name, slug, address, city, country, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Extension de Bukavu',
  'bukavu',
  '123 Avenue de la Paix, Bukavu',
  'Bukavu',
  'RDC',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Extension de Kinshasa
INSERT INTO extensions (id, name, slug, address, city, country, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'Extension de Kinshasa',
  'kinshasa',
  '456 Boulevard Lumumba, Kinshasa',
  'Kinshasa',
  'RDC',
  true
) ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. DEPARTMENT — Évangélisation (not in seed data, must be created)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Note: Louange (slug: louange), Médias (slug: medias), and Accueil (slug: accueil)
-- already exist from the migration seed data. Only Évangélisation is new.
INSERT INTO departments (name, slug, description, icon_name, accent_color, sort_order, extension_id)
VALUES (
  'Évangélisation',
  'evangelisation',
  'Département d''évangélisation et de mission',
  'Globe',
  'gold',
  9,
  NULL  -- global, not tied to an extension
) ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. CREATE ALL TEST USERS (auth.users + user_profiles)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Uses deterministic UUIDs for reproducibility and cross-referencing.
-- The handle_new_user trigger auto-creates a basic user_profile on INSERT;
-- we then UPSERT to set all role-specific fields.

DO $$
DECLARE
  v_admin_id           UUID := 'b0000000-0000-0000-0000-000000000001';
  v_past_kateba_id     UUID := 'b0000000-0000-0000-0000-000000000002';
  v_past_mukendi_id    UUID := 'b0000000-0000-0000-0000-000000000003';
  v_past_assoc_id      UUID := 'b0000000-0000-0000-0000-000000000004';
  v_ancien_id          UUID := 'b0000000-0000-0000-0000-000000000005';
  v_diacre_id          UUID := 'b0000000-0000-0000-0000-000000000006';
  v_collaborateur_id   UUID := 'b0000000-0000-0000-0000-000000000007';
  v_partenaire_id      UUID := 'b0000000-0000-0000-0000-000000000008';
  v_chef_louange_id    UUID := 'b0000000-0000-0000-0000-000000000009';
  v_chef_evangel_id    UUID := 'b0000000-0000-0000-0000-000000000010';
  v_membre_simple_id   UUID := 'b0000000-0000-0000-0000-000000000011';
  v_membre_multidept_id UUID := 'b0000000-0000-0000-0000-000000000012';
  v_instance_id        UUID;
  v_now                TIMESTAMPTZ := now();
BEGIN
  -- Get the Supabase instance_id from an existing user, or use fallback
  SELECT instance_id INTO v_instance_id FROM auth.users LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- ─── 3a. Insert into auth.users (idempotent) ─────────────────────
  -- Each INSERT is wrapped so the trigger fires only for new users.

  -- TEST_Admin
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_admin@laconquete.test') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, confirmation_token, recovery_token, created_at, updated_at)
    VALUES (v_admin_id, v_instance_id, 'test_admin@laconquete.test', crypt('TestAdmin2024!', gen_salt('bf')), v_now, '{"full_name":"TEST_Admin"}'::jsonb, 'authenticated', 'authenticated', '', '', v_now, v_now);
  END IF;

  -- TEST_Past_Principal_Kateba
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_past_principal_kateba@laconquete.test') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, confirmation_token, recovery_token, created_at, updated_at)
    VALUES (v_past_kateba_id, v_instance_id, 'test_past_principal_kateba@laconquete.test', crypt('TestPastPrincipalKateba2024!', gen_salt('bf')), v_now, '{"full_name":"TEST_Past_Principal_Kateba"}'::jsonb, 'authenticated', 'authenticated', '', '', v_now, v_now);
  END IF;

  -- TEST_Past_Principal_Mukendi
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_past_principal_mukendi@laconquete.test') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, confirmation_token, recovery_token, created_at, updated_at)
    VALUES (v_past_mukendi_id, v_instance_id, 'test_past_principal_mukendi@laconquete.test', crypt('TestPastPrincipalMukendi2024!', gen_salt('bf')), v_now, '{"full_name":"TEST_Past_Principal_Mukendi"}'::jsonb, 'authenticated', 'authenticated', '', '', v_now, v_now);
  END IF;

  -- TEST_Past_Assoc_Bukavu
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_past_assoc_bukavu@laconquete.test') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, confirmation_token, recovery_token, created_at, updated_at)
    VALUES (v_past_assoc_id, v_instance_id, 'test_past_assoc_bukavu@laconquete.test', crypt('TestPastAssocBukavu2024!', gen_salt('bf')), v_now, '{"full_name":"TEST_Past_Assoc_Bukavu"}'::jsonb, 'authenticated', 'authenticated', '', '', v_now, v_now);
  END IF;

  -- TEST_Ancien
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_ancien@laconquete.test') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, confirmation_token, recovery_token, created_at, updated_at)
    VALUES (v_ancien_id, v_instance_id, 'test_ancien@laconquete.test', crypt('TestAncien2024!', gen_salt('bf')), v_now, '{"full_name":"TEST_Ancien"}'::jsonb, 'authenticated', 'authenticated', '', '', v_now, v_now);
  END IF;

  -- TEST_Diacre
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_diacre@laconquete.test') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, confirmation_token, recovery_token, created_at, updated_at)
    VALUES (v_diacre_id, v_instance_id, 'test_diacre@laconquete.test', crypt('TestDiacre2024!', gen_salt('bf')), v_now, '{"full_name":"TEST_Diacre"}'::jsonb, 'authenticated', 'authenticated', '', '', v_now, v_now);
  END IF;

  -- TEST_Collaborateur
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_collaborateur@laconquete.test') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, confirmation_token, recovery_token, created_at, updated_at)
    VALUES (v_collaborateur_id, v_instance_id, 'test_collaborateur@laconquete.test', crypt('TestCollaborateur2024!', gen_salt('bf')), v_now, '{"full_name":"TEST_Collaborateur"}'::jsonb, 'authenticated', 'authenticated', '', '', v_now, v_now);
  END IF;

  -- TEST_Partenaire
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_partenaire@laconquete.test') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, confirmation_token, recovery_token, created_at, updated_at)
    VALUES (v_partenaire_id, v_instance_id, 'test_partenaire@laconquete.test', crypt('TestPartenaire2024!', gen_salt('bf')), v_now, '{"full_name":"TEST_Partenaire"}'::jsonb, 'authenticated', 'authenticated', '', '', v_now, v_now);
  END IF;

  -- TEST_Chef_Louange
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_chef_louange@laconquete.test') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, confirmation_token, recovery_token, created_at, updated_at)
    VALUES (v_chef_louange_id, v_instance_id, 'test_chef_louange@laconquete.test', crypt('TestChefLouange2024!', gen_salt('bf')), v_now, '{"full_name":"TEST_Chef_Louange"}'::jsonb, 'authenticated', 'authenticated', '', '', v_now, v_now);
  END IF;

  -- TEST_Chef_Evangelisation
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_chef_evangelisation@laconquete.test') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, confirmation_token, recovery_token, created_at, updated_at)
    VALUES (v_chef_evangel_id, v_instance_id, 'test_chef_evangelisation@laconquete.test', crypt('TestChefEvangelisation2024!', gen_salt('bf')), v_now, '{"full_name":"TEST_Chef_Evangelisation"}'::jsonb, 'authenticated', 'authenticated', '', '', v_now, v_now);
  END IF;

  -- TEST_Membre_Simple
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_membre_simple@laconquete.test') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, confirmation_token, recovery_token, created_at, updated_at)
    VALUES (v_membre_simple_id, v_instance_id, 'test_membre_simple@laconquete.test', crypt('TestMembreSimple2024!', gen_salt('bf')), v_now, '{"full_name":"TEST_Membre_Simple"}'::jsonb, 'authenticated', 'authenticated', '', '', v_now, v_now);
  END IF;

  -- TEST_Membre_MultiDept
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_membre_multidept@laconquete.test') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, confirmation_token, recovery_token, created_at, updated_at)
    VALUES (v_membre_multidept_id, v_instance_id, 'test_membre_multidept@laconquete.test', crypt('TestMembreMultiDept2024!', gen_salt('bf')), v_now, '{"full_name":"TEST_Membre_MultiDept"}'::jsonb, 'authenticated', 'authenticated', '', '', v_now, v_now);
  END IF;

  -- ─── 3b. Upsert user_profiles with role-specific fields ─────────

  -- TEST_Admin — super_admin, role_level=6, is_admin=true
  INSERT INTO user_profiles (id, email, full_name, is_admin, role, role_level, onboarding_completed, updated_at)
  VALUES (v_admin_id, 'test_admin@laconquete.test', 'TEST_Admin', true, 'super_admin', 6, true, v_now)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    role_level = EXCLUDED.role_level,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

  -- TEST_Past_Principal_Kateba — pastor, role_level=5, is_principal_pastor=true, pastor_category=ancien
  INSERT INTO user_profiles (id, email, full_name, is_admin, role, role_level, is_principal_pastor, pastor_category, onboarding_completed, updated_at)
  VALUES (v_past_kateba_id, 'test_past_principal_kateba@laconquete.test', 'TEST_Past_Principal_Kateba', false, 'pastor', 5, true, 'ancien', true, v_now)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    role_level = EXCLUDED.role_level,
    is_principal_pastor = EXCLUDED.is_principal_pastor,
    pastor_category = EXCLUDED.pastor_category,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

  -- TEST_Past_Principal_Mukendi — pastor, role_level=5, is_principal_pastor=true, pastor_category=ancien
  INSERT INTO user_profiles (id, email, full_name, is_admin, role, role_level, is_principal_pastor, pastor_category, onboarding_completed, updated_at)
  VALUES (v_past_mukendi_id, 'test_past_principal_mukendi@laconquete.test', 'TEST_Past_Principal_Mukendi', false, 'pastor', 5, true, 'ancien', true, v_now)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    role_level = EXCLUDED.role_level,
    is_principal_pastor = EXCLUDED.is_principal_pastor,
    pastor_category = EXCLUDED.pastor_category,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

  -- TEST_Past_Assoc_Bukavu — pastor, role_level=4, pastor_category=ancien, extension=Bukavu
  INSERT INTO user_profiles (id, email, full_name, is_admin, role, role_level, pastor_category, extension_id, onboarding_completed, updated_at)
  VALUES (v_past_assoc_id, 'test_past_assoc_bukavu@laconquete.test', 'TEST_Past_Assoc_Bukavu', false, 'pastor', 4, 'ancien', 'a0000000-0000-0000-0000-000000000001'::UUID, true, v_now)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    role_level = EXCLUDED.role_level,
    pastor_category = EXCLUDED.pastor_category,
    extension_id = EXCLUDED.extension_id,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

  -- TEST_Ancien — pastor, role_level=4, pastor_category=ancien
  INSERT INTO user_profiles (id, email, full_name, is_admin, role, role_level, pastor_category, onboarding_completed, updated_at)
  VALUES (v_ancien_id, 'test_ancien@laconquete.test', 'TEST_Ancien', false, 'pastor', 4, 'ancien', true, v_now)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    role_level = EXCLUDED.role_level,
    pastor_category = EXCLUDED.pastor_category,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

  -- TEST_Diacre — pastor, role_level=4, pastor_category=diacre
  INSERT INTO user_profiles (id, email, full_name, is_admin, role, role_level, pastor_category, onboarding_completed, updated_at)
  VALUES (v_diacre_id, 'test_diacre@laconquete.test', 'TEST_Diacre', false, 'pastor', 4, 'diacre', true, v_now)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    role_level = EXCLUDED.role_level,
    pastor_category = EXCLUDED.pastor_category,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

  -- TEST_Collaborateur — pastor, role_level=4, pastor_category=collaborateur
  INSERT INTO user_profiles (id, email, full_name, is_admin, role, role_level, pastor_category, onboarding_completed, updated_at)
  VALUES (v_collaborateur_id, 'test_collaborateur@laconquete.test', 'TEST_Collaborateur', false, 'pastor', 4, 'collaborateur', true, v_now)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    role_level = EXCLUDED.role_level,
    pastor_category = EXCLUDED.pastor_category,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

  -- TEST_Partenaire — member, role_level=1, pastor_category=partenaire
  INSERT INTO user_profiles (id, email, full_name, is_admin, role, role_level, pastor_category, onboarding_completed, updated_at)
  VALUES (v_partenaire_id, 'test_partenaire@laconquete.test', 'TEST_Partenaire', false, 'member', 1, 'partenaire', true, v_now)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    role_level = EXCLUDED.role_level,
    pastor_category = EXCLUDED.pastor_category,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

  -- TEST_Chef_Louange — chief, role_level=3
  INSERT INTO user_profiles (id, email, full_name, is_admin, role, role_level, onboarding_completed, updated_at)
  VALUES (v_chef_louange_id, 'test_chef_louange@laconquete.test', 'TEST_Chef_Louange', false, 'chief', 3, true, v_now)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    role_level = EXCLUDED.role_level,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

  -- TEST_Chef_Evangelisation — chief, role_level=3
  INSERT INTO user_profiles (id, email, full_name, is_admin, role, role_level, onboarding_completed, updated_at)
  VALUES (v_chef_evangel_id, 'test_chef_evangelisation@laconquete.test', 'TEST_Chef_Evangelisation', false, 'chief', 3, true, v_now)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    role_level = EXCLUDED.role_level,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

  -- TEST_Membre_Simple — member, role_level=1
  INSERT INTO user_profiles (id, email, full_name, is_admin, role, role_level, onboarding_completed, updated_at)
  VALUES (v_membre_simple_id, 'test_membre_simple@laconquete.test', 'TEST_Membre_Simple', false, 'member', 1, true, v_now)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    role_level = EXCLUDED.role_level,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

  -- TEST_Membre_MultiDept — member, role_level=2
  INSERT INTO user_profiles (id, email, full_name, is_admin, role, role_level, onboarding_completed, updated_at)
  VALUES (v_membre_multidept_id, 'test_membre_multidept@laconquete.test', 'TEST_Membre_MultiDept', false, 'member', 2, true, v_now)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_admin = EXCLUDED.is_admin,
    role = EXCLUDED.role,
    role_level = EXCLUDED.role_level,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = EXCLUDED.updated_at;

END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. LINK PASTOR TO EXTENSION
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE extensions
SET pastor_id = 'b0000000-0000-0000-0000-000000000004'  -- TEST_Past_Assoc_Bukavu
WHERE slug = 'bukavu';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. DEPARTMENT MEMBERSHIPS
-- ═══════════════════════════════════════════════════════════════════════════════
-- Uses deterministic UUIDs for the membership rows so ON CONFLICT is reliable.
-- department_members has UNIQUE(user_id, department_id).

-- ─── 5a. TEST_Chef_Louange: LEADER of Louange (is_primary=true) ──
INSERT INTO department_members (id, user_id, department_id, role_in_dept, is_primary, is_active)
SELECT
  'c0000000-0000-0000-0000-000000000001'::UUID,
  'b0000000-0000-0000-0000-000000000009'::UUID,  -- TEST_Chef_Louange
  d.id,
  'leader',
  true,
  true
FROM departments d WHERE d.slug = 'louange'
ON CONFLICT (user_id, department_id) DO UPDATE SET
  role_in_dept = EXCLUDED.role_in_dept,
  is_primary   = EXCLUDED.is_primary,
  is_active    = EXCLUDED.is_active;

-- ─── 5b. TEST_Chef_Evangelisation: LEADER of Évangélisation (is_primary=true) ──
INSERT INTO department_members (id, user_id, department_id, role_in_dept, is_primary, is_active)
SELECT
  'c0000000-0000-0000-0000-000000000002'::UUID,
  'b0000000-0000-0000-0000-000000000010'::UUID,  -- TEST_Chef_Evangelisation
  d.id,
  'leader',
  true,
  true
FROM departments d WHERE d.slug = 'evangelisation'
ON CONFLICT (user_id, department_id) DO UPDATE SET
  role_in_dept = EXCLUDED.role_in_dept,
  is_primary   = EXCLUDED.is_primary,
  is_active    = EXCLUDED.is_active;

-- ─── 5c. TEST_Chef_Evangelisation: also MEMBER of Louange (multi-dept) ──
INSERT INTO department_members (id, user_id, department_id, role_in_dept, is_primary, is_active)
SELECT
  'c0000000-0000-0000-0000-000000000003'::UUID,
  'b0000000-0000-0000-0000-000000000010'::UUID,  -- TEST_Chef_Evangelisation
  d.id,
  'member',
  false,
  true
FROM departments d WHERE d.slug = 'louange'
ON CONFLICT (user_id, department_id) DO UPDATE SET
  role_in_dept = EXCLUDED.role_in_dept,
  is_primary   = EXCLUDED.is_primary,
  is_active    = EXCLUDED.is_active;

-- ─── 5d. TEST_Membre_MultiDept: MEMBER of Louange ──
INSERT INTO department_members (id, user_id, department_id, role_in_dept, is_primary, is_active)
SELECT
  'c0000000-0000-0000-0000-000000000004'::UUID,
  'b0000000-0000-0000-0000-000000000012'::UUID,  -- TEST_Membre_MultiDept
  d.id,
  'member',
  false,
  true
FROM departments d WHERE d.slug = 'louange'
ON CONFLICT (user_id, department_id) DO UPDATE SET
  role_in_dept = EXCLUDED.role_in_dept,
  is_primary   = EXCLUDED.is_primary,
  is_active    = EXCLUDED.is_active;

-- ─── 5e. TEST_Membre_MultiDept: MEMBER of Évangélisation ──
INSERT INTO department_members (id, user_id, department_id, role_in_dept, is_primary, is_active)
SELECT
  'c0000000-0000-0000-0000-000000000005'::UUID,
  'b0000000-0000-0000-0000-000000000012'::UUID,  -- TEST_Membre_MultiDept
  d.id,
  'member',
  false,
  true
FROM departments d WHERE d.slug = 'evangelisation'
ON CONFLICT (user_id, department_id) DO UPDATE SET
  role_in_dept = EXCLUDED.role_in_dept,
  is_primary   = EXCLUDED.is_primary,
  is_active    = EXCLUDED.is_active;

-- ─── 5f. TEST_Ancien: MEMBER of Évangélisation ──
INSERT INTO department_members (id, user_id, department_id, role_in_dept, is_primary, is_active)
SELECT
  'c0000000-0000-0000-0000-000000000006'::UUID,
  'b0000000-0000-0000-0000-000000000005'::UUID,  -- TEST_Ancien
  d.id,
  'member',
  false,
  true
FROM departments d WHERE d.slug = 'evangelisation'
ON CONFLICT (user_id, department_id) DO UPDATE SET
  role_in_dept = EXCLUDED.role_in_dept,
  is_primary   = EXCLUDED.is_primary,
  is_active    = EXCLUDED.is_active;

-- ─── 5g. TEST_Diacre: MEMBER of Louange ──
INSERT INTO department_members (id, user_id, department_id, role_in_dept, is_primary, is_active)
SELECT
  'c0000000-0000-0000-0000-000000000007'::UUID,
  'b0000000-0000-0000-0000-000000000006'::UUID,  -- TEST_Diacre
  d.id,
  'member',
  false,
  true
FROM departments d WHERE d.slug = 'louange'
ON CONFLICT (user_id, department_id) DO UPDATE SET
  role_in_dept = EXCLUDED.role_in_dept,
  is_primary   = EXCLUDED.is_primary,
  is_active    = EXCLUDED.is_active;

-- ─── 5h. TEST_Collaborateur: MEMBER of Médias ──
INSERT INTO department_members (id, user_id, department_id, role_in_dept, is_primary, is_active)
SELECT
  'c0000000-0000-0000-0000-000000000008'::UUID,
  'b0000000-0000-0000-0000-000000000007'::UUID,  -- TEST_Collaborateur
  d.id,
  'member',
  false,
  true
FROM departments d WHERE d.slug = 'medias'
ON CONFLICT (user_id, department_id) DO UPDATE SET
  role_in_dept = EXCLUDED.role_in_dept,
  is_primary   = EXCLUDED.is_primary,
  is_active    = EXCLUDED.is_active;

-- TEST_Partenaire: intentionally NO department membership

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. COMMUNIQUÉS (3 sample communiqués)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 6a. Spiritual communiqué by TEST_Ancien
INSERT INTO communiques (id, title, content, author_id, category, is_urgent, is_published, published_at, created_at, updated_at)
VALUES (
  'd0000000-0000-0000-0000-000000000001'::UUID,
  'Exhortation spirituelle — Juillet 2026',
  'Chers frères et sœurs, que la grâce de notre Seigneur Jésus-Christ soit avec vous tous. Ce mois-ci, nous sommes appelés à redoubler de ferveur dans la prière et l''étude de la Parole. « Efforcez-vous de vous présenter devant Dieu comme un homme éprouvé, un ouvrier qui n''a point à rougir, qui dispense droitement la parole de la vérité. » — 2 Timothée 2:15. Soyons des ambassadeurs de Christ dans nos communautés.',
  'b0000000-0000-0000-0000-000000000005'::UUID,  -- TEST_Ancien
  'spirituel',
  false,
  true,
  now() - INTERVAL '2 days',
  now() - INTERVAL '2 days',
  now() - INTERVAL '2 days'
) ON CONFLICT (id) DO NOTHING;

-- 6b. Logistical communiqué by TEST_Diacre
INSERT INTO communiques (id, title, content, author_id, category, is_urgent, is_published, published_at, created_at, updated_at)
VALUES (
  'd0000000-0000-0000-0000-000000000002'::UUID,
  'Information logistique — Réunion des diacres',
  'Tous les diacres sont convoqués pour une réunion logistique ce samedi à 10h à la salle paroissiale. Ordre du jour : organisation de la collecte de dons, préparation du repas de communion du mois prochain, et suivi des besoins des familles. Merci de confirmer votre présence.',
  'b0000000-0000-0000-0000-000000000006'::UUID,  -- TEST_Diacre
  'logistique',
  false,
  true,
  now() - INTERVAL '1 day',
  now() - INTERVAL '1 day',
  now() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

-- 6c. Department-level communiqué by TEST_Chef_Louange (linked to Louange department)
INSERT INTO communiques (id, title, content, author_id, department_id, category, is_urgent, is_published, published_at, created_at, updated_at)
SELECT
  'd0000000-0000-0000-0000-000000000003'::UUID,
  'Programme de répétition — Département Louange',
  'Le département de louange informe tous ses membres qu''une répétition générale aura lieu ce vendredi de 18h à 20h. Nous préparons les chants pour le culte spécial du dimanche. Tous les chantres, musiciens et membres de la chorale sont attendus. Arrivez à l''heure et apportez vos partitions. Que Dieu bénisse notre préparation !',
  'b0000000-0000-0000-0000-000000000009'::UUID,  -- TEST_Chef_Louange
  d.id,  -- Louange department
  'departement',
  false,
  true,
  now(),
  now(),
  now()
FROM departments d WHERE d.slug = 'louange'
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. PRAYER REQUESTS (3 sample requests)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 7a. Public prayer request by TEST_Membre_Simple
INSERT INTO prayer_requests (id, user_id, content, is_anonymous, is_confidential, status)
VALUES (
  'e0000000-0000-0000-0000-000000000001'::UUID,
  'b0000000-0000-0000-0000-000000000011'::UUID,  -- TEST_Membre_Simple
  'Priez pour ma famille qui traverse une période difficile. Mon père est malade et nous avons besoin de la guérison divine et de la force pour tenir ferme dans la foi.',
  false,
  false,
  'received'
) ON CONFLICT (id) DO NOTHING;

-- 7b. Confidential prayer request by TEST_Ancien
INSERT INTO prayer_requests (id, user_id, content, is_anonymous, is_confidential, status)
VALUES (
  'e0000000-0000-0000-0000-000000000002'::UUID,
  'b0000000-0000-0000-0000-000000000005'::UUID,  -- TEST_Ancien
  'Demande de prière confidentielle pour un membre de l''assemblée en situation de détresse financière grave. Que les pasteurs et anciens prient avec discernement.',
  false,
  true,
  'praying'
) ON CONFLICT (id) DO NOTHING;

-- 7c. Prayer request already being prayed for (by TEST_Diacre)
INSERT INTO prayer_requests (id, user_id, content, is_anonymous, is_confidential, status, prayed_by, prayed_at)
VALUES (
  'e0000000-0000-0000-0000-000000000003'::UUID,
  'b0000000-0000-0000-0000-000000000012'::UUID,  -- TEST_Membre_MultiDept
  'Prière pour le succès de la campagne d''évangélisation dans le quartier de Matonge. Que Dieu ouvre les cœurs et que beaucoup viennent à la connaissance de la vérité.',
  false,
  false,
  'praying',
  'b0000000-0000-0000-0000-000000000006'::UUID,  -- TEST_Diacre is praying for this
  now() - INTERVAL '3 hours'
) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. FORUM MESSAGES + TAG MENTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- 8a. Forum message in Louange department by TEST_Chef_Louange, mentioning Évangélisation dept
INSERT INTO forum_messages (id, author_id, department_id, content, is_pinned, created_at)
SELECT
  'f0000000-0000-0000-0000-000000000001'::UUID,
  'b0000000-0000-0000-0000-000000000009'::UUID,  -- TEST_Chef_Louange
  d_louange.id,
  'Chers membres, la répétition de vendredi a été un vrai succès ! Merci à tous. J''aimerais aussi saluer le département @Évangélisation pour leur belle campagne de la semaine dernière. Puissions-nous collaborer davantage !',
  true,
  now() - INTERVAL '1 day'
FROM departments d_louange WHERE d_louange.slug = 'louange'
ON CONFLICT (id) DO NOTHING;

-- 8b. Tag mention: @Évangélisation department on message f...001
INSERT INTO tag_mentions (id, message_id, tag_type, target_id, created_at)
SELECT
  'f0000000-0000-0000-0000-000000000010'::UUID,
  'f0000000-0000-0000-0000-000000000001'::UUID,
  'department',
  d_evangel.id,
  now() - INTERVAL '1 day'
FROM departments d_evangel WHERE d_evangel.slug = 'evangelisation'
ON CONFLICT (id) DO NOTHING;

-- 8c. Forum reply in Louange by TEST_Diacre, mentioning TEST_Chef_Louange as user tag
INSERT INTO forum_messages (id, author_id, department_id, parent_id, content, is_pinned, created_at)
SELECT
  'f0000000-0000-0000-0000-000000000002'::UUID,
  'b0000000-0000-0000-0000-000000000006'::UUID,  -- TEST_Diacre
  d_louange.id,
  'f0000000-0000-0000-0000-000000000001'::UUID,  -- reply to above
  'Gloire à Dieu ! Merci @TEST_Chef_Louange pour l''organisation. Je confirme ma présence pour la prochaine répétition. Le Seigneur soit loué !',
  false,
  now() - INTERVAL '20 hours'
FROM departments d_louange WHERE d_louange.slug = 'louange'
ON CONFLICT (id) DO NOTHING;

-- 8d. Tag mention: @TEST_Chef_Louange user on message f...002
INSERT INTO tag_mentions (id, message_id, tag_type, target_id, created_at)
VALUES (
  'f0000000-0000-0000-0000-000000000011'::UUID,
  'f0000000-0000-0000-0000-000000000002'::UUID,
  'user',
  'b0000000-0000-0000-0000-000000000009'::UUID,  -- TEST_Chef_Louange
  now() - INTERVAL '20 hours'
) ON CONFLICT (id) DO NOTHING;

-- 8e. Forum message in Évangélisation by TEST_Chef_Evangelisation, mentioning Louange dept
INSERT INTO forum_messages (id, author_id, department_id, content, is_pinned, created_at)
SELECT
  'f0000000-0000-0000-0000-000000000003'::UUID,
  'b0000000-0000-0000-0000-000000000010'::UUID,  -- TEST_Chef_Evangelisation
  d_evangel.id,
  'Rapport de la campagne d''évangélisation de la semaine : 23 nouvelles âmes ont donné leur vie au Christ ! Merci au département @Louange pour les chants d''adoration qui ont accompagné nos sorties. Continuons dans cette lancée.',
  true,
  now() - INTERVAL '5 hours'
FROM departments d_evangel WHERE d_evangel.slug = 'evangelisation'
ON CONFLICT (id) DO NOTHING;

-- 8f. Tag mention: @Louange department on message f...003
INSERT INTO tag_mentions (id, message_id, tag_type, target_id, created_at)
SELECT
  'f0000000-0000-0000-0000-000000000012'::UUID,
  'f0000000-0000-0000-0000-000000000003'::UUID,
  'department',
  d_louange.id,
  now() - INTERVAL '5 hours'
FROM departments d_louange WHERE d_louange.slug = 'louange'
ON CONFLICT (id) DO NOTHING;

-- 8g. Forum message in Évangélisation by TEST_Membre_MultiDept, mentioning TEST_Chef_Evangelisation
INSERT INTO forum_messages (id, author_id, department_id, parent_id, content, is_pinned, created_at)
SELECT
  'f0000000-0000-0000-0000-000000000004'::UUID,
  'b0000000-0000-0000-0000-000000000012'::UUID,  -- TEST_Membre_MultiDept
  d_evangel.id,
  'f0000000-0000-0000-0000-000000000003'::UUID,  -- reply to campaign report
  'Alléluia ! @TEST_Chef_Evangelisation quel rapport encourageant ! Je suis disponible pour la prochaine sortie. Dieu est fidèle.',
  false,
  now() - INTERVAL '2 hours'
FROM departments d_evangel WHERE d_evangel.slug = 'evangelisation'
ON CONFLICT (id) DO NOTHING;

-- 8h. Tag mention: @TEST_Chef_Evangelisation user on message f...004
INSERT INTO tag_mentions (id, message_id, tag_type, target_id, created_at)
VALUES (
  'f0000000-0000-0000-0000-000000000013'::UUID,
  'f0000000-0000-0000-0000-000000000004'::UUID,
  'user',
  'b0000000-0000-0000-0000-000000000010'::UUID,  -- TEST_Chef_Evangelisation
  now() - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. BUREAU PASTORAL MEMBERS (Bukavu extension)
-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST_Past_Assoc_Bukavu (coordinator), TEST_Ancien (member), TEST_Diacre (member)

INSERT INTO bureau_pastoral_members (id, user_id, extension_id, role_in_bureau, created_at)
VALUES
  (
    'g0000000-0000-0000-0000-000000000001'::UUID,
    'b0000000-0000-0000-0000-000000000004'::UUID,  -- TEST_Past_Assoc_Bukavu
    'a0000000-0000-0000-0000-000000000001'::UUID,  -- Extension Bukavu
    'coordinator',
    now()
  ),
  (
    'g0000000-0000-0000-0000-000000000002'::UUID,
    'b0000000-0000-0000-0000-000000000005'::UUID,  -- TEST_Ancien
    'a0000000-0000-0000-0000-000000000001'::UUID,  -- Extension Bukavu
    'member',
    now()
  ),
  (
    'g0000000-0000-0000-0000-000000000003'::UUID,
    'b0000000-0000-0000-0000-000000000006'::UUID,  -- TEST_Diacre
    'a0000000-0000-0000-0000-000000000001'::UUID,  -- Extension Bukavu
    'member',
    now()
  )
ON CONFLICT (user_id, extension_id) DO UPDATE SET
  role_in_bureau = EXCLUDED.role_in_bureau;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. DONATION from TEST_Partenaire
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO donations (id, amount, donation_date, donor_id, donor_name, purpose, status, currency, extension_id, notes, created_at)
VALUES (
  'h0000000-0000-0000-0000-000000000001'::UUID,
  500.00,
  CURRENT_DATE - INTERVAL '5 days',
  'b0000000-0000-0000-0000-000000000008'::UUID,  -- TEST_Partenaire
  'TEST_Partenaire',
  'Construction de l''église — Extension de Bukavu',
  'confirmed',
  'USD',
  'a0000000-0000-0000-0000-000000000001'::UUID,  -- Extension Bukavu
  'Don mensuel de soutien pour le projet de construction',
  now() - INTERVAL '5 days'
) ON CONFLICT (id) DO NOTHING;

-- Second donation for richer test data
INSERT INTO donations (id, amount, donation_date, donor_id, donor_name, purpose, status, currency, notes, created_at)
VALUES (
  'h0000000-0000-0000-0000-000000000002'::UUID,
  150000.00,
  CURRENT_DATE - INTERVAL '1 day',
  'b0000000-0000-0000-0000-000000000008'::UUID,  -- TEST_Partenaire
  'TEST_Partenaire',
  'Aide aux familles nécessiteuses',
  'confirmed',
  'CDF',
  'Contribution en Francs Congolais pour la diakonia',
  now() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. ROLE ASSIGNMENT LOG (traceability for promotions)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 11a. Promote TEST_Past_Principal_Kateba to principal pastor
INSERT INTO role_assignment_log (id, performed_by, target_user, action, old_role_level, new_role_level, old_pastor_category, new_pastor_category, details, created_at)
VALUES (
  'i0000000-0000-0000-0000-000000000001'::UUID,
  'b0000000-0000-0000-0000-000000000001'::UUID,  -- performed by TEST_Admin
  'b0000000-0000-0000-0000-000000000002'::UUID,  -- TEST_Past_Principal_Kateba
  'promoted',
  1,
  5,
  NULL,
  'ancien',
  'Promotion au rang de Pasteur Principal de l''Église Évangélique La Conquête',
  now() - INTERVAL '30 days'
) ON CONFLICT (id) DO NOTHING;

-- 11b. Promote TEST_Past_Principal_Mukendi to principal pastor
INSERT INTO role_assignment_log (id, performed_by, target_user, action, old_role_level, new_role_level, old_pastor_category, new_pastor_category, details, created_at)
VALUES (
  'i0000000-0000-0000-0000-000000000002'::UUID,
  'b0000000-0000-0000-0000-000000000001'::UUID,  -- performed by TEST_Admin
  'b0000000-0000-0000-0000-000000000003'::UUID,  -- TEST_Past_Principal_Mukendi
  'promoted',
  1,
  5,
  NULL,
  'ancien',
  'Promotion au rang de Pasteur Principal — co-responsabilité spirituelle',
  now() - INTERVAL '30 days'
) ON CONFLICT (id) DO NOTHING;

-- 11c. Assign TEST_Past_Assoc_Bukavu to Bukavu extension
INSERT INTO role_assignment_log (id, performed_by, target_user, action, old_role_level, new_role_level, old_pastor_category, new_pastor_category, details, created_at)
VALUES (
  'i0000000-0000-0000-0000-000000000003'::UUID,
  'b0000000-0000-0000-0000-000000000001'::UUID,  -- performed by TEST_Admin
  'b0000000-0000-0000-0000-000000000004'::UUID,  -- TEST_Past_Assoc_Bukavu
  'assigned_extension',
  4,
  4,
  'ancien',
  'ancien',
  'Affectation comme Pasteur Associé de l''Extension de Bukavu',
  now() - INTERVAL '25 days'
) ON CONFLICT (id) DO NOTHING;

-- 11d. Set pastor category for TEST_Ancien
INSERT INTO role_assignment_log (id, performed_by, target_user, action, old_role_level, new_role_level, old_pastor_category, new_pastor_category, details, created_at)
VALUES (
  'i0000000-0000-0000-0000-000000000004'::UUID,
  'b0000000-0000-0000-0000-000000000001'::UUID,  -- performed by TEST_Admin
  'b0000000-0000-0000-0000-000000000005'::UUID,  -- TEST_Ancien
  'pastor_category_changed',
  1,
  4,
  NULL,
  'ancien',
  'Reconnaissance comme Ancien dans l''assemblée',
  now() - INTERVAL '20 days'
) ON CONFLICT (id) DO NOTHING;

-- 11e. Set pastor category for TEST_Diacre
INSERT INTO role_assignment_log (id, performed_by, target_user, action, old_role_level, new_role_level, old_pastor_category, new_pastor_category, details, created_at)
VALUES (
  'i0000000-0000-0000-0000-000000000005'::UUID,
  'b0000000-0000-0000-0000-000000000001'::UUID,  -- performed by TEST_Admin
  'b0000000-0000-0000-0000-000000000006'::UUID,  -- TEST_Diacre
  'pastor_category_changed',
  1,
  4,
  NULL,
  'diacre',
  'Ordonnation comme Diacre — service dans la diakonia',
  now() - INTERVAL '20 days'
) ON CONFLICT (id) DO NOTHING;

-- 11f. Set pastor category for TEST_Collaborateur
INSERT INTO role_assignment_log (id, performed_by, target_user, action, old_role_level, new_role_level, old_pastor_category, new_pastor_category, details, created_at)
VALUES (
  'i0000000-0000-0000-0000-000000000006'::UUID,
  'b0000000-0000-0000-0000-000000000001'::UUID,  -- performed by TEST_Admin
  'b0000000-0000-0000-0000-000000000007'::UUID,  -- TEST_Collaborateur
  'pastor_category_changed',
  1,
  4,
  NULL,
  'collaborateur',
  'Reconnaissance comme Collaborateur pastoral',
  now() - INTERVAL '20 days'
) ON CONFLICT (id) DO NOTHING;

-- 11g. Assign TEST_Chef_Louange as department leader
INSERT INTO role_assignment_log (id, performed_by, target_user, action, old_role_level, new_role_level, details, created_at)
VALUES (
  'i0000000-0000-0000-0000-000000000007'::UUID,
  'b0000000-0000-0000-0000-000000000001'::UUID,  -- performed by TEST_Admin
  'b0000000-0000-0000-0000-000000000009'::UUID,  -- TEST_Chef_Louange
  'assigned_dept_leader',
  1,
  3,
  'Nommé Chef du Département de Louange',
  now() - INTERVAL '15 days'
) ON CONFLICT (id) DO NOTHING;

-- 11h. Assign TEST_Chef_Evangelisation as department leader
INSERT INTO role_assignment_log (id, performed_by, target_user, action, old_role_level, new_role_level, details, created_at)
VALUES (
  'i0000000-0000-0000-0000-000000000008'::UUID,
  'b0000000-0000-0000-0000-000000000001'::UUID,  -- performed by TEST_Admin
  'b0000000-0000-0000-0000-000000000010'::UUID,  -- TEST_Chef_Evangelisation
  'assigned_dept_leader',
  1,
  3,
  'Nommé Chef du Département d''Évangélisation',
  now() - INTERVAL '15 days'
) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. VERIFICATION SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════════
-- (Runs at the end to confirm all data was inserted correctly)

DO $$
DECLARE
  v_count_users    INTEGER;
  v_count_ext      INTEGER;
  v_count_depts    INTEGER;
  v_count_members  INTEGER;
  v_count_comm     INTEGER;
  v_count_prayers  INTEGER;
  v_count_forum    INTEGER;
  v_count_tags     INTEGER;
  v_count_bureau   INTEGER;
  v_count_donations INTEGER;
  v_count_logs     INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count_users    FROM auth.users       WHERE email LIKE 'test_%@laconquete.test';
  SELECT COUNT(*) INTO v_count_ext      FROM extensions       WHERE name LIKE 'Extension de %';
  SELECT COUNT(*) INTO v_count_depts    FROM departments      WHERE slug IN ('louange', 'evangelisation', 'medias', 'accueil');
  SELECT COUNT(*) INTO v_count_members  FROM department_members WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE 'test_%@laconquete.test');
  SELECT COUNT(*) INTO v_count_comm     FROM communiques      WHERE id::text LIKE 'd0%';
  SELECT COUNT(*) INTO v_count_prayers  FROM prayer_requests  WHERE id::text LIKE 'e0%';
  SELECT COUNT(*) INTO v_count_forum    FROM forum_messages   WHERE id::text LIKE 'f0%';
  SELECT COUNT(*) INTO v_count_tags     FROM tag_mentions     WHERE id::text LIKE 'f0%';
  SELECT COUNT(*) INTO v_count_bureau   FROM bureau_pastoral_members WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE 'test_%@laconquete.test');
  SELECT COUNT(*) INTO v_count_donations FROM donations       WHERE donor_id IN (SELECT id FROM auth.users WHERE email LIKE 'test_%@laconquete.test');
  SELECT COUNT(*) INTO v_count_logs     FROM role_assignment_log WHERE id::text LIKE 'i0%';

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '  TEST DATA SEED COMPLETE — La Conquête Platform';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '  Auth users (test_*)      : %', v_count_users;
  RAISE NOTICE '  Extensions created       : %', v_count_ext;
  RAISE NOTICE '  Departments referenced   : %', v_count_depts;
  RAISE NOTICE '  Dept memberships         : %', v_count_members;
  RAISE NOTICE '  Communiqués              : %', v_count_comm;
  RAISE NOTICE '  Prayer requests          : %', v_count_prayers;
  RAISE NOTICE '  Forum messages           : %', v_count_forum;
  RAISE NOTICE '  Tag mentions             : %', v_count_tags;
  RAISE NOTICE '  Bureau pastoral members  : %', v_count_bureau;
  RAISE NOTICE '  Donations                : %', v_count_donations;
  RAISE NOTICE '  Role assignment logs     : %', v_count_logs;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '  Login: test_admin@laconquete.test / TestAdmin2024!';
  RAISE NOTICE '  Cleanup: DELETE FROM auth.users WHERE email LIKE ''test_%%@laconquete.test'';';
  RAISE NOTICE '';
END $$;

COMMIT;