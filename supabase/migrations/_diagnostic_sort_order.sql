-- ═══════════════════════════════════════════════════════
-- Diagnostic: Trouver la colonne sort_order manquante
-- Exécutez ce script dans le SQL Editor Supabase
-- ═══════════════════════════════════════════════════════

SELECT 
  t.table_name,
  CASE 
    WHEN c.column_name IS NULL THEN '❌ MANQUANTE'
    ELSE '✅ OK'
  END as status
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
  ON c.table_name = t.table_name 
  AND c.column_name = 'sort_order'
  AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY status DESC, t.table_name;