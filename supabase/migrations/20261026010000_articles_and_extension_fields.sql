-- ═══════════════════════════════════════════════════════════════════
-- Articles éditables + extensions enrichies + pages libres
-- Date: 2026-10-26
--
-- Objectifs :
--   1. Table `articles` pour publier les actualités depuis le back-office,
--      avec repli sur les articles statiques tant qu'elle est vide.
--   2. `locations` : GPS facultatif, description et photo pour les
--      extensions de la page Missions.
--   3. `page_contents` : suppression du CHECK qui limitait les pages
--      éditables (Missions, Ministères, Pasteurs, etc.).
--   4. Storage : upload réservé aux administrateurs connectés.
--
-- Aucune donnée d'église n'est insérée par cette migration.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Helper d'autorisation (évite la récursion RLS) ────────────────
CREATE OR REPLACE FUNCTION public.is_church_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_church_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_church_admin() TO anon, authenticated;

-- ─── 1. ARTICLES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.articles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  category        text NOT NULL DEFAULT 'Annonce'
                  CHECK (category IN ('Enseignement', 'Événement', 'Annonce', 'Vision')),
  published_at    timestamptz NOT NULL DEFAULT now(),
  excerpt         text NOT NULL DEFAULT '',
  image_url       text,
  body            jsonb NOT NULL DEFAULT '[]'::jsonb,
  quote_text      text,
  quote_reference text,
  source_url      text,
  is_featured     boolean NOT NULL DEFAULT false,
  is_published    boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT articles_body_is_array CHECK (jsonb_typeof(body) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_articles_published_at
  ON public.articles (published_at DESC);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "articles_public_read" ON public.articles;
CREATE POLICY "articles_public_read" ON public.articles
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "articles_admin_read" ON public.articles;
CREATE POLICY "articles_admin_read" ON public.articles
  FOR SELECT TO authenticated
  USING (public.is_church_admin());

DROP POLICY IF EXISTS "articles_admin_write" ON public.articles;
CREATE POLICY "articles_admin_write" ON public.articles
  FOR ALL TO authenticated
  USING (public.is_church_admin())
  WITH CHECK (public.is_church_admin());

CREATE OR REPLACE FUNCTION public.touch_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_set_updated_at ON public.articles;
CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.touch_content_updated_at();

-- ─── 2. GALERIE PHOTOS (page Médias) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.media_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text NOT NULL DEFAULT '',
  file_url      text NOT NULL,
  thumbnail_url text,
  file_type     text NOT NULL DEFAULT 'image'
                CHECK (file_type IN ('image', 'video', 'audio')),
  category      text NOT NULL DEFAULT 'general'
                CHECK (category IN ('sermon', 'event', 'worship', 'community', 'general')),
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_items_active_order
  ON public.media_items (is_active, sort_order);

ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_items_public_read" ON public.media_items;
CREATE POLICY "media_items_public_read" ON public.media_items
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "media_items_admin_write" ON public.media_items;
CREATE POLICY "media_items_admin_write" ON public.media_items
  FOR ALL TO authenticated
  USING (public.is_church_admin())
  WITH CHECK (public.is_church_admin());

DROP TRIGGER IF EXISTS media_items_set_updated_at ON public.media_items;
CREATE TRIGGER media_items_set_updated_at
  BEFORE UPDATE ON public.media_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_content_updated_at();

-- ─── 3. LOCATIONS / EXTENSIONS ────────────────────────────────────
ALTER TABLE public.locations ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.locations ALTER COLUMN longitude DROP NOT NULL;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_locations" ON public.locations;
DROP POLICY IF EXISTS "anon_insert_locations" ON public.locations;
DROP POLICY IF EXISTS "anon_update_locations" ON public.locations;
DROP POLICY IF EXISTS "anon_delete_locations" ON public.locations;
DROP POLICY IF EXISTS "locations_public_read" ON public.locations;
CREATE POLICY "locations_public_read" ON public.locations
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "locations_admin_write" ON public.locations;
CREATE POLICY "locations_admin_write" ON public.locations
  FOR ALL TO authenticated
  USING (public.is_church_admin())
  WITH CHECK (public.is_church_admin());

-- ─── 4. PAGE_CONTENTS : toutes les pages sont éditables ────────────
-- Le CHECK historique empêchait d'enregistrer Missions, Ministères,
-- Pasteurs, Jeunesse, Blog, Vision, Enseignements, etc.
ALTER TABLE public.page_contents DROP CONSTRAINT IF EXISTS page_contents_page_check;

-- Lecture publique, écriture réservée aux administrateurs.
ALTER TABLE public.page_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_public_read" ON public.page_contents;
CREATE POLICY "content_public_read" ON public.page_contents
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "content_admin_write" ON public.page_contents;
CREATE POLICY "content_admin_write" ON public.page_contents
  FOR ALL TO authenticated
  USING (public.is_church_admin())
  WITH CHECK (public.is_church_admin());

-- ─── 5. STORAGE « media » ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media', 'media', true, 52428800)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
CREATE POLICY "media_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_public_upload" ON storage.objects;
DROP POLICY IF EXISTS "media_public_update" ON storage.objects;
DROP POLICY IF EXISTS "media_public_delete" ON storage.objects;
DROP POLICY IF EXISTS "media_admin_insert" ON storage.objects;
CREATE POLICY "media_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.is_church_admin());

DROP POLICY IF EXISTS "media_admin_update" ON storage.objects;
CREATE POLICY "media_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.is_church_admin())
  WITH CHECK (bucket_id = 'media' AND public.is_church_admin());

DROP POLICY IF EXISTS "media_admin_delete" ON storage.objects;
CREATE POLICY "media_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.is_church_admin());
