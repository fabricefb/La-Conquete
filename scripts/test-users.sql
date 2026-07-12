-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST DATA SEED — Église Évangélique La Conquête
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Purpose     : Insert comprehensive test users covering ALL role levels (0–6),
--               plus related test data (extensions, departments, prayer requests,
--               communiqués, events, onboarding answers).
--
-- Prerequisites:
--   1. Run migration-roles-v2.sql first (creates extensions, communiques, bureau, etc.)
--   2. Run 20260711060000_erp_roles.sql (departments, prayer_requests, etc.)
--   3. Run 20260710150815_create_events_table.sql (events table)
--   4. Run 20260714000000_features_batch.sql (onboarding_answers, etc.)
--
-- Cleanup     : Run /scripts/cleanup-test-data.sql or /download/cleanup-test-data.sql
--               to remove ALL test data (everything prefixed with TEST_).
--
-- Usage       : Execute in Supabase Dashboard → SQL Editor (as superuser).
--
-- Credentials : Each test user's email/password is documented in the table below.
--               All emails use the @laconquete.test domain (non-routable).
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- Role Mapping:
--   0 = VISITOR          |  1 = MEMBER           |  2 = DEPT_MEMBER (collaborateur)
--   3 = DEPT_LEADER      |  4 = PASTOR_ASSOC     |  5 = PASTOR_PRINCIPAL
--   6 = ADMIN
-- ═══════════════════════════════════════════════════════════════════════════════
-- Test User Matrix:
-- ─────────────────┬──────────────────────────────────────────┬──────────────────────┐
-- Role Level      │ Email                                     │ Password             │
-- ─────────────────┼──────────────────────────────────────────┼──────────────────────┤
-- 6  Admin        │ test.admin@laconquete.test                │ TestAdmin2024!       │
-- 5  Pasteur Princ│ test.pastor.principal@laconquete.test      │ TestPasteurPrinc2024!│
-- 4  Pasteur Assoc│ test.pastor.assoc@laconquete.test          │ TestPasteurAssoc2024!│
-- 3  Chef Dept    │ test.chef.dept@laconquete.test             │ TestChefDept2024!    │
-- 2  Collaborateur│ test.collaborateur@laconquete.test         │ TestCollab2024!      │
-- 2  Ancien       │ test.ancien@laconquete.test                │ TestAncien2024!      │
-- 2  Diacre       │ test.diacre@laconquete.test                │ TestDiacre2024!      │
-- 2  Partenaire   │ test.partenaire@laconquete.test            │ TestPartenaire2024!  │
-- 1  Membre       │ test.membre@laconquete.test                │ TestMembre2024!      │
-- ─────────────────┴──────────────────────────────────────────┴──────────────────────┘
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 0. CLEANUP — Remove any pre-existing TEST_ data (idempotent)
-- ═══════════════════════════════════════════════════════════════

-- Temp table to collect test user IDs before cascading deletes
CREATE TEMP TABLE _test_uids AS
SELECT id FROM user_profiles WHERE full_name LIKE 'TEST_%';

DELETE FROM communiques    WHERE title LIKE 'TEST_%';
DELETE FROM prayer_requests WHERE content LIKE 'TEST_%';
DELETE FROM events         WHERE title LIKE 'TEST_%';
DELETE FROM onboarding_answers WHERE full_name LIKE 'TEST_%';
DELETE FROM department_members WHERE user_id IN (SELECT id FROM _test_uids);
DELETE FROM user_profiles   WHERE id IN (SELECT id FROM _test_uids);
DELETE FROM auth.users      WHERE email LIKE 'test.%@laconquete.test';
DELETE FROM departments     WHERE name LIKE 'TEST_%';
DELETE FROM extensions      WHERE name LIKE 'TEST_%';

DROP TABLE _test_uids;


-- ═══════════════════════════════════════════════════════════════
-- 1. EXTENSIONS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO extensions (id, name, slug, address, city, country, is_active)
VALUES
  (
    gen_random_uuid(),
    'TEST_Extension Matonge',
    'test-extension-matonge',
    'Avenue Test 123, Matonge',
    'Kinshasa',
    'RDC',
    true
  ),
  (
    gen_random_uuid(),
    'TEST_Extension Lemba',
    'test-extension-lemba',
    'Boulevard Test 456, Lemba',
    'Kinshasa',
    'RDC',
    true
  )
ON CONFLICT (slug) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 2. DEPARTMENTS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO departments (id, name, slug, description, icon_name, accent_color, is_active, sort_order)
VALUES
  (
    gen_random_uuid(),
    'TEST_Protocole',
    'test-protocole',
    'TEST — Département de protocole et accueil',
    'Shield',
    'blue',
    true,
    1
  ),
  (
    gen_random_uuid(),
    'TEST_Musique',
    'test-musique',
    'TEST — Département de musique et louange',
    'Music',
    'purple',
    true,
    2
  ),
  (
    gen_random_uuid(),
    'TEST_Evangélisation',
    'test-evangelisation',
    'TEST — Département d''évangélisation et missions',
    'Globe',
    'green',
    true,
    3
  )
ON CONFLICT (slug) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 3. AUTH USERS + USER PROFILES
-- ═══════════════════════════════════════════════════════════════
-- Note: The handle_new_user() trigger auto-creates a basic user_profiles
-- row on auth.users INSERT. We immediately UPDATE it with full data.
-- ═══════════════════════════════════════════════════════════════

-- ─── 3a. Admin (role_level=6) ─────────────────────────────────
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  aud,
  role,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test.admin@laconquete.test',
  crypt('TestAdmin2024!', gen_salt('bf')),
  'authenticated',
  'authenticated',
  now(),
  '{"full_name":"TEST_Admin Principal"}',
  now(),
  now(),
  '',
  '',
  '',
  '',
  ''
);

UPDATE user_profiles
SET
  full_name            = 'TEST_Admin Principal',
  phone                = '+243 000 000 001',
  gender               = 'male',
  is_admin             = true,
  role_level           = 6,
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'test.admin@laconquete.test';


-- ─── 3b. Pasteur Principal (role_level=5) ────────────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test.pastor.principal@laconquete.test',
  crypt('TestPasteurPrinc2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"TEST_Pasteur Principal"}',
  now(), now(), '', '', '', '', ''
);

UPDATE user_profiles
SET
  full_name            = 'TEST_Pasteur Principal',
  phone                = '+243 000 000 002',
  gender               = 'male',
  role_level           = 5,
  is_principal_pastor  = true,
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'test.pastor.principal@laconquete.test';


-- ─── 3c. Pasteur Associé (role_level=4) ──────────────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test.pastor.assoc@laconquete.test',
  crypt('TestPasteurAssoc2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"TEST_Pasteur Associé"}',
  now(), now(), '', '', '', '', ''
);

UPDATE user_profiles up
SET
  full_name            = 'TEST_Pasteur Associé',
  phone                = '+243 000 000 003',
  gender               = 'male',
  role_level           = 4,
  pastor_category      = 'assistant_pastor',
  extension_id         = (SELECT id FROM extensions WHERE name = 'TEST_Extension Matonge'),
  onboarding_completed = true,
  updated_at           = now()
WHERE up.email = 'test.pastor.assoc@laconquete.test';


-- ─── 3d. Chef de Département (role_level=3) ──────────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test.chef.dept@laconquete.test',
  crypt('TestChefDept2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"TEST_Chef Protocole"}',
  now(), now(), '', '', '', '', ''
);

UPDATE user_profiles
SET
  full_name            = 'TEST_Chef Protocole',
  phone                = '+243 000 000 004',
  gender               = 'male',
  role_level           = 3,
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'test.chef.dept@laconquete.test';


-- ─── 3e. Collaborateur — Musique (role_level=2) ──────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test.collaborateur@laconquete.test',
  crypt('TestCollab2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"TEST_Collaborateur Musique"}',
  now(), now(), '', '', '', '', ''
);

UPDATE user_profiles
SET
  full_name            = 'TEST_Collaborateur Musique',
  phone                = '+243 000 000 005',
  gender               = 'female',
  role_level           = 2,
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'test.collaborateur@laconquete.test';


-- ─── 3f. Ancien (role_level=2, pastor_category=ancien) ───────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test.ancien@laconquete.test',
  crypt('TestAncien2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"TEST_Ancien Jean"}',
  now(), now(), '', '', '', '', ''
);

UPDATE user_profiles
SET
  full_name            = 'TEST_Ancien Jean',
  phone                = '+243 000 000 006',
  gender               = 'male',
  role_level           = 2,
  pastor_category      = 'ancien',
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'test.ancien@laconquete.test';


-- ─── 3g. Diacre (role_level=2, pastor_category=diacre) ───────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test.diacre@laconquete.test',
  crypt('TestDiacre2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"TEST_Diacre Pierre"}',
  now(), now(), '', '', '', '', ''
);

UPDATE user_profiles
SET
  full_name            = 'TEST_Diacre Pierre',
  phone                = '+243 000 000 007',
  gender               = 'male',
  role_level           = 2,
  pastor_category      = 'diacre',
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'test.diacre@laconquete.test';


-- ─── 3h. Partenaire (role_level=2, pastor_category=partenaire)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test.partenaire@laconquete.test',
  crypt('TestPartenaire2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"TEST_Partenaire Marie"}',
  now(), now(), '', '', '', '', ''
);

UPDATE user_profiles
SET
  full_name            = 'TEST_Partenaire Marie',
  phone                = '+243 000 000 008',
  gender               = 'female',
  role_level           = 2,
  pastor_category      = 'partenaire',
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'test.partenaire@laconquete.test';


-- ─── 3i. Membre Simple (role_level=1) ────────────────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test.membre@laconquete.test',
  crypt('TestMembre2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"TEST_Membre Simple"}',
  now(), now(), '', '', '', '', ''
);

UPDATE user_profiles
SET
  full_name            = 'TEST_Membre Simple',
  phone                = '+243 000 000 009',
  gender               = 'female',
  role_level           = 1,
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'test.membre@laconquete.test';


-- ═══════════════════════════════════════════════════════════════
-- 4. DEPARTMENT MEMBERS
-- ═══════════════════════════════════════════════════════════════

-- Chef de Dept: LEADER in Protocole + Musique
INSERT INTO department_members (id, user_id, department_id, role_in_dept, is_active, is_primary, joined_at)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  'leader',
  true,
  true,
  now()
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'test.chef.dept@laconquete.test'
  AND d.name IN ('TEST_Protocole', 'TEST_Musique')
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Collaborateur: MEMBER in Musique
INSERT INTO department_members (id, user_id, department_id, role_in_dept, is_active, is_primary, joined_at)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  'member',
  true,
  false,
  now()
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'test.collaborateur@laconquete.test'
  AND d.name = 'TEST_Musique'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Ancien: MEMBER in Evangélisation
INSERT INTO department_members (id, user_id, department_id, role_in_dept, is_active, is_primary, joined_at)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  'member',
  true,
  false,
  now()
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'test.ancien@laconquete.test'
  AND d.name = 'TEST_Evangélisation'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Membre Simple: MEMBER in Protocole + Evangélisation
INSERT INTO department_members (id, user_id, department_id, role_in_dept, is_active, is_primary, joined_at)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  'member',
  true,
  false,
  now()
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'test.membre@laconquete.test'
  AND d.name IN ('TEST_Protocole', 'TEST_Evangélisation')
ON CONFLICT (user_id, department_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 5. RELATED TEST DATA
-- ═══════════════════════════════════════════════════════════════

-- ─── 5a. Prayer Requests (from TEST_Membre) ──────────────────
INSERT INTO prayer_requests (id, user_id, author_name, content, is_anonymous, is_confidential, status, created_at)
VALUES
  (
    gen_random_uuid(),
    (SELECT id FROM user_profiles WHERE email = 'test.membre@laconquete.test'),
    'TEST_Membre Simple',
    'TEST — Prière pour la guérison de ma mère qui est malade depuis 3 semaines. Qu''est-ce que Dieu a en réserve pour notre famille.',
    false,
    false,
    'received',
    now() - INTERVAL '2 days'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM user_profiles WHERE email = 'test.membre@laconquete.test'),
    'TEST_Membre Simple',
    'TEST — Demande de guidance spirituelle pour un projet professionnel important. Que la volonté de Dieu soit faite.',
    false,
    true,
    'praying',
    now() - INTERVAL '5 hours'
  );


-- ─── 5b. Communiqué (from TEST_Pasteur Principal) ────────────
INSERT INTO communiques (
  id, title, content, author_id, category,
  is_urgent, is_published, published_at, created_at, updated_at
)
VALUES
  (
    gen_random_uuid(),
    'TEST — Programme de la Semaine de Réveil Spirituel',
    'TEST — Chers frères et sœurs, je vous invite à participer à notre semaine spéciale de réveil spirituel qui débutera le lundi prochain. Les cultes auront lieu chaque jour de 18h à 20h au temple principal. Le thème de cette semaine est « Marcher dans la Destinée ». Venez nombreux et amenez vos proches. Que Dieu vous bénisse abondamment.',
    (SELECT id FROM user_profiles WHERE email = 'test.pastor.principal@laconquete.test'),
    'spirituel',
    true,
    true,
    now() - INTERVAL '1 hour',
    now() - INTERVAL '3 hours',
    now() - INTERVAL '1 hour'
  );


-- ─── 5c. Event (created by TEST_Admin) ───────────────────────
INSERT INTO events (
  id, title, description, category, image_url,
  event_date, location, is_live, is_featured, created_at
)
VALUES
  (
    gen_random_uuid(),
    'TEST — Conférence des Jeunes 2026',
    'TEST — Une conférence transformatrice pour la jeunesse de La Conquête. Trois jours de louange, enseignement et activation des dons spirituels. Avec des intervenants invités et des ateliers pratiques.',
    'Jeunesse',
    'https://placehold.co/800x400/1a1a2e/d4a843?text=TEST+Event',
    now() + INTERVAL '15 days',
    'TEST_Auditorium Principal, Kinshasa',
    false,
    true,
    now()
  );


-- ─── 5d. Onboarding Answers ──────────────────────────────────
INSERT INTO onboarding_answers (id, user_id, full_name, phone, gender, birth_date, department_id, department_name, motivation, created_at)
VALUES
  (
    gen_random_uuid(),
    (SELECT id FROM user_profiles WHERE email = 'test.collaborateur@laconquete.test'),
    'TEST_Collaborateur Musique',
    '+243 000 000 005',
    'female',
    '1998-03-15'::date,
    (SELECT id FROM departments WHERE name = 'TEST_Musique'),
    'TEST_Musique',
    'TEST — Je désire servir Dieu à travers la musique et la louange. J''ai 5 ans d''expérience au clavier et je veux contribuer au département musique de l''église.',
    now() - INTERVAL '10 days'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM user_profiles WHERE email = 'test.ancien@laconquete.test'),
    'TEST_Ancien Jean',
    '+243 000 000 006',
    'male',
    '1965-08-22'::date,
    (SELECT id FROM departments WHERE name = 'TEST_Evangélisation'),
    'TEST_Evangélisation',
    'TEST — Ancien dans la foi depuis 20 ans, je souhaite encadrer les jeunes dans le département d''évangélisation et partager mon expérience missionnaire.',
    now() - INTERVAL '7 days'
  );


-- ═══════════════════════════════════════════════════════════════
-- 6. VERIFICATION SUMMARY
-- ═══════════════════════════════════════════════════════════════
DO $$ DECLARE
  v_users    INTEGER;
  v_ext      INTEGER;
  v_depts    INTEGER;
  v_dept_mem INTEGER;
  v_prayers  INTEGER;
  v_comm     INTEGER;
  v_events   INTEGER;
  v_onboard  INTEGER;
BEGIN
  SELECT count(*) INTO v_users    FROM user_profiles    WHERE full_name LIKE 'TEST_%';
  SELECT count(*) INTO v_ext      FROM extensions       WHERE name LIKE 'TEST_%';
  SELECT count(*) INTO v_depts    FROM departments      WHERE name LIKE 'TEST_%';
  SELECT count(*) INTO v_dept_mem FROM department_members dm JOIN user_profiles up ON up.id = dm.user_id WHERE up.full_name LIKE 'TEST_%';
  SELECT count(*) INTO v_prayers  FROM prayer_requests  WHERE content LIKE 'TEST_%';
  SELECT count(*) INTO v_comm     FROM communiques       WHERE title LIKE 'TEST_%';
  SELECT count(*) INTO v_events   FROM events            WHERE title LIKE 'TEST_%';
  SELECT count(*) INTO v_onboard  FROM onboarding_answers WHERE full_name LIKE 'TEST_%';

  RAISE NOTICE '╔══════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           TEST DATA SEED COMPLETE                  ║';
  RAISE NOTICE '╠══════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Test Users        : %', v_users;
  RAISE NOTICE '║  Extensions        : %', v_ext;
  RAISE NOTICE '║  Departments       : %', v_depts;
  RAISE NOTICE '║  Dept. Memberships : %', v_dept_mem;
  RAISE NOTICE '║  Prayer Requests   : %', v_prayers;
  RAISE NOTICE '║  Communiqués       : %', v_comm;
  RAISE NOTICE '║  Events            : %', v_events;
  RAISE NOTICE '║  Onboarding Answers: %', v_onboard;
  RAISE NOTICE '╠══════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  All rows prefixed TEST_ for easy cleanup          ║';
  RAISE NOTICE '║  Run cleanup-test-data.sql to remove everything   ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════╝';
END $$;

COMMIT;