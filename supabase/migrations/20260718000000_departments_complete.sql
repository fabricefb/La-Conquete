-- ═════════════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLÈTE: Départements — Église Évangélique La Conquête
-- Date       : 2026-07-18
-- Résumé     : department_requests, RLS off, 15 départements, positions,
--              données de test, trigger updated_at
-- Idempotent : Oui — tous les inserts utilisent ON CONFLICT DO NOTHING
-- Prérequis  : 20260711120000_full_schema.sql, 20260715000000_departments_module.sql
-- ═════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- 1. CONVERTIR activities ET requirements EN TEXT[]
--    (les anciennes migrations utilisaient TEXT simple)
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Convertir activities de TEXT → TEXT[] si nécessaire
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments'
      AND column_name = 'activities'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE departments ALTER COLUMN activities TYPE TEXT[] USING
      CASE WHEN activities IS NULL OR activities = '' THEN NULL
           ELSE string_to_array(activities, ', ')
      END;
    RAISE NOTICE 'Column departments.activities convertie en TEXT[]';
  END IF;

  -- Convertir requirements de TEXT → TEXT[] si nécessaire
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments'
      AND column_name = 'requirements'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE departments ALTER COLUMN requirements TYPE TEXT[] USING
      CASE WHEN requirements IS NULL OR requirements = '' THEN NULL
           ELSE string_to_array(requirements, ', ')
      END;
    RAISE NOTICE 'Column departments.requirements convertie en TEXT[]';
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- 2. TABLE department_requests (complète avec position_id)
-- ═══════════════════════════════════════════════════════════════

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
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, department_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_dept_requests_user
  ON department_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_requests_dept
  ON department_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_requests_status
  ON department_requests(status);

-- Ajouter position_id si la table existait déjà sans cette colonne
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'department_requests'
      AND column_name = 'position_id'
  ) THEN
    ALTER TABLE department_requests
      ADD COLUMN position_id UUID REFERENCES positions(id) ON DELETE SET NULL;
  END IF;

  -- Ajouter message avec DEFAULT si absent
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'department_requests'
      AND column_name = 'message'
      AND column_default IS NULL
  ) THEN
    ALTER TABLE department_requests ALTER COLUMN message SET DEFAULT '';
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- 3. DÉSACTIVER RLS (pattern utilisé partout dans le projet)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE department_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE department_requests DISABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════
-- 4. SEED: 15 DÉPARTEMENTS COMPLETS
--    Chaque département: name, slug, description, icon_name,
--    accent_color, meeting_schedule, mission, activities (TEXT[]),
--    requirements (TEXT[]), is_active, sort_order
-- ═══════════════════════════════════════════════════════════════

INSERT INTO departments (
  name, slug, description, icon_name, accent_color,
  meeting_schedule, mission, activities, requirements,
  is_active, sort_order
) VALUES

-- ─── 1. Évangélisation ─────────────────────────────────────────
(
  'Évangélisation',
  'evangelisation',
  'Porter la Bonne Nouvelle aux nations, faire des disciples et équiper les saints pour l''œuvre du ministère.',
  'Compass',
  'gold',
  'Samedis 8h00 - 10h00',
  'Proclamer l''Évangile à toute créature et faire des disciples',
  ARRAY[
    'Sorties d''évangélisation',
    'Visites domiciliaires',
    'Campagnes d''évangélisation',
    'Formation des évangélistes',
    'Suivi des nouveaux convertis',
    'Tracts et supports'
  ],
  ARRAY[
    'Passion pour les âmes',
    'Engagement hebdomadaire',
    'Formation initiale'
  ],
  true, 1
),

-- ─── 2. Louange et Adoration ──────────────────────────────────
(
  'Louange et Adoration',
  'louange-adoration',
  'Élever le nom de Jésus à travers la musique, les chants et la danse pour la gloire de Dieu.',
  'Music',
  'ember',
  'Mercredis 17h00 - 19h00, Samedis 14h00 - 16h00',
  'Amener la congrégation dans la présence de Dieu par la louange et l''adoration',
  ARRAY[
    'Répétitions de chants',
    'Composition musicale',
    'Direction de louange',
    'Accompagnement instrumental',
    'Enregistrements',
    'Formation musicale'
  ],
  ARRAY[
    'Sens de la musique',
    'Engagement aux répétitions',
    'Consécration personnelle'
  ],
  true, 2
),

-- ─── 3. Intercession ──────────────────────────────────────────
(
  'Intercession',
  'intercession',
  'Porter les fardeaux dans la prière, intercéder pour l''église, la communauté et les nations.',
  'Heart',
  'gold',
  'Lundis et Jeudis 5h30 - 7h00',
  'Soutenir l''église et la communauté par la prière fervente et persistante',
  ARRAY[
    'Chaînes de prière',
    'Veillées de prière',
    'Prière pour les malades',
    'Jeûne et prière',
    'Intercession pour la nation',
    'Réveil spirituel'
  ],
  ARRAY[
    'Vie de prière personnelle',
    'Foi en la puissance de la prière',
    'Disponibilité'
  ],
  true, 3
),

-- ─── 4. Diaconie ──────────────────────────────────────────────
(
  'Diaconie',
  'diaconie',
  'Servir les membres dans leurs besoins pratiques, organiser l''entraide et la solidarité.',
  'HandHeart',
  'ember',
  'Vendredis 16h00 - 18h00',
  'Servir les membres et la communauté dans l''amour pratique du Christ',
  ARRAY[
    'Aide aux familles nécessiteuses',
    'Visite aux malades',
    'Aide alimentaire',
    'Accompagnement social',
    'Collectes de fonds',
    'Actions caritatives'
  ],
  ARRAY[
    'Cœur de serviteur',
    'Disponibilité',
    'Sens de la confidentialité'
  ],
  true, 4
),

-- ─── 5. École du Dimanche ─────────────────────────────────────
(
  'École du Dimanche',
  'ecole-du-dimanche',
  'Enseigner la Parole de Dieu aux enfants et aux nouveaux convertis de manière structurée.',
  'GraduationCap',
  'gold',
  'Dimanches 9h00 - 10h30',
  'Enseigner la Parole de Dieu aux enfants et aux nouveaux convertis de manière adaptée',
  ARRAY[
    'Cours bibliques pour enfants',
    'Matériel pédagogique',
    'Activités ludiques',
    'Suivi de la progression',
    'Formation des enseignants',
    'Événements spéciaux enfants'
  ],
  ARRAY[
    'Amour pour les enfants',
    'Connaissances bibliques',
    'Patience et créativité'
  ],
  true, 5
),

-- ─── 6. Multimédia ────────────────────────────────────────────
(
  'Multimédia',
  'multimedia',
  'Gérer les outils technologiques et numériques pour amplifier la portée de l''Évangile.',
  'Mic',
  'ember',
  'Selon les besoins des cultes',
  'Amplifier la parole de Dieu à travers les médias et la technologie',
  ARRAY[
    'Son lors des cultes',
    'Enregistrement vidéo',
    'Streaming en direct',
    'Gestion des réseaux sociaux',
    'Design graphique',
    'Photographie',
    'Montage vidéo',
    'Site web'
  ],
  ARRAY[
    'Compétences techniques',
    'Créativité',
    'Fiabilité'
  ],
  true, 6
),

-- ─── 7. Protocole et Accueil ──────────────────────────────────
(
  'Protocole et Accueil',
  'protocole-et-accueil',
  'Le visage de l''église. Planification, accueil des fidèles, comptage, gestion des nouveaux venus.',
  'Shield',
  'gold',
  'Dimanches 7h00 - 14h00',
  'Assurer l''ordre, la sécurité et l''accueil chaleureux lors des rassemblements',
  ARRAY[
    'Accueil des fidèles',
    'Orientation des visiteurs',
    'Gestion du parking',
    'Ordre pendant le culte',
    'Protection des pasteurs',
    'Coordination des équipes de service',
    'Suivi des visiteurs'
  ],
  ARRAY[
    'Présentation soignée',
    'Sens du service',
    'Fière allure (tenue appropriée)'
  ],
  true, 7
),

-- ─── 8. Communication ─────────────────────────────────────────
(
  'Communication',
  'communication',
  'Faciliter la circulation de l''information au sein de l''église et vers l''extérieur.',
  'Radio',
  'ember',
  'Mardis 17h00 - 18h30',
  'Faciliter la circulation de l''information au sein de l''église et vers l''extérieur',
  ARRAY[
    'Rédaction d''annonces',
    'Gestion des communiqués',
    'Bulletin paroissial',
    'Communication interne',
    'Relations publiques',
    'Gestion du site web et newsletter'
  ],
  ARRAY[
    'Bonne plume',
    'Esprit d''analyse',
    'Réactivité'
  ],
  true, 8
),

-- ─── 9. Jeunesse ──────────────────────────────────────────────
(
  'Jeunesse',
  'jeunesse',
  'Accompagner les jeunes dans leur croissance spirituelle et leur développement personnel.',
  'Flame',
  'gold',
  'Samedis 15h00 - 17h30',
  'Accompagner les jeunes dans leur croissance spirituelle et leur développement personnel',
  ARRAY[
    'Études bibliques',
    'Activités récréatives',
    'Sorties et excursions',
    'Conferences jeunesse',
    'Mentorat',
    'Projets communautaires',
    'Culte jeunesse'
  ],
  ARRAY[
    'Avoir entre 15 et 35 ans',
    'Passion pour la jeunesse',
    'Exemple de vie'
  ],
  true, 9
),

-- ─── 10. Enseignement ─────────────────────────────────────────
(
  'Enseignement',
  'enseignement',
  'Approfondir la connaissance de la Parole de Dieu et former des disciples matures.',
  'BookOpen',
  'gold',
  'Mercredis 18h00 - 20h00',
  'Approfondir la connaissance de la Parole de Dieu et former des disciples matures',
  ARRAY[
    'Cours de théologie',
    'Études bibliques approfondies',
    'Formation des formateurs',
    'Matériel de formation',
    'Séminaires',
    'École biblique'
  ],
  ARRAY[
    'Engagement dans l''étude',
    'Assiduité',
    'Désir d''enseigner'
  ],
  true, 10
),

-- ─── 11. Hommes ───────────────────────────────────────────────
(
  'Hommes',
  'hommes',
  'Bâtir des hommes de caractère selon les principes de la Parole de Dieu.',
  'Users',
  'gold',
  '1er samedi du mois 8h00 - 10h00',
  'Bâtir des hommes de caractère selon les principes de la Parole de Dieu',
  ARRAY[
    'Rencontres mensuelles',
    'Retraites spirituelles',
    'Groupes de responsabilisation',
    'Activités de fellowship',
    'Projets de service',
    'Mentorat intergénérationnel'
  ],
  ARRAY[
    'Être un homme de l''église',
    'Désir de grandir',
    'Engagement'
  ],
  true, 11
),

-- ─── 12. Femmes ───────────────────────────────────────────────
(
  'Femmes',
  'femmes',
  'Encourager et équiper les femmes à vivre pleinement leur destinée en Christ.',
  'Heart',
  'ember',
  '2e samedi du mois 8h00 - 10h00',
  'Encourager et équiper les femmes à vivre pleinement leur destinée en Christ',
  ARRAY[
    'Rencontres mensuelles',
    'Journées de retrouvailles',
    'Groupes de prière',
    'Ateliers pratiques',
    'Aide aux femmes en difficulté',
    'Conférences féminines'
  ],
  ARRAY[
    'Être une femme de l''église',
    'Cœur ouvert',
    'Disponibilité'
  ],
  true, 12
),

-- ─── 13. Couples et Famille ───────────────────────────────────
(
  'Couples et Famille',
  'couples-et-famille',
  'Renforcer les mariages et les familles selon les principes bibliques.',
  'Heart',
  'gold',
  '3e samedi du mois 9h00 - 11h00',
  'Renforcer les mariages et les familles selon les principes bibliques',
  ARRAY[
    'Conseil conjugal',
    'Rencontres de couples',
    'Séminaires familiaux',
    'Accompagnement des jeunes mariés',
    'Groupes de soutien',
    'Activités familiales'
  ],
  ARRAY[
    'Être marié ou fiancé',
    'Engagement couple',
    'Ouverture'
  ],
  true, 13
),

-- ─── 14. Enfants ──────────────────────────────────────────────
(
  'Enfants',
  'enfants',
  'Former les enfants dans la voie du Seigneur dès leur plus jeune âge.',
  'Star',
  'ember',
  'Dimanches 9h00 - 10h30, Mercredis 15h30 - 17h00',
  'Former les enfants dans la voie du Seigneur dès leur plus jeune âge',
  ARRAY[
    'Culte enfants',
    'École biblique',
    'Activités manuelles',
    'Chants et jeux bibliques',
    'Événements spéciaux (Noël, Pâques)',
    'Sorties éducatives'
  ],
  ARRAY[
    'Amour pour les enfants',
    'Patience',
    'Créativité'
  ],
  true, 14
),

-- ─── 15. Missions ─────────────────────────────────────────────
(
  'Missions',
  'missions',
  'Envoyer et soutenir des missionnaires pour l''avancement du royaume de Dieu.',
  'Compass',
  'ember',
  'Selon les besoins',
  'Envoyer et soutenir des missionnaires pour l''avancement du royaume de Dieu',
  ARRAY[
    'Soutien financier aux missionnaires',
    'Préparation des missionnaires',
    'Partenariats missionnaires',
    'Collectes missionnaires',
    'Visites sur le terrain',
    'Rapports missionnaires'
  ],
  ARRAY[
    'Vision missionnaire',
    'Engagement financier',
    'Disponibilité pour les voyages'
  ],
  true, 15
)

ON CONFLICT (slug) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 5. SEED: POSITIONS PAR DÉPARTEMENT (5 positions × 15 depts)
--    - Responsable (description unique par dept)
--    - Vice-responsable
--    - Secrétaire
--    - Trésorier
--    - Membre actif
-- ═══════════════════════════════════════════════════════════════

INSERT INTO positions (department_id, name, description, sort_order)
SELECT
  d.id,
  p.pos_name,
  p.pos_desc,
  p.pos_order
FROM (
  -- ─── Évangélisation ─────────────────────────────────────
  VALUES
    ('evangelisation', 'Responsable',
     'Diriger le département d''évangélisation et coordonner les sorties sur le terrain', 1),
    ('evangelisation', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('evangelisation', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('evangelisation', 'Trésorier',
     'Gestion des finances du département', 4),
    ('evangelisation', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── Louange et Adoration ───────────────────────────────
    ('louange-adoration', 'Responsable',
     'Diriger le ministère de louange et superviser les équipes de musique', 1),
    ('louange-adoration', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('louange-adoration', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('louange-adoration', 'Trésorier',
     'Gestion des finances du département', 4),
    ('louange-adoration', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── Intercession ───────────────────────────────────────
    ('intercession', 'Responsable',
     'Animer et coordonner toutes les activités de prière et d''intercession', 1),
    ('intercession', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('intercession', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('intercession', 'Trésorier',
     'Gestion des finances du département', 4),
    ('intercession', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── Diaconie ───────────────────────────────────────────
    ('diaconie', 'Responsable',
     'Superviser les actions caritatives et le service communautaire', 1),
    ('diaconie', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('diaconie', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('diaconie', 'Trésorier',
     'Gestion des finances du département', 4),
    ('diaconie', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── École du Dimanche ──────────────────────────────────
    ('ecole-du-dimanche', 'Responsable',
     'Gérer les programmes d''enseignement et coordonner les enseignants', 1),
    ('ecole-du-dimanche', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('ecole-du-dimanche', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('ecole-du-dimanche', 'Trésorier',
     'Gestion des finances du département', 4),
    ('ecole-du-dimanche', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── Multimédia ─────────────────────────────────────────
    ('multimedia', 'Responsable',
     'Superviser la production technique, le son, la vidéo et le streaming', 1),
    ('multimedia', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('multimedia', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('multimedia', 'Trésorier',
     'Gestion des finances du département', 4),
    ('multimedia', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── Protocole et Accueil ───────────────────────────────
    ('protocole-et-accueil', 'Responsable',
     'Assurer l''ordre, la sécurité et la qualité de l''accueil lors des cultes', 1),
    ('protocole-et-accueil', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('protocole-et-accueil', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('protocole-et-accueil', 'Trésorier',
     'Gestion des finances du département', 4),
    ('protocole-et-accueil', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── Communication ──────────────────────────────────────
    ('communication', 'Responsable',
     'Diriger la stratégie de communication et gérer les publications', 1),
    ('communication', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('communication', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('communication', 'Trésorier',
     'Gestion des finances du département', 4),
    ('communication', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── Jeunesse ───────────────────────────────────────────
    ('jeunesse', 'Responsable',
     'Encadrer la jeunesse et développer des activités adaptées', 1),
    ('jeunesse', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('jeunesse', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('jeunesse', 'Trésorier',
     'Gestion des finances du département', 4),
    ('jeunesse', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── Enseignement ───────────────────────────────────────
    ('enseignement', 'Responsable',
     'Superviser les programmes de formation biblique et théologique', 1),
    ('enseignement', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('enseignement', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('enseignement', 'Trésorier',
     'Gestion des finances du département', 4),
    ('enseignement', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── Hommes ─────────────────────────────────────────────
    ('hommes', 'Responsable',
     'Coordonner les réunions et activités spirituelles pour les hommes', 1),
    ('hommes', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('hommes', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('hommes', 'Trésorier',
     'Gestion des finances du département', 4),
    ('hommes', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── Femmes ─────────────────────────────────────────────
    ('femmes', 'Responsable',
     'Animer et coordonner les activités pour les femmes de l''église', 1),
    ('femmes', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('femmes', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('femmes', 'Trésorier',
     'Gestion des finances du département', 4),
    ('femmes', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── Couples et Famille ─────────────────────────────────
    ('couples-et-famille', 'Responsable',
     'Superviser l''accompagnement conjugal et les activités familiales', 1),
    ('couples-et-famille', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('couples-et-famille', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('couples-et-famille', 'Trésorier',
     'Gestion des finances du département', 4),
    ('couples-et-famille', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── Enfants ────────────────────────────────────────────
    ('enfants', 'Responsable',
     'Diriger les programmes éducatifs et spirituels pour les enfants', 1),
    ('enfants', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('enfants', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('enfants', 'Trésorier',
     'Gestion des finances du département', 4),
    ('enfants', 'Membre actif',
     'Participation active aux activités du département', 5),

  -- ─── Missions ───────────────────────────────────────────
    ('missions', 'Responsable',
     'Coordonner les projets missionnaires et le suivi des missionnaires', 1),
    ('missions', 'Vice-responsable',
     'Assister le responsable et le remplacer en son absence', 2),
    ('missions', 'Secrétaire',
     'Gestion administrative et suivi des activités', 3),
    ('missions', 'Trésorier',
     'Gestion des finances du département', 4),
    ('missions', 'Membre actif',
     'Participation active aux activités du département', 5)
) AS p(slug, pos_name, pos_desc, pos_order)
JOIN departments d ON d.slug = p.slug
ON CONFLICT (department_id, name) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 6. SEED: DONNÉES DE TEST (3 utilisateurs + memberships)
--    Pattern: INSERT INTO auth.users → UPDATE user_profiles
--    (le trigger handle_new_user crée le profil de base)
-- ═══════════════════════════════════════════════════════════════

-- ─── 6a. Jean Mukendi ──────────────────────────────────────
--    Membre leader: Évangélisation | Membre: Louange et Adoration
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'dept.jean.mukendi@laconquete.test',
  crypt('TestDept2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"Jean Mukendi"}',
  now(), now(), '', '', '', '', ''
) ON CONFLICT DO NOTHING;

UPDATE user_profiles
SET
  full_name            = 'Jean Mukendi',
  phone                = '+243810000001',
  is_admin             = false,
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'dept.jean.mukendi@laconquete.test';

-- Jean Mukendi → Leader dans Évangélisation
INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Responsable' LIMIT 1),
  'leader',
  true,
  true,
  now()
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'dept.jean.mukendi@laconquete.test'
  AND d.slug = 'evangelisation'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Jean Mukendi → Membre dans Louange et Adoration
INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Membre actif' LIMIT 1),
  'member',
  false,
  true,
  now()
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'dept.jean.mukendi@laconquete.test'
  AND d.slug = 'louange-adoration'
ON CONFLICT (user_id, department_id) DO NOTHING;


-- ─── 6b. Marie Kabongo ─────────────────────────────────────
--    Membre leader: Diaconie | Membre: Femmes, Enfants
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'dept.marie.kabongo@laconquete.test',
  crypt('TestDept2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"Marie Kabongo"}',
  now(), now(), '', '', '', '', ''
) ON CONFLICT DO NOTHING;

UPDATE user_profiles
SET
  full_name            = 'Marie Kabongo',
  phone                = '+243810000002',
  is_admin             = false,
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'dept.marie.kabongo@laconquete.test';

-- Marie Kabongo → Leader dans Diaconie
INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Responsable' LIMIT 1),
  'leader',
  true,
  true,
  now()
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'dept.marie.kabongo@laconquete.test'
  AND d.slug = 'diaconie'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Marie Kabongo → Membre dans Femmes
INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Membre actif' LIMIT 1),
  'member',
  false,
  true,
  now()
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'dept.marie.kabongo@laconquete.test'
  AND d.slug = 'femmes'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Marie Kabongo → Membre dans Enfants
INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Membre actif' LIMIT 1),
  'member',
  false,
  true,
  now()
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'dept.marie.kabongo@laconquete.test'
  AND d.slug = 'enfants'
ON CONFLICT (user_id, department_id) DO NOTHING;


-- ─── 6c. Pierre Lubala ─────────────────────────────────────
--    Membre leader: Intercession | Membre: Enseignement, Hommes
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'dept.pierre.lubala@laconquete.test',
  crypt('TestDept2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"Pierre Lubala"}',
  now(), now(), '', '', '', '', ''
) ON CONFLICT DO NOTHING;

UPDATE user_profiles
SET
  full_name            = 'Pierre Lubala',
  phone                = '+243810000003',
  is_admin             = false,
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'dept.pierre.lubala@laconquete.test';

-- Pierre Lubala → Leader dans Intercession
INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Responsable' LIMIT 1),
  'leader',
  true,
  true,
  now()
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'dept.pierre.lubala@laconquete.test'
  AND d.slug = 'intercession'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Pierre Lubala → Membre dans Enseignement
INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Membre actif' LIMIT 1),
  'member',
  false,
  true,
  now()
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'dept.pierre.lubala@laconquete.test'
  AND d.slug = 'enseignement'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Pierre Lubala → Membre dans Hommes
INSERT INTO department_members (id, user_id, department_id, position_id, role_in_dept, is_primary, is_active, joined_at)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  (SELECT p.id FROM positions p WHERE p.department_id = d.id AND p.name = 'Membre actif' LIMIT 1),
  'member',
  false,
  true,
  now()
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'dept.pierre.lubala@laconquete.test'
  AND d.slug = 'hommes'
ON CONFLICT (user_id, department_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 7. SEED: 3 DEMANDES D'ADHÉSION EN ATTENTE
--    (nécessite des utilisateurs auth.users pour la FK)
-- ═══════════════════════════════════════════════════════════════

-- ─── 7a. Anne Mwamba → Protocole et Accueil ────────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'dept.anne.mwamba@laconquete.test',
  crypt('TestDept2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"Anne Mwamba"}',
  now(), now(), '', '', '', '', ''
) ON CONFLICT DO NOTHING;

UPDATE user_profiles
SET
  full_name            = 'Anne Mwamba',
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'dept.anne.mwamba@laconquete.test';

INSERT INTO department_requests (id, user_id, department_id, message, status)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  'Je souhaite rejoindre le département Protocole et Accueil pour servir l''église.',
  'en_attente'
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'dept.anne.mwamba@laconquete.test'
  AND d.slug = 'protocole-et-accueil'
ON CONFLICT (user_id, department_id) DO NOTHING;


-- ─── 7b. Joseph Kasongo → Multimédia ────────────────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'dept.joseph.kasongo@laconquete.test',
  crypt('TestDept2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"Joseph Kasongo"}',
  now(), now(), '', '', '', '', ''
) ON CONFLICT DO NOTHING;

UPDATE user_profiles
SET
  full_name            = 'Joseph Kasongo',
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'dept.joseph.kasongo@laconquete.test';

INSERT INTO department_requests (id, user_id, department_id, message, status)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  'Je suis passionné par la technologie et je souhaite contribuer au département Multimédia.',
  'en_attente'
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'dept.joseph.kasongo@laconquete.test'
  AND d.slug = 'multimedia'
ON CONFLICT (user_id, department_id) DO NOTHING;


-- ─── 7c. Grace Tshimanga → Jeunesse ────────────────────────
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, aud, role,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, invite_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'dept.grace.tshimanga@laconquete.test',
  crypt('TestDept2024!', gen_salt('bf')),
  'authenticated', 'authenticated',
  now(),
  '{"full_name":"Grace Tshimanga"}',
  now(), now(), '', '', '', '', ''
) ON CONFLICT DO NOTHING;

UPDATE user_profiles
SET
  full_name            = 'Grace Tshimanga',
  onboarding_completed = true,
  updated_at           = now()
WHERE email = 'dept.grace.tshimanga@laconquete.test';

INSERT INTO department_requests (id, user_id, department_id, message, status)
SELECT
  gen_random_uuid(),
  up.id,
  d.id,
  'Je désire rejoindre le département Jeunesse pour grandir spirituellement et servir parmi les jeunes.',
  'en_attente'
FROM user_profiles up
CROSS JOIN departments d
WHERE up.email = 'dept.grace.tshimanga@laconquete.test'
  AND d.slug = 'jeunesse'
ON CONFLICT (user_id, department_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 8. TRIGGER: updated_at automatique sur department_requests
-- ═══════════════════════════════════════════════════════════════

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
-- 9. VÉRIFICATION — Résumé des données insérées
-- ═══════════════════════════════════════════════════════════════

DO $$ DECLARE
  v_depts      INTEGER;
  v_positions  INTEGER;
  v_members    INTEGER;
  v_requests   INTEGER;
BEGIN
  SELECT count(*) INTO v_depts      FROM departments WHERE sort_order BETWEEN 1 AND 15;
  SELECT count(*) INTO v_positions  FROM positions p JOIN departments d ON d.id = p.department_id WHERE d.sort_order BETWEEN 1 AND 15;
  SELECT count(*) INTO v_members    FROM department_members dm JOIN user_profiles up ON up.id = dm.user_id WHERE up.phone LIKE '+2438100000%';
  SELECT count(*) INTO v_requests   FROM department_requests WHERE status = 'en_attente';

  RAISE NOTICE '╔══════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║     MIGRATION DEPARTEMENTS — RÉSUMÉ                    ║';
  RAISE NOTICE '╠══════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Départements (1-15)     : %', v_depts;
  RAISE NOTICE '║  Positions totales       : %', v_positions;
  RAISE NOTICE '║  Membres de test         : %', v_members;
  RAISE NOTICE '║  Demandes en attente     : %', v_requests;
  RAISE NOTICE '╠══════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  RLS désactivé sur: departments, positions,             ║';
  RAISE NOTICE '║    department_members, department_requests              ║';
  RAISE NOTICE '║  Trigger updated_at créé sur department_requests         ║';
  RAISE NOTICE '║  Colonnes activities/requirements → TEXT[]              ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════╝';
END $$;