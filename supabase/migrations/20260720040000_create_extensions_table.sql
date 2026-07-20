-- ═══════════════════════════════════════════════════════
-- Migration: CREATE extensions table
-- Used by: ExtensionsPage, ProtocolTab, ProtocolSection
-- ⚠️ This table was missing — code queried it but no migration created it
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS extensions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  city TEXT DEFAULT '',
  address TEXT DEFAULT '',
  description TEXT DEFAULT '',
  pastor_name TEXT DEFAULT '',
  pastor_role TEXT DEFAULT '',
  pastor_photo TEXT DEFAULT '',
  schedule TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active extensions" ON extensions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins full access" ON extensions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_extensions_active ON extensions (is_active, sort_order);