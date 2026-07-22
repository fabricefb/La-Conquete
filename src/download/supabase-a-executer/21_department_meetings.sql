-- Department meetings table
-- Allows department heads to program weekly/special meetings
CREATE TABLE IF NOT EXISTS department_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TIME,
  location TEXT,
  agenda TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE department_meetings DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dm_dept ON department_meetings(department_id);
CREATE INDEX IF NOT EXISTS idx_dm_date ON department_meetings(meeting_date);