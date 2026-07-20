-- ═══════════════════════════════════════════════════════
-- Migration: CREATE pastors table
-- ⚠️ This table was missing — only ALTER existed in 20260714000000
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pastors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Pasteur',
  bio TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  thought TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_main BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  video_url TEXT DEFAULT '',
  social_links JSONB DEFAULT '{}'::jsonb,
  extended_bio TEXT DEFAULT '',
  media_urls JSONB DEFAULT '[]'::jsonb,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE pastors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active pastors" ON pastors
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins full access" ON pastors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_pastors_active ON pastors (is_active, sort_order);
