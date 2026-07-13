-- Table for pastoral role requests
CREATE TABLE IF NOT EXISTS role_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('ancien', 'diacre', 'collaborateur', 'assistant_pastor', 'pastor_assoc')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'approuve', 'refuse')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);
CREATE INDEX IF NOT EXISTS idx_role_requests_user ON role_requests(user_id);

-- RLS (disabled like user_profiles, but create policies for future use)
ALTER TABLE role_requests ENABLE ROW LEVEL SECURITY;

-- Simple policy: users can see their own requests, admins see all
DO $$ BEGIN
  CREATE POLICY "Users see own role requests" ON role_requests
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own requests" ON role_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can see all role requests" ON role_requests
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND (is_admin = true OR role_level >= 5))
    );
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update all role requests" ON role_requests
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND (is_admin = true OR role_level >= 5))
    );
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;