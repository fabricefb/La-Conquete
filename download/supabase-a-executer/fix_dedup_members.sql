-- ═══════════════════════════════════════════════════════════════
-- FIX RAPIDE : Supprimer les doublons department_members
-- puis créer la contrainte UNIQUE
-- Exécuter CE SCRIPT dans le SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════

-- 1. Supprimer TOUTES les lignes en doublon (garder celle avec le plus petit id)
DELETE FROM department_members
WHERE id NOT IN (
  SELECT MIN(id) FROM department_members GROUP BY user_id, department_id
);

-- 2. Créer la contrainte UNIQUE
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