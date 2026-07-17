-- ═══════════════════════════════════════════════════════════════════
-- AUDIO_TRACKS — Lecteur audio persistant
-- Date: 2026-07-17
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audio_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Piste audio',
  speaker text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  audio_url text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'predication'
    CHECK (category IN ('predication', 'louange', 'enseignement', 'temoignage', 'autre')),
  duration_sec integer,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS — public read, admin manages via app
ALTER TABLE audio_tracks DISABLE ROW LEVEL SECURITY;

-- Index
CREATE INDEX IF NOT EXISTS idx_audio_tracks_active ON audio_tracks (is_active, sort_order);