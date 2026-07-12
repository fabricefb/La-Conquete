-- ═══════════════════════════════════════════════════════════════════════
-- NETTOYAGE COMPLET DES DONNÉES DE TEST
-- Supprime TOUT ce qui commence par TEST_ sans toucher aux données réelles
-- Exécuter dans Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Récupérer les IDs des utilisateurs test
CREATE TEMP TABLE test_user_ids AS
SELECT id FROM user_profiles WHERE full_name LIKE 'TEST_%';

-- 2. Supprimer les données liées (ordre inverse des FK)
DELETE FROM tag_mentions WHERE message_id IN (
  SELECT id FROM forum_messages WHERE author_id IN (SELECT id FROM test_user_ids)
);
DELETE FROM forum_messages WHERE author_id IN (SELECT id FROM test_user_ids);

DELETE FROM bureau_votes WHERE voter_id IN (SELECT id FROM test_user_ids);
DELETE FROM bureau_votes WHERE proposal_id IN (
  SELECT id FROM bureau_proposals WHERE author_id IN (SELECT id FROM test_user_ids)
);
DELETE FROM bureau_proposals WHERE author_id IN (SELECT id FROM test_user_ids);
DELETE FROM bureau_pastoral_members WHERE user_id IN (SELECT id FROM test_user_ids);

DELETE FROM role_assignment_log WHERE performed_by IN (SELECT id FROM test_user_ids);
DELETE FROM role_assignment_log WHERE target_user IN (SELECT id FROM test_user_ids);

DELETE FROM donations WHERE donor_id IN (SELECT id FROM test_user_ids);

DELETE FROM communiques WHERE author_id IN (SELECT id FROM test_user_ids);

DELETE FROM tag_mentions; -- purger aussi les tags orphelins
DELETE FROM prayer_requests WHERE user_id IN (SELECT id FROM test_user_ids);

DELETE FROM department_members WHERE user_id IN (SELECT id FROM test_user_ids);
DELETE FROM service_assignments WHERE user_id IN (SELECT id FROM test_user_ids);

DELETE FROM notifications WHERE user_id IN (SELECT id FROM test_user_ids);
DELETE FROM notification_preferences WHERE user_id IN (SELECT id FROM test_user_ids);

DELETE FROM role_requests WHERE user_id IN (SELECT id FROM test_user_ids);
DELETE FROM visitor_followups WHERE visitor_id IN (SELECT id FROM test_user_ids);
DELETE FROM visitor_followups WHERE assigned_to IN (SELECT id FROM test_user_ids);

-- 3. Supprimer les profils
DELETE FROM user_profiles WHERE id IN (SELECT id FROM test_user_ids);

-- 4. Supprimer les comptes auth (cascade via trigger ou manuel)
DELETE FROM auth.users WHERE email LIKE 'test_%@laconquete.test';

-- 5. Nettoyer les extensions de test
DELETE FROM extensions WHERE name LIKE 'Extension TEST%';

-- 6. Supprimer les départements de test (si créés par le script de test)
DELETE FROM departments WHERE name LIKE 'TEST%';

-- 7. Notification de résultat
DO $$ BEGIN
  RAISE NOTICE '✅ Nettoyage terminé. Toutes les données TEST_ ont été supprimées.';
END $$;

COMMIT;