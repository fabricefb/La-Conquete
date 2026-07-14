-- ═══════════════════════════════════════════════════════════════════════════
-- 16 — Fix department_members : structure + auto-réparation
-- Le bug "Vous n'êtes pas encore assigné" venait de :
--   1. Absence de contrainte unique → upsert échouait silencieusement
--   2. Colonnes manquantes potentielles
--   3. Demandes acceptées sans entrée correspondante dans department_members
--   4. Membres avec is_active = false filtrés incorrectement
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Assurer la structure de department_members ──────────────
DO $$
BEGIN
  -- Vérifier si la table existe, sinon la créer
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_members') THEN
    CREATE TABLE department_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
      role_in_dept TEXT NOT NULL DEFAULT 'member' CHECK (role_in_dept IN ('member', 'leader', 'assistant')),
      is_active BOOLEAN NOT NULL DEFAULT true,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    RAISE NOTICE 'Table department_members créée';
  ELSE
    -- Ajouter les colonnes manquantes si nécessaire
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'department_members' AND column_name = 'position_id') THEN
      ALTER TABLE department_members ADD COLUMN position_id UUID REFERENCES positions(id) ON DELETE SET NULL;
      RAISE NOTICE 'Colonne position_id ajoutée';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'department_members' AND column_name = 'role_in_dept') THEN
      ALTER TABLE department_members ADD COLUMN role_in_dept TEXT NOT NULL DEFAULT 'member';
      RAISE NOTICE 'Colonne role_in_dept ajoutée';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'department_members' AND column_name = 'is_active') THEN
      ALTER TABLE department_members ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
      RAISE NOTICE 'Colonne is_active ajoutée';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'department_members' AND column_name = 'joined_at') THEN
      ALTER TABLE department_members ADD COLUMN joined_at TIMESTAMPTZ NOT NULL DEFAULT now();
      RAISE NOTICE 'Colonne joined_at ajoutée';
    END IF;
    -- Assurer que is_active n'est pas NULL (réparer les NULL existants)
    UPDATE department_members SET is_active = true WHERE is_active IS NULL;
    RAISE NOTICE 'Table department_members vérifiée';
  END IF;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_dept_members_user ON department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_dept ON department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_active ON department_members(department_id, is_active) WHERE is_active = true;

-- Contrainte unique pour le upsert (ignorer si déjà existe)
DO $$
BEGIN
  ALTER TABLE department_members ADD CONSTRAINT uq_dept_members_user_dept UNIQUE (user_id, department_id);
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Contrainte unique déjà existante';
END $$;

-- RLS désactivé
ALTER TABLE department_members DISABLE ROW LEVEL SECURITY;

-- ─── 2. Auto-réparation : demandes acceptées sans membre ────────
-- Pour chaque demande acceptée (status en 'accepte' ou variantes) sans entrée
INSERT INTO department_members (user_id, department_id, role_in_dept, is_active, joined_at)
SELECT dr.user_id, dr.department_id, 'member', true, COALESCE(dr.responded_at, now())
FROM department_requests dr
WHERE dr.status IN ('accepte', 'accepted', 'approuve', 'approved')
  AND NOT EXISTS (
    SELECT 1 FROM department_members dm
    WHERE dm.user_id = dr.user_id AND dm.department_id = dr.department_id
  )
ON CONFLICT (user_id, department_id) DO UPDATE SET is_active = true;

-- ─── 3. Auto-réparation : membres inactifs avec demande acceptée ──
-- Si un membre existe mais is_active = false et la demande est acceptée → réactiver
UPDATE department_members dm
SET is_active = true
FROM department_requests dr
WHERE dm.user_id = dr.user_id
  AND dm.department_id = dr.department_id
  AND dm.is_active = false
  AND dr.status IN ('accepte', 'accepted', 'approuve', 'approved');

-- ─── 4. Auto-réparation : membres sans demande acceptée ────────
-- Si un membre est actif mais sa demande est encore 'en_attente' → accepter la demande
UPDATE department_requests
SET status = 'accepte', responded_at = now()
WHERE (user_id, department_id) IN (
  SELECT dm.user_id, dm.department_id
  FROM department_members dm
  WHERE dm.is_active = true
)
AND status = 'en_attente';

-- ═══════════════════════════════════════════════════════════════════════════
-- RÉCAPITULATIF
-- - Structure de department_members vérifiée/corrigée
-- - Contrainte unique (user_id, department_id) ajoutée
-- - RLS désactivé
-- - NULL sur is_active corrigés → true
-- - Auto-réparation des demandes acceptées (toutes variantes de statut) sans membre
-- - Auto-réparation des membres inactifs dont la demande est acceptée
-- - Auto-réparation des membres sans demande acceptée
-- ═══════════════════════════════════════════════════════════════════════════