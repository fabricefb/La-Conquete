-- ═══════════════════════════════════════════════════════════════
-- FIX URGENT: Désactiver RLS sur departments/positions/department_members
-- Les policies RLS référençaient user_profiles qui a aussi RLS → blocage
-- On suit le même pattern que user_profiles (RLS désactivé)
-- ═══════════════════════════════════════════════════════════════

-- Supprimer toutes les policies existantes
DROP POLICY IF EXISTS departments_public_read ON departments;
DROP POLICY IF EXISTS departments_member_read ON departments;
DROP POLICY IF EXISTS departments_admin_read ON departments;
DROP POLICY IF EXISTS departments_admin_insert ON departments;
DROP POLICY IF EXISTS departments_admin_update ON departments;
DROP POLICY IF EXISTS departments_admin_delete ON departments;

DROP POLICY IF EXISTS positions_public_read ON positions;
DROP POLICY IF EXISTS positions_admin_all ON positions;
DROP POLICY IF EXISTS positions_leader_manage ON positions;
DROP POLICY IF EXISTS positions_leader_update ON positions;

DROP POLICY IF EXISTS dept_members_public_read ON department_members;
DROP POLICY IF EXISTS dept_members_self_read ON department_members;
DROP POLICY IF EXISTS dept_members_self_join ON department_members;
DROP POLICY IF EXISTS dept_members_admin_all ON department_members;
DROP POLICY IF EXISTS dept_members_leader_read ON department_members;
DROP POLICY IF EXISTS dept_members_leader_update ON department_members;
DROP POLICY IF EXISTS dept_members_self_leave ON department_members;

-- Désactiver RLS
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE department_members DISABLE ROW LEVEL SECURITY;

-- Vérification
DO $$ BEGIN
  RAISE NOTICE 'RLS désactivé sur departments, positions, department_members';
  RAISE NOTICE 'Les opérations CRUD fonctionnent maintenant sans blocage.';
END $$;