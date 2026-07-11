-- ═══════════════════════════════════════════════════════════════════
--  Migration ERP Église — Rôles, Départements, Prières, Planning
--  Église Évangélique La Conquête — Juillet 2026
--  ═══════════════════════════════════════════════════════════════════

-- ─── 1. ENUM pour les rôles ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'visitor',
    'member',
    'servant',
    'chief',
    'pastor',
    'super_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. ALTER user_profiles : ajouter le rôle ──────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role user_role NOT NULL DEFAULT 'visitor';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN address TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN birth_date DATE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Mettre à jour l'admin existant en super_admin
UPDATE user_profiles SET role = 'super_admin', onboarding_completed = true WHERE email = 'aimeonginfo@gmail.com';

-- ─── 3. TABLE: departments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'Users',
  accent_color TEXT DEFAULT 'gold',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. TABLE: positions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. TABLE: department_members (many-to-many) ───────────────────
CREATE TABLE IF NOT EXISTS department_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, department_id)
);

-- ─── 6. TABLE: role_requests ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  requested_role user_role NOT NULL CHECK (requested_role IN ('member', 'servant', 'chief')),
  department_id UUID REFERENCES departments(id),
  position_id UUID REFERENCES positions(id),
  motivation TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 7. TABLE: prayer_requests ────────────────────────────────────
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  author_name TEXT,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_confidential BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'praying', 'answered')),
  prayed_by UUID REFERENCES user_profiles(id),
  prayed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 8. TABLE: daily_thoughts (Pensée du Jour) ───────────────────
CREATE TABLE IF NOT EXISTS daily_thoughts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES user_profiles(id),
  verse_reference TEXT,
  verse_text TEXT NOT NULL,
  reflection TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 9. TABLE: service_plannings ──────────────────────────────────
CREATE TABLE IF NOT EXISTS service_plannings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id),
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'culte' CHECK (service_type IN ('culte', 'repetition', 'special', 'veillerie', 'etude')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 10. TABLE: service_assignments ────────────────────────────────
CREATE TABLE IF NOT EXISTS service_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID NOT NULL REFERENCES service_plannings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  position_id UUID NOT NULL REFERENCES positions(id),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'declined')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(planning_id, user_id, position_id)
);

-- ─── 11. TABLE: department_posts (fil d'actualité) ─────────────────
CREATE TABLE IF NOT EXISTS department_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES user_profiles(id),
  department_id UUID NOT NULL REFERENCES departments(id),
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'announcement' CHECK (post_type IN ('announcement', 'encouragement', 'prayer_need', 'info', 'testimony')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 12. TABLE: post_comments ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES department_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES user_profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 13. TABLE: visitor_followups ─────────────────────────────────
CREATE TABLE IF NOT EXISTS visitor_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES user_profiles(id),
  assigned_to UUID NOT NULL REFERENCES user_profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'returned', 'lost')),
  contact_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 14. TABLE: notification_preferences ───────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  pastoral_whatsapp BOOLEAN NOT NULL DEFAULT false,
  pastoral_sms BOOLEAN NOT NULL DEFAULT false,
  pastoral_call BOOLEAN NOT NULL DEFAULT false,
  dept_notifications BOOLEAN NOT NULL DEFAULT true,
  prayer_updates BOOLEAN NOT NULL DEFAULT true,
  service_reminders BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
--  RLS — Row Level Security
-- ═══════════════════════════════════════════════════════════════════

-- ─── Helper Functions ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_pastor_or_above() RETURNS BOOLEAN AS $$
  SELECT role IN ('pastor', 'super_admin') FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_chief_or_above() RETURNS BOOLEAN AS $$
  SELECT role IN ('chief', 'pastor', 'super_admin') FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_member_or_above() RETURNS BOOLEAN AS $$
  SELECT role NOT IN ('visitor') FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_logged_in() RETURNS BOOLEAN AS $$
  SELECT auth.uid() IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION owns_profile(p_id UUID) RETURNS BOOLEAN AS $$
  SELECT p_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_chief_of(dept_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM department_members dm
    JOIN user_profiles up ON up.id = dm.user_id
    WHERE dm.user_id = auth.uid()
    AND dm.department_id = is_chief_of.dept_id
    AND up.role IN ('chief', 'pastor', 'super_admin')
    AND dm.is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION belongs_to_dept(dept_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM department_members
    WHERE user_id = auth.uid()
    AND department_id = belongs_to_dept.dept_id
    AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── Enable RLS on all new tables ─────────────────────────────────
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_plannings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Also enable on user_profiles if not already
DO $$ BEGIN
  ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── DEPARTMENTS ──────────────────────────────────────────────────
-- Public read, admin write
DO $$ BEGIN
  DROP POLICY IF EXISTS dept_select ON departments;
  CREATE POLICY dept_select ON departments FOR SELECT
    USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS dept_insert ON departments;
  CREATE POLICY dept_insert ON departments FOR INSERT
    WITH CHECK (is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS dept_update ON departments;
  CREATE POLICY dept_update ON departments FOR UPDATE
    USING (is_super_admin())
    WITH CHECK (is_super_admin());
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS dept_delete ON departments;
  CREATE POLICY dept_delete ON departments FOR DELETE
    USING (is_super_admin());
END $$;

-- ─── POSITIONS ────────────────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS pos_select ON positions;
  CREATE POLICY pos_select ON positions FOR SELECT USING (true);
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS pos_insert ON positions;
  CREATE POLICY pos_insert ON positions FOR INSERT WITH CHECK (is_super_admin() OR is_chief_of(department_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS pos_update ON positions;
  CREATE POLICY pos_update ON positions FOR UPDATE USING (is_super_admin() OR is_chief_of(department_id)) WITH CHECK (is_super_admin() OR is_chief_of(department_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS pos_delete ON positions;
  CREATE POLICY pos_delete ON positions FOR DELETE USING (is_super_admin());
END $$;

-- ─── DEPARTMENT_MEMBERS ──────────────────────────────────────────
-- Members can see who is in their dept; admin/pastor see all
DO $$ BEGIN DROP POLICY IF EXISTS dm_select ON department_members;
  CREATE POLICY dm_select ON department_members FOR SELECT
    USING (is_pastor_or_above() OR belongs_to_dept(department_id) OR owns_profile(user_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS dm_insert ON department_members;
  CREATE POLICY dm_insert ON department_members FOR INSERT
    WITH CHECK (is_super_admin() OR (owns_profile(user_id) AND is_member_or_above()));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS dm_update ON department_members;
  CREATE POLICY dm_update ON department_members FOR UPDATE
    USING (is_super_admin() OR is_chief_of(department_id) OR owns_profile(user_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS dm_delete ON department_members;
  CREATE POLICY dm_delete ON department_members FOR DELETE
    USING (is_super_admin() OR owns_profile(user_id));
END $$;

-- ─── ROLE_REQUESTS ───────────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS rr_select ON role_requests;
  CREATE POLICY rr_select ON role_requests FOR SELECT
    USING (is_super_admin() OR owns_profile(user_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS rr_insert ON role_requests;
  CREATE POLICY rr_insert ON role_requests FOR INSERT
    WITH CHECK (owns_profile(user_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS rr_update ON role_requests;
  CREATE POLICY rr_update ON role_requests FOR UPDATE
    USING (is_super_admin())
    WITH CHECK (is_super_admin());
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS rr_delete ON role_requests;
  CREATE POLICY rr_delete ON role_requests FOR DELETE
    USING (is_super_admin());
END $$;

-- ─── PRAYER_REQUESTS ──────────────────────────────────────────────
-- User sees their own; pastor sees all non-confidential + all confidential
DO $$ BEGIN DROP POLICY IF EXISTS pr_select ON prayer_requests;
  CREATE POLICY pr_select ON prayer_requests FOR SELECT
    USING (
      owns_profile(user_id)
      OR is_pastor_or_above()
      OR (is_chief_or_above() AND NOT is_confidential)
    );
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS pr_insert ON prayer_requests;
  CREATE POLICY pr_insert ON prayer_requests FOR INSERT
    WITH CHECK (is_logged_in());
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS pr_update ON prayer_requests;
  CREATE POLICY pr_update ON prayer_requests FOR UPDATE
    USING (is_pastor_or_above() OR owns_profile(user_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS pr_delete ON prayer_requests;
  CREATE POLICY pr_delete ON prayer_requests FOR DELETE
    USING (is_super_admin() OR owns_profile(user_id));
END $$;

-- ─── DAILY_THOUGHTS ──────────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS dt_select ON daily_thoughts;
  CREATE POLICY dt_select ON daily_thoughts FOR SELECT USING (is_published = true OR is_pastor_or_above() OR owns_profile(author_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS dt_insert ON daily_thoughts;
  CREATE POLICY dt_insert ON daily_thoughts FOR INSERT WITH CHECK (is_pastor_or_above());
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS dt_update ON daily_thoughts;
  CREATE POLICY dt_update ON daily_thoughts FOR UPDATE USING (is_pastor_or_above() OR owns_profile(author_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS dt_delete ON daily_thoughts;
  CREATE POLICY dt_delete ON daily_thoughts FOR DELETE USING (is_super_admin());
END $$;

-- ─── SERVICE_PLANNINGS ────────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS sp_select ON service_plannings;
  CREATE POLICY sp_select ON service_plannings FOR SELECT
    USING (is_member_or_above() OR belongs_to_dept(department_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS sp_insert ON service_plannings;
  CREATE POLICY sp_insert ON service_plannings FOR INSERT
    WITH CHECK (is_super_admin() OR is_chief_of(department_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS sp_update ON service_plannings;
  CREATE POLICY sp_update ON service_plannings FOR UPDATE
    USING (is_super_admin() OR is_chief_of(department_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS sp_delete ON service_plannings;
  CREATE POLICY sp_delete ON service_plannings FOR DELETE USING (is_super_admin());
END $$;

-- ─── SERVICE_ASSIGNMENTS ─────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS sa_select ON service_assignments;
  CREATE POLICY sa_select ON service_assignments FOR SELECT
    USING (owns_profile(user_id) OR is_super_admin() OR is_chief_of(
      (SELECT department_id FROM service_plannings WHERE id = planning_id)
    ));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS sa_insert ON service_assignments;
  CREATE POLICY sa_insert ON service_assignments FOR INSERT
    WITH CHECK (is_super_admin() OR is_chief_of(
      (SELECT department_id FROM service_plannings WHERE id = planning_id)
    ));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS sa_update ON service_assignments;
  CREATE POLICY sa_update ON service_assignments FOR UPDATE
    USING (owns_profile(user_id) OR is_super_admin() OR is_chief_of(
      (SELECT department_id FROM service_plannings WHERE id = planning_id)
    ));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS sa_delete ON service_assignments;
  CREATE POLICY sa_delete ON service_assignments FOR DELETE USING (is_super_admin());
END $$;

-- ─── DEPARTMENT_POSTS ────────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS dp_select ON department_posts;
  CREATE POLICY dp_select ON department_posts FOR SELECT
    USING (belongs_to_dept(department_id) OR is_pastor_or_above() OR owns_profile(author_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS dp_insert ON department_posts;
  CREATE POLICY dp_insert ON department_posts FOR INSERT
    WITH CHECK (belongs_to_dept(department_id) OR is_chief_of(department_id) OR is_pastor_or_above());
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS dp_update ON department_posts;
  CREATE POLICY dp_update ON department_posts FOR UPDATE
    USING (owns_profile(author_id) OR is_chief_of(department_id) OR is_pastor_or_above());
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS dp_delete ON department_posts;
  CREATE POLICY dp_delete ON department_posts FOR DELETE USING (is_super_admin() OR owns_profile(author_id));
END $$;

-- ─── POST_COMMENTS ────────────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS pc_select ON post_comments;
  CREATE POLICY pc_select ON post_comments FOR SELECT
    USING (belongs_to_dept(
      (SELECT department_id FROM department_posts WHERE id = post_id)
    ) OR is_pastor_or_above());
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS pc_insert ON post_comments;
  CREATE POLICY pc_insert ON post_comments FOR INSERT
    WITH CHECK (belongs_to_dept(
      (SELECT department_id FROM department_posts WHERE id = post_id)
    ) OR is_pastor_or_above());
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS pc_delete ON post_comments;
  CREATE POLICY pc_delete ON post_comments FOR DELETE
    USING (is_super_admin() OR owns_profile(author_id));
END $$;

-- ─── VISITOR_FOLLOWUPS ───────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS vf_select ON visitor_followups;
  CREATE POLICY vf_select ON visitor_followups FOR SELECT
    USING (is_pastor_or_above() OR owns_profile(assigned_to) OR owns_profile(visitor_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS vf_insert ON visitor_followups;
  CREATE POLICY vf_insert ON visitor_followups FOR INSERT
    WITH CHECK (is_pastor_or_above());
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS vf_update ON visitor_followups;
  CREATE POLICY vf_update ON visitor_followups FOR UPDATE
    USING (is_pastor_or_above() OR owns_profile(assigned_to));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS vf_delete ON visitor_followups;
  CREATE POLICY vf_delete ON visitor_followups FOR DELETE USING (is_super_admin());
END $$;

-- ─── NOTIFICATION_PREFERENCES ────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS np_select ON notification_preferences;
  CREATE POLICY np_select ON notification_preferences FOR SELECT USING (owns_profile(user_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS np_insert ON notification_preferences;
  CREATE POLICY np_insert ON notification_preferences FOR INSERT WITH CHECK (owns_profile(user_id));
END $$;
DO $$ BEGIN DROP POLICY IF EXISTS np_update ON notification_preferences;
  CREATE POLICY np_update ON notification_preferences FOR UPDATE USING (owns_profile(user_id));
END $$;

-- ─── USER_PROFILES — update existing policies for new role ───────
-- Read: everyone can see basic profiles; pastors see more
DO $$ BEGIN DROP POLICY IF EXISTS profiles_select_own ON user_profiles;
  CREATE POLICY profiles_select_own ON user_profiles FOR SELECT
    USING (
      owns_profile(id)
      OR is_pastor_or_above()
      OR (is_member_or_above() AND onboarding_completed = true)
    );
END $$;

-- Insert: auto-create on signup (trigger already exists)
-- Update: own profile, or admin
DO $$ BEGIN DROP POLICY IF EXISTS profiles_update_own ON user_profiles;
  CREATE POLICY profiles_update_own ON user_profiles FOR UPDATE
    USING (owns_profile(id) OR is_super_admin());
END $$;

-- Delete: only super_admin
DO $$ BEGIN DROP POLICY IF EXISTS profiles_delete ON user_profiles;
  CREATE POLICY profiles_delete ON user_profiles FOR DELETE USING (is_super_admin());
END $$;

-- ═══════════════════════════════════════════════════════════════════
--  SEED DATA — Départements et Positions
-- ═══════════════════════════════════════════════════════════════════

-- Départements
INSERT INTO departments (name, slug, description, icon_name, accent_color, sort_order) VALUES
  ('Louange', 'louange', 'Département de louange et adoration musicale', 'Music', 'gold', 1),
  ('Médias', 'medias', 'Département audiovisuel, photo, vidéo et réseaux sociaux', 'Globe', 'ember', 2),
  ('Intercession', 'intercession', 'Département de prière et intercession', 'Heart', 'gold', 3),
  ('Accueil', 'accueil', 'Équipe d''accueil et intégration des visiteurs', 'Users', 'gold', 4),
  ('Enfants', 'enfants', 'École du dimanche et activités pour enfants', 'Sparkles', 'ember', 5),
  ('Jeunesse', 'jeunesse', 'Ministère des jeunes et des adolescents', 'Flame', 'gold', 6),
  ('Étude Biblique', 'etude-biblique', 'Étude approfondie de la Parole de Dieu', 'BookOpen', 'gold', 7),
  ('Diakonia', 'diakonia', 'Service social, assistance et entraide communautaire', 'HandHeart', 'ember', 8)
ON CONFLICT (slug) DO NOTHING;

-- Positions par département
INSERT INTO positions (department_id, name, sort_order)
SELECT id, 'Chantre', 1 FROM departments WHERE slug = 'louange'
UNION ALL
SELECT id, 'Musicien', 2 FROM departments WHERE slug = 'louange'
UNION ALL
SELECT id, 'Chef de choeur', 3 FROM departments WHERE slug = 'louange'
UNION ALL
SELECT id, 'Cadreur', 1 FROM departments WHERE slug = 'medias'
UNION ALL
SELECT id, 'Photographe', 2 FROM departments WHERE slug = 'medias'
UNION ALL
SELECT id, 'Rédacteur', 3 FROM departments WHERE slug = 'medias'
UNION ALL
SELECT id, 'Intercesseur', 1 FROM departments WHERE slug = 'intercession'
UNION ALL
SELECT id, 'Coordinateur', 2 FROM departments WHERE slug = 'intercession'
UNION ALL
SELECT id, 'Hôte d''accueil', 1 FROM departments WHERE slug = 'accueil'
UNION ALL
SELECT id, 'Suivi intégration', 2 FROM departments WHERE slug = 'accueil'
UNION ALL
SELECT id, 'Moniteur', 1 FROM departments WHERE slug = 'enfants'
UNION ALL
SELECT id, 'Animateur', 2 FROM departments WHERE slug = 'enfants'
UNION ALL
SELECT id, 'Responsable jeunesse', 1 FROM departments WHERE slug = 'jeunesse'
UNION ALL
SELECT id, 'Animateur jeunesse', 2 FROM departments WHERE slug = 'jeunesse'
UNION ALL
SELECT id, 'Enseignant', 1 FROM departments WHERE slug = 'etude-biblique'
UNION ALL
SELECT id, 'Facilitateur', 2 FROM departments WHERE slug = 'etude-biblique'
UNION ALL
SELECT id, 'Responsable', 1 FROM departments WHERE slug = 'diakonia'
UNION ALL
SELECT id, 'Bénévole', 2 FROM departments WHERE slug = 'diakonia';

-- Créer les préférences de notification pour l'admin existant
INSERT INTO notification_preferences (user_id)
SELECT id FROM user_profiles WHERE email = 'aimeonginfo@gmail.com'
ON CONFLICT DO NOTHING;

-- ─── Index pour la performance ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dept_members_user ON department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_dept ON department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_prayer_status ON prayer_requests(status);
CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);
CREATE INDEX IF NOT EXISTS idx_daily_thoughts_published ON daily_thoughts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_plannings_date ON service_plannings(service_date);
CREATE INDEX IF NOT EXISTS idx_dept_posts_dept ON department_posts(department_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_status ON visitor_followups(status);

-- ═══════════════════════════════════════════════════════════════════
--  TRIGGER: auto-create notification_preferences on signup
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auto_create_notif_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_notif ON auth.users;
CREATE TRIGGER on_auth_user_created_notif
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auto_create_notif_prefs();

-- ═══════════════════════════════════════════════════════════════════
--  Done!
-- ═══════════════════════════════════════════════════════════════════