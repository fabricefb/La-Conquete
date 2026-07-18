-- ═══════════════════════════════════════════════════════════════
-- FIX RAPIDE : Supprimer les doublons department_members
-- Exécuter CE SCRIPT dans le SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════

-- Supprimer les doublons en gardant le premier (par id text)
DELETE FROM department_members
WHERE id::text NOT IN (
  SELECT MIN(id::text) FROM department_members GROUP BY user_id, department_id
);

-- Créer la contrainte UNIQUE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'department_members_user_id_department_id_key'
  ) THEN
    ALTER TABLE department_members
      ADD CONSTRAINT department_members_user_id_department_id_key
      UNIQUE (user_id, department_id);
    RAISE NOTICE 'Constraint CREATED';
  ELSE
    RAISE NOTICE 'Constraint already exists';
  END IF;
END $$;