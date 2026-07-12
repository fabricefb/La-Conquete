-- ═══════════════════════════════════════════════════════════════════
-- Migration: Features Batch — 13 Juillet 2026
-- Église Évangélique La Conquête
-- ═══════════════════════════════════════════════════════════════════

-- 1. ONBOARDING ANSWERS — Store user onboarding responses for admin visibility
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  gender TEXT,
  birth_date DATE,
  department_id UUID,
  department_name TEXT,
  position_id UUID,
  position_name TEXT,
  motivation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE onboarding_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all onboarding answers" ON onboarding_answers
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

-- 2. EVENT ENHANCEMENTS — YouTube/FB links + comments
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS youtube_url TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS category_custom TEXT DEFAULT '';

-- Event comments table
CREATE TABLE IF NOT EXISTS event_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read event comments" ON event_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can post comments" ON event_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authors can delete their comments" ON event_comments
  FOR DELETE USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

-- 3. TESTIMONIALS WORKFLOW — member submission → pastor review → publish
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('pending', 'approved', 'rejected', 'published'));
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' CHECK (category IN ('general', 'guerison', 'finance', 'maternite', 'delivrance', 'miracle', 'salut', 'famille', 'autre'));
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;

-- 4. PASTORS TABLE — Enhanced with social links, video, extended bio
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE pastors ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '';
ALTER TABLE pastors ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE pastors ADD COLUMN IF NOT EXISTS extended_bio TEXT DEFAULT '';
ALTER TABLE pastors ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pastors ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE pastors ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

-- 5. USER BLOCKING
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 6. CUSTOM ICONS for site settings
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_icons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('svg', 'png')),
  svg_content TEXT,          -- raw SVG markup
  file_url TEXT,              -- URL for PNG uploads
  size INTEGER DEFAULT 24,
  color TEXT DEFAULT '#d4a843',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE custom_icons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage custom icons" ON custom_icons
  FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

-- 7. CRENEAUX SYSTEM — Serviteurs program/schedule management
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creneaux (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'visite' CHECK (type IN ('visite', 'entretien', 'culte', 'reunion', 'formation', 'evangelisation', 'priere', 'suivi', 'autre')),
  status TEXT NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert', 'en_cours', 'termine', 'annule')),
  target_roles TEXT[] DEFAULT ARRAY['collaborateur', 'diacre', 'ancien', 'assistant_pastor', 'pasteur_assoc']::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creneau_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creneau_id UUID NOT NULL REFERENCES creneaux(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responder_name TEXT,
  responder_role TEXT,
  status TEXT NOT NULL DEFAULT 'accepte' CHECK (status IN ('accepte', 'refuse', 'termine', 'annule')),
  notes TEXT DEFAULT '',
  responded_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(creneau_id, responder_id)
);

-- RLS for creneaux
ALTER TABLE creneaux ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Serviteurs and admins can view creneaux" ON creneaux
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 3)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "Serviteurs and admins can create creneaux" ON creneaux
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 3)
  );
CREATE POLICY "Creator or admin can update creneaux" ON creneaux
  FOR UPDATE USING (
    creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "Creator or admin can delete creneaux" ON creneaux
  FOR DELETE USING (
    creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- RLS for creneau_responses
ALTER TABLE creneau_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Serviteurs and admins can view responses" ON creneau_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 3)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "Serviteurs can respond" ON creneau_responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 3)
  );
CREATE POLICY "Responder or admin can update" ON creneau_responses
  FOR UPDATE USING (
    responder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 8. INDEXES for performance
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_onboarding_answers_user ON onboarding_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_event ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_creneaux_date ON creneaux(date);
CREATE INDEX IF NOT EXISTS idx_creneaux_creator ON creneaux(creator_id);
CREATE INDEX IF NOT EXISTS idx_creneau_responses_creneau ON creneau_responses(creneau_id);
CREATE INDEX IF NOT EXISTS idx_creneau_responses_responder ON creneau_responses(responder_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_blocked ON user_profiles(is_blocked);
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON testimonials(status);