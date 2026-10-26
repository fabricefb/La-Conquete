-- ═══════════════════════════════════════════════════════════════════════════
-- 24 — NETTOYAGE DES ANCIENNES SECTIONS DE LA PAGE ÉVÉNEMENTS
--
-- La page #events a été consolidée : les sections « upcoming », « weekly_heading »
-- et « newsletter » n'existent plus dans l'éditeur, et les champs
-- heading_label/heading_title de « weekly » ont été remplacés.
--
-- Les nouvelles sections (calendar, weekly, stay_connected, champs marathon
-- supplémentaires) sont créées automatiquement à la première ouverture de
-- « Autres pages → Événements » dans le back-office. Ce script supprime
-- seulement les lignes devenues invisibles.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DELETE FROM page_contents
WHERE page = 'events'
  AND section_key IN ('upcoming', 'weekly_heading', 'newsletter');

DELETE FROM page_contents
WHERE page = 'events'
  AND section_key = 'weekly'
  AND field_key IN ('heading_label', 'heading_title');

COMMIT;

-- Contrôle :
--   SELECT section_key, count(*) FROM page_contents WHERE page = 'events' GROUP BY 1 ORDER BY 1;
