-- ═══════════════════════════════════════════════════════════════════
-- Migration: sermons + activity_cards tables
-- Date: 2026-07-20
-- Purpose: Admin-manageable predications page + homepage explore section
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. SERMONS table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sermons (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT NOT NULL,
  preacher      TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  series        TEXT NOT NULL DEFAULT '',
  duration      TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  video_url     TEXT NOT NULL DEFAULT '',
  audio_url     TEXT NOT NULL DEFAULT '',
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  preached_on   DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sermons: public read active" ON public.sermons
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Sermons: full admin all" ON public.sermons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_sermons_sort ON public.sermons (sort_order ASC, preached_on DESC);

-- ─── 2. ACTIVITY_CARDS table (homepage explore section) ───────────
CREATE TABLE IF NOT EXISTS public.activity_cards (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_key    TEXT NOT NULL UNIQUE,            -- 'predications', 'events', 'ministries', 'medias', 'actualites'
  title       TEXT NOT NULL DEFAULT '',
  stat_label  TEXT NOT NULL DEFAULT '',         -- '12+ messages', 'Prochains événements', etc.
  image_url   TEXT NOT NULL DEFAULT '',
  target_page TEXT NOT NULL DEFAULT '',         -- 'predications', 'events', 'departments', 'media', 'blog'
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ActivityCards: public read active" ON public.activity_cards
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "ActivityCards: full admin all" ON public.activity_cards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ─── 3. Seed default activity cards ─────────────────────────────────
INSERT INTO public.activity_cards (card_key, title, stat_label, image_url, target_page, sort_order) VALUES
  ('predications', 'Prédications', '12+ messages',
   'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg?auto=compress&cs=tinysrgb&w=800',
   'predications', 1),
  ('events', 'Événements', 'Prochains événements',
   'https://images.pexels.com/photos/2774557/pexels-photo-2774557.jpeg?auto=compress&cs=tinysrgb&w=800',
   'events', 2),
  ('ministries', 'Ministères', '8 départements',
   'https://images.pexels.com/photos/8465180/pexels-photo-8465180.jpeg?auto=compress&cs=tinysrgb&w=800',
   'departments', 3),
  ('medias', 'Médias', 'Vidéos & podcasts',
   'https://images.pexels.com/photos/196656/pexels-photo-196656.jpeg?auto=compress&cs=tinysrgb&w=800',
   'media', 4),
  ('actualites', 'Actualités', 'Dernières nouvelles',
   'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800',
   'blog', 5)
ON CONFLICT (card_key) DO NOTHING;