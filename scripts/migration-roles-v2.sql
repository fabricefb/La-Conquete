-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION RÔLES V2 — La Conquête Plateforme Pastorale
-- Exécuter dans Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. EXTENSIONS (nouvelle table — sépare des locations)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'RDC',
  pastor_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 2. NOUVEAUX CHAMPS SUR user_profiles
-- ═══════════════════════════════════════════════════════════════

-- role_level (0=visiteur → 6=admin)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'role_level') THEN
    ALTER TABLE user_profiles ADD COLUMN role_level INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- pastor_category
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'pastor_category') THEN
    ALTER TABLE user_profiles ADD COLUMN pastor_category TEXT CHECK (pastor_category IN ('ancien', 'diacre', 'collaborateur', 'partenaire', 'assistant_pastor'));
  END IF;
END $$;

-- extension_id (déclaration d'appartenance)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'extension_id') THEN
    ALTER TABLE user_profiles ADD COLUMN extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- is_principal_pastor
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_principal_pastor') THEN
    ALTER TABLE user_profiles ADD COLUMN is_principal_pastor BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- colonnes qui pourraient manquer (safe adds)
DO $$ BEGIN
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
    ALTER TABLE user_profiles ADD COLUMN gender TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'birth_date') THEN
    ALTER TABLE user_profiles ADD COLUMN birth_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'bio') THEN
    ALTER TABLE user_profiles ADD COLUMN bio TEXT;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. AJOUT CHAMPS SUR departments
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'extension_id') THEN
    ALTER TABLE departments ADD COLUMN extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. MISE À JOUR department_members
-- ═══════════════════════════════════════════════════════════════

-- Ajouter role_in_dept
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'department_members' AND column_name = 'role_in_dept') THEN
    ALTER TABLE department_members ADD COLUMN role_in_dept TEXT NOT NULL DEFAULT 'member' 
      CHECK (role_in_dept IN ('pending', 'member', 'leader'));
  END IF;
END $$;

-- Ajouter is_primary
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'department_members' AND column_name = 'is_primary') THEN
    ALTER TABLE department_members ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. COMMUNIQUÉS (nouvelle table)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS communiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  extension_scope UUID REFERENCES extensions(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'departement' CHECK (category IN ('spirituel', 'logistique', 'departement', 'urgent', 'global')),
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 6. FORUMS INTER-DÉPARTEMENTAUX
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS forum_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES forum_messages(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tag_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES forum_messages(id) ON DELETE CASCADE,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('department', 'user')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tag_mentions_message ON tag_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_tag_mentions_target ON tag_mentions(tag_type, target_id);

-- ═══════════════════════════════════════════════════════════════
-- 7. BUREAU PASTORAL
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bureau_pastoral_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  extension_id UUID REFERENCES extensions(id) ON DELETE CASCADE,
  role_in_bureau TEXT NOT NULL DEFAULT 'member' CHECK (role_in_bureau IN ('member', 'coordinator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, extension_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bureau_user_global ON bureau_pastoral_members(user_id) WHERE extension_id IS NULL;

CREATE TABLE IF NOT EXISTS bureau_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'voting', 'approved', 'rejected', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bureau_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES bureau_proposals(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('pour', 'contre', 'abstention')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, voter_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 8. JOURNAL DES PROMOTIONS (traçabilité)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS role_assignment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  target_user UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('promoted', 'assigned_extension', 'assigned_dept_leader', 'revoked', 'role_changed', 'pastor_category_changed')),
  old_role_level INTEGER,
  new_role_level INTEGER,
  old_pastor_category TEXT,
  new_pastor_category TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_log_target ON role_assignment_log(target_user);
CREATE INDEX IF NOT EXISTS idx_role_log_performed ON role_assignment_log(performed_by);

-- ═══════════════════════════════════════════════════════════════
-- 9. DONATIONS (pour partenaires)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12, 2) NOT NULL,
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  donor_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  donor_name TEXT,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'CDF', 'EUR')),
  extension_id UUID REFERENCES extensions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 10. MISE À JOUR NOTIFICATIONS (ajout de nouveaux types)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  -- Vérifier si la colonne type a un CHECK constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'notifications' AND ccu.column_name = 'type' AND tc.constraint_type = 'CHECK'
  ) THEN
    -- Supprimer l'ancien CHECK et le recréer avec les nouveaux types
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
      type IN (
        'prayer_prayed', 'service_assigned', 'service_accepted', 'service_declined',
        'role_approved', 'role_rejected', 'new_post', 'new_comment', 'daily_thought',
        'general', 'visitor_assigned', 'onboarding_reminder',
        'tag_mention', 'dept_request_approved', 'dept_request_received',
        'communique_published', 'bureau_vote', 'donation_received'
      )
    );
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 11. MIGRER LES DONNÉES EXISTANTES
-- ═══════════════════════════════════════════════════════════════

-- Définir l'admin existant comme admin + principal
UPDATE user_profiles SET
  role_level = 6,
  is_admin = true,
  is_principal_pastor = false,
  onboarding_completed = true
WHERE email = 'aimeonginfo@gmail.com';

-- Définir les 2 pasteurs principaux (à créer manuellement si non existants)
-- David KATEBA et Richard MUKENDI devront être créés via l'interface admin
-- puis promus avec : UPDATE user_profiles SET role_level=5, is_principal_pastor=true, pastor_category='ancien' WHERE email='...'

-- Migrer is_admin existants vers role_level=6
UPDATE user_profiles SET role_level = 6 WHERE is_admin = true AND role_level = 1;

-- Migrer les chefs de département existants vers role_level=3
UPDATE user_profiles SET role_level = 3
WHERE id IN (
  SELECT DISTINCT dm.user_id FROM department_members dm
  JOIN user_profiles up ON up.id = dm.user_id
  WHERE dm.is_active = true
  AND (dm.role_in_dept = 'leader' OR dm.position_id IS NOT NULL)
  AND up.role_level = 1
);

-- Mettre à jour les membres de département actifs vers role_level=2
UPDATE user_profiles SET role_level = GREATEST(role_level, 2)
WHERE id IN (
  SELECT DISTINCT dm.user_id FROM department_members dm
  JOIN user_profiles up ON up.id = dm.user_id
  WHERE dm.is_active = true AND dm.role_in_dept = 'member'
  AND up.role_level < 2
);

-- ═══════════════════════════════════════════════════════════════
-- 12. METTRE À JOUR LES FONCTIONS RLS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_principal_pastor() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_principal_pastor = true);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_pastor_or_above() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 4);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_chief_or_above() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 3);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_member_or_above() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 1 AND onboarding_completed = true);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION owns_profile(p_id UUID) RETURNS BOOLEAN AS $$
  SELECT p_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Retourne l'extension_id de l'utilisateur connecté (NULL si église mère)
CREATE OR REPLACE FUNCTION current_user_extension() RETURNS UUID AS $$
  SELECT extension_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Vérifie si l'utilisateur est pasteur associé de l'extension donnée
CREATE OR REPLACE FUNCTION is_pastor_of_extension(ext_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role_level >= 4 
    AND (extension_id = ext_id OR is_principal_pastor = true OR is_admin = true)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════
-- 13. RLS SUR LES NOUVELLES TABLES
-- ═══════════════════════════════════════════════════════════════

-- Extensions
ALTER TABLE extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "extensions_select_all" ON extensions FOR SELECT USING (true);
CREATE POLICY "extensions_admin_manage" ON extensions FOR ALL USING (is_super_admin());

-- Communiqués
ALTER TABLE communiques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "communiques_select_published" ON communiques FOR SELECT 
  USING (is_published OR is_super_admin() OR is_pastor_or_above());
CREATE POLICY "communiques_chief_insert" ON communiques FOR INSERT 
  WITH CHECK (is_chief_or_above());
CREATE POLICY "communiques_chief_update" ON communiques FOR UPDATE 
  USING (is_super_admin() OR author_id = auth.uid());
CREATE POLICY "communiques_admin_delete" ON communiques FOR DELETE 
  USING (is_super_admin());

-- Forum messages
ALTER TABLE forum_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_select_members" ON forum_messages FOR SELECT 
  USING (is_member_or_above());
CREATE POLICY "forum_insert_members" ON forum_messages FOR INSERT 
  WITH CHECK (is_member_or_above());
CREATE POLICY "forum_update_own" ON forum_messages FOR UPDATE 
  USING (author_id = auth.uid() OR is_chief_or_above() OR is_super_admin());
CREATE POLICY "forum_delete_own" ON forum_messages FOR DELETE 
  USING (author_id = auth.uid() OR is_super_admin());

-- Tag mentions
ALTER TABLE tag_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tag_mentions_select" ON tag_mentions FOR SELECT USING (is_member_or_above());
CREATE POLICY "tag_mentions_insert" ON tag_mentions FOR INSERT WITH CHECK (is_member_or_above());

-- Bureau pastoral
ALTER TABLE bureau_pastoral_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bureau_select" ON bureau_pastoral_members FOR SELECT 
  USING (is_super_admin() OR is_principal_pastor() OR is_pastor_or_above());
CREATE POLICY "bureau_admin_manage" ON bureau_pastoral_members FOR ALL 
  USING (is_super_admin());

ALTER TABLE bureau_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposals_select" ON bureau_proposals FOR SELECT 
  USING (is_super_admin() OR is_principal_pastor() OR is_pastor_or_above());
CREATE POLICY "proposals_insert" ON bureau_proposals FOR INSERT 
  WITH CHECK (is_super_admin() OR is_principal_pastor() OR is_pastor_or_above());
CREATE POLICY "proposals_update" ON bureau_proposals FOR UPDATE 
  USING (is_super_admin() OR author_id = auth.uid() OR is_principal_pastor());

ALTER TABLE bureau_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_select" ON bureau_votes FOR SELECT 
  USING (is_super_admin() OR is_principal_pastor() OR is_pastor_or_above());
CREATE POLICY "votes_insert" ON bureau_votes FOR INSERT 
  WITH CHECK (is_super_admin() OR is_principal_pastor() OR is_pastor_or_above());
CREATE POLICY "votes_update_own" ON bureau_votes FOR UPDATE 
  USING (voter_id = auth.uid());

-- Role assignment log
ALTER TABLE role_assignment_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log_select_admin_principal" ON role_assignment_log FOR SELECT 
  USING (is_super_admin() OR is_principal_pastor());
CREATE POLICY "log_insert_admin" ON role_assignment_log FOR INSERT 
  WITH CHECK (is_super_admin());

-- Donations
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "donations_select_own" ON donations FOR SELECT 
  USING (is_super_admin() OR is_pastor_or_above() OR donor_id = auth.uid());
CREATE POLICY "donations_admin_manage" ON donations FOR ALL 
  USING (is_super_admin());

-- ═══════════════════════════════════════════════════════════════
-- 14. EXTENSION DEPARTMENT (optionnel — départements propres à une extension)
-- ═══════════════════════════════════════════════════════════════
-- Les départements globaux ont extension_id = NULL
-- Les départements d'extension ont extension_id = <uuid>

COMMIT;