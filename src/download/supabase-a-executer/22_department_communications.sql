-- Department communications table
-- Allows departments to send messages to each other (especially to Media)
CREATE TABLE IF NOT EXISTS department_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  recipient_department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'high', 'urgent')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE department_communications DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dc_recipient ON department_communications(recipient_department_id);
CREATE INDEX IF NOT EXISTS idx_dc_created ON department_communications(created_at DESC);