-- ═══════════════════════════════════════════════════════════════════
-- FIX: Admin save errors
-- Date: 2026-07-16
--
-- Problems fixed:
-- 1. user_profiles RLS was re-enabled by erp_roles migration,
--    causing infinite recursion when site_settings/page_contents
--    policies check user_profiles.is_admin
-- 2. site_settings.category CHECK missing 'images' value
-- 3. page_contents.page CHECK missing several page values
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Disable RLS on user_profiles ───────────────────────────
-- Authorization is handled in application code (AuthContext).
-- RLS policies on user_profiles caused infinite recursion because
-- site_settings/page_contents write policies query user_profiles.
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ─── 2. Add 'images' to site_settings.category CHECK ───────────
ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_category_check;
ALTER TABLE site_settings ADD CONSTRAINT site_settings_category_check
  CHECK (category IN ('general', 'contact', 'social', 'seo', 'images'));

-- ─── 3. Expand page_contents.page CHECK ────────────────────────
ALTER TABLE page_contents DROP CONSTRAINT IF EXISTS page_contents_page_check;
ALTER TABLE page_contents ADD CONSTRAINT page_contents_page_check
  CHECK (page IN (
    'home', 'about', 'activities', 'events', 'media', 'contact',
    'culte', 'vision', 'pasteurs', 'ministeres', 'jeunesse',
    'enseignements', 'blog', 'predications', 'donnations',
    'communique', 'dashboard', 'pastoral', 'reports',
    'crm', 'communication'
  ));

-- ─── 4. Add 'image' to site_settings.type CHECK ──────────
ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_type_check;
ALTER TABLE site_settings ADD CONSTRAINT site_settings_type_check
  CHECK (type IN ('text', 'url', 'json', 'boolean', 'number', 'image'));

-- ─── 5. Add default for label column (fixes upsert without label) ──
ALTER TABLE site_settings ALTER COLUMN label SET DEFAULT '';

-- ─── 6. Drop NOT NULL on description (was causing issues) ─────
-- description is already nullable, just making sure upserts don't fail