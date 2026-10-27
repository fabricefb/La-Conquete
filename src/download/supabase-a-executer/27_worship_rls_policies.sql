-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE PLANIFICATION DE CULTE — Politiques RLS
--
-- Problème : les tables worship_* sont en RLS activée sans aucune politique.
-- Résultat : le département Média ne peut ni créer un culte (401 / 42501),
-- ni enregistrer un formulaire, ni ouvrir un lien de formulaire en public.
--
-- Rappel du fonctionnement du module :
--   • le département Média crée les cultes et génère les liens depuis le site ;
--   • l'orateur ouvre un lien public (il n'a pas de compte) et soumet le formulaire ;
--   • le président du culte fait de même avec son propre lien.
-- Les liens sont donc publics par conception, comme prévu à l'origine
-- (« RLS désactivé, même pattern que cult_reports / protocole »).
--
-- IDÉMPOTENT : peut être ré-exécuté sans erreur.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'worship_services',
    'worship_form_links',
    'worship_orator_forms',
    'worship_orator_points',
    'worship_order_items'
  ]
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_module_access', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      t || '_module_access', t
    );
  END LOOP;
END $$;

-- Vérification rapide (doit renvoyer 5 lignes)
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename LIKE 'worship_%'
ORDER BY tablename;
