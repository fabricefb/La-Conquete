-- ═══════════════════════════════════════════════════════
-- Migration: CREATE contents table (generic CMS)
-- Used by: BlogPage (type='blog'), EnseignementsPage (type='enseignement'),
--          TopBar (type='communique')
-- ⚠️ This table was missing — only page_contents existed
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  value TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'blog'
    CHECK (type IN ('blog', 'enseignement', 'communique', 'actualite', 'evenement', 'ressource')),
  category TEXT DEFAULT '',
  speaker TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  is_featured BOOLEAN DEFAULT false,
  audio_url TEXT DEFAULT '',
  pdf_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published contents" ON contents
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins full access" ON contents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contents_type ON contents (type, status);
CREATE INDEX IF NOT EXISTS idx_contents_featured ON contents (type, is_featured) WHERE is_featured = true;