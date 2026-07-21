-- ═══════════════════════════════════════════════════════
-- FIX: Ajouter sort_order partout où ça manque
-- Exécutez ce script si vous obtenez:
--   ERROR: 42703: column "sort_order" does not exist
-- ═══════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Liste des tables qui DOIVENT avoir sort_order
  FOR r IN SELECT unnest(ARRAY[
    'page_contents',
    'site_settings',
    'locations',
    'ministries',
    'media_items',
    'testimonials',
    'departments',
    'positions',
    'department_members',
    'sermons',
    'activity_cards',
    'emissions',
    'announcements',
    'communications',
    'worship_schedules',
    'audio_tracks',
    'pastors',
    'extensions',
    'worship_services',
    'worship_order_items',
    'evangelism_outings',
    'protocol_teams',
    'protocol_schedules',
    'daily_verses',
    'impact_counters',
    'event_assignments',
    'cellules_maison'
  ]::text[]) AS tbl
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = r.tbl
        AND column_name = 'sort_order'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN sort_order INTEGER DEFAULT 0', r.tbl);
      RAISE NOTICE '✅ Ajouté sort_order à %', r.tbl;
    END IF;
  END LOOP;
END $$;