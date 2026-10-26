-- ─────────────────────────────────────────────────────────────────────
-- Synchro « Mot du pasteur » : photo optimisée + cadrage choisi localement
-- À exécuter dans : Supabase → SQL Editor (projet yltlpljqhjnescqufibx)
-- La photo pasteur-principal.webp (84 Ko) doit être présente dans public/
-- au moment du déploiement (elle y est déjà dans le dépôt).
-- ─────────────────────────────────────────────────────────────────────

UPDATE page_contents
SET value = '/pasteur-principal.webp', updated_at = now()
WHERE page = 'home' AND section_key = 'pastor_word' AND field_key = 'portrait_image';

UPDATE page_contents
SET value = '1.1', updated_at = now()
WHERE page = 'home' AND section_key = 'pastor_word' AND field_key = 'portrait_scale';

UPDATE page_contents
SET value = '100', updated_at = now()
WHERE page = 'home' AND section_key = 'pastor_word' AND field_key = 'portrait_pos_y';

-- Vérification : la colonne updated_at doit afficher l'heure de l'exécution
SELECT field_key, value, updated_at
FROM page_contents
WHERE page = 'home' AND section_key = 'pastor_word'
ORDER BY field_key;
