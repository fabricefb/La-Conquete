-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE DÉPARTEMENTS — Église Évangélique La Conquête
-- Tables: departments (enrichie), positions, department_members
-- RLS strict, triggers, index
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Enrichir la table departments si elle existe ─────────────────
DO $$
BEGIN
  -- Ajouter les colonnes manquantes à departments si la table existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments' AND table_schema = 'public') THEN
    -- meeting_schedule
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'meeting_schedule') THEN
      ALTER TABLE departments ADD COLUMN meeting_schedule TEXT;
    END IF;
    -- mission
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'mission') THEN
      ALTER TABLE departments ADD COLUMN mission TEXT;
    END IF;
    -- activities
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'activities') THEN
      ALTER TABLE departments ADD COLUMN activities TEXT;
    END IF;
    -- requirements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'requirements') THEN
      ALTER TABLE departments ADD COLUMN requirements TEXT;
    END IF;
    -- image_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'image_url') THEN
      ALTER TABLE departments ADD COLUMN image_url TEXT;
    END IF;
    -- leader_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'leader_id') THEN
      ALTER TABLE departments ADD COLUMN leader_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
    END IF;
    -- member_count (cache)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'member_count') THEN
      ALTER TABLE departments ADD COLUMN member_count INTEGER DEFAULT 0;
    END IF;
    RAISE NOTICE 'Table departments enrichie avec succès';
  ELSE
    -- Créer la table departments complète si elle n'existe pas
    CREATE TABLE IF NOT EXISTS departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      icon_name TEXT DEFAULT 'Users',
      accent_color TEXT DEFAULT 'gold',
      meeting_schedule TEXT,
      mission TEXT,
      activities TEXT,
      requirements TEXT,
      image_url TEXT,
      leader_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
      member_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      extension_id UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Index pour le tri
    CREATE INDEX IF NOT EXISTS idx_departments_sort ON departments(sort_order);
    CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_departments_extension ON departments(extension_id) WHERE extension_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_departments_slug ON departments(slug);

    RAISE NOTICE 'Table departments créée avec succès';
  END IF;
END $$;

-- ─── 2. Table positions (rôles au sein d'un département) ────────────
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department_id, name)
);

CREATE INDEX IF NOT EXISTS idx_positions_dept ON positions(department_id);
CREATE INDEX IF NOT EXISTS idx_positions_active ON positions(department_id, is_active) WHERE is_active = true;

-- ─── 3. Table department_members ────────────────────────────────────
CREATE TABLE IF NOT EXISTS department_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  role_in_dept TEXT NOT NULL DEFAULT 'member' CHECK (role_in_dept IN ('pending','member','leader')),
  is_primary BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_dept_members_user ON department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_dept ON department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_active ON department_members(department_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dept_members_role ON department_members(user_id, department_id, is_active);

-- ═══════════════════════════════════════════════════════════════════════
-- RLS POLICIES — Departments
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;

-- ─── Departments RLS ───────────────────────────────────────────────
-- Tout le monde peut lire les départements actifs
DROP POLICY IF EXISTS departments_public_read ON departments;
CREATE POLICY departments_public_read ON departments
  FOR SELECT USING (is_active = true);

-- Les membres du département peuvent lire leur département (même inactif)
DROP POLICY IF EXISTS departments_member_read ON departments;
CREATE POLICY departments_member_read ON departments
  FOR SELECT USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM department_members dm
      WHERE dm.department_id = departments.id
        AND dm.user_id = auth.uid()
        AND dm.is_active = true
    )
  );

-- Admin et pasteurs peuvent tout voir
DROP POLICY IF EXISTS departments_admin_read ON departments;
CREATE POLICY departments_admin_read ON departments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin = true OR up.role_level >= 5)
    )
  );

-- Seuls admin/pasteurs peuvent créer, modifier, supprimer
DROP POLICY IF EXISTS departments_admin_insert ON departments;
CREATE POLICY departments_admin_insert ON departments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin = true OR up.role_level >= 5)
    )
  );

DROP POLICY IF EXISTS departments_admin_update ON departments;
CREATE POLICY departments_admin_update ON departments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin = true OR up.role_level >= 5)
    )
  );

DROP POLICY IF EXISTS departments_admin_delete ON departments;
CREATE POLICY departments_admin_delete ON departments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin = true OR up.role_level >= 5)
    )
  );

-- ─── Positions RLS ──────────────────────────────────────────────────
-- Tout le monde peut lire les positions des départements actifs
DROP POLICY IF EXISTS positions_public_read ON positions;
CREATE POLICY positions_public_read ON positions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM departments d
      WHERE d.id = positions.department_id AND d.is_active = true
    )
  );

-- Admin/pasteurs CRUD complet
DROP POLICY IF EXISTS positions_admin_all ON positions;
CREATE POLICY positions_admin_all ON positions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin = true OR up.role_level >= 5)
    )
  );

-- Chef de département peut gérer les positions de son département
DROP POLICY IF EXISTS positions_leader_manage ON positions;
CREATE POLICY positions_leader_manage ON positions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM department_members dm
      WHERE dm.department_id = positions.department_id
        AND dm.user_id = auth.uid()
        AND dm.role_in_dept = 'leader'
        AND dm.is_active = true
    )
  );
CREATE POLICY positions_leader_update ON positions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM department_members dm
      WHERE dm.department_id = positions.department_id
        AND dm.user_id = auth.uid()
        AND dm.role_in_dept = 'leader'
        AND dm.is_active = true
    )
  );

-- ─── Department Members RLS ─────────────────────────────────────────
-- Chacun peut voir les membres des départements actifs
DROP POLICY IF EXISTS dept_members_public_read ON department_members;
CREATE POLICY dept_members_public_read ON department_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM departments d
      WHERE d.id = department_members.department_id AND d.is_active = true
    )
  );

-- Un utilisateur peut voir sa propre appartenance
DROP POLICY IF EXISTS dept_members_self_read ON department_members;
CREATE POLICY dept_members_self_read ON department_members
  FOR SELECT USING (user_id = auth.uid());

-- Un utilisateur peut demander à rejoindre (insert avec role_in_dept = 'pending')
DROP POLICY IF EXISTS dept_members_self_join ON department_members;
CREATE POLICY dept_members_self_join ON department_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin/pasteurs peuvent tout gérer
DROP POLICY IF EXISTS dept_members_admin_all ON department_members;
CREATE POLICY dept_members_admin_all ON department_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin = true OR up.role_level >= 5)
    )
  );

-- Chef de département peut voir/modifier les membres de son département
DROP POLICY IF EXISTS dept_members_leader_read ON department_members;
CREATE POLICY dept_members_leader_read ON department_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM department_members dm2
      WHERE dm2.department_id = department_members.department_id
        AND dm2.user_id = auth.uid()
        AND dm2.role_in_dept = 'leader'
        AND dm2.is_active = true
    )
  );

DROP POLICY IF EXISTS dept_members_leader_update ON department_members;
CREATE POLICY dept_members_leader_update ON department_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM department_members dm2
      WHERE dm2.department_id = department_members.department_id
        AND dm2.user_id = auth.uid()
        AND dm2.role_in_dept = 'leader'
        AND dm2.is_active = true
    )
  );

-- Un utilisateur peut se retirer d'un département (delete sa propre ligne)
DROP POLICY IF EXISTS dept_members_self_leave ON department_members;
CREATE POLICY dept_members_self_leave ON department_members
  FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════

-- Trigger: mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_positions_updated_at ON positions;
CREATE TRIGGER trg_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: recaler le member_count sur la table departments
CREATE OR REPLACE FUNCTION refresh_department_member_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Après insert/delete/update sur department_members
  IF TG_OP = 'DELETE' THEN
    UPDATE departments SET member_count =
      (SELECT count(*) FROM department_members dm WHERE dm.department_id = COALESCE(OLD.department_id, NEW.department_id) AND dm.is_active = true AND dm.role_in_dept != 'pending')
    WHERE id = COALESCE(OLD.department_id, NEW.department_id);
    RETURN OLD;
  ELSE
    UPDATE departments SET member_count =
      (SELECT count(*) FROM department_members dm WHERE dm.department_id = NEW.department_id AND dm.is_active = true AND dm.role_in_dept != 'pending')
    WHERE id = NEW.department_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_member_count ON department_members;
CREATE TRIGGER trg_refresh_member_count
  AFTER INSERT OR DELETE OR UPDATE OF is_active, role_in_dept ON department_members
  FOR EACH ROW EXECUTE FUNCTION refresh_department_member_count();

-- Trigger: auto-slug à la création d'un département
CREATE OR REPLACE FUNCTION slugify_dept_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Nettoyer les tirets en début/fin et les doubler
    NEW.slug = regexp_replace(NEW.slug, '(^-|-$)', '', 'g');
    NEW.slug = regexp_replace(NEW.slug, '-{2,}', '-', 'g');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dept_auto_slug ON departments;
CREATE TRIGGER trg_dept_auto_slug
  BEFORE INSERT ON departments
  FOR EACH ROW EXECUTE FUNCTION slugify_dept_name();

-- ═══════════════════════════════════════════════════════════════════════
-- DONNÉES INITIALES (optionnel — exemples de départements)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO departments (name, slug, description, icon_name, accent_color, meeting_schedule, mission, activities, requirements, sort_order) VALUES
  ('Évangélisation', 'evangelisation', 'Porter la Bonne Nouvelle aux nations, faire des disciples et équiper les saints pour l''œuvre du ministère.', 'Compass', 'gold', 'Samedi à 07h00', 'Atteindre chaque quartier avec l''Évangile, former des évangélistes et assurer le suivi des nouveaux convertis.', 'Sorties d''évangélisation hebdomadaires, distribution de Bibles et tracts, visites domiciliaires, campagnes de masse.', 'Être membre actif, avoir suivi les cours de baptême.', 1),
  ('Louange & Adoration', 'louange-adoration', 'Élever le nom de Jésus à travers la musique, les chants et la danse pour la gloire de Dieu.', 'Music', 'ember', 'Mercredi à 17h00', 'Créer une atmosphère de louange qui invite la présence de Dieu lors de chaque culte.', 'Répétitions hebdomadaires, composition de chants, formations musicales, accompagnement des cultes.', 'Avoir un talent musical ou vocal, être ponctuel aux répétitions.', 2),
  ('Intercession', 'intercession', 'Porter les fardeaux dans la prière, intercéder pour l''église, la communauté et les nations.', 'Heart', 'gold', 'Mardi à 18h00', 'Être un rempart spirituel par la prière fervente et persévérante.', 'Veillées de prière, chaînes de jeûne et prière, intercession pour les malades et les besoins de l''église.', 'Avoir une vie de prière personnelle établie, être disponible pour les veillées.', 3),
  ('Diaconie', 'diaconie', 'Servir les membres dans leurs besoins pratiques, organiser l''entraide et la solidarité.', 'HandHeart', 'ember', 'Vendredi à 16h00', 'Incarner l''amour du Christ par un service pratique et désintéressé envers les membres et la communauté.', 'Visites aux malades et prisonniers, aide aux nécessiteux, organisation de repas communautaires.', 'Avoir un cœur de serviteur, être disponible et discret.', 4),
  ('École du Dimanche', 'ecole-du-dimanche', 'Enseigner la Parole de Dieu aux enfants et aux nouveaux convertis de manière structurée.', 'GraduationCap', 'gold', 'Dimanche à 08h00', 'Former des disciples fondés sur la Parole, depuis le plus jeune âge.', 'Cours bibliques par tranches d''âge, matériel pédagogique, activités ludiques, évaluation trimestrielle.', 'Aimer les enfants, avoir des connaissances bibliques de base.', 5),
  ('Multimédia', 'multimedia', 'Gérer les outils technologiques et numériques pour amplifier la portée de l''Évangile.', 'Mic', 'ember', 'Samedi à 10h00', 'Utiliser la technologie comme outil au service de l''évangélisation et de l''édification de l''église.', 'Son et lumière lors des cultes, streaming en ligne, réseaux sociaux, montage vidéo, photographie.', 'Avoir des compétences techniques en audio/vidéo/informatique, être ponctuel et fiable.', 6)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- RÉCAPITULATIF
-- ═══════════════════════════════════════════════════════════════════════
-- Tables créées/enrichies : departments, positions, department_members
-- RLS activé sur les 3 tables avec politiques granulaires
-- Triggers : updated_at auto, member_count auto, slug auto
-- 6 départements exemples insérés
-- ═══════════════════════════════════════════════════════════════════════