-- Fix events category CHECK constraint to include all categories used in the UI
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_category_check;
ALTER TABLE events ADD CONSTRAINT events_category_check
  CHECK (category IN ('Cultes','Missions','Jeunesse','Communion','Formation','Évangélisation','Spécial','Autre'));

-- Fix onboarding_answers: allow users to INSERT their own answers
CREATE POLICY "Users can insert own onboarding answers" ON onboarding_answers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Disable RLS on user_profiles to prevent infinite recursion
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;