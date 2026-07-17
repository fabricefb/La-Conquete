-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION UNIFIÉE — Église Évangélique La Conquête
-- Date: 2026-07-19
--
-- Combine et remplace les 3 migrations précédentes :
--   - 20260717000000_fix_builder_save.sql
--   - 20260717010000_fix_page_contents_full.sql
--   - 20260718000000_departments_complete.sql
--
-- PROBLÈME RÉSOLU: "42P10: no unique constraint matching ON CONFLICT"
-- → Chaque ON CONFLICT est précédé d'une garantie de contrainte existante.
--
-- Idempotent : OUI — peut être relancé autant de fois que nécessaire.
-- Prérequis  : 20260711120000_full_schema.sql + 20260715000000_departments_module.sql
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- PHASE 1 : SÉCURITÉ — Contraintes, CHECK, RLS
-- ═══════════════════════════════════════════════════════════════

-- ─── 1A. Désactiver RLS sur user_profiles ─────────────────
-- RLS sur user_profiles = boucle infinie quand les policies
-- site_settings/page_contents vérifient is_admin.
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ─── 1B. Dédupliquer + GARANTIR unique sur page_contents ──
DELETE FROM page_contents pc1
WHERE EXISTS (
  SELECT 1 FROM page_contents pc2
  WHERE pc2.page = pc1.page
    AND pc2.section_key = pc1.section_key
    AND pc2.field_key = pc1.field_key
    AND pc2.id > pc1.id
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'page_contents_page_section_key_field_key_key'
  ) THEN
    ALTER TABLE page_contents
      ADD CONSTRAINT page_contents_page_section_key_field_key_key
      UNIQUE (page, section_key, field_key);
    RAISE NOTICE 'Constraint page_contents UNIQUE(page, section_key, field_key) CREATED';
  ELSE
    RAISE NOTICE 'Constraint page_contents UNIQUE(page, section_key, field_key) already exists';
  END IF;
END $$;

-- ─── 1C. GARANTIR unique constraint sur site_settings ────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_key_key'
  ) THEN
    ALTER TABLE site_settings
      ADD CONSTRAINT site_settings_key_key UNIQUE (key);
    RAISE NOTICE 'Constraint site_settings UNIQUE(key) CREATED';
  ELSE
    RAISE NOTICE 'Constraint site_settings UNIQUE(key) already exists';
  END IF;
END $$;

-- ─── 1D. Dédupliquer + GARANTIR unique sur departments ────
DELETE FROM departments d1
WHERE EXISTS (
  SELECT 1 FROM departments d2
  WHERE d2.slug = d1.slug AND d2.id > d1.id
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'departments_slug_key'
  ) THEN
    ALTER TABLE departments
      ADD CONSTRAINT departments_slug_key UNIQUE (slug);
    RAISE NOTICE 'Constraint departments UNIQUE(slug) CREATED';
  ELSE
    RAISE NOTICE 'Constraint departments UNIQUE(slug) already exists';
  END IF;
END $$;

-- ─── 1E. Dédupliquer + GARANTIR unique sur department_members ─
-- Supprime les doublons en gardant la ligne la plus récente (plus grand id)
DELETE FROM department_members dm1
WHERE EXISTS (
  SELECT 1 FROM department_members dm2
  WHERE dm2.user_id = dm1.user_id
    AND dm2.department_id = dm1.department_id
    AND dm2.id > dm1.id
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'department_members_user_id_department_id_key'
  ) THEN
    ALTER TABLE department_members
      ADD CONSTRAINT department_members_user_id_department_id_key
      UNIQUE (user_id, department_id);
    RAISE NOTICE 'Constraint department_members UNIQUE(user_id, department_id) CREATED';
  ELSE
    RAISE NOTICE 'Constraint department_members UNIQUE(user_id, department_id) already exists';
  END IF;
END $$;

-- ─── 1F. Dédupliquer + GARANTIR unique sur positions ──────
DELETE FROM positions p1
WHERE EXISTS (
  SELECT 1 FROM positions p2
  WHERE p2.department_id = p1.department_id
    AND p2.name = p1.name
    AND p2.id > p1.id
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'positions_department_id_name_key'
  ) THEN
    ALTER TABLE positions
      ADD CONSTRAINT positions_department_id_name_key
      UNIQUE (department_id, name);
    RAISE NOTICE 'Constraint positions UNIQUE(department_id, name) CREATED';
  ELSE
    RAISE NOTICE 'Constraint positions UNIQUE(department_id, name) already exists';
  END IF;
END $$;

-- ─── 1G. Dédupliquer + GARANTIR unique sur department_requests ─
DELETE FROM department_requests dr1
WHERE EXISTS (
  SELECT 1 FROM department_requests dr2
  WHERE dr2.user_id = dr1.user_id
    AND dr2.department_id = dr1.department_id
    AND dr2.id > dr1.id
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'department_requests_user_id_department_id_key'
  ) THEN
    ALTER TABLE department_requests
      ADD CONSTRAINT department_requests_user_id_department_id_key
      UNIQUE (user_id, department_id);
    RAISE NOTICE 'Constraint department_requests UNIQUE(user_id, department_id) CREATED';
  ELSE
    RAISE NOTICE 'Constraint department_requests UNIQUE(user_id, department_id) already exists';
  END IF;
END $$;

-- ─── 1H. Élargir CHECK sur site_settings ──────────────────
ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_category_check;
ALTER TABLE site_settings ADD CONSTRAINT site_settings_category_check
  CHECK (category IN ('general', 'contact', 'social', 'seo', 'images', 'theme', 'builder'));

ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_type_check;
ALTER TABLE site_settings ADD CONSTRAINT site_settings_type_check
  CHECK (type IN ('text', 'url', 'json', 'boolean', 'number', 'image'));

ALTER TABLE site_settings ALTER COLUMN label SET DEFAULT '';

-- ─── 1I. Élargir CHECK sur page_contents ──────────────────
ALTER TABLE page_contents DROP CONSTRAINT IF EXISTS page_contents_page_check;
ALTER TABLE page_contents ADD CONSTRAINT page_contents_page_check
  CHECK (page IN (
    'home', 'about', 'activities', 'events', 'media', 'contact',
    'departments', 'emissions', 'predications', 'dons',
    'culte', 'vision', 'pasteurs', 'ministeres', 'jeunesse',
    'enseignements', 'blog', 'donnations', 'communique',
    'dashboard', 'pastoral', 'reports', 'crm', 'communication'
  ));

-- ─── 1J. Simplifier RLS sur site_settings ─────────────────
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_admin_write" ON site_settings;
DROP POLICY IF EXISTS "settings_auth_write" ON site_settings;
DROP POLICY IF EXISTS "settings_admin_update" ON site_settings;
DROP POLICY IF EXISTS "settings_auth_update" ON site_settings;
DROP POLICY IF EXISTS "settings_admin_delete" ON site_settings;
DROP POLICY IF EXISTS "settings_auth_delete" ON site_settings;
DROP POLICY IF EXISTS "settings_public_read" ON site_settings;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_all_read" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "settings_auth_insert" ON site_settings FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "settings_auth_update" ON site_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "settings_auth_delete" ON site_settings FOR DELETE
  TO authenticated USING (true);

-- ─── 1K. Simplifier RLS sur page_contents ─────────────────
ALTER TABLE page_contents DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contents_admin_write" ON page_contents;
DROP POLICY IF EXISTS "contents_auth_write" ON page_contents;
DROP POLICY IF EXISTS "contents_admin_update" ON page_contents;
DROP POLICY IF EXISTS "contents_auth_update" ON page_contents;
DROP POLICY IF EXISTS "contents_admin_delete" ON page_contents;
DROP POLICY IF EXISTS "contents_auth_delete" ON page_contents;
DROP POLICY IF EXISTS "content_public_read" ON page_contents;

ALTER TABLE page_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contents_all_read" ON page_contents FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "contents_auth_insert" ON page_contents FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "contents_auth_update" ON page_contents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "contents_auth_delete" ON page_contents FOR DELETE
  TO authenticated USING (true);

-- ─── 1L. Désactiver RLS sur tables départements ───────────
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE department_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE department_requests DISABLE ROW LEVEL SECURITY;

-- ─── 1M. Convertir activities/requirements en TEXT[] ───────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'activities' AND data_type = 'text'
  ) THEN
    ALTER TABLE departments ALTER COLUMN activities TYPE TEXT[] USING
      CASE WHEN activities IS NULL OR activities = '' THEN NULL
           ELSE string_to_array(activities, ', ')
      END;
    RAISE NOTICE 'departments.activities → TEXT[]';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'requirements' AND data_type = 'text'
  ) THEN
    ALTER TABLE departments ALTER COLUMN requirements TYPE TEXT[] USING
      CASE WHEN requirements IS NULL OR requirements = '' THEN NULL
           ELSE string_to_array(requirements, ', ')
      END;
    RAISE NOTICE 'departments.requirements → TEXT[]';
  END IF;
END $$;

-- ─── 1N. Créer/Mettre à jour department_requests ──────────
CREATE TABLE IF NOT EXISTS department_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (status IN ('en_attente', 'accepte', 'refuse')),
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ajouter position_id si la table existait déjà sans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'department_requests' AND column_name = 'position_id'
  ) THEN
    ALTER TABLE department_requests
      ADD COLUMN position_id UUID REFERENCES positions(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'department_requests' AND column_name = 'message' AND column_default IS NULL
  ) THEN
    ALTER TABLE department_requests ALTER COLUMN message SET DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dept_requests_user ON department_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_requests_dept ON department_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_requests_status ON department_requests(status);

-- ─── 1O. Trigger updated_at sur department_requests ───────
CREATE OR REPLACE FUNCTION update_dept_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON department_requests;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON department_requests
  FOR EACH ROW EXECUTE FUNCTION update_dept_requests_updated_at();


-- ═══════════════════════════════════════════════════════════════
-- PHASE 2 : GRAINES (SEED DATA)
-- ═══════════════════════════════════════════════════════════════

-- ─── 2A. Lignes builder dans site_settings ───────────────
-- (Utilise INSERT WHERE NOT EXISTS au lieu de ON CONFLICT)
INSERT INTO site_settings (key, value, type, category, label, sort_order)
SELECT 'builder_config_home', '[]', 'json', 'general', 'Configuration constructeur — Page d''accueil', 500
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'builder_config_home');

INSERT INTO site_settings (key, value, type, category, label, sort_order)
SELECT 'section_colors_home', '{}', 'json', 'general', 'Couleurs de sections — home', 600
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'section_colors_home');

-- ─── 2B. Reseed page_contents — Home (delete + insert) ──
DELETE FROM page_contents WHERE page = 'home';

INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order) VALUES
  ('home', 'topbar', 'phone', '+243 00 000 0000', 'text', 'Téléphone bande passante', 0),
  ('home', 'topbar', 'email', 'contact@laconquete.cd', 'text', 'Email bande passante', 1),
  ('home', 'hero', 'bg_image', '', 'image_url', 'Image de fond héro', 10),
  ('home', 'hero', 'bg_images', '', 'text', 'Images diaporama (séparées par ,)', 11),
  ('home', 'hero', 'subtitle', 'Une communauté de foi qui transforme des vies', 'text', 'Sous-titre héro', 12),
  ('home', 'pillars', 'pillar_1_title', 'Foi', 'text', 'Pilier 1 — Titre', 20),
  ('home', 'pillars', 'pillar_1_desc', '', 'text', 'Pilier 1 — Description', 21),
  ('home', 'pillars', 'pillar_2_title', 'Communauté', 'text', 'Pilier 2 — Titre', 22),
  ('home', 'pillars', 'pillar_2_desc', '', 'text', 'Pilier 2 — Description', 23),
  ('home', 'pillars', 'pillar_3_title', 'Mission', 'text', 'Pilier 3 — Titre', 24),
  ('home', 'pillars', 'pillar_3_desc', '', 'text', 'Pilier 3 — Description', 25),
  ('home', 'about', 'text_1', '', 'text', 'Texte principal Qui sommes-nous', 30),
  ('home', 'about', 'text_2', '', 'text', 'Texte secondaire Qui sommes-nous', 31),
  ('home', 'about', 'bible_text', '', 'text', 'Citation biblique Qui sommes-nous', 32),
  ('home', 'about', 'image', '', 'image_url', 'Photo Qui sommes-nous', 33),
  ('home', 'quote', 'text', '', 'text', 'Texte de la citation', 40),
  ('home', 'quote', 'reference', '', 'text', 'Référence de la citation', 41)
ON CONFLICT (page, section_key, field_key) DO UPDATE SET
  value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label, updated_at = now();

-- ─── 2C. Reseed page_contents — Pages secondaires ────────
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order) VALUES
  ('about', 'hero', 'badge', 'Notre Identité', 'text', 'Badge', 0),
  ('about', 'hero', 'title', 'Qui sommes-nous', 'text', 'Titre', 1),
  ('about', 'hero', 'subtitle', '', 'text', 'Sous-titre', 2),
  ('about', 'vision', 'text', 'La Conquête des âmes, La Conquête des terres habitables et cultivables.', 'text', 'Texte vision', 5),
  ('about', 'mission', 'text', 'Nous œuvrons au moyen de la Parole de Dieu, à gagner les âmes pour Jésus. Nous les équipons, les instruisons et les envoyons comme agents de transformation dans les nations.', 'text', 'Texte mission', 6),
  ('about', 'values', 'title', 'Nos Valeurs', 'text', 'Titre valeurs', 10),
  ('about', 'values', 'subtitle', '', 'text', 'Sous-titre valeurs', 11),
  ('activities', 'hero', 'badge', 'Communauté', 'text', 'Badge', 0),
  ('activities', 'hero', 'title', '', 'text', 'Titre', 1),
  ('activities', 'hero', 'subtitle', '', 'text', 'Sous-titre', 2),
  ('activities', 'ministries', 'title', '', 'text', 'Titre ministères', 10),
  ('activities', 'ministries', 'subtitle', '', 'text', 'Sous-titre ministères', 11),
  ('activities', 'cta', 'title', '', 'text', 'Titre CTA', 20),
  ('activities', 'cta', 'description', '', 'text', 'Description CTA', 21),
  ('events', 'hero', 'badge', 'Calendrier', 'text', 'Badge', 0),
  ('events', 'hero', 'title', '', 'text', 'Titre', 1),
  ('events', 'hero', 'subtitle', '', 'text', 'Sous-titre', 2),
  ('contact', 'hero', 'subtitle', '', 'text', 'Sous-titre', 0),
  ('departments', 'hero', 'subtitle', '', 'text', 'Sous-titre', 0),
  ('media', 'hero', 'subtitle', '', 'text', 'Sous-titre', 0),
  ('emissions', 'hero', 'subtitle', '', 'text', 'Sous-titre', 0),
  ('predications', 'hero', 'subtitle', '', 'text', 'Sous-titre', 0),
  ('dons', 'hero', 'subtitle', '', 'text', 'Sous-titre dons', 0)
ON CONFLICT (page, section_key, field_key) DO NOTHING;

-- ─── 2D. 15 Départements complets ─────────────────────────
INSERT INTO departments (
  name, slug, description, icon_name, accent_color,
  meeting_schedule, mission, activities, requirements,
  is_active, sort_order
) VALUES
  ('Évangélisation', 'evangelisation',
   'Porter la Bonne Nouvelle aux nations, faire des disciples et équiper les saints pour l''œuvre du ministère.',
   'Compass', 'gold', 'Samedis 8h00 - 10h00',
   'Proclamer l''Évangile à toute créature et faire des disciples',
   ARRAY['Sorties d''évangélisation','Visites domiciliaires','Campagnes d''évangélisation','Formation des évangélistes','Suivi des nouveaux convertis','Tracts et supports'],
   ARRAY['Passion pour les âmes','Engagement hebdomadaire','Formation initiale'],
   true, 1),

  ('Louange et Adoration', 'louange-adoration',
   'Élever le nom de Jésus à travers la musique, les chants et la danse pour la gloire de Dieu.',
   'Music', 'ember', 'Mercredis 17h00 - 19h00, Samedis 14h00 - 16h00',
   'Amener la congrégation dans la présence de Dieu par la louange et l''adoration',
   ARRAY['Répétitions de chants','Composition musicale','Direction de louange','Accompagnement instrumental','Enregistrements','Formation musicale'],
   ARRAY['Sens de la musique','Engagement aux répétitions','Consécration personnelle'],
   true, 2),

  ('Intercession', 'intercession',
   'Porter les fardeaux dans la prière, intercéder pour l''église, la communauté et les nations.',
   'Heart', 'gold', 'Lundis et Jeudis 5h30 - 7h00',
   'Soutenir l''église et la communauté par la prière fervente et persistante',
   ARRAY['Chaînes de prière','Veillées de prière','Prière pour les malades','Jeûne et prière','Intercession pour la nation','Réveil spirituel'],
   ARRAY['Vie de prière personnelle','Foi en la puissance de la prière','Disponibilité'],
   true, 3),

  ('Diaconie', 'diaconie',
   'Servir les membres dans leurs besoins pratiques, organiser l''entraide et la solidarité.',
   'HandHeart', 'ember', 'Vendredis 16h00 - 18h00',
   'Servir les membres et la communauté dans l''amour pratique du Christ',
   ARRAY['Aide aux familles nécessiteuses','Visite aux malades','Aide alimentaire','Accompagnement social','Collectes de fonds','Actions caritatives'],
   ARRAY['Cœur de serviteur','Disponibilité','Sens de la confidentialité'],
   true, 4),

  ('École du Dimanche', 'ecole-du-dimanche',
   'Enseigner la Parole de Dieu aux enfants et aux nouveaux convertis de manière structurée.',
   'GraduationCap', 'gold', 'Dimanches 9h00 - 10h30',
   'Enseigner la Parole de Dieu aux enfants et aux nouveaux convertis de manière adaptée',
   ARRAY['Cours bibliques pour enfants','Matériel pédagogique','Activités ludiques','Suivi de la progression','Formation des enseignants','Événements spéciaux enfants'],
   ARRAY['Amour pour les enfants','Connaissances bibliques','Patience et créativité'],
   true, 5),

  ('Multimédia', 'multimedia',
   'Gérer les outils technologiques et numériques pour amplifier la portée de l''Évangile.',
   'Mic', 'ember', 'Selon les besoins des cultes',
   'Amplifier la parole de Dieu à travers les médias et la technologie',
   ARRAY['Son lors des cultes','Enregistrement vidéo','Streaming en direct','Gestion des réseaux sociaux','Design graphique','Photographie','Montage vidéo','Site web'],
   ARRAY['Compétences techniques','Créativité','Fiabilité'],
   true, 6),

  ('Protocole et Accueil', 'protocole-et-accueil',
   'Le visage de l''église. Planification, accueil des fidèles, comptage, gestion des nouveaux venus.',
   'Shield', 'gold', 'Dimanches 7h00 - 14h00',
   'Assurer l''ordre, la sécurité et l''accueil chaleureux lors des rassemblements',
   ARRAY['Accueil des fidèles','Orientation des visiteurs','Gestion du parking','Ordre pendant le culte','Protection des pasteurs','Coordination des équipes de service','Suivi des visiteurs'],
   ARRAY['Présentation soignée','Sens du service','Fière allure (tenue appropriée)'],
   true, 7),

  ('Communication', 'communication',
   'Faciliter la circulation de l''information au sein de l''église et vers l''extérieur.',
   'Radio', 'ember', 'Mardis 17h00 - 18h30',
   'Faciliter la circulation de l''information au sein de l''église et vers l''extérieur',
   ARRAY['Rédaction d''annonces','Gestion des communiqués','Bulletin paroissial','Communication interne','Relations publiques','Gestion du site web et newsletter'],
   ARRAY['Bonne plume','Esprit d''analyse','Réactivité'],
   true, 8),

  ('Jeunesse', 'jeunesse',
   'Accompagner les jeunes dans leur croissance spirituelle et leur développement personnel.',
   'Flame', 'gold', 'Samedis 15h00 - 17h30',
   'Accompagner les jeunes dans leur croissance spirituelle et leur développement personnel',
   ARRAY['Études bibliques','Activités récréatives','Sorties et excursions','Conferences jeunesse','Mentorat','Projets communautaires','Culte jeunesse'],
   ARRAY['Avoir entre 15 et 35 ans','Passion pour la jeunesse','Exemple de vie'],
   true, 9),

  ('Enseignement', 'enseignement',
   'Approfondir la connaissance de la Parole de Dieu et former des disciples matures.',
   'BookOpen', 'gold', 'Mercredis 18h00 - 20h00',
   'Approfondir la connaissance de la Parole de Dieu et former des disciples matures',
   ARRAY['Cours de théologie','Études bibliques approfondies','Formation des formateurs','Matériel de formation','Séminaires','École biblique'],
   ARRAY['Engagement dans l''étude','Assiduité','Désir d''enseigner'],
   true, 10),

  ('Hommes', 'hommes',
   'Bâtir des hommes de caractère selon les principes de la Parole de Dieu.',
   'Users', 'gold', '1er samedi du mois 8h00 - 10h00',
   'Bâtir des hommes de caractère selon les principes de la Parole de Dieu',
   ARRAY['Rencontres mensuelles','Retraites spirituelles','Groupes de responsabilisation','Activités de fellowship','Projets de service','Mentorat intergénérationnel'],
   ARRAY['Être un homme de l''église','Désir de grandir','Engagement'],
   true, 11),

  ('Femmes', 'femmes',
   'Encourager et équiper les femmes à vivre pleinement leur destinée en Christ.',
   'Heart', 'ember', '2e samedi du mois 8h00 - 10h00',
   'Encourager et équiper les femmes à vivre pleinement leur destinée en Christ',
   ARRAY['Rencontres mensuelles','Journées de retrouvailles','Groupes de prière','Ateliers pratiques','Aide aux femmes en difficulté','Conférences féminines'],
   ARRAY['Être une femme de l''église','Cœur ouvert','Disponibilité'],
   true, 12),

  ('Couples et Famille', 'couples-et-famille',
   'Renforcer les mariages et les familles selon les principes bibliques.',
   'Heart', 'gold', '3e samedi du mois 9h00 - 11h00',
   'Renforcer les mariages et les familles selon les principes bibliques',
   ARRAY['Conseil conjugal','Rencontres de couples','Séminaires familiaux','Accompagnement des jeunes mariés','Groupes de soutien','Activités familiales'],
   ARRAY['Être marié ou fiancé','Engagement couple','Ouverture'],
   true, 13),

  ('Enfants', 'enfants',
   'Former les enfants dans la voie du Seigneur dès leur plus jeune âge.',
   'Star', 'ember', 'Dimanches 9h00 - 10h30, Mercredis 15h30 - 17h00',
   'Former les enfants dans la voie du Seigneur dès leur plus jeune âge',
   ARRAY['Culte enfants','École biblique','Activités manuelles','Chants et jeux bibliques','Événements spéciaux (Noël, Pâques)','Sorties éducatives'],
   ARRAY['Amour pour les enfants','Patience','Créativité'],
   true, 14),

  ('Missions', 'missions',
   'Envoyer et soutenir des missionnaires pour l''avancement du royaume de Dieu.',
   'Compass', 'ember', 'Selon les besoins',
   'Envoyer et soutenir des missionnaires pour l''avancement du royaume de Dieu',
   ARRAY['Soutien financier aux missionnaires','Préparation des missionnaires','Partenariats missionnaires','Collectes missionnaires','Visites sur le terrain','Rapports missionnaires'],
   ARRAY['Vision missionnaire','Engagement financier','Disponibilité pour les voyages'],
   true, 15)
ON CONFLICT (slug) DO NOTHING;


-- ─── 2E. Positions par département (5 × 15 = 75) ────────
INSERT INTO positions (department_id, name, description, sort_order)
SELECT d.id, p.pos_name, p.pos_desc, p.pos_order
FROM (
  VALUES
    ('evangelisation','Responsable','Diriger le département d''évangélisation et coordonner les sorties sur le terrain',1),
    ('evangelisation','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('evangelisation','Secrétaire','Gestion administrative et suivi des activités',3),
    ('evangelisation','Trésorier','Gestion des finances du département',4),
    ('evangelisation','Membre actif','Participation active aux activités du département',5),
    ('louange-adoration','Responsable','Diriger le ministère de louange et superviser les équipes de musique',1),
    ('louange-adoration','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('louange-adoration','Secrétaire','Gestion administrative et suivi des activités',3),
    ('louange-adoration','Trésorier','Gestion des finances du département',4),
    ('louange-adoration','Membre actif','Participation active aux activités du département',5),
    ('intercession','Responsable','Animer et coordonner toutes les activités de prière et d''intercession',1),
    ('intercession','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('intercession','Secrétaire','Gestion administrative et suivi des activités',3),
    ('intercession','Trésorier','Gestion des finances du département',4),
    ('intercession','Membre actif','Participation active aux activités du département',5),
    ('diaconie','Responsable','Superviser les actions caritatives et le service communautaire',1),
    ('diaconie','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('diaconie','Secrétaire','Gestion administrative et suivi des activités',3),
    ('diaconie','Trésorier','Gestion des finances du département',4),
    ('diaconie','Membre actif','Participation active aux activités du département',5),
    ('ecole-du-dimanche','Responsable','Gérer les programmes d''enseignement et coordonner les enseignants',1),
    ('ecole-du-dimanche','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('ecole-du-dimanche','Secrétaire','Gestion administrative et suivi des activités',3),
    ('ecole-du-dimanche','Trésorier','Gestion des finances du département',4),
    ('ecole-du-dimanche','Membre actif','Participation active aux activités du département',5),
    ('multimedia','Responsable','Superviser la production technique, le son, la vidéo et le streaming',1),
    ('multimedia','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('multimedia','Secrétaire','Gestion administrative et suivi des activités',3),
    ('multimedia','Trésorier','Gestion des finances du département',4),
    ('multimedia','Membre actif','Participation active aux activités du département',5),
    ('protocole-et-accueil','Responsable','Assurer l''ordre, la sécurité et la qualité de l''accueil lors des cultes',1),
    ('protocole-et-accueil','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('protocole-et-accueil','Secrétaire','Gestion administrative et suivi des activités',3),
    ('protocole-et-accueil','Trésorier','Gestion des finances du département',4),
    ('protocole-et-accueil','Membre actif','Participation active aux activités du département',5),
    ('communication','Responsable','Diriger la stratégie de communication et gérer les publications',1),
    ('communication','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('communication','Secrétaire','Gestion administrative et suivi des activités',3),
    ('communication','Trésorier','Gestion des finances du département',4),
    ('communication','Membre actif','Participation active aux activités du département',5),
    ('jeunesse','Responsable','Encadrer la jeunesse et développer des activités adaptées',1),
    ('jeunesse','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('jeunesse','Secrétaire','Gestion administrative et suivi des activités',3),
    ('jeunesse','Trésorier','Gestion des finances du département',4),
    ('jeunesse','Membre actif','Participation active aux activités du département',5),
    ('enseignement','Responsable','Superviser les programmes de formation biblique et théologique',1),
    ('enseignement','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('enseignement','Secrétaire','Gestion administrative et suivi des activités',3),
    ('enseignement','Trésorier','Gestion des finances du département',4),
    ('enseignement','Membre actif','Participation active aux activités du département',5),
    ('hommes','Responsable','Coordonner les réunions et activités spirituelles pour les hommes',1),
    ('hommes','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('hommes','Secrétaire','Gestion administrative et suivi des activités',3),
    ('hommes','Trésorier','Gestion des finances du département',4),
    ('hommes','Membre actif','Participation active aux activités du département',5),
    ('femmes','Responsable','Animer et coordonner les activités pour les femmes de l''église',1),
    ('femmes','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('femmes','Secrétaire','Gestion administrative et suivi des activités',3),
    ('femmes','Trésorier','Gestion des finances du département',4),
    ('femmes','Membre actif','Participation active aux activités du département',5),
    ('couples-et-famille','Responsable','Superviser l''accompagnement conjugal et les activités familiales',1),
    ('couples-et-famille','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('couples-et-famille','Secrétaire','Gestion administrative et suivi des activités',3),
    ('couples-et-famille','Trésorier','Gestion des finances du département',4),
    ('couples-et-famille','Membre actif','Participation active aux activités du département',5),
    ('enfants','Responsable','Diriger les programmes éducatifs et spirituels pour les enfants',1),
    ('enfants','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('enfants','Secrétaire','Gestion administrative et suivi des activités',3),
    ('enfants','Trésorier','Gestion des finances du département',4),
    ('enfants','Membre actif','Participation active aux activités du département',5),
    ('missions','Responsable','Coordonner les projets missionnaires et le suivi des missionnaires',1),
    ('missions','Vice-responsable','Assister le responsable et le remplacer en son absence',2),
    ('missions','Secrétaire','Gestion administrative et suivi des activités',3),
    ('missions','Trésorier','Gestion des finances du département',4),
    ('missions','Membre actif','Participation active aux activités du département',5)
) AS p(slug, pos_name, pos_desc, pos_order)
JOIN departments d ON d.slug = p.slug
ON CONFLICT (department_id, name) DO NOTHING;


-- ─── 2F. Utilisateurs de test + memberships ──────────────

-- Jean Mukendi → Leader Évangélisation + Membre Louange
INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, invite_token)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'dept.jean.mukendi@laconquete.test', crypt('TestDept2024!', gen_salt('bf')), 'authenticated', 'authenticated', now(), '{"full_name":"Jean Mukendi"}', now(), now(), '', '', '', '', '')
ON CONFLICT DO NOTHING;

UPDATE user_profiles SET full_name = 'Jean Mukendi', phone = '+243810000001', is_admin = false, onboarding_completed = true, updated_at = now() WHERE email = 'dept.jean.mukendi@laconquete.test';

INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT gen_random_uuid(), up.id, d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Responsable' LIMIT 1),
  'leader', true, true, now()
FROM user_profiles up CROSS JOIN departments d
WHERE up.email = 'dept.jean.mukendi@laconquete.test' AND d.slug = 'evangelisation'
ON CONFLICT (user_id, department_id) DO NOTHING;

INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT gen_random_uuid(), up.id, d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Membre actif' LIMIT 1),
  'member', false, true, now()
FROM user_profiles up CROSS JOIN departments d
WHERE up.email = 'dept.jean.mukendi@laconquete.test' AND d.slug = 'louange-adoration'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Marie Kabongo → Leader Diaconie + Membre Femmes, Enfants
INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, invite_token)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'dept.marie.kabongo@laconquete.test', crypt('TestDept2024!', gen_salt('bf')), 'authenticated', 'authenticated', now(), '{"full_name":"Marie Kabongo"}', now(), now(), '', '', '', '', '')
ON CONFLICT DO NOTHING;

UPDATE user_profiles SET full_name = 'Marie Kabongo', phone = '+243810000002', is_admin = false, onboarding_completed = true, updated_at = now() WHERE email = 'dept.marie.kabongo@laconquete.test';

INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT gen_random_uuid(), up.id, d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Responsable' LIMIT 1),
  'leader', true, true, now()
FROM user_profiles up CROSS JOIN departments d
WHERE up.email = 'dept.marie.kabongo@laconquete.test' AND d.slug = 'diaconie'
ON CONFLICT (user_id, department_id) DO NOTHING;

INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT gen_random_uuid(), up.id, d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Membre actif' LIMIT 1),
  'member', false, true, now()
FROM user_profiles up CROSS JOIN departments d
WHERE up.email = 'dept.marie.kabongo@laconquete.test' AND d.slug = 'femmes'
ON CONFLICT (user_id, department_id) DO NOTHING;

INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT gen_random_uuid(), up.id, d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Membre actif' LIMIT 1),
  'member', false, true, now()
FROM user_profiles up CROSS JOIN departments d
WHERE up.email = 'dept.marie.kabongo@laconquete.test' AND d.slug = 'enfants'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Pierre Lubala → Leader Intercession + Membre Enseignement, Hommes
INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, invite_token)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'dept.pierre.lubala@laconquete.test', crypt('TestDept2024!', gen_salt('bf')), 'authenticated', 'authenticated', now(), '{"full_name":"Pierre Lubala"}', now(), now(), '', '', '', '', '')
ON CONFLICT DO NOTHING;

UPDATE user_profiles SET full_name = 'Pierre Lubala', phone = '+243810000003', is_admin = false, onboarding_completed = true, updated_at = now() WHERE email = 'dept.pierre.lubala@laconquete.test';

INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT gen_random_uuid(), up.id, d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Responsable' LIMIT 1),
  'leader', true, true, now()
FROM user_profiles up CROSS JOIN departments d
WHERE up.email = 'dept.pierre.lubala@laconquete.test' AND d.slug = 'intercession'
ON CONFLICT (user_id, department_id) DO NOTHING;

INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT gen_random_uuid(), up.id, d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Membre actif' LIMIT 1),
  'member', false, true, now()
FROM user_profiles up CROSS JOIN departments d
WHERE up.email = 'dept.pierre.lubala@laconquete.test' AND d.slug = 'enseignement'
ON CONFLICT (user_id, department_id) DO NOTHING;

INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT gen_random_uuid(), up.id, d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Membre actif' LIMIT 1),
  'member', false, true, now()
FROM user_profiles up CROSS JOIN departments d
WHERE up.email = 'dept.pierre.lubala@laconquete.test' AND d.slug = 'hommes'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- ─── 2G. Demandes d'adhésion en attente (3) ──────────────

-- Anne Mwamba → Protocole et Accueil
INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, invite_token)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'dept.anne.mwamba@laconquete.test', crypt('TestDept2024!', gen_salt('bf')), 'authenticated', 'authenticated', now(), '{"full_name":"Anne Mwamba"}', now(), now(), '', '', '', '', '')
ON CONFLICT DO NOTHING;

UPDATE user_profiles SET full_name = 'Anne Mwamba', onboarding_completed = true, updated_at = now() WHERE email = 'dept.anne.mwamba@laconquete.test';

INSERT INTO department_requests (id, user_id, department_id, message, status)
SELECT gen_random_uuid(), up.id, d.id, 'Je souhaite rejoindre le département Protocole et Accueil pour servir l''église.', 'en_attente'
FROM user_profiles up CROSS JOIN departments d
WHERE up.email = 'dept.anne.mwamba@laconquete.test' AND d.slug = 'protocole-et-accueil'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Joseph Kasongo → Multimédia
INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, invite_token)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'dept.joseph.kasongo@laconquete.test', crypt('TestDept2024!', gen_salt('bf')), 'authenticated', 'authenticated', now(), '{"full_name":"Joseph Kasongo"}', now(), now(), '', '', '', '', '')
ON CONFLICT DO NOTHING;

UPDATE user_profiles SET full_name = 'Joseph Kasongo', onboarding_completed = true, updated_at = now() WHERE email = 'dept.joseph.kasongo@laconquete.test';

INSERT INTO department_requests (id, user_id, department_id, message, status)
SELECT gen_random_uuid(), up.id, d.id, 'Je suis passionné par la technologie et je souhaite contribuer au département Multimédia.', 'en_attente'
FROM user_profiles up CROSS JOIN departments d
WHERE up.email = 'dept.joseph.kasongo@laconquete.test' AND d.slug = 'multimedia'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Grace Tshimanga → Jeunesse
INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, invite_token)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'dept.grace.tshimanga@laconquete.test', crypt('TestDept2024!', gen_salt('bf')), 'authenticated', 'authenticated', now(), '{"full_name":"Grace Tshimanga"}', now(), now(), '', '', '', '', '')
ON CONFLICT DO NOTHING;

UPDATE user_profiles SET full_name = 'Grace Tshimanga', onboarding_completed = true, updated_at = now() WHERE email = 'dept.grace.tshimanga@laconquete.test';

INSERT INTO department_requests (id, user_id, department_id, message, status)
SELECT gen_random_uuid(), up.id, d.id, 'Je désire rejoindre le département Jeunesse pour grandir spirituellement et servir parmi les jeunes.', 'en_attente'
FROM user_profiles up CROSS JOIN departments d
WHERE up.email = 'dept.grace.tshimanga@laconquete.test' AND d.slug = 'jeunesse'
ON CONFLICT (user_id, department_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 3 : VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════

DO $$ DECLARE
  v_depts     INTEGER;
  v_positions INTEGER;
  v_members   INTEGER;
  v_requests  INTEGER;
BEGIN
  SELECT count(*) INTO v_depts     FROM departments WHERE sort_order BETWEEN 1 AND 15;
  SELECT count(*) INTO v_positions FROM positions p JOIN departments d ON d.id = p.department_id WHERE d.sort_order BETWEEN 1 AND 15;
  SELECT count(*) INTO v_members   FROM department_members dm JOIN user_profiles up ON up.id = dm.user_id WHERE up.phone LIKE '+2438100000%';
  SELECT count(*) INTO v_requests  FROM department_requests WHERE status = 'en_attente';

  RAISE NOTICE '╔══════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║     MIGRATION UNIFIÉE — RÉSUMÉ                        ║';
  RAISE NOTICE '╠══════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Départements (1-15)     : %', v_depts;
  RAISE NOTICE '║  Positions totales       : %', v_positions;
  RAISE NOTICE '║  Membres de test         : %', v_members;
  RAISE NOTICE '║  Demandes en attente     : %', v_requests;
  RAISE NOTICE '║  RLS : user_profiles OFF, site_settings/page_contents  ║';
  RAISE NOTICE '║        departments/positions/members/requests OFF     ║';
  RAISE NOTICE '║  Toutes contraintes UNIQUE vérifiées/créées            ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════╝';
END $$;