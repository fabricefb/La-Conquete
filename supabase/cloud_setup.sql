-- ═══════════════════════════════════════════════════════════════════════════
-- ÉGLISE ÉVANGÉLIQUE LA CONQUÊTE — INSTALLATION COMPLÈTE DU BACKEND
-- Projet Supabase : yltlpljqhjnescqufibx
-- Généré le 2026-10-26T09:36:14.502Z
--
-- À exécuter UNE FOIS dans le SQL Editor de Supabase (coller tout le fichier).
-- Contenu : schéma (DDL), policies RLS, triggers, fonctions, bucket "media".
-- Aucune donnée d'église, aucun compte de test : les contenus réels sont
-- importés ensuite depuis le back-office local.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;


SET statement_timeout = '120s';


-- ═══ 20260711120000_full_schema.sql ══════════════════════════════
-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION COMPLÈTE — Église Évangélique La Conquête
-- Date: 2026-07-11  (v2 — idempotent, ré-exécutable à volonté)
-- Tables: user_profiles, site_settings, page_contents, locations,
--          events, ministries, media_items, testimonials, contact_messages,
--          theme_settings
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. user_profiles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  address text,
  gender text,
  birth_date date,
  bio text,
  is_admin boolean NOT NULL DEFAULT false,
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_at timestamptz,
  blocked_reason text,
  last_seen_at timestamptz,
  onboarding_completed boolean NOT NULL DEFAULT false,
  role_level integer NOT NULL DEFAULT 1,
  pastor_category text,
  extension_id uuid,
  is_principal_pastor boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);



CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;


CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- RLS désactivé sur user_profiles : l'autorisation est gérée dans le code applicatif
-- Les policies admin causaient une récursion infinie (self-referencing SELECT).
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- Les accès sont contrôlés par AuthContext (isAdmin / isFullAdmin) côté client.

-- ─── 2. site_settings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'text'
    CHECK (type IN ('text', 'url', 'json', 'boolean', 'number')),
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'contact', 'social', 'seo')),
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);



ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "settings_public_read" ON site_settings;

DROP POLICY IF EXISTS "settings_public_read" ON site_settings;


CREATE POLICY "settings_public_read" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);



DROP POLICY IF EXISTS "settings_admin_write" ON site_settings;

DROP POLICY IF EXISTS "settings_admin_write" ON site_settings;


CREATE POLICY "settings_admin_write" ON site_settings FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "settings_admin_update" ON site_settings;

DROP POLICY IF EXISTS "settings_admin_update" ON site_settings;


CREATE POLICY "settings_admin_update" ON site_settings FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "settings_admin_delete" ON site_settings;

DROP POLICY IF EXISTS "settings_admin_delete" ON site_settings;


CREATE POLICY "settings_admin_delete" ON site_settings FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



-- ─── 3. page_contents ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL
    CHECK (page IN ('home', 'about', 'activities', 'events', 'media', 'contact')),
  section_key text NOT NULL,
  field_key text NOT NULL,
  value text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'text'
    CHECK (type IN ('text', 'html', 'image_url', 'url')),
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page, section_key, field_key)
);



ALTER TABLE page_contents ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "content_public_read" ON page_contents;

DROP POLICY IF EXISTS "content_public_read" ON page_contents;


CREATE POLICY "content_public_read" ON page_contents FOR SELECT
  TO anon, authenticated USING (true);



DROP POLICY IF EXISTS "content_admin_write" ON page_contents;

DROP POLICY IF EXISTS "content_admin_write" ON page_contents;


CREATE POLICY "content_admin_write" ON page_contents FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "content_admin_update" ON page_contents;

DROP POLICY IF EXISTS "content_admin_update" ON page_contents;


CREATE POLICY "content_admin_update" ON page_contents FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "content_admin_delete" ON page_contents;

DROP POLICY IF EXISTS "content_admin_delete" ON page_contents;


CREATE POLICY "content_admin_delete" ON page_contents FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



-- ─── 4. locations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  country text NOT NULL DEFAULT 'RDC',
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  phone text,
  email text,
  service_times text,
  pastor_name text,
  is_main boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);



ALTER TABLE locations ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "anon_select_locations" ON locations;

DROP POLICY IF EXISTS "anon_select_locations" ON locations;


CREATE POLICY "anon_select_locations" ON locations FOR SELECT
  TO anon, authenticated USING (true);



DROP POLICY IF EXISTS "anon_insert_locations" ON locations;


DROP POLICY IF EXISTS "locations_admin_insert" ON locations;

DROP POLICY IF EXISTS "locations_admin_insert" ON locations;


CREATE POLICY "locations_admin_insert" ON locations FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "anon_update_locations" ON locations;


DROP POLICY IF EXISTS "locations_admin_update" ON locations;

DROP POLICY IF EXISTS "locations_admin_update" ON locations;


CREATE POLICY "locations_admin_update" ON locations FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "anon_delete_locations" ON locations;


DROP POLICY IF EXISTS "locations_admin_delete" ON locations;

DROP POLICY IF EXISTS "locations_admin_delete" ON locations;


CREATE POLICY "locations_admin_delete" ON locations FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



-- ─── 5. events ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('Cultes', 'Missions', 'Jeunesse', 'Communion')),
  image_url text NOT NULL,
  event_date timestamptz NOT NULL,
  location text NOT NULL,
  is_live boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);



ALTER TABLE events ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "anon_select_events" ON events;

DROP POLICY IF EXISTS "anon_select_events" ON events;


CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon, authenticated USING (true);



DROP POLICY IF EXISTS "anon_insert_events" ON events;


DROP POLICY IF EXISTS "events_admin_insert" ON events;

DROP POLICY IF EXISTS "events_admin_insert" ON events;


CREATE POLICY "events_admin_insert" ON events FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "anon_update_events" ON events;


DROP POLICY IF EXISTS "events_admin_update" ON events;

DROP POLICY IF EXISTS "events_admin_update" ON events;


CREATE POLICY "events_admin_update" ON events FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "anon_delete_events" ON events;


DROP POLICY IF EXISTS "events_admin_delete" ON events;

DROP POLICY IF EXISTS "events_admin_delete" ON events;


CREATE POLICY "events_admin_delete" ON events FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



-- ─── 6. ministries ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ministries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon_name text NOT NULL DEFAULT 'Users',
  schedule text NOT NULL DEFAULT '',
  image_url text,
  accent_color text NOT NULL DEFAULT 'gold'
    CHECK (accent_color IN ('gold', 'ember')),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);



ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "ministries_public_read" ON ministries;

DROP POLICY IF EXISTS "ministries_public_read" ON ministries;


CREATE POLICY "ministries_public_read" ON ministries FOR SELECT
  TO anon, authenticated USING (true);



DROP POLICY IF EXISTS "ministries_admin_insert" ON ministries;

DROP POLICY IF EXISTS "ministries_admin_insert" ON ministries;


CREATE POLICY "ministries_admin_insert" ON ministries FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "ministries_admin_update" ON ministries;

DROP POLICY IF EXISTS "ministries_admin_update" ON ministries;


CREATE POLICY "ministries_admin_update" ON ministries FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "ministries_admin_delete" ON ministries;

DROP POLICY IF EXISTS "ministries_admin_delete" ON ministries;


CREATE POLICY "ministries_admin_delete" ON ministries FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



-- ─── 7. media_items ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  file_url text NOT NULL,
  thumbnail_url text,
  file_type text NOT NULL DEFAULT 'image'
    CHECK (file_type IN ('image', 'video', 'audio')),
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN ('sermon', 'event', 'worship', 'community', 'general')),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);



ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "media_public_read" ON media_items;

DROP POLICY IF EXISTS "media_public_read" ON media_items;


CREATE POLICY "media_public_read" ON media_items FOR SELECT
  TO anon, authenticated USING (true);



DROP POLICY IF EXISTS "media_admin_insert" ON media_items;

DROP POLICY IF EXISTS "media_admin_insert" ON media_items;


CREATE POLICY "media_admin_insert" ON media_items FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "media_admin_update" ON media_items;

DROP POLICY IF EXISTS "media_admin_update" ON media_items;


CREATE POLICY "media_admin_update" ON media_items FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "media_admin_delete" ON media_items;

DROP POLICY IF EXISTS "media_admin_delete" ON media_items;


CREATE POLICY "media_admin_delete" ON media_items FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



-- ─── 8. testimonials ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_title text,
  content text NOT NULL,
  photo_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);



ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "testimonials_public_read" ON testimonials;

DROP POLICY IF EXISTS "testimonials_public_read" ON testimonials;


CREATE POLICY "testimonials_public_read" ON testimonials FOR SELECT
  TO anon, authenticated USING (true);



DROP POLICY IF EXISTS "testimonials_admin_insert" ON testimonials;

DROP POLICY IF EXISTS "testimonials_admin_insert" ON testimonials;


CREATE POLICY "testimonials_admin_insert" ON testimonials FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "testimonials_admin_update" ON testimonials;

DROP POLICY IF EXISTS "testimonials_admin_update" ON testimonials;


CREATE POLICY "testimonials_admin_update" ON testimonials FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "testimonials_admin_delete" ON testimonials;

DROP POLICY IF EXISTS "testimonials_admin_delete" ON testimonials;


CREATE POLICY "testimonials_admin_delete" ON testimonials FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



-- ─── 9. contact_messages ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL DEFAULT '',
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);



ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "messages_public_insert" ON contact_messages;

DROP POLICY IF EXISTS "messages_public_insert" ON contact_messages;


CREATE POLICY "messages_public_insert" ON contact_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);



DROP POLICY IF EXISTS "messages_admin_read" ON contact_messages;

DROP POLICY IF EXISTS "messages_admin_read" ON contact_messages;


CREATE POLICY "messages_admin_read" ON contact_messages FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "messages_admin_update" ON contact_messages;

DROP POLICY IF EXISTS "messages_admin_update" ON contact_messages;


CREATE POLICY "messages_admin_update" ON contact_messages FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "messages_admin_delete" ON contact_messages;

DROP POLICY IF EXISTS "messages_admin_delete" ON contact_messages;


CREATE POLICY "messages_admin_delete" ON contact_messages FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



-- ─── 10. theme_settings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS theme_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  primary_color text NOT NULL DEFAULT '#e8a73c',
  secondary_color text NOT NULL DEFAULT '#f23c2e',
  accent_color text NOT NULL DEFAULT '#efc06a',
  button_style text NOT NULL DEFAULT 'pill'
    CHECK (button_style IN ('pill', 'rounded', 'sharp', 'outline', 'gradient')),
  card_style text NOT NULL DEFAULT 'glass'
    CHECK (card_style IN ('glass', 'flat', 'bordered', 'shadowed', 'glass-bordered')),
  border_radius text NOT NULL DEFAULT 'medium'
    CHECK (border_radius IN ('none', 'small', 'medium', 'large', 'full')),
  title_font text NOT NULL DEFAULT 'Cormorant Garamond',
  body_font text NOT NULL DEFAULT 'Inter',
  updated_at timestamptz NOT NULL DEFAULT now()
);



ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "theme_public_read" ON theme_settings;

DROP POLICY IF EXISTS "theme_public_read" ON theme_settings;


CREATE POLICY "theme_public_read" ON theme_settings FOR SELECT
  TO anon, authenticated USING (true);



DROP POLICY IF EXISTS "theme_admin_write" ON theme_settings;

DROP POLICY IF EXISTS "theme_admin_write" ON theme_settings;


CREATE POLICY "theme_admin_write" ON theme_settings FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



DROP POLICY IF EXISTS "theme_admin_update" ON theme_settings;

DROP POLICY IF EXISTS "theme_admin_update" ON theme_settings;


CREATE POLICY "theme_admin_update" ON theme_settings FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));



-- ═══════════════════════════════════════════════════════════════════
-- FIN — Ce script est idempotent : vous pouvez le relancer autant
-- de fois que nécessaire sans erreur.
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- HELPERS D'AUTORISATION
-- Créés après user_profiles, avant les policies qui les utilisent.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_church_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;


CREATE OR REPLACE FUNCTION public.touch_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;



-- ═══ 20260711060000_erp_roles.sql ════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════
--  Migration ERP Église — Rôles, Départements, Prières, Planning
--  Église Évangélique La Conquête — Juillet 2026
--  ═══════════════════════════════════════════════════════════════════

-- ─── 1. ENUM pour les rôles ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'visitor',
    'member',
    'servant',
    'chief',
    'pastor',
    'super_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;



-- ─── 2. ALTER user_profiles : ajouter le rôle ──────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'visitor';
  END IF;
END $$;



DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
  END IF;
END $$;



DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address TEXT;
  END IF;
END $$;



DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));
  END IF;
END $$;



DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
  END IF;
END $$;



DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;



-- ─── 3. TABLE: departments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'Users',
  accent_color TEXT DEFAULT 'gold',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);



-- ─── 4. TABLE: positions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);



-- ─── 5. TABLE: department_members (many-to-many) ───────────────────
CREATE TABLE IF NOT EXISTS department_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, department_id)
);



-- ─── 6. TABLE: role_requests ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  requested_role user_role NOT NULL CHECK (requested_role IN ('member', 'servant', 'chief')),
  department_id UUID REFERENCES departments(id),
  position_id UUID REFERENCES positions(id),
  motivation TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);



-- ─── 7. TABLE: prayer_requests ────────────────────────────────────
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  author_name TEXT,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_confidential BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'praying', 'answered')),
  prayed_by UUID REFERENCES user_profiles(id),
  prayed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);



-- ─── 8. TABLE: daily_thoughts (Pensée du Jour) ───────────────────
CREATE TABLE IF NOT EXISTS daily_thoughts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES user_profiles(id),
  verse_reference TEXT,
  verse_text TEXT NOT NULL,
  reflection TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);



-- ─── 9. TABLE: service_plannings ──────────────────────────────────
CREATE TABLE IF NOT EXISTS service_plannings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id),
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'culte' CHECK (service_type IN ('culte', 'repetition', 'special', 'veillerie', 'etude')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);



-- ─── 10. TABLE: service_assignments ────────────────────────────────
CREATE TABLE IF NOT EXISTS service_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID NOT NULL REFERENCES service_plannings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  position_id UUID NOT NULL REFERENCES positions(id),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'declined')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(planning_id, user_id, position_id)
);



-- ─── 11. TABLE: department_posts (fil d'actualité) ─────────────────
CREATE TABLE IF NOT EXISTS department_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES user_profiles(id),
  department_id UUID NOT NULL REFERENCES departments(id),
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'announcement' CHECK (post_type IN ('announcement', 'encouragement', 'prayer_need', 'info', 'testimony')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);



-- ─── 12. TABLE: post_comments ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES department_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES user_profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);



-- ─── 13. TABLE: visitor_followups ─────────────────────────────────
CREATE TABLE IF NOT EXISTS visitor_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES user_profiles(id),
  assigned_to UUID NOT NULL REFERENCES user_profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'returned', 'lost')),
  contact_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);



-- ─── 14. TABLE: notification_preferences ───────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  pastoral_whatsapp BOOLEAN NOT NULL DEFAULT false,
  pastoral_sms BOOLEAN NOT NULL DEFAULT false,
  pastoral_call BOOLEAN NOT NULL DEFAULT false,
  dept_notifications BOOLEAN NOT NULL DEFAULT true,
  prayer_updates BOOLEAN NOT NULL DEFAULT true,
  service_reminders BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);



-- ═══════════════════════════════════════════════════════════════════
--  RLS — Row Level Security
-- ═══════════════════════════════════════════════════════════════════

-- ─── Helper Functions ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;



CREATE OR REPLACE FUNCTION is_pastor_or_above() RETURNS BOOLEAN AS $$
  SELECT role IN ('pastor', 'super_admin') FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;



CREATE OR REPLACE FUNCTION is_chief_or_above() RETURNS BOOLEAN AS $$
  SELECT role IN ('chief', 'pastor', 'super_admin') FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;



CREATE OR REPLACE FUNCTION is_member_or_above() RETURNS BOOLEAN AS $$
  SELECT role NOT IN ('visitor') FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;



CREATE OR REPLACE FUNCTION is_logged_in() RETURNS BOOLEAN AS $$
  SELECT auth.uid() IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;



CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;



CREATE OR REPLACE FUNCTION owns_profile(p_id UUID) RETURNS BOOLEAN AS $$
  SELECT p_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;



CREATE OR REPLACE FUNCTION is_chief_of(dept_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM department_members dm
    JOIN user_profiles up ON up.id = dm.user_id
    WHERE dm.user_id = auth.uid()
    AND dm.department_id = is_chief_of.dept_id
    AND up.role IN ('chief', 'pastor', 'super_admin')
    AND dm.is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;



CREATE OR REPLACE FUNCTION belongs_to_dept(dept_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM department_members
    WHERE user_id = auth.uid()
    AND department_id = belongs_to_dept.dept_id
    AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;



-- ─── Enable RLS on all new tables ─────────────────────────────────
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;


ALTER TABLE positions ENABLE ROW LEVEL SECURITY;


ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;


ALTER TABLE role_requests ENABLE ROW LEVEL SECURITY;


ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;


ALTER TABLE daily_thoughts ENABLE ROW LEVEL SECURITY;


ALTER TABLE service_plannings ENABLE ROW LEVEL SECURITY;


ALTER TABLE service_assignments ENABLE ROW LEVEL SECURITY;


ALTER TABLE department_posts ENABLE ROW LEVEL SECURITY;


ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;


ALTER TABLE visitor_followups ENABLE ROW LEVEL SECURITY;


ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;



-- Also enable on user_profiles if not already
DO $$ BEGIN
  ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;



-- ─── DEPARTMENTS ──────────────────────────────────────────────────
-- Public read, admin write
DO $$ BEGIN
  DROP POLICY IF EXISTS dept_select ON departments;
  CREATE POLICY dept_select ON departments FOR SELECT
    USING (true);
END $$;



DO $$ BEGIN
  DROP POLICY IF EXISTS dept_insert ON departments;
  CREATE POLICY dept_insert ON departments FOR INSERT
    WITH CHECK (is_super_admin());
END $$;



DO $$ BEGIN
  DROP POLICY IF EXISTS dept_update ON departments;
  CREATE POLICY dept_update ON departments FOR UPDATE
    USING (is_super_admin())
    WITH CHECK (is_super_admin());
END $$;



DO $$ BEGIN
  DROP POLICY IF EXISTS dept_delete ON departments;
  CREATE POLICY dept_delete ON departments FOR DELETE
    USING (is_super_admin());
END $$;



-- ─── POSITIONS ────────────────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS pos_select ON positions;
  CREATE POLICY pos_select ON positions FOR SELECT USING (true);
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS pos_insert ON positions;
  CREATE POLICY pos_insert ON positions FOR INSERT WITH CHECK (is_super_admin() OR is_chief_of(department_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS pos_update ON positions;
  CREATE POLICY pos_update ON positions FOR UPDATE USING (is_super_admin() OR is_chief_of(department_id)) WITH CHECK (is_super_admin() OR is_chief_of(department_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS pos_delete ON positions;
  CREATE POLICY pos_delete ON positions FOR DELETE USING (is_super_admin());
END $$;



-- ─── DEPARTMENT_MEMBERS ──────────────────────────────────────────
-- Members can see who is in their dept; admin/pastor see all
DO $$ BEGIN DROP POLICY IF EXISTS dm_select ON department_members;
  CREATE POLICY dm_select ON department_members FOR SELECT
    USING (is_pastor_or_above() OR belongs_to_dept(department_id) OR owns_profile(user_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS dm_insert ON department_members;
  CREATE POLICY dm_insert ON department_members FOR INSERT
    WITH CHECK (is_super_admin() OR (owns_profile(user_id) AND is_member_or_above()));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS dm_update ON department_members;
  CREATE POLICY dm_update ON department_members FOR UPDATE
    USING (is_super_admin() OR is_chief_of(department_id) OR owns_profile(user_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS dm_delete ON department_members;
  CREATE POLICY dm_delete ON department_members FOR DELETE
    USING (is_super_admin() OR owns_profile(user_id));
END $$;



-- ─── ROLE_REQUESTS ───────────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS rr_select ON role_requests;
  CREATE POLICY rr_select ON role_requests FOR SELECT
    USING (is_super_admin() OR owns_profile(user_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS rr_insert ON role_requests;
  CREATE POLICY rr_insert ON role_requests FOR INSERT
    WITH CHECK (owns_profile(user_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS rr_update ON role_requests;
  CREATE POLICY rr_update ON role_requests FOR UPDATE
    USING (is_super_admin())
    WITH CHECK (is_super_admin());
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS rr_delete ON role_requests;
  CREATE POLICY rr_delete ON role_requests FOR DELETE
    USING (is_super_admin());
END $$;



-- ─── PRAYER_REQUESTS ──────────────────────────────────────────────
-- User sees their own; pastor sees all non-confidential + all confidential
DO $$ BEGIN DROP POLICY IF EXISTS pr_select ON prayer_requests;
  CREATE POLICY pr_select ON prayer_requests FOR SELECT
    USING (
      owns_profile(user_id)
      OR is_pastor_or_above()
      OR (is_chief_or_above() AND NOT is_confidential)
    );
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS pr_insert ON prayer_requests;
  CREATE POLICY pr_insert ON prayer_requests FOR INSERT
    WITH CHECK (is_logged_in());
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS pr_update ON prayer_requests;
  CREATE POLICY pr_update ON prayer_requests FOR UPDATE
    USING (is_pastor_or_above() OR owns_profile(user_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS pr_delete ON prayer_requests;
  CREATE POLICY pr_delete ON prayer_requests FOR DELETE
    USING (is_super_admin() OR owns_profile(user_id));
END $$;



-- ─── DAILY_THOUGHTS ──────────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS dt_select ON daily_thoughts;
  CREATE POLICY dt_select ON daily_thoughts FOR SELECT USING (is_published = true OR is_pastor_or_above() OR owns_profile(author_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS dt_insert ON daily_thoughts;
  CREATE POLICY dt_insert ON daily_thoughts FOR INSERT WITH CHECK (is_pastor_or_above());
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS dt_update ON daily_thoughts;
  CREATE POLICY dt_update ON daily_thoughts FOR UPDATE USING (is_pastor_or_above() OR owns_profile(author_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS dt_delete ON daily_thoughts;
  CREATE POLICY dt_delete ON daily_thoughts FOR DELETE USING (is_super_admin());
END $$;



-- ─── SERVICE_PLANNINGS ────────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS sp_select ON service_plannings;
  CREATE POLICY sp_select ON service_plannings FOR SELECT
    USING (is_member_or_above() OR belongs_to_dept(department_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS sp_insert ON service_plannings;
  CREATE POLICY sp_insert ON service_plannings FOR INSERT
    WITH CHECK (is_super_admin() OR is_chief_of(department_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS sp_update ON service_plannings;
  CREATE POLICY sp_update ON service_plannings FOR UPDATE
    USING (is_super_admin() OR is_chief_of(department_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS sp_delete ON service_plannings;
  CREATE POLICY sp_delete ON service_plannings FOR DELETE USING (is_super_admin());
END $$;



-- ─── SERVICE_ASSIGNMENTS ─────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS sa_select ON service_assignments;
  CREATE POLICY sa_select ON service_assignments FOR SELECT
    USING (owns_profile(user_id) OR is_super_admin() OR is_chief_of(
      (SELECT department_id FROM service_plannings WHERE id = planning_id)
    ));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS sa_insert ON service_assignments;
  CREATE POLICY sa_insert ON service_assignments FOR INSERT
    WITH CHECK (is_super_admin() OR is_chief_of(
      (SELECT department_id FROM service_plannings WHERE id = planning_id)
    ));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS sa_update ON service_assignments;
  CREATE POLICY sa_update ON service_assignments FOR UPDATE
    USING (owns_profile(user_id) OR is_super_admin() OR is_chief_of(
      (SELECT department_id FROM service_plannings WHERE id = planning_id)
    ));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS sa_delete ON service_assignments;
  CREATE POLICY sa_delete ON service_assignments FOR DELETE USING (is_super_admin());
END $$;



-- ─── DEPARTMENT_POSTS ────────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS dp_select ON department_posts;
  CREATE POLICY dp_select ON department_posts FOR SELECT
    USING (belongs_to_dept(department_id) OR is_pastor_or_above() OR owns_profile(author_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS dp_insert ON department_posts;
  CREATE POLICY dp_insert ON department_posts FOR INSERT
    WITH CHECK (belongs_to_dept(department_id) OR is_chief_of(department_id) OR is_pastor_or_above());
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS dp_update ON department_posts;
  CREATE POLICY dp_update ON department_posts FOR UPDATE
    USING (owns_profile(author_id) OR is_chief_of(department_id) OR is_pastor_or_above());
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS dp_delete ON department_posts;
  CREATE POLICY dp_delete ON department_posts FOR DELETE USING (is_super_admin() OR owns_profile(author_id));
END $$;



-- ─── POST_COMMENTS ────────────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS pc_select ON post_comments;
  CREATE POLICY pc_select ON post_comments FOR SELECT
    USING (belongs_to_dept(
      (SELECT department_id FROM department_posts WHERE id = post_id)
    ) OR is_pastor_or_above());
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS pc_insert ON post_comments;
  CREATE POLICY pc_insert ON post_comments FOR INSERT
    WITH CHECK (belongs_to_dept(
      (SELECT department_id FROM department_posts WHERE id = post_id)
    ) OR is_pastor_or_above());
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS pc_delete ON post_comments;
  CREATE POLICY pc_delete ON post_comments FOR DELETE
    USING (is_super_admin() OR owns_profile(author_id));
END $$;



-- ─── VISITOR_FOLLOWUPS ───────────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS vf_select ON visitor_followups;
  CREATE POLICY vf_select ON visitor_followups FOR SELECT
    USING (is_pastor_or_above() OR owns_profile(assigned_to) OR owns_profile(visitor_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS vf_insert ON visitor_followups;
  CREATE POLICY vf_insert ON visitor_followups FOR INSERT
    WITH CHECK (is_pastor_or_above());
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS vf_update ON visitor_followups;
  CREATE POLICY vf_update ON visitor_followups FOR UPDATE
    USING (is_pastor_or_above() OR owns_profile(assigned_to));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS vf_delete ON visitor_followups;
  CREATE POLICY vf_delete ON visitor_followups FOR DELETE USING (is_super_admin());
END $$;



-- ─── NOTIFICATION_PREFERENCES ────────────────────────────────────
DO $$ BEGIN DROP POLICY IF EXISTS np_select ON notification_preferences;
  CREATE POLICY np_select ON notification_preferences FOR SELECT USING (owns_profile(user_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS np_insert ON notification_preferences;
  CREATE POLICY np_insert ON notification_preferences FOR INSERT WITH CHECK (owns_profile(user_id));
END $$;


DO $$ BEGIN DROP POLICY IF EXISTS np_update ON notification_preferences;
  CREATE POLICY np_update ON notification_preferences FOR UPDATE USING (owns_profile(user_id));
END $$;



-- ─── USER_PROFILES — update existing policies for new role ───────
-- Read: everyone can see basic profiles; pastors see more
DO $$ BEGIN DROP POLICY IF EXISTS profiles_select_own ON user_profiles;
  CREATE POLICY profiles_select_own ON user_profiles FOR SELECT
    USING (
      owns_profile(id)
      OR is_pastor_or_above()
      OR (is_member_or_above() AND onboarding_completed = true)
    );
END $$;



-- Insert: auto-create on signup (trigger already exists)
-- Update: own profile, or admin
DO $$ BEGIN DROP POLICY IF EXISTS profiles_update_own ON user_profiles;
  CREATE POLICY profiles_update_own ON user_profiles FOR UPDATE
    USING (owns_profile(id) OR is_super_admin());
END $$;



-- Delete: only super_admin
DO $$ BEGIN DROP POLICY IF EXISTS profiles_delete ON user_profiles;
  CREATE POLICY profiles_delete ON user_profiles FOR DELETE USING (is_super_admin());
END $$;



-- ─── Index pour la performance ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dept_members_user ON department_members(user_id);


CREATE INDEX IF NOT EXISTS idx_dept_members_dept ON department_members(department_id);


CREATE INDEX IF NOT EXISTS idx_prayer_status ON prayer_requests(status);


CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);


CREATE INDEX IF NOT EXISTS idx_daily_thoughts_published ON daily_thoughts(is_published, published_at DESC);


CREATE INDEX IF NOT EXISTS idx_service_plannings_date ON service_plannings(service_date);


CREATE INDEX IF NOT EXISTS idx_dept_posts_dept ON department_posts(department_id, created_at DESC);


CREATE INDEX IF NOT EXISTS idx_followups_status ON visitor_followups(status);



-- ═══════════════════════════════════════════════════════════════════
--  TRIGGER: auto-create notification_preferences on signup
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auto_create_notif_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



DROP TRIGGER IF EXISTS on_auth_user_created_notif ON auth.users;

DROP TRIGGER IF EXISTS on_auth_user_created_notif ON auth.users;


CREATE TRIGGER on_auth_user_created_notif
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auto_create_notif_prefs();



-- ═══════════════════════════════════════════════════════════════════
--  Done!
-- ═══════════════════════════════════════════════════════════════════

-- ═══ 20260710150815_create_events_table.sql ══════════════════════
/*
# Create events table for La Conquête church

1. New Tables
- `events`
- `id` (uuid, primary key)
- `title` (text, not null) - event title
- `description` (text, not null) - event description
- `category` (text, not null) - one of: Cultes, Missions, Jeunesse, Communion
- `image_url` (text, not null) - cover image URL
- `event_date` (timestamptz, not null) - when the event takes place
- `location` (text, not null) - venue/location string
- `is_live` (boolean, default false) - whether the event is currently live
- `is_featured` (boolean, default false) - whether to show as featured card
- `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `events`.
- Allow anon + authenticated CRUD since events are public/shared (single-tenant, no auth).

3. Seed Data
- Inserts sample events matching the HTML references.
*/

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('Cultes', 'Missions', 'Jeunesse', 'Communion')),
  image_url text NOT NULL,
  event_date timestamptz NOT NULL,
  location text NOT NULL,
  is_live boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);



ALTER TABLE events ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "anon_select_events" ON events;

DROP POLICY IF EXISTS "anon_select_events" ON events;


CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon, authenticated USING (true);



DROP POLICY IF EXISTS "anon_insert_events" ON events;

DROP POLICY IF EXISTS "anon_insert_events" ON events;


CREATE POLICY "anon_insert_events" ON events FOR INSERT
  TO anon, authenticated WITH CHECK (true);



DROP POLICY IF EXISTS "anon_update_events" ON events;

DROP POLICY IF EXISTS "anon_update_events" ON events;


CREATE POLICY "anon_update_events" ON events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "anon_delete_events" ON events;

DROP POLICY IF EXISTS "anon_delete_events" ON events;


CREATE POLICY "anon_delete_events" ON events FOR DELETE
  TO anon, authenticated USING (true);


-- ═══ 20260712000000_create_media_bucket.sql ══════════════════════
-- Create the "media" storage bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;



-- Allow public reads on all objects in the media bucket
DROP POLICY IF EXISTS "media_public_read" ON storage.objects;

DROP POLICY IF EXISTS "media_public_read" ON storage.objects;


CREATE POLICY "media_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media');



-- Allow public uploads to the media bucket
DROP POLICY IF EXISTS "media_public_upload" ON storage.objects;

DROP POLICY IF EXISTS "media_public_upload" ON storage.objects;


CREATE POLICY "media_public_upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'media');



-- Allow public updates (upsert) in the media bucket
DROP POLICY IF EXISTS "media_public_update" ON storage.objects;

DROP POLICY IF EXISTS "media_public_update" ON storage.objects;


CREATE POLICY "media_public_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');



-- Allow public deletes in the media bucket
DROP POLICY IF EXISTS "media_public_delete" ON storage.objects;

DROP POLICY IF EXISTS "media_public_delete" ON storage.objects;


CREATE POLICY "media_public_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'media');


-- ═══ 20260713000000_notifications_v2.sql ═════════════════════════
-- ═══════════════════════════════════════════════════════════════════
--  Migration Complémentaire v2 — Notifications + Améliorations Profils
--  Église Évangélique La Conquête — Juillet 2026
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. TABLE: notifications (in-app) ──────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'prayer_prayed', 'service_assigned', 'service_accepted',
    'service_declined', 'role_approved', 'role_rejected',
    'new_post', 'new_comment', 'daily_thought', 'general',
    'visitor_assigned', 'onboarding_reminder'
  )),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  -- Pour lier à l'entité concernée (ex: prayer_request.id, role_request.id)
  ref_table TEXT,
  ref_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);



-- ─── 2. Améliorations user_profiles ────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'joined_via'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS joined_via TEXT CHECK (joined_via IN (
      'word_of_mouth', 'social_media', 'event', 'website', 'invitation', 'other'
    ));
  END IF;
END $$;



DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'membership_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS membership_date DATE;
  END IF;
END $$;



DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
  END IF;
END $$;



DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'previous_role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS previous_role TEXT;
  END IF;
END $$;



-- ─── 3. Fonction : créer une notification ─────────────────────
-- Cette fonction SECURITY DEFINER permet de créer des notifications
-- depuis n'importe quel contexte (trigger, RPC, etc.)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_ref_table TEXT DEFAULT NULL,
  p_ref_id UUID DEFAULT NULL
) RETURNS UUID AS $$
  DECLARE
    v_id UUID;
  BEGIN
    INSERT INTO notifications (user_id, type, title, body, link, ref_table, ref_id)
    VALUES (p_user_id, p_type, p_title, p_body, p_link, p_ref_table, p_ref_id)
    RETURNING id INTO v_id;
    RETURN v_id;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- ─── 4. RPC : Soumettre une requête de prière (anonyme ou non) ─
-- Permet aux visiteurs non authentifiés de soumettre des prières
-- via un appel RPC depuis le client Supabase
CREATE OR REPLACE FUNCTION submit_prayer_request(
  p_content TEXT,
  p_author_name TEXT DEFAULT 'Anonyme',
  p_is_anonymous BOOLEAN DEFAULT true,
  p_is_confidential BOOLEAN DEFAULT false
) RETURNS UUID AS $$
  DECLARE
    v_id UUID;
    v_user_id UUID;
  BEGIN
    -- Si l'utilisateur est connecté, lier à son profil
    v_user_id := auth.uid();

    INSERT INTO prayer_requests (user_id, author_name, content, is_anonymous, is_confidential)
    VALUES (
      v_user_id,
      CASE WHEN p_is_anonymous THEN 'Anonyme' ELSE COALESCE(p_author_name, 'Anonyme') END,
      p_content,
      p_is_anonymous,
      p_is_confidential
    )
    RETURNING id INTO v_id;

    -- Notifier les pasteurs de la nouvelle requête
    INSERT INTO notifications (user_id, type, title, body, ref_table, ref_id)
    SELECT
      up.id,
      'prayer_prayed'::text,
      'Nouvelle requête de prière'::text,
      CASE WHEN p_is_anonymous THEN 'Une demande anonyme a été soumise.' ELSE p_author_name || ' a soumis une demande de prière.' END,
      'prayer_requests'::text,
      v_id
    FROM user_profiles up
    WHERE up.role_level >= 5 OR up.is_admin = true;

    RETURN v_id;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- ─── 5. Trigger : Notification quand un pasteur prie ──────────
CREATE OR REPLACE FUNCTION notify_prayer_prayed()
RETURNS TRIGGER AS $$
BEGIN
  -- Si prayed_by est défini et status change vers 'praying'
  IF NEW.prayed_by IS NOT NULL AND NEW.prayed_at IS NOT NULL AND (OLD.prayed_by IS NULL OR OLD.prayed_at IS NULL) THEN
    -- Notifier l'auteur de la requête
    IF NEW.user_id IS NOT NULL AND NEW.user_id != NEW.prayed_by THEN
      INSERT INTO notifications (user_id, type, title, body, ref_table, ref_id)
      VALUES (
        NEW.user_id,
        'prayer_prayed',
        'Votre requête de prière a été prise en charge',
        (SELECT full_name FROM user_profiles WHERE id = NEW.prayed_by) || ' a prié pour votre requête aujourd''hui.',
        'prayer_requests',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



DROP TRIGGER IF EXISTS on_prayer_prayed ON prayer_requests;

DROP TRIGGER IF EXISTS on_prayer_prayed ON prayer_requests;


CREATE TRIGGER on_prayer_prayed
  AFTER UPDATE ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION notify_prayer_prayed();



-- ─── 6. Trigger : Notification quand un rôle est validé ───────
CREATE OR REPLACE FUNCTION notify_role_decision()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO notifications (user_id, type, title, body, ref_table, ref_id)
    VALUES (
      NEW.user_id,
      CASE WHEN NEW.status = 'approved' THEN 'role_approved' ELSE 'role_rejected' END,
      CASE WHEN NEW.status = 'approved'
        THEN 'Votre demande de rôle a été approuvée !'
        ELSE 'Votre demande de rôle a été refusée'
      END,
      CASE WHEN NEW.status = 'approved'
        THEN 'Vous êtes maintenant ' || NEW.requested_role || '.'
        ELSE COALESCE(NEW.admin_note, 'Contactez l''administration pour plus d''informations.')
      END,
      'role_requests',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



DROP TRIGGER IF EXISTS on_role_decision ON role_requests;

DROP TRIGGER IF EXISTS on_role_decision ON role_requests;


CREATE TRIGGER on_role_decision
  AFTER UPDATE ON role_requests
  FOR EACH ROW EXECUTE FUNCTION notify_role_decision();



-- ─── 7. RLS sur notifications ─────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;



DO $$ BEGIN
  DROP POLICY IF EXISTS notif_select ON notifications;
  CREATE POLICY notif_select ON notifications FOR SELECT
    USING (user_id = auth.uid());
END $$;



DO $$ BEGIN
  DROP POLICY IF EXISTS notif_update ON notifications;
  CREATE POLICY notif_update ON notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
END $$;



-- Pas de policy INSERT publique : les notifications sont créées
-- uniquement via triggers ou la fonction create_notification (SECURITY DEFINER)

-- ─── 8. Index ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifs_user_unread
  ON notifications(user_id, is_read, created_at DESC);


CREATE INDEX IF NOT EXISTS idx_notifs_user_created
  ON notifications(user_id, created_at DESC);


CREATE INDEX IF NOT EXISTS idx_profiles_role_level ON user_profiles(role_level);


CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON user_profiles(is_admin) WHERE is_admin = true;


CREATE INDEX IF NOT EXISTS idx_profiles_membership ON user_profiles(membership_date) WHERE membership_date IS NOT NULL;



-- ─── 9. Mettre à jour le trigger handle_new_user pour le joined_via ─
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, joined_via)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'joined_via'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- ═══════════════════════════════════════════════════════════════════
--  Done!
-- ═══════════════════════════════════════════════════════════════════

-- ═══ 20260714000000_features_batch.sql ═══════════════════════════
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

DROP POLICY IF EXISTS "Admins can view all onboarding answers" ON onboarding_answers;


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

DROP POLICY IF EXISTS "Anyone can read event comments" ON event_comments;


CREATE POLICY "Anyone can read event comments" ON event_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can post comments" ON event_comments;


CREATE POLICY "Authenticated users can post comments" ON event_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authors can delete their comments" ON event_comments;


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

DROP POLICY IF EXISTS "Admins manage custom icons" ON custom_icons;


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

DROP POLICY IF EXISTS "Serviteurs and admins can view creneaux" ON creneaux;


CREATE POLICY "Serviteurs and admins can view creneaux" ON creneaux
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 3)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Serviteurs and admins can create creneaux" ON creneaux;


CREATE POLICY "Serviteurs and admins can create creneaux" ON creneaux
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 3)
  );

DROP POLICY IF EXISTS "Creator or admin can update creneaux" ON creneaux;


CREATE POLICY "Creator or admin can update creneaux" ON creneaux
  FOR UPDATE USING (
    creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Creator or admin can delete creneaux" ON creneaux;


CREATE POLICY "Creator or admin can delete creneaux" ON creneaux
  FOR DELETE USING (
    creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );



-- RLS for creneau_responses
ALTER TABLE creneau_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Serviteurs and admins can view responses" ON creneau_responses;


CREATE POLICY "Serviteurs and admins can view responses" ON creneau_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 3)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Serviteurs can respond" ON creneau_responses;


CREATE POLICY "Serviteurs can respond" ON creneau_responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 3)
  );

DROP POLICY IF EXISTS "Responder or admin can update" ON creneau_responses;


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


-- ═══ 20260715000000_departments_module.sql ═══════════════════════
-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE DÉPARTEMENTS — Église Évangélique La Conquête
-- Tables: departments (enrichie), positions, department_members
-- RLS strict, triggers, index
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Enrichir la table departments si elle existe ─────────────────
DO $$
BEGIN
  -- Ajouter les colonnes manquantes à departments si la table existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments' AND table_schema = 'public') THEN
    -- meeting_schedule
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'meeting_schedule') THEN
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS meeting_schedule TEXT;
    END IF;
    -- mission
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'mission') THEN
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS mission TEXT;
    END IF;
    -- activities
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'activities') THEN
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS activities TEXT;
    END IF;
    -- requirements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'requirements') THEN
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS requirements TEXT;
    END IF;
    -- image_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'image_url') THEN
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS image_url TEXT;
    END IF;
    -- leader_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'leader_id') THEN
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;
    END IF;
    -- member_count (cache)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'member_count') THEN
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;
    END IF;
    RAISE NOTICE 'Table departments enrichie avec succès';
  ELSE
    -- Créer la table departments complète si elle n'existe pas
    CREATE TABLE IF NOT EXISTS departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      icon_name TEXT DEFAULT 'Users',
      accent_color TEXT DEFAULT 'gold',
      meeting_schedule TEXT,
      mission TEXT,
      activities TEXT,
      requirements TEXT,
      image_url TEXT,
      leader_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
      member_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      extension_id UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Index pour le tri
    CREATE INDEX IF NOT EXISTS idx_departments_sort ON departments(sort_order);
    CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_departments_extension ON departments(extension_id) WHERE extension_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_departments_slug ON departments(slug);

    RAISE NOTICE 'Table departments créée avec succès';
  END IF;
END $$;



-- ─── 2. Table positions (rôles au sein d'un département) ────────────
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department_id, name)
);



CREATE INDEX IF NOT EXISTS idx_positions_dept ON positions(department_id);


CREATE INDEX IF NOT EXISTS idx_positions_active ON positions(department_id, is_active) WHERE is_active = true;



-- ─── 3. Table department_members ────────────────────────────────────
CREATE TABLE IF NOT EXISTS department_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  role_in_dept TEXT NOT NULL DEFAULT 'member' CHECK (role_in_dept IN ('pending','member','leader')),
  is_primary BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, department_id)
);



CREATE INDEX IF NOT EXISTS idx_dept_members_user ON department_members(user_id);


CREATE INDEX IF NOT EXISTS idx_dept_members_dept ON department_members(department_id);


CREATE INDEX IF NOT EXISTS idx_dept_members_active ON department_members(department_id, is_active) WHERE is_active = true;


CREATE INDEX IF NOT EXISTS idx_dept_members_role ON department_members(user_id, department_id, is_active);



-- ═══════════════════════════════════════════════════════════════════════
-- RLS POLICIES — Departments
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;


ALTER TABLE positions ENABLE ROW LEVEL SECURITY;


ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;



-- ─── Departments RLS ───────────────────────────────────────────────
-- Tout le monde peut lire les départements actifs
DROP POLICY IF EXISTS departments_public_read ON departments;

DROP POLICY IF EXISTS "departments_public_read" ON departments;


CREATE POLICY departments_public_read ON departments
  FOR SELECT USING (is_active = true);



-- Les membres du département peuvent lire leur département (même inactif)
DROP POLICY IF EXISTS departments_member_read ON departments;

DROP POLICY IF EXISTS "departments_member_read" ON departments;


CREATE POLICY departments_member_read ON departments
  FOR SELECT USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM department_members dm
      WHERE dm.department_id = departments.id
        AND dm.user_id = auth.uid()
        AND dm.is_active = true
    )
  );



-- Admin et pasteurs peuvent tout voir
DROP POLICY IF EXISTS departments_admin_read ON departments;

DROP POLICY IF EXISTS "departments_admin_read" ON departments;


CREATE POLICY departments_admin_read ON departments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin = true OR up.role_level >= 5)
    )
  );



-- Seuls admin/pasteurs peuvent créer, modifier, supprimer
DROP POLICY IF EXISTS departments_admin_insert ON departments;

DROP POLICY IF EXISTS "departments_admin_insert" ON departments;


CREATE POLICY departments_admin_insert ON departments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin = true OR up.role_level >= 5)
    )
  );



DROP POLICY IF EXISTS departments_admin_update ON departments;

DROP POLICY IF EXISTS "departments_admin_update" ON departments;


CREATE POLICY departments_admin_update ON departments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin = true OR up.role_level >= 5)
    )
  );



DROP POLICY IF EXISTS departments_admin_delete ON departments;

DROP POLICY IF EXISTS "departments_admin_delete" ON departments;


CREATE POLICY departments_admin_delete ON departments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin = true OR up.role_level >= 5)
    )
  );



-- ─── Positions RLS ──────────────────────────────────────────────────
-- Tout le monde peut lire les positions des départements actifs
DROP POLICY IF EXISTS positions_public_read ON positions;

DROP POLICY IF EXISTS "positions_public_read" ON positions;


CREATE POLICY positions_public_read ON positions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM departments d
      WHERE d.id = positions.department_id AND d.is_active = true
    )
  );



-- Admin/pasteurs CRUD complet
DROP POLICY IF EXISTS positions_admin_all ON positions;

DROP POLICY IF EXISTS "positions_admin_all" ON positions;


CREATE POLICY positions_admin_all ON positions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin = true OR up.role_level >= 5)
    )
  );



-- Chef de département peut gérer les positions de son département
DROP POLICY IF EXISTS positions_leader_manage ON positions;

DROP POLICY IF EXISTS "positions_leader_manage" ON positions;

DROP POLICY IF EXISTS "positions_leader_update" ON positions;



-- ─── Department Members RLS ─────────────────────────────────────────
-- Chacun peut voir les membres des départements actifs
DROP POLICY IF EXISTS dept_members_public_read ON department_members;

DROP POLICY IF EXISTS "dept_members_public_read" ON department_members;


CREATE POLICY dept_members_public_read ON department_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM departments d
      WHERE d.id = department_members.department_id AND d.is_active = true
    )
  );



-- Un utilisateur peut voir sa propre appartenance
DROP POLICY IF EXISTS dept_members_self_read ON department_members;

DROP POLICY IF EXISTS "dept_members_self_read" ON department_members;


CREATE POLICY dept_members_self_read ON department_members
  FOR SELECT USING (user_id = auth.uid());



-- Un utilisateur peut demander à rejoindre (insert avec role_in_dept = 'pending')
DROP POLICY IF EXISTS dept_members_self_join ON department_members;

DROP POLICY IF EXISTS "dept_members_self_join" ON department_members;


CREATE POLICY dept_members_self_join ON department_members
  FOR INSERT WITH CHECK (user_id = auth.uid());



-- Admin/pasteurs peuvent tout gérer
DROP POLICY IF EXISTS dept_members_admin_all ON department_members;

DROP POLICY IF EXISTS "dept_members_admin_all" ON department_members;


CREATE POLICY dept_members_admin_all ON department_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (up.is_admin = true OR up.role_level >= 5)
    )
  );



-- Chef de département peut voir/modifier les membres de son département
DROP POLICY IF EXISTS dept_members_leader_read ON department_members;

DROP POLICY IF EXISTS "dept_members_leader_read" ON department_members;



DROP POLICY IF EXISTS dept_members_leader_update ON department_members;

DROP POLICY IF EXISTS "dept_members_leader_update" ON department_members;



-- Un utilisateur peut se retirer d'un département (delete sa propre ligne)
DROP POLICY IF EXISTS dept_members_self_leave ON department_members;

DROP POLICY IF EXISTS "dept_members_self_leave" ON department_members;


CREATE POLICY dept_members_self_leave ON department_members
  FOR DELETE USING (user_id = auth.uid());



-- ═══════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════

-- Trigger: mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;

DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;


CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();



DROP TRIGGER IF EXISTS trg_positions_updated_at ON positions;

DROP TRIGGER IF EXISTS trg_positions_updated_at ON positions;


CREATE TRIGGER trg_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();



-- Trigger: recaler le member_count sur la table departments
CREATE OR REPLACE FUNCTION refresh_department_member_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Après insert/delete/update sur department_members
  IF TG_OP = 'DELETE' THEN
    UPDATE departments SET member_count =
      (SELECT count(*) FROM department_members dm WHERE dm.department_id = COALESCE(OLD.department_id, NEW.department_id) AND dm.is_active = true AND dm.role_in_dept != 'pending')
    WHERE id = COALESCE(OLD.department_id, NEW.department_id);
    RETURN OLD;
  ELSE
    UPDATE departments SET member_count =
      (SELECT count(*) FROM department_members dm WHERE dm.department_id = NEW.department_id AND dm.is_active = true AND dm.role_in_dept != 'pending')
    WHERE id = NEW.department_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;



DROP TRIGGER IF EXISTS trg_refresh_member_count ON department_members;

DROP TRIGGER IF EXISTS trg_refresh_member_count ON department_members;



-- Trigger: auto-slug à la création d'un département
CREATE OR REPLACE FUNCTION slugify_dept_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Nettoyer les tirets en début/fin et les doubler
    NEW.slug = regexp_replace(NEW.slug, '(^-|-$)', '', 'g');
    NEW.slug = regexp_replace(NEW.slug, '-{2,}', '-', 'g');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



DROP TRIGGER IF EXISTS trg_dept_auto_slug ON departments;

DROP TRIGGER IF EXISTS trg_dept_auto_slug ON departments;


CREATE TRIGGER trg_dept_auto_slug
  BEFORE INSERT ON departments
  FOR EACH ROW EXECUTE FUNCTION slugify_dept_name();



-- ═══════════════════════════════════════════════════════════════════════
-- RÉCAPITULATIF
-- ═══════════════════════════════════════════════════════════════════════
-- Tables créées/enrichies : departments, positions, department_members
-- RLS activé sur les 3 tables avec politiques granulaires
-- Triggers : updated_at auto, member_count auto, slug auto
-- 6 départements exemples insérés
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 20260716000000_fix_admin_save_errors.sql ════════════════════
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

-- ═══ 20260716120000_fix_multiple_bugs.sql ════════════════════════
-- Fix events category CHECK constraint to include all categories used in the UI
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_category_check;


ALTER TABLE events ADD CONSTRAINT events_category_check
  CHECK (category IN ('Cultes','Missions','Jeunesse','Communion','Formation','Évangélisation','Spécial','Autre'));

DROP POLICY IF EXISTS "Users can insert own onboarding answers" ON onboarding_answers;



-- Fix onboarding_answers: allow users to INSERT their own answers
CREATE POLICY "Users can insert own onboarding answers" ON onboarding_answers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());



-- Disable RLS on user_profiles to prevent infinite recursion
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;


-- ═══ 20260717000000_fix_builder_save.sql ═════════════════════════
-- ═══════════════════════════════════════════════════════════════════
-- FIX COMPLET : Sauvegarde admin (builder, contenus, settings)
-- Date: 2026-07-17
--
-- Exécuter CE SCRIPT dans le SQL Editor de Supabase.
--
-- Problèmes résolus :
-- 1. user_profiles RLS causait une boucle infinie quand les
--    policies site_settings/page_contents vérifient is_admin
-- 2. Contraintes CHECK trop restrictives sur site_settings
-- 3. Permissions simplifiées pour tous les utilisateurs authentifiés
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Désactiver RLS sur user_profiles ──────────────────────
-- L'autorisation est gérée dans le code (AuthContext).
-- RLS sur user_profiles = boucle infinie avec les policies de site_settings.
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;



-- ─── 2. Simplifier les policies site_settings ────────────────
-- Au lieu de vérifier is_admin (qui causait la boucle),
-- on autorise tous les utilisateurs authentifiés à écrire.
-- La sécurité est gérée par l'interface admin (AuthContext + AdminAccess).

DROP POLICY IF EXISTS "settings_admin_write" ON site_settings;


DROP POLICY IF EXISTS "settings_auth_write" ON site_settings;

DROP POLICY IF EXISTS "settings_admin_write" ON site_settings;


CREATE POLICY "settings_admin_write" ON site_settings FOR INSERT
  TO authenticated WITH CHECK (true);



DROP POLICY IF EXISTS "settings_admin_update" ON site_settings;


DROP POLICY IF EXISTS "settings_auth_update" ON site_settings;

DROP POLICY IF EXISTS "settings_admin_update" ON site_settings;


CREATE POLICY "settings_admin_update" ON site_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);



DROP POLICY IF EXISTS "settings_admin_delete" ON site_settings;


DROP POLICY IF EXISTS "settings_auth_delete" ON site_settings;

DROP POLICY IF EXISTS "settings_admin_delete" ON site_settings;


CREATE POLICY "settings_admin_delete" ON site_settings FOR DELETE
  TO authenticated USING (true);



-- ─── 3. Élargir les CHECK sur site_settings ─────────────────
ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_category_check;


ALTER TABLE site_settings ADD CONSTRAINT site_settings_category_check
  CHECK (category IN ('general', 'contact', 'social', 'seo', 'images', 'theme', 'builder'));



ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_type_check;


ALTER TABLE site_settings ADD CONSTRAINT site_settings_type_check
  CHECK (type IN ('text', 'url', 'json', 'boolean', 'number', 'image'));



-- ─── 4. S'assurer que label a un DEFAULT ─────────────────────
ALTER TABLE site_settings ALTER COLUMN label SET DEFAULT '';



-- ─── 5. Simplifier les policies page_contents ────────────────
DROP POLICY IF EXISTS "contents_admin_write" ON page_contents;


DROP POLICY IF EXISTS "contents_auth_write" ON page_contents;


DROP POLICY IF EXISTS "contents_admin_update" ON page_contents;


DROP POLICY IF EXISTS "contents_auth_update" ON page_contents;


DROP POLICY IF EXISTS "contents_admin_delete" ON page_contents;


DROP POLICY IF EXISTS "contents_auth_delete" ON page_contents;

DROP POLICY IF EXISTS "contents_auth_write" ON page_contents;



CREATE POLICY "contents_auth_write" ON page_contents FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "contents_auth_update" ON page_contents;



CREATE POLICY "contents_auth_update" ON page_contents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "contents_auth_delete" ON page_contents;



CREATE POLICY "contents_auth_delete" ON page_contents FOR DELETE
  TO authenticated USING (true);


-- ═══ 20260717010000_fix_page_contents_full.sql ═══════════════════
-- ═══════════════════════════════════════════════════════════════════
-- FIX COMPLET page_contents — Église Évangélique La Conquête
-- Date: 2026-07-17
-- Problèmes résolus:
--   1. RLS bloquait toutes les écritures depuis la clé anon
--   2. CHECK constraint limitait à 6 pages (manquait departments, emissions, etc.)
--   3. Anciennes graines avec mauvaises clés (image_url vs bg_image, etc.)
--   4. Ajout du champ topbar manquant
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. DÉSACTIVER RLS sur page_contents ──────────────────────────
-- L'autorisation est gérée dans le code applicatif (comme user_profiles)
ALTER TABLE page_contents DISABLE ROW LEVEL SECURITY;



-- ─── 2. ÉTENDRE le CHECK constraint pour toutes les pages ──────────
ALTER TABLE page_contents DROP CONSTRAINT IF EXISTS page_contents_page_check;


ALTER TABLE page_contents ADD CONSTRAINT page_contents_page_check
  CHECK (page IN (
    'home', 'about', 'activities', 'events', 'media', 'contact',
    'departments', 'emissions', 'predications', 'dons'
  ));



-- ═══════════════════════════════════════════════════════════════════
-- FIN — Exécuter ce script dans le SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════════

-- ═══ 20260717020000_audio_tracks.sql ═════════════════════════════
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


-- ═══ 20260718000000_departments_complete.sql ═════════════════════
-- ═════════════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLÈTE: Départements — Église Évangélique La Conquête
-- Date       : 2026-07-18
-- Résumé     : department_requests, RLS off, 15 départements, positions,
--              données de test, trigger updated_at
-- Idempotent : Oui — tous les inserts utilisent ON CONFLICT DO NOTHING
-- Prérequis  : 20260711120000_full_schema.sql, 20260715000000_departments_module.sql
-- ═════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- 1. CONVERTIR activities ET requirements EN TEXT[]
--    (les anciennes migrations utilisaient TEXT simple)
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Convertir activities de TEXT → TEXT[] si nécessaire
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments'
      AND column_name = 'activities'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE departments ALTER COLUMN activities TYPE TEXT[] USING
      CASE WHEN activities IS NULL OR activities = '' THEN NULL
           ELSE string_to_array(activities, ', ')
      END;
    RAISE NOTICE 'Column departments.activities convertie en TEXT[]';
  END IF;

  -- Convertir requirements de TEXT → TEXT[] si nécessaire
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments'
      AND column_name = 'requirements'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE departments ALTER COLUMN requirements TYPE TEXT[] USING
      CASE WHEN requirements IS NULL OR requirements = '' THEN NULL
           ELSE string_to_array(requirements, ', ')
      END;
    RAISE NOTICE 'Column departments.requirements convertie en TEXT[]';
  END IF;
END $$;




-- ═══════════════════════════════════════════════════════════════
-- 2. TABLE department_requests (complète avec position_id)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS department_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (status IN ('en_attente', 'accepte', 'refuse')),
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, department_id)
);



-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_dept_requests_user
  ON department_requests(user_id);


CREATE INDEX IF NOT EXISTS idx_dept_requests_dept
  ON department_requests(department_id);


CREATE INDEX IF NOT EXISTS idx_dept_requests_status
  ON department_requests(status);



-- Ajouter position_id si la table existait déjà sans cette colonne
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'department_requests'
      AND column_name = 'position_id'
  ) THEN
    ALTER TABLE department_requests
      ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES positions(id) ON DELETE SET NULL;
  END IF;

  -- Ajouter message avec DEFAULT si absent
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'department_requests'
      AND column_name = 'message'
      AND column_default IS NULL
  ) THEN
    ALTER TABLE department_requests ALTER COLUMN message SET DEFAULT '';
  END IF;
END $$;




-- ═══════════════════════════════════════════════════════════════
-- 3. DÉSACTIVER RLS (pattern utilisé partout dans le projet)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE departments DISABLE ROW LEVEL SECURITY;


ALTER TABLE positions DISABLE ROW LEVEL SECURITY;


ALTER TABLE department_members DISABLE ROW LEVEL SECURITY;


ALTER TABLE department_requests DISABLE ROW LEVEL SECURITY;




-- ═══════════════════════════════════════════════════════════════
-- 8. TRIGGER: updated_at automatique sur department_requests
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_dept_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



DROP TRIGGER IF EXISTS set_updated_at ON department_requests;

DROP TRIGGER IF EXISTS set_updated_at ON department_requests;


CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON department_requests
  FOR EACH ROW EXECUTE FUNCTION update_dept_requests_updated_at();




-- ═══════════════════════════════════════════════════════════════
-- 9. VÉRIFICATION — Résumé des données insérées
-- ═══════════════════════════════════════════════════════════════

DO $$ DECLARE
  v_depts      INTEGER;
  v_positions  INTEGER;
  v_members    INTEGER;
  v_requests   INTEGER;
BEGIN
  SELECT count(*) INTO v_depts      FROM departments WHERE sort_order BETWEEN 1 AND 15;
  SELECT count(*) INTO v_positions  FROM positions p JOIN departments d ON d.id = p.department_id WHERE d.sort_order BETWEEN 1 AND 15;
  SELECT count(*) INTO v_members    FROM department_members dm JOIN user_profiles up ON up.id = dm.user_id WHERE up.phone LIKE '+2438100000%';
  SELECT count(*) INTO v_requests   FROM department_requests WHERE status = 'en_attente';

  RAISE NOTICE '╔══════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║     MIGRATION DEPARTEMENTS — RÉSUMÉ                    ║';
  RAISE NOTICE '╠══════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Départements (1-15)     : %', v_depts;
  RAISE NOTICE '║  Positions totales       : %', v_positions;
  RAISE NOTICE '║  Membres de test         : %', v_members;
  RAISE NOTICE '║  Demandes en attente     : %', v_requests;
  RAISE NOTICE '╠══════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  RLS désactivé sur: departments, positions,             ║';
  RAISE NOTICE '║    department_members, department_requests              ║';
  RAISE NOTICE '║  Trigger updated_at créé sur department_requests         ║';
  RAISE NOTICE '║  Colonnes activities/requirements → TEXT[]              ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════╝';
END $$;


-- ═══ 20260719000000_unified_fix.sql ══════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION UNIFIÉE — Église Évangélique La Conquête
-- Date: 2026-07-19
--
-- Combine et remplace les 3 migrations précédentes :
--   - 20260717000000_fix_builder_save.sql
--   - 20260717010000_fix_page_contents_full.sql
--   - 20260718000000_departments_complete.sql
--
-- PROBLÈME RÉSOLU: "42P10: no unique constraint matching ON CONFLICT"
-- → Chaque ON CONFLICT est précédé d'une garantie de contrainte existante.
--
-- Idempotent : OUI — peut être relancé autant de fois que nécessaire.
-- Prérequis  : 20260711120000_full_schema.sql + 20260715000000_departments_module.sql
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- PHASE 1 : SÉCURITÉ — Contraintes, CHECK, RLS
-- ═══════════════════════════════════════════════════════════════

-- ─── 1A. Désactiver RLS sur user_profiles ─────────────────
-- RLS sur user_profiles = boucle infinie quand les policies
-- site_settings/page_contents vérifient is_admin.
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'page_contents_page_section_key_field_key_key'
  ) THEN
    ALTER TABLE page_contents
      ADD CONSTRAINT page_contents_page_section_key_field_key_key
      UNIQUE (page, section_key, field_key);
    RAISE NOTICE 'Constraint page_contents UNIQUE(page, section_key, field_key) CREATED';
  ELSE
    RAISE NOTICE 'Constraint page_contents UNIQUE(page, section_key, field_key) already exists';
  END IF;
END $$;



-- ─── 1C. GARANTIR unique constraint sur site_settings ────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_key_key'
  ) THEN
    ALTER TABLE site_settings
      ADD CONSTRAINT site_settings_key_key UNIQUE (key);
    RAISE NOTICE 'Constraint site_settings UNIQUE(key) CREATED';
  ELSE
    RAISE NOTICE 'Constraint site_settings UNIQUE(key) already exists';
  END IF;
END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'departments_slug_key'
  ) THEN
    ALTER TABLE departments
      ADD CONSTRAINT departments_slug_key UNIQUE (slug);
    RAISE NOTICE 'Constraint departments UNIQUE(slug) CREATED';
  ELSE
    RAISE NOTICE 'Constraint departments UNIQUE(slug) already exists';
  END IF;
END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'department_members_user_id_department_id_key'
  ) THEN
    ALTER TABLE department_members
      ADD CONSTRAINT department_members_user_id_department_id_key
      UNIQUE (user_id, department_id);
    RAISE NOTICE 'Constraint department_members UNIQUE(user_id, department_id) CREATED';
  ELSE
    RAISE NOTICE 'Constraint department_members UNIQUE(user_id, department_id) already exists';
  END IF;
END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'positions_department_id_name_key'
  ) THEN
    ALTER TABLE positions
      ADD CONSTRAINT positions_department_id_name_key
      UNIQUE (department_id, name);
    RAISE NOTICE 'Constraint positions UNIQUE(department_id, name) CREATED';
  ELSE
    RAISE NOTICE 'Constraint positions UNIQUE(department_id, name) already exists';
  END IF;
END $$;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'department_requests_user_id_department_id_key'
  ) THEN
    ALTER TABLE department_requests
      ADD CONSTRAINT department_requests_user_id_department_id_key
      UNIQUE (user_id, department_id);
    RAISE NOTICE 'Constraint department_requests UNIQUE(user_id, department_id) CREATED';
  ELSE
    RAISE NOTICE 'Constraint department_requests UNIQUE(user_id, department_id) already exists';
  END IF;
END $$;



-- ─── 1H. Élargir CHECK sur site_settings ──────────────────
ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_category_check;


ALTER TABLE site_settings ADD CONSTRAINT site_settings_category_check
  CHECK (category IN ('general', 'contact', 'social', 'seo', 'images', 'theme', 'builder'));



ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_type_check;


ALTER TABLE site_settings ADD CONSTRAINT site_settings_type_check
  CHECK (type IN ('text', 'url', 'json', 'boolean', 'number', 'image'));



ALTER TABLE site_settings ALTER COLUMN label SET DEFAULT '';



-- ─── 1I. Élargir CHECK sur page_contents ──────────────────
ALTER TABLE page_contents DROP CONSTRAINT IF EXISTS page_contents_page_check;


ALTER TABLE page_contents ADD CONSTRAINT page_contents_page_check
  CHECK (page IN (
    'home', 'about', 'activities', 'events', 'media', 'contact',
    'departments', 'emissions', 'predications', 'dons',
    'culte', 'vision', 'pasteurs', 'ministeres', 'jeunesse',
    'enseignements', 'blog', 'donnations', 'communique',
    'dashboard', 'pastoral', 'reports', 'crm', 'communication'
  ));



-- ─── 1J. Simplifier RLS sur site_settings ─────────────────
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "settings_admin_write" ON site_settings;


DROP POLICY IF EXISTS "settings_auth_write" ON site_settings;


DROP POLICY IF EXISTS "settings_admin_update" ON site_settings;


DROP POLICY IF EXISTS "settings_auth_update" ON site_settings;


DROP POLICY IF EXISTS "settings_admin_delete" ON site_settings;


DROP POLICY IF EXISTS "settings_auth_delete" ON site_settings;


DROP POLICY IF EXISTS "settings_public_read" ON site_settings;



ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_all_read" ON site_settings;



CREATE POLICY "settings_all_read" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "settings_auth_insert" ON site_settings;


CREATE POLICY "settings_auth_insert" ON site_settings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "settings_auth_update" ON site_settings;


CREATE POLICY "settings_auth_update" ON site_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "settings_auth_delete" ON site_settings;


CREATE POLICY "settings_auth_delete" ON site_settings FOR DELETE
  TO authenticated USING (true);



-- ─── 1K. Simplifier RLS sur page_contents ─────────────────
ALTER TABLE page_contents DISABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "contents_admin_write" ON page_contents;


DROP POLICY IF EXISTS "contents_auth_write" ON page_contents;


DROP POLICY IF EXISTS "contents_admin_update" ON page_contents;


DROP POLICY IF EXISTS "contents_auth_update" ON page_contents;


DROP POLICY IF EXISTS "contents_admin_delete" ON page_contents;


DROP POLICY IF EXISTS "contents_auth_delete" ON page_contents;


DROP POLICY IF EXISTS "content_public_read" ON page_contents;



ALTER TABLE page_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contents_all_read" ON page_contents;



CREATE POLICY "contents_all_read" ON page_contents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "contents_auth_insert" ON page_contents;


CREATE POLICY "contents_auth_insert" ON page_contents FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "contents_auth_update" ON page_contents;


CREATE POLICY "contents_auth_update" ON page_contents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "contents_auth_delete" ON page_contents;


CREATE POLICY "contents_auth_delete" ON page_contents FOR DELETE
  TO authenticated USING (true);



-- ─── 1L. Désactiver RLS sur tables départements ───────────
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;


ALTER TABLE positions DISABLE ROW LEVEL SECURITY;


ALTER TABLE department_members DISABLE ROW LEVEL SECURITY;


ALTER TABLE department_requests DISABLE ROW LEVEL SECURITY;



-- ─── 1M. Convertir activities/requirements en TEXT[] ───────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'activities' AND data_type = 'text'
  ) THEN
    ALTER TABLE departments ALTER COLUMN activities TYPE TEXT[] USING
      CASE WHEN activities IS NULL OR activities = '' THEN NULL
           ELSE string_to_array(activities, ', ')
      END;
    RAISE NOTICE 'departments.activities → TEXT[]';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'requirements' AND data_type = 'text'
  ) THEN
    ALTER TABLE departments ALTER COLUMN requirements TYPE TEXT[] USING
      CASE WHEN requirements IS NULL OR requirements = '' THEN NULL
           ELSE string_to_array(requirements, ', ')
      END;
    RAISE NOTICE 'departments.requirements → TEXT[]';
  END IF;
END $$;



-- ─── 1N. Créer/Mettre à jour department_requests ──────────
CREATE TABLE IF NOT EXISTS department_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (status IN ('en_attente', 'accepte', 'refuse')),
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);



-- Ajouter position_id si la table existait déjà sans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'department_requests' AND column_name = 'position_id'
  ) THEN
    ALTER TABLE department_requests
      ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES positions(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'department_requests' AND column_name = 'message' AND column_default IS NULL
  ) THEN
    ALTER TABLE department_requests ALTER COLUMN message SET DEFAULT '';
  END IF;
END $$;



CREATE INDEX IF NOT EXISTS idx_dept_requests_user ON department_requests(user_id);


CREATE INDEX IF NOT EXISTS idx_dept_requests_dept ON department_requests(department_id);


CREATE INDEX IF NOT EXISTS idx_dept_requests_status ON department_requests(status);



-- ─── 1O. Trigger updated_at sur department_requests ───────
CREATE OR REPLACE FUNCTION update_dept_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



DROP TRIGGER IF EXISTS set_updated_at ON department_requests;

DROP TRIGGER IF EXISTS set_updated_at ON department_requests;


CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON department_requests
  FOR EACH ROW EXECUTE FUNCTION update_dept_requests_updated_at();




-- ═══════════════════════════════════════════════════════════════
-- PHASE 3 : VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════

DO $$ DECLARE
  v_depts     INTEGER;
  v_positions INTEGER;
  v_members   INTEGER;
  v_requests  INTEGER;
BEGIN
  SELECT count(*) INTO v_depts     FROM departments WHERE sort_order BETWEEN 1 AND 15;
  SELECT count(*) INTO v_positions FROM positions p JOIN departments d ON d.id = p.department_id WHERE d.sort_order BETWEEN 1 AND 15;
  SELECT count(*) INTO v_members   FROM department_members dm JOIN user_profiles up ON up.id = dm.user_id WHERE up.phone LIKE '+2438100000%';
  SELECT count(*) INTO v_requests  FROM department_requests WHERE status = 'en_attente';

  RAISE NOTICE '╔══════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║     MIGRATION UNIFIÉE — RÉSUMÉ                        ║';
  RAISE NOTICE '╠══════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Départements (1-15)     : %', v_depts;
  RAISE NOTICE '║  Positions totales       : %', v_positions;
  RAISE NOTICE '║  Membres de test         : %', v_members;
  RAISE NOTICE '║  Demandes en attente     : %', v_requests;
  RAISE NOTICE '║  RLS : user_profiles OFF, site_settings/page_contents  ║';
  RAISE NOTICE '║        departments/positions/members/requests OFF     ║';
  RAISE NOTICE '║  Toutes contraintes UNIQUE vérifiées/créées            ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════╝';
END $$;


-- ═══ 20260720000000_sermons_activity_cards.sql ═══════════════════
-- ═══════════════════════════════════════════════════════════════════
-- Migration: sermons + activity_cards tables
-- Date: 2026-07-20
-- Purpose: Admin-manageable predications page + homepage explore section
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. SERMONS table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sermons (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT NOT NULL,
  preacher      TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  series        TEXT NOT NULL DEFAULT '',
  duration      TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  video_url     TEXT NOT NULL DEFAULT '',
  audio_url     TEXT NOT NULL DEFAULT '',
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  preached_on   DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);



ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sermons: public read active" ON public.sermons;



CREATE POLICY "Sermons: public read active" ON public.sermons
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Sermons: full admin all" ON public.sermons;



CREATE POLICY "Sermons: full admin all" ON public.sermons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_admin = TRUE)
  );



-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_sermons_sort ON public.sermons (sort_order ASC, preached_on DESC);



-- ─── 2. ACTIVITY_CARDS table (homepage explore section) ───────────
CREATE TABLE IF NOT EXISTS public.activity_cards (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_key    TEXT NOT NULL UNIQUE,            -- 'predications', 'events', 'ministries', 'medias', 'actualites'
  title       TEXT NOT NULL DEFAULT '',
  stat_label  TEXT NOT NULL DEFAULT '',         -- '12+ messages', 'Prochains événements', etc.
  image_url   TEXT NOT NULL DEFAULT '',
  target_page TEXT NOT NULL DEFAULT '',         -- 'predications', 'events', 'departments', 'media', 'blog'
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);



ALTER TABLE public.activity_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ActivityCards: public read active" ON public.activity_cards;



CREATE POLICY "ActivityCards: public read active" ON public.activity_cards
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "ActivityCards: full admin all" ON public.activity_cards;



CREATE POLICY "ActivityCards: full admin all" ON public.activity_cards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_admin = TRUE)
  );


-- ═══ 20260720010000_admin_pages_tables.sql ═══════════════════════
-- ═══════════════════════════════════════════════════════════════════
-- Admin-controllable pages: new tables
-- ═══════════════════════════════════════════════════════════════════

-- 1. announcements (AnnoncesPage)
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);



ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select" ON public.announcements;


CREATE POLICY "announcements_select" ON public.announcements FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "announcements_admin" ON public.announcements;


CREATE POLICY "announcements_admin" ON public.announcements FOR ALL USING (auth.uid() IS NOT NULL);



-- 2. communications (CommuniquesPage)
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Général',
  is_active BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);



ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "communications_select" ON public.communications;


CREATE POLICY "communications_select" ON public.communications FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "communications_admin" ON public.communications;


CREATE POLICY "communications_admin" ON public.communications FOR ALL USING (auth.uid() IS NOT NULL);



-- 3. worship_schedules (CultePage)
CREATE TABLE IF NOT EXISTS public.worship_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day TEXT NOT NULL DEFAULT 'Dimanche',
  time TEXT NOT NULL DEFAULT '09h00',
  label TEXT NOT NULL DEFAULT 'Culte',
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);



ALTER TABLE public.worship_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ws_select" ON public.worship_schedules;


CREATE POLICY "ws_select" ON public.worship_schedules FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "ws_admin" ON public.worship_schedules;


CREATE POLICY "ws_admin" ON public.worship_schedules FOR ALL USING (auth.uid() IS NOT NULL);



-- 4. emissions (EmissionsPage)
CREATE TABLE IF NOT EXISTS public.emissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'youtube' CHECK (platform IN ('youtube','facebook','other')),
  schedule TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  host TEXT NOT NULL DEFAULT '',
  is_live BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);



ALTER TABLE public.emissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emissions_select" ON public.emissions;


CREATE POLICY "emissions_select" ON public.emissions FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "emissions_admin" ON public.emissions;


CREATE POLICY "emissions_admin" ON public.emissions FOR ALL USING (auth.uid() IS NOT NULL);


-- ═══ 20260720020000_create_pastors_table.sql ═════════════════════
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

DROP POLICY IF EXISTS "Public read active pastors" ON pastors;



CREATE POLICY "Public read active pastors" ON pastors
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins full access" ON pastors;



CREATE POLICY "Admins full access" ON pastors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );



-- Index
CREATE INDEX IF NOT EXISTS idx_pastors_active ON pastors (is_active, sort_order);


-- ═══ 20260720030000_create_contents_table.sql ════════════════════
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

DROP POLICY IF EXISTS "Public read published contents" ON contents;



CREATE POLICY "Public read published contents" ON contents
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Admins full access" ON contents;



CREATE POLICY "Admins full access" ON contents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );



-- Indexes
CREATE INDEX IF NOT EXISTS idx_contents_type ON contents (type, status);


CREATE INDEX IF NOT EXISTS idx_contents_featured ON contents (type, is_featured) WHERE is_featured = true;


-- ═══ 20260720040000_create_extensions_table.sql ══════════════════
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

DROP POLICY IF EXISTS "Public read active extensions" ON extensions;



CREATE POLICY "Public read active extensions" ON extensions
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins full access" ON extensions;



CREATE POLICY "Admins full access" ON extensions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );



-- Index
CREATE INDEX IF NOT EXISTS idx_extensions_active ON extensions (is_active, sort_order);


-- ═══ 20260721000000_all_missing_tables.sql ═══════════════════════
-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260721000000_all_missing_tables.sql
-- Description: Create ALL missing DB tables referenced in the application code.
--              Each table includes RLS policies, useful indexes, and CHECK
--              constraints matching the TypeScript type definitions.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1 — WORSHIP / CULT PLANNING (Planification de Culte)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. worship_services
CREATE TABLE IF NOT EXISTS worship_services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date              DATE NOT NULL,
  time              TEXT NOT NULL DEFAULT '10:00',
  type              TEXT NOT NULL
    CHECK (type IN (
      'enseignement_priere','jeune_priere','jeune_gen_espoir','adoration_louange',
      'seminaire','veillee','culte_special','conference','exposition','retraite','autre'
    )),
  orator_name       TEXT,
  president_name    TEXT,
  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','planned','orator_submitted','president_submitted','completed','cancelled')),
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_delayed        BOOLEAN NOT NULL DEFAULT false,
  delayed_at        TIMESTAMPTZ,
  delayed_minutes   INTEGER NOT NULL DEFAULT 0,
  form_deadline_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_ws_date ON worship_services(date);


CREATE INDEX IF NOT EXISTS idx_ws_type ON worship_services(type);


CREATE INDEX IF NOT EXISTS idx_ws_status ON worship_services(status);


DO $$ BEGIN ALTER TABLE worship_services ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "ws_public_select" ON worship_services;

DROP POLICY IF EXISTS "ws_public_select" ON worship_services;


CREATE POLICY "ws_public_select" ON worship_services FOR SELECT USING (true);


DROP POLICY IF EXISTS "ws_admin_all" ON worship_services;

DROP POLICY IF EXISTS "ws_admin_all" ON worship_services;


CREATE POLICY "ws_admin_all" ON worship_services FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 2. worship_form_links
CREATE TABLE IF NOT EXISTS worship_form_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      UUID NOT NULL REFERENCES worship_services(id) ON DELETE CASCADE,
  link_type       TEXT NOT NULL CHECK (link_type IN ('orator','president')),
  token           TEXT NOT NULL UNIQUE,
  recipient_name  TEXT,
  recipient_phone TEXT,
  is_used         BOOLEAN NOT NULL DEFAULT false,
  sent_at         TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_wfl_service ON worship_form_links(service_id);


CREATE INDEX IF NOT EXISTS idx_wfl_token  ON worship_form_links(token);


DO $$ BEGIN ALTER TABLE worship_form_links ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "wfl_public_select" ON worship_form_links;

DROP POLICY IF EXISTS "wfl_public_select" ON worship_form_links;


CREATE POLICY "wfl_public_select" ON worship_form_links FOR SELECT USING (true);


DROP POLICY IF EXISTS "wfl_admin_all" ON worship_form_links;

DROP POLICY IF EXISTS "wfl_admin_all" ON worship_form_links;


CREATE POLICY "wfl_admin_all" ON worship_form_links FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 3. worship_orator_forms
CREATE TABLE IF NOT EXISTS worship_orator_forms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id    UUID NOT NULL REFERENCES worship_services(id) ON DELETE CASCADE,
  orator_name   TEXT NOT NULL,
  theme         TEXT NOT NULL,
  sub_theme     TEXT,
  bible_book    TEXT,
  bible_chapter TEXT,
  bible_verses  TEXT,
  summary       TEXT,
  remarks       TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_wof_service ON worship_orator_forms(service_id);


DO $$ BEGIN ALTER TABLE worship_orator_forms ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "wof_public_select" ON worship_orator_forms;

DROP POLICY IF EXISTS "wof_public_select" ON worship_orator_forms;


CREATE POLICY "wof_public_select" ON worship_orator_forms FOR SELECT USING (true);


DROP POLICY IF EXISTS "wof_admin_all" ON worship_orator_forms;

DROP POLICY IF EXISTS "wof_admin_all" ON worship_orator_forms;


CREATE POLICY "wof_admin_all" ON worship_orator_forms FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 4. worship_order_items
CREATE TABLE IF NOT EXISTS worship_order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id       UUID NOT NULL REFERENCES worship_services(id) ON DELETE CASCADE,
  item_type        TEXT NOT NULL
    CHECK (item_type IN (
      'louange','adoration','offrande','communique','predication',
      'temoignage','sainte_cene','priere_nouveaux','accueil_invites',
      'intervention_speciale','priere_finale','autre'
    )),
  custom_label     TEXT,
  notes            TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 5,
  position         INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_woi_service ON worship_order_items(service_id);


DO $$ BEGIN ALTER TABLE worship_order_items ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "woi_public_select" ON worship_order_items;

DROP POLICY IF EXISTS "woi_public_select" ON worship_order_items;


CREATE POLICY "woi_public_select" ON worship_order_items FOR SELECT USING (true);


DROP POLICY IF EXISTS "woi_admin_all" ON worship_order_items;

DROP POLICY IF EXISTS "woi_admin_all" ON worship_order_items;


CREATE POLICY "woi_admin_all" ON worship_order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 5. worship_orator_points
CREATE TABLE IF NOT EXISTS worship_orator_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id     UUID NOT NULL REFERENCES worship_orator_forms(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_wop_form ON worship_orator_points(form_id);


DO $$ BEGIN ALTER TABLE worship_orator_points ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "wop_public_select" ON worship_orator_points;

DROP POLICY IF EXISTS "wop_public_select" ON worship_orator_points;


CREATE POLICY "wop_public_select" ON worship_orator_points FOR SELECT USING (true);


DROP POLICY IF EXISTS "wop_admin_all" ON worship_orator_points;

DROP POLICY IF EXISTS "wop_admin_all" ON worship_orator_points;


CREATE POLICY "wop_admin_all" ON worship_orator_points FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);




-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2 — PROTOCOL (Protocol / Accueil)
-- ═══════════════════════════════════════════════════════════════════════════

-- 6. protocol_teams
CREATE TABLE IF NOT EXISTS protocol_teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#3b82f6',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


DO $$ BEGIN ALTER TABLE protocol_teams ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "pt_public_select" ON protocol_teams;

DROP POLICY IF EXISTS "pt_public_select" ON protocol_teams;


CREATE POLICY "pt_public_select" ON protocol_teams FOR SELECT USING (true);


DROP POLICY IF EXISTS "pt_admin_all" ON protocol_teams;

DROP POLICY IF EXISTS "pt_admin_all" ON protocol_teams;


CREATE POLICY "pt_admin_all" ON protocol_teams FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 7. protocol_team_members
CREATE TABLE IF NOT EXISTS protocol_team_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES protocol_teams(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_team  TEXT NOT NULL DEFAULT 'agent' CHECK (role_in_team IN ('agent','responsable','adjoint')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);


CREATE INDEX IF NOT EXISTS idx_ptm_team ON protocol_team_members(team_id);


CREATE INDEX IF NOT EXISTS idx_ptm_user ON protocol_team_members(user_id);


DO $$ BEGIN ALTER TABLE protocol_team_members ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "ptm_public_select" ON protocol_team_members;

DROP POLICY IF EXISTS "ptm_public_select" ON protocol_team_members;


CREATE POLICY "ptm_public_select" ON protocol_team_members FOR SELECT USING (true);


DROP POLICY IF EXISTS "ptm_admin_all" ON protocol_team_members;

DROP POLICY IF EXISTS "ptm_admin_all" ON protocol_team_members;


CREATE POLICY "ptm_admin_all" ON protocol_team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 8. protocol_dress_code
CREATE TABLE IF NOT EXISTS protocol_dress_code (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cult_day         TEXT NOT NULL CHECK (cult_day IN ('mercredi','vendredi','samedi','dimanche','autre')),
  description      TEXT NOT NULL,
  required_items   TEXT[] NOT NULL DEFAULT '{}',
  formality_level  TEXT NOT NULL DEFAULT 'decontracte'
    CHECK (formality_level IN ('decontracte','correct','habille','formel')),
  icon_hint        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cult_day)
);


DO $$ BEGIN ALTER TABLE protocol_dress_code ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "pdc_public_select" ON protocol_dress_code;

DROP POLICY IF EXISTS "pdc_public_select" ON protocol_dress_code;


CREATE POLICY "pdc_public_select" ON protocol_dress_code FOR SELECT USING (true);


DROP POLICY IF EXISTS "pdc_admin_all" ON protocol_dress_code;

DROP POLICY IF EXISTS "pdc_admin_all" ON protocol_dress_code;


CREATE POLICY "pdc_admin_all" ON protocol_dress_code FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 9. protocol_schedules
CREATE TABLE IF NOT EXISTS protocol_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES protocol_teams(id) ON DELETE CASCADE,
  cult_day    TEXT NOT NULL CHECK (cult_day IN ('mercredi','vendredi','samedi','dimanche','autre')),
  week_number INTEGER,
  month       INTEGER CHECK (month BETWEEN 1 AND 12),
  year        INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_psch_team ON protocol_schedules(team_id);


CREATE INDEX IF NOT EXISTS idx_psch_day_year ON protocol_schedules(cult_day, year);


DO $$ BEGIN ALTER TABLE protocol_schedules ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "psch_public_select" ON protocol_schedules;

DROP POLICY IF EXISTS "psch_public_select" ON protocol_schedules;


CREATE POLICY "psch_public_select" ON protocol_schedules FOR SELECT USING (true);


DROP POLICY IF EXISTS "psch_admin_all" ON protocol_schedules;

DROP POLICY IF EXISTS "psch_admin_all" ON protocol_schedules;


CREATE POLICY "psch_admin_all" ON protocol_schedules FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 10. cult_reports
CREATE TABLE IF NOT EXISTS cult_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_name    TEXT NOT NULL,
  cult_day         TEXT NOT NULL CHECK (cult_day IN ('mercredi','vendredi','samedi','dimanche','autre')),
  cult_date        DATE NOT NULL,
  men_count        INTEGER NOT NULL DEFAULT 0,
  women_count      INTEGER NOT NULL DEFAULT 0,
  children_count   INTEGER NOT NULL DEFAULT 0,
  new_comers_count INTEGER NOT NULL DEFAULT 0,
  empty_seats      INTEGER NOT NULL DEFAULT 0,
  total_attendance INTEGER NOT NULL DEFAULT 0,
  incidents        TEXT,
  team_group       TEXT,
  extension_id     UUID REFERENCES extensions(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (status IN ('brouillon','soumis','valide','rejete')),
  reviewed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  admin_notes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_cr_date ON cult_reports(cult_date);


CREATE INDEX IF NOT EXISTS idx_cr_day  ON cult_reports(cult_day);


CREATE INDEX IF NOT EXISTS idx_cr_status ON cult_reports(status);


CREATE INDEX IF NOT EXISTS idx_cr_user ON cult_reports(user_id);


DO $$ BEGIN ALTER TABLE cult_reports ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "cr_authenticated_select" ON cult_reports;

DROP POLICY IF EXISTS "cr_authenticated_select" ON cult_reports;


CREATE POLICY "cr_authenticated_select" ON cult_reports FOR SELECT USING (auth.uid() IS NOT NULL);


DROP POLICY IF EXISTS "cr_admin_all" ON cult_reports;

DROP POLICY IF EXISTS "cr_admin_all" ON cult_reports;


CREATE POLICY "cr_admin_all" ON cult_reports FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);




-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3 — EVANGELISM (Évangélisation)
-- ═══════════════════════════════════════════════════════════════════════════

-- 11. evangelism_outings
CREATE TABLE IF NOT EXISTS evangelism_outings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  description        TEXT,
  outing_date        DATE NOT NULL,
  start_time         TEXT NOT NULL,
  end_time           TEXT,
  location           TEXT NOT NULL,
  location_quartier  TEXT,
  objective          TEXT NOT NULL DEFAULT 'autre'
    CHECK (objective IN (
      'porte_a_porte','marche','campagne','rue','hopital','prison','ecole','stade','autre'
    )),
  status             TEXT NOT NULL DEFAULT 'planifiee'
    CHECK (status IN ('planifiee','en_cours','terminee','annulee')),
  responsible_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responsible_name   TEXT,
  notes              TEXT,
  team_member_ids    UUID[] DEFAULT NULL,
  team_member_names  TEXT[] DEFAULT NULL,
  expected_attendees INTEGER NOT NULL DEFAULT 0,
  actual_attendees   INTEGER NOT NULL DEFAULT 0,
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_eo_date   ON evangelism_outings(outing_date);


CREATE INDEX IF NOT EXISTS idx_eo_status ON evangelism_outings(status);


CREATE INDEX IF NOT EXISTS idx_eo_resp  ON evangelism_outings(responsible_id);


DO $$ BEGIN ALTER TABLE evangelism_outings ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "eo_public_select" ON evangelism_outings;

DROP POLICY IF EXISTS "eo_public_select" ON evangelism_outings;


CREATE POLICY "eo_public_select" ON evangelism_outings FOR SELECT USING (true);


DROP POLICY IF EXISTS "eo_admin_all" ON evangelism_outings;

DROP POLICY IF EXISTS "eo_admin_all" ON evangelism_outings;


CREATE POLICY "eo_admin_all" ON evangelism_outings FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 12. evangelism_contacts
CREATE TABLE IF NOT EXISTS evangelism_contacts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outing_id               UUID REFERENCES evangelism_outings(id) ON DELETE SET NULL,
  full_name               TEXT NOT NULL,
  phone                   TEXT,
  whatsapp                TEXT,
  address                 TEXT,
  quartier                TEXT,
  decision                TEXT NOT NULL DEFAULT 'a_suivre'
    CHECK (decision IN (
      'interesse','en_savoir_plus','accepte_christ','veut_venir_eglise',
      'deja_croyant','pas_interesse','a_suivre'
    )),
  needs                   TEXT,
  prayer_request          TEXT,
  notes                   TEXT,
  status                  TEXT NOT NULL DEFAULT 'a_contacter'
    CHECK (status IN ('a_contacter','contacte','en_suivi','integre_eglise','perdu_de_vue')),
  assigned_to             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name        TEXT,
  first_contact_at        TIMESTAMPTZ,
  first_call_at           TIMESTAMPTZ,
  first_visit_at          TIMESTAMPTZ,
  invited_culte_id        UUID,
  invited_culte_date      DATE,
  came_to_culte           BOOLEAN NOT NULL DEFAULT false,
  culte_notes             TEXT,
  baptized                BOOLEAN NOT NULL DEFAULT false,
  baptism_date            DATE,
  created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  pipeline_stage          TEXT NOT NULL DEFAULT 'nouveau_contact'
    CHECK (pipeline_stage IN (
      'nouveau_contact','premier_contact','rdv_planifie','en_suivi',
      'venu_culte','etude_biblique','affermi','integre_eglise','baptise','perdu_de_vue'
    )),
  rdv_date                DATE,
  rdv_time                TEXT,
  rdv_type                TEXT NOT NULL DEFAULT 'autre'
    CHECK (rdv_type IN ('visite','appel','etude_biblique','prie_domicile','cafe_chretien','autre')),
  rdv_notes               TEXT,
  rdv_status              TEXT NOT NULL DEFAULT 'planifie'
    CHECK (rdv_status IN ('planifie','confirme','realise','annule','reporte')),
  source                  TEXT NOT NULL DEFAULT 'evangelisme'
    CHECK (source IN ('evangelisme','culte','evenement','recommandation','internet','autre')),
  source_culte_id         UUID,
  is_new_visitor          BOOLEAN NOT NULL DEFAULT false,
  discipleship_start_date DATE,
  discipleship_notes      TEXT
);


CREATE INDEX IF NOT EXISTS idx_ec_outing   ON evangelism_contacts(outing_id);


CREATE INDEX IF NOT EXISTS idx_ec_status   ON evangelism_contacts(status);


CREATE INDEX IF NOT EXISTS idx_ec_assigned ON evangelism_contacts(assigned_to);


CREATE INDEX IF NOT EXISTS idx_ec_pipeline ON evangelism_contacts(pipeline_stage);


CREATE INDEX IF NOT EXISTS idx_ec_baptized ON evangelism_contacts(baptized);


DO $$ BEGIN ALTER TABLE evangelism_contacts ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "ec_public_select" ON evangelism_contacts;

DROP POLICY IF EXISTS "ec_public_select" ON evangelism_contacts;


CREATE POLICY "ec_public_select" ON evangelism_contacts FOR SELECT USING (true);


DROP POLICY IF EXISTS "ec_admin_all" ON evangelism_contacts;

DROP POLICY IF EXISTS "ec_admin_all" ON evangelism_contacts;


CREATE POLICY "ec_admin_all" ON evangelism_contacts FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 13. evangelism_followups
CREATE TABLE IF NOT EXISTS evangelism_followups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id     UUID NOT NULL REFERENCES evangelism_contacts(id) ON DELETE CASCADE,
  followup_type  TEXT NOT NULL DEFAULT 'appel'
    CHECK (followup_type IN (
      'appel','visite','message','invitation_culte','etude_biblique','prière','autre'
    )),
  scheduled_date DATE NOT NULL,
  completed_at   TIMESTAMPTZ,
  notes          TEXT,
  result         TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (result IN ('positif','neutre','negatif','a_reporter','en_attente')),
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_ef_contact ON evangelism_followups(contact_id);


CREATE INDEX IF NOT EXISTS idx_ef_date    ON evangelism_followups(scheduled_date);


CREATE INDEX IF NOT EXISTS idx_ef_result  ON evangelism_followups(result);


DO $$ BEGIN ALTER TABLE evangelism_followups ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "ef_public_select" ON evangelism_followups;

DROP POLICY IF EXISTS "ef_public_select" ON evangelism_followups;


CREATE POLICY "ef_public_select" ON evangelism_followups FOR SELECT USING (true);


DROP POLICY IF EXISTS "ef_admin_all" ON evangelism_followups;

DROP POLICY IF EXISTS "ef_admin_all" ON evangelism_followups;


CREATE POLICY "ef_admin_all" ON evangelism_followups FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 14. zones_evangelisation
CREATE TABLE IF NOT EXISTS zones_evangelisation (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT,
  coordinator_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  coordinator_name TEXT,
  converti_count   INTEGER NOT NULL DEFAULT 0,
  potential_score  INTEGER NOT NULL DEFAULT 5 CHECK (potential_score BETWEEN 1 AND 10),
  last_visited     DATE,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_ze_active ON zones_evangelisation(is_active);


DO $$ BEGIN ALTER TABLE zones_evangelisation ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "ze_public_select" ON zones_evangelisation;

DROP POLICY IF EXISTS "ze_public_select" ON zones_evangelisation;


CREATE POLICY "ze_public_select" ON zones_evangelisation FOR SELECT USING (true);


DROP POLICY IF EXISTS "ze_admin_all" ON zones_evangelisation;

DROP POLICY IF EXISTS "ze_admin_all" ON zones_evangelisation;


CREATE POLICY "ze_admin_all" ON zones_evangelisation FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);




-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4 — CONVERTI PIPELINE (CRM Spirituel)
-- ═══════════════════════════════════════════════════════════════════════════


-- 33. cellules_maison (House cells / small groups)
CREATE TABLE IF NOT EXISTS cellules_maison (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  leader_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_name  TEXT,
  zone         TEXT,
  quartier     TEXT,
  address      TEXT,
  meeting_day  TEXT NOT NULL
    CHECK (meeting_day IN (
      'lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'
    )),
  meeting_time TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_cmaison_leader ON cellules_maison(leader_id);


CREATE INDEX IF NOT EXISTS idx_cmaison_active ON cellules_maison(is_active);


CREATE INDEX IF NOT EXISTS idx_cmaison_day    ON cellules_maison(meeting_day);


DO $$ BEGIN ALTER TABLE cellules_maison ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "cmaison_public_select" ON cellules_maison;

DROP POLICY IF EXISTS "cmaison_public_select" ON cellules_maison;


CREATE POLICY "cmaison_public_select" ON cellules_maison FOR SELECT USING (true);


DROP POLICY IF EXISTS "cmaison_admin_all" ON cellules_maison;

DROP POLICY IF EXISTS "cmaison_admin_all" ON cellules_maison;


CREATE POLICY "cmaison_admin_all" ON cellules_maison FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);




-- 15. convertis
CREATE TABLE IF NOT EXISTS convertis (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  quartier              TEXT,
  zone                  TEXT,
  address               TEXT,
  gender                TEXT CHECK (gender IN ('homme','femme')),
  age_range             TEXT CHECK (age_range IN ('moins_18','18_25','26_35','36_50','plus_50')),
  request_type          TEXT CHECK (request_type IN ('priere','conseil','visite','information','relation_aide')),
  needs_pastoral_care   BOOLEAN NOT NULL DEFAULT false,
  evangelist_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evangelist_name       TEXT,
  mentor_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mentor_name           TEXT,
  pipeline_stage        TEXT NOT NULL DEFAULT 'nouveau'
    CHECK (pipeline_stage IN (
      'nouveau','premier_contact','visite_domicile','cellule','cours_bapteme','membre_actif'
    )),
  pipeline_updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_contact_date    DATE,
  first_contact_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visit_date            DATE,
  visit_done            BOOLEAN NOT NULL DEFAULT false,
  cellule_id            UUID REFERENCES cellules_maison(id) ON DELETE SET NULL,
  cellule_name          TEXT,
  bapteme_water_date    DATE,
  bapteme_saint_esprit  BOOLEAN NOT NULL DEFAULT false,
  became_member_date    DATE,
  notes                 TEXT,
  source                TEXT NOT NULL DEFAULT 'evangelisation'
    CHECK (source IN ('evangelisation','croisade','visite','internet','ami','media','autre')),
  event_id              UUID,
  created_by            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_conv_stage     ON convertis(pipeline_stage);


CREATE INDEX IF NOT EXISTS idx_conv_evangelist ON convertis(evangelist_id);


CREATE INDEX IF NOT EXISTS idx_conv_mentor    ON convertis(mentor_id);


CREATE INDEX IF NOT EXISTS idx_conv_source    ON convertis(source);


DO $$ BEGIN ALTER TABLE convertis ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "conv_authenticated_select" ON convertis;

DROP POLICY IF EXISTS "conv_authenticated_select" ON convertis;


CREATE POLICY "conv_authenticated_select" ON convertis FOR SELECT USING (auth.uid() IS NOT NULL);


DROP POLICY IF EXISTS "conv_admin_all" ON convertis;

DROP POLICY IF EXISTS "conv_admin_all" ON convertis;


CREATE POLICY "conv_admin_all" ON convertis FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 16. converti_timeline
CREATE TABLE IF NOT EXISTS converti_timeline (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  converti_id  UUID NOT NULL REFERENCES convertis(id) ON DELETE CASCADE,
  stage_from   TEXT CHECK (stage_from IN (
    'nouveau','premier_contact','visite_domicile','cellule','cours_bapteme','membre_actif'
  )),
  stage_to     TEXT NOT NULL CHECK (stage_to IN (
    'nouveau','premier_contact','visite_domicile','cellule','cours_bapteme','membre_actif'
  )),
  action       TEXT NOT NULL,
  notes        TEXT,
  done_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  done_by_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_ct_converti ON converti_timeline(converti_id);


CREATE INDEX IF NOT EXISTS idx_ct_date     ON converti_timeline(created_at);


DO $$ BEGIN ALTER TABLE converti_timeline ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "ct_authenticated_select" ON converti_timeline;

DROP POLICY IF EXISTS "ct_authenticated_select" ON converti_timeline;


CREATE POLICY "ct_authenticated_select" ON converti_timeline FOR SELECT USING (auth.uid() IS NOT NULL);


DROP POLICY IF EXISTS "ct_admin_all" ON converti_timeline;

DROP POLICY IF EXISTS "ct_admin_all" ON converti_timeline;


CREATE POLICY "ct_admin_all" ON converti_timeline FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);




-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5 — VISITORS & DEPARTMENTS
-- ═══════════════════════════════════════════════════════════════════════════

-- 17. new_visitors
CREATE TABLE IF NOT EXISTS new_visitors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_name     TEXT NOT NULL,
  visitor_phone    TEXT,
  visitor_gender   TEXT CHECK (visitor_gender IN ('homme','femme')),
  visitor_quartier TEXT,
  how_known        TEXT CHECK (how_known IN ('membre_invitation','reseaux_sociaux','passant','media','autre')),
  invited_by       TEXT,
  follow_up_type   TEXT CHECK (follow_up_type IN ('visite','appel','information','aucun')),
  cult_day         TEXT CHECK (cult_day IN ('mercredi','vendredi','samedi','dimanche','autre')),
  cult_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status           TEXT NOT NULL DEFAULT 'nouveau'
    CHECK (status IN ('nouveau','contacte','suivi_en_cours','integre','perdu')),
  follow_up_notes  TEXT,
  follow_up_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  follow_up_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_nv_date   ON new_visitors(cult_date);


CREATE INDEX IF NOT EXISTS idx_nv_status ON new_visitors(status);


CREATE INDEX IF NOT EXISTS idx_nv_rec    ON new_visitors(recorded_by);


DO $$ BEGIN ALTER TABLE new_visitors ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "nv_authenticated_select" ON new_visitors;

DROP POLICY IF EXISTS "nv_authenticated_select" ON new_visitors;


CREATE POLICY "nv_authenticated_select" ON new_visitors FOR SELECT USING (auth.uid() IS NOT NULL);


DROP POLICY IF EXISTS "nv_admin_all" ON new_visitors;

DROP POLICY IF EXISTS "nv_admin_all" ON new_visitors;


CREATE POLICY "nv_admin_all" ON new_visitors FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 18. department_notes
CREATE TABLE IF NOT EXISTS department_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  content       TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, department_id)
);


CREATE INDEX IF NOT EXISTS idx_dn_user_dept ON department_notes(user_id, department_id);


DO $$ BEGIN ALTER TABLE department_notes ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "dn_owner_all" ON department_notes;

DROP POLICY IF EXISTS "dn_owner_all" ON department_notes;


CREATE POLICY "dn_owner_all" ON department_notes FOR ALL USING (user_id = auth.uid());


DROP POLICY IF EXISTS "dn_admin_all" ON department_notes;

DROP POLICY IF EXISTS "dn_admin_all" ON department_notes;


CREATE POLICY "dn_admin_all" ON department_notes FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);




-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6 — DAILY VERSE
-- ═══════════════════════════════════════════════════════════════════════════

-- 19. daily_verses
CREATE TABLE IF NOT EXISTS daily_verses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verse_date  DATE NOT NULL,
  reference   TEXT NOT NULL,
  content     TEXT NOT NULL,
  exhortation TEXT,
  plan_id     UUID,
  day_number  INTEGER,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(verse_date)
);


CREATE INDEX IF NOT EXISTS idx_dv_date ON daily_verses(verse_date);


DO $$ BEGIN ALTER TABLE daily_verses ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "dv_public_select" ON daily_verses;

DROP POLICY IF EXISTS "dv_public_select" ON daily_verses;


CREATE POLICY "dv_public_select" ON daily_verses FOR SELECT USING (true);


DROP POLICY IF EXISTS "dv_admin_all" ON daily_verses;

DROP POLICY IF EXISTS "dv_admin_all" ON daily_verses;


CREATE POLICY "dv_admin_all" ON daily_verses FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);




-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7 — VISIT REQUESTS
-- ═══════════════════════════════════════════════════════════════════════════

-- 20. visit_requests
CREATE TABLE IF NOT EXISTS visit_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name      TEXT,
  requester_phone     TEXT,
  requester_email     TEXT,
  beneficiary_name    TEXT NOT NULL,
  beneficiary_phone   TEXT,
  beneficiary_address TEXT NOT NULL,
  visit_type          TEXT NOT NULL DEFAULT 'pastorale'
    CHECK (visit_type IN ('pastorale','evangelisation','malade','encouragement','suivi')),
  reason              TEXT,
  urgency             TEXT NOT NULL DEFAULT 'normale'
    CHECK (urgency IN ('basse','normale','haute','urgente')),
  preferred_date      DATE,
  preferred_time      TEXT,
  assigned_to         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name    TEXT,
  status              TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (status IN (
      'en_attente','acceptee','planifiee','effectuee','refusee','reprogrammee'
    )),
  pastor_notes        TEXT,
  visited_at          TIMESTAMPTZ,
  response            TEXT,
  responded_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_vr_status    ON visit_requests(status);


CREATE INDEX IF NOT EXISTS idx_vr_requester ON visit_requests(requester_id);


CREATE INDEX IF NOT EXISTS idx_vr_assigned  ON visit_requests(assigned_to);


CREATE INDEX IF NOT EXISTS idx_vr_urgency   ON visit_requests(urgency);


DO $$ BEGIN ALTER TABLE visit_requests ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "vr_owner_select" ON visit_requests;

DROP POLICY IF EXISTS "vr_owner_select" ON visit_requests;


CREATE POLICY "vr_owner_select" ON visit_requests FOR SELECT USING (
  requester_id = auth.uid() OR
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);


DROP POLICY IF EXISTS "vr_authenticated_insert" ON visit_requests;

DROP POLICY IF EXISTS "vr_authenticated_insert" ON visit_requests;


CREATE POLICY "vr_authenticated_insert" ON visit_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


DROP POLICY IF EXISTS "vr_admin_all" ON visit_requests;

DROP POLICY IF EXISTS "vr_admin_all" ON visit_requests;


CREATE POLICY "vr_admin_all" ON visit_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);




-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8 — PASTORAL (Espace Pastoral / Supervision)
-- ═══════════════════════════════════════════════════════════════════════════

-- 21. pastor_schedule
CREATE TABLE IF NOT EXISTS pastor_schedule (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pastor_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pastor_name  TEXT,
  date         DATE NOT NULL,
  start_time   TEXT NOT NULL,
  end_time     TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'autre'
    CHECK (type IN ('visite','entretien','culte','reunion','formation','personnel','autre')),
  title        TEXT NOT NULL,
  description  TEXT,
  location     TEXT,
  is_available BOOLEAN NOT NULL DEFAULT false,
  status       TEXT NOT NULL DEFAULT 'planifie'
    CHECK (status IN ('planifie','confirme','termine','annule')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_ps_pastor ON pastor_schedule(pastor_id);


CREATE INDEX IF NOT EXISTS idx_ps_date   ON pastor_schedule(date);


CREATE INDEX IF NOT EXISTS idx_ps_status ON pastor_schedule(status);


DO $$ BEGIN ALTER TABLE pastor_schedule ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "ps_authenticated_select" ON pastor_schedule;

DROP POLICY IF EXISTS "ps_authenticated_select" ON pastor_schedule;


CREATE POLICY "ps_authenticated_select" ON pastor_schedule FOR SELECT USING (auth.uid() IS NOT NULL);


DROP POLICY IF EXISTS "ps_admin_all" ON pastor_schedule;

DROP POLICY IF EXISTS "ps_admin_all" ON pastor_schedule;


CREATE POLICY "ps_admin_all" ON pastor_schedule FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 22. pastoral_alerts
CREATE TABLE IF NOT EXISTS pastoral_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT NOT NULL DEFAULT 'autre'
    CHECK (type IN ('ame_en_danger_72h','cas_lourd','retard_integration','autre')),
  converti_id      UUID REFERENCES convertis(id) ON DELETE SET NULL,
  converti_name    TEXT,
  description      TEXT NOT NULL,
  severity         TEXT NOT NULL DEFAULT 'moyenne'
    CHECK (severity IN ('haute','moyenne','basse')),
  status           TEXT NOT NULL DEFAULT 'ouverte'
    CHECK (status IN ('ouverte','en_cours','resolue')),
  assigned_to      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  resolved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at      TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_pa_status   ON pastoral_alerts(status);


CREATE INDEX IF NOT EXISTS idx_pa_severity ON pastoral_alerts(severity);


CREATE INDEX IF NOT EXISTS idx_pa_assigned ON pastoral_alerts(assigned_to);


CREATE INDEX IF NOT EXISTS idx_pa_converti ON pastoral_alerts(converti_id);


DO $$ BEGIN ALTER TABLE pastoral_alerts ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "pa_pastor_select" ON pastoral_alerts;

DROP POLICY IF EXISTS "pa_pastor_select" ON pastoral_alerts;


CREATE POLICY "pa_pastor_select" ON pastoral_alerts FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 4)
);


DROP POLICY IF EXISTS "pa_admin_all" ON pastoral_alerts;

DROP POLICY IF EXISTS "pa_admin_all" ON pastoral_alerts;


CREATE POLICY "pa_admin_all" ON pastoral_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 23. spiritual_assessments
CREATE TABLE IF NOT EXISTS spiritual_assessments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name      TEXT,
  period         TEXT NOT NULL,
  prayer_life    INTEGER NOT NULL DEFAULT 5 CHECK (prayer_life BETWEEN 1 AND 10),
  bible_study    INTEGER NOT NULL DEFAULT 5 CHECK (bible_study BETWEEN 1 AND 10),
  fellowship     INTEGER NOT NULL DEFAULT 5 CHECK (fellowship BETWEEN 1 AND 10),
  evangelism     INTEGER NOT NULL DEFAULT 5 CHECK (evangelism BETWEEN 1 AND 10),
  giving         INTEGER NOT NULL DEFAULT 5 CHECK (giving BETWEEN 1 AND 10),
  service        INTEGER NOT NULL DEFAULT 5 CHECK (service BETWEEN 1 AND 10),
  overall_score  INTEGER NOT NULL DEFAULT 5 CHECK (overall_score BETWEEN 1 AND 10),
  strengths      TEXT,
  areas_to_grow  TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_sa_user   ON spiritual_assessments(user_id);


CREATE INDEX IF NOT EXISTS idx_sa_period ON spiritual_assessments(period);


DO $$ BEGIN ALTER TABLE spiritual_assessments ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "sa_owner_select" ON spiritual_assessments;

DROP POLICY IF EXISTS "sa_owner_select" ON spiritual_assessments;


CREATE POLICY "sa_owner_select" ON spiritual_assessments FOR SELECT USING (user_id = auth.uid());


DROP POLICY IF EXISTS "sa_admin_all" ON spiritual_assessments;

DROP POLICY IF EXISTS "sa_admin_all" ON spiritual_assessments;


CREATE POLICY "sa_admin_all" ON spiritual_assessments FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 24. spiritual_evaluations (simplified self-evaluation from dashboard)
CREATE TABLE IF NOT EXISTS spiritual_evaluations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name      TEXT,
  period         TEXT NOT NULL,
  overall_score  INTEGER NOT NULL DEFAULT 0,
  want_interview BOOLEAN NOT NULL DEFAULT false,
  answers        JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_se_user ON spiritual_evaluations(user_id);


DO $$ BEGIN ALTER TABLE spiritual_evaluations ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "se_owner_all" ON spiritual_evaluations;

DROP POLICY IF EXISTS "se_owner_all" ON spiritual_evaluations;


CREATE POLICY "se_owner_all" ON spiritual_evaluations FOR ALL USING (user_id = auth.uid());


DROP POLICY IF EXISTS "se_admin_all" ON spiritual_evaluations;

DROP POLICY IF EXISTS "se_admin_all" ON spiritual_evaluations;


CREATE POLICY "se_admin_all" ON spiritual_evaluations FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);




-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 9 — REPORTS & STATISTICS
-- ═══════════════════════════════════════════════════════════════════════════

-- 25. impact_counters
CREATE TABLE IF NOT EXISTS impact_counters (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period                 TEXT NOT NULL CHECK (period IN ('jour','semaine','mois','trimestre','annee')),
  period_value           TEXT NOT NULL,
  persons_contacted      INTEGER NOT NULL DEFAULT 0,
  decisions              INTEGER NOT NULL DEFAULT 0,
  bibles_distributed     INTEGER NOT NULL DEFAULT 0,
  baptisms_water         INTEGER NOT NULL DEFAULT 0,
  baptisms_holy_spirit   INTEGER NOT NULL DEFAULT 0,
  new_active_members     INTEGER NOT NULL DEFAULT 0,
  prayer_requests_answered INTEGER NOT NULL DEFAULT 0,
  zone_id                UUID,
  zone_name              TEXT,
  department_id          UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_ic_period ON impact_counters(period, period_value);


DO $$ BEGIN ALTER TABLE impact_counters ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "ic_public_select" ON impact_counters;

DROP POLICY IF EXISTS "ic_public_select" ON impact_counters;


CREATE POLICY "ic_public_select" ON impact_counters FOR SELECT USING (true);


DROP POLICY IF EXISTS "ic_admin_all" ON impact_counters;

DROP POLICY IF EXISTS "ic_admin_all" ON impact_counters;


CREATE POLICY "ic_admin_all" ON impact_counters FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 26. mission_reports
CREATE TABLE IF NOT EXISTS mission_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID,
  event_title         TEXT,
  zone_id             UUID,
  zone_name           TEXT,
  report_date         DATE NOT NULL,
  persons_contacted   INTEGER NOT NULL DEFAULT 0,
  decisions_count     INTEGER NOT NULL DEFAULT 0,
  bibles_distributed  INTEGER NOT NULL DEFAULT 0,
  tracts_distributed  INTEGER NOT NULL DEFAULT 0,
  new_contacts_count  INTEGER NOT NULL DEFAULT 0,
  highlights          TEXT NOT NULL DEFAULT '',
  challenges          TEXT NOT NULL DEFAULT '',
  testimonies         TEXT,
  photos              TEXT[] DEFAULT NULL,
  reported_by         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_by_name    TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed')),
  reviewed_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  reviewer_notes      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_mr_date   ON mission_reports(report_date);


CREATE INDEX IF NOT EXISTS idx_mr_status ON mission_reports(status);


DO $$ BEGIN ALTER TABLE mission_reports ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "mr_public_select" ON mission_reports;

DROP POLICY IF EXISTS "mr_public_select" ON mission_reports;


CREATE POLICY "mr_public_select" ON mission_reports FOR SELECT USING (true);


DROP POLICY IF EXISTS "mr_admin_all" ON mission_reports;

DROP POLICY IF EXISTS "mr_admin_all" ON mission_reports;


CREATE POLICY "mr_admin_all" ON mission_reports FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 27. mission_finances
CREATE TABLE IF NOT EXISTS mission_finances (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_report_id  UUID REFERENCES mission_reports(id) ON DELETE SET NULL,
  event_id           UUID,
  event_title        TEXT,
  budget_allocated   NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_costs    NUMERIC(12,2) NOT NULL DEFAULT 0,
  material_costs     NUMERIC(12,2) NOT NULL DEFAULT 0,
  special_offering   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_expenses     NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance            NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','CDF','EUR')),
  notes              TEXT,
  created_by         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_mf_report ON mission_finances(mission_report_id);


CREATE INDEX IF NOT EXISTS idx_mf_event  ON mission_finances(event_id);


DO $$ BEGIN ALTER TABLE mission_finances ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "mf_public_select" ON mission_finances;

DROP POLICY IF EXISTS "mf_public_select" ON mission_finances;


CREATE POLICY "mf_public_select" ON mission_finances FOR SELECT USING (true);


DROP POLICY IF EXISTS "mf_admin_all" ON mission_finances;

DROP POLICY IF EXISTS "mf_admin_all" ON mission_finances;


CREATE POLICY "mf_admin_all" ON mission_finances FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);




-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 10 — EVENTS (Assignments, Minutes, Reminders)
-- ═══════════════════════════════════════════════════════════════════════════

-- 28. event_assignments
CREATE TABLE IF NOT EXISTS event_assignments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   TEXT NOT NULL,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name  TEXT,
  role       TEXT NOT NULL DEFAULT 'other'
    CHECK (role IN (
      'preacher','intercessor','logistician','worship_leader','singer',
      'usher','sound_tech','camera','other'
    )),
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined')),
  notified   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_ea_event ON event_assignments(event_id);


CREATE INDEX IF NOT EXISTS idx_ea_user  ON event_assignments(user_id);


DO $$ BEGIN ALTER TABLE event_assignments ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "ea_public_select" ON event_assignments;

DROP POLICY IF EXISTS "ea_public_select" ON event_assignments;


CREATE POLICY "ea_public_select" ON event_assignments FOR SELECT USING (true);


DROP POLICY IF EXISTS "ea_admin_all" ON event_assignments;

DROP POLICY IF EXISTS "ea_admin_all" ON event_assignments;


CREATE POLICY "ea_admin_all" ON event_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 29. event_minutes
CREATE TABLE IF NOT EXISTS event_minutes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         TEXT NOT NULL,
  time_slot        TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  responsible_id   UUID,
  responsible_name TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_completed     BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_emin_event ON event_minutes(event_id);


DO $$ BEGIN ALTER TABLE event_minutes ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "emin_public_select" ON event_minutes;

DROP POLICY IF EXISTS "emin_public_select" ON event_minutes;


CREATE POLICY "emin_public_select" ON event_minutes FOR SELECT USING (true);


DROP POLICY IF EXISTS "emin_admin_all" ON event_minutes;

DROP POLICY IF EXISTS "emin_admin_all" ON event_minutes;


CREATE POLICY "emin_admin_all" ON event_minutes FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 30. event_reminders
CREATE TABLE IF NOT EXISTS event_reminders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              TEXT NOT NULL,
  reminder_time         TEXT NOT NULL CHECK (reminder_time IN ('matin','apres_midi','soir')),
  reminder_offset_hours INTEGER NOT NULL DEFAULT 1,
  message_template      TEXT,
  target_type           TEXT NOT NULL DEFAULT 'all'
    CHECK (target_type IN ('all','department','team','custom')),
  target_ids            UUID[] DEFAULT '{}',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_er_event ON event_reminders(event_id);


DO $$ BEGIN ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "er_public_select" ON event_reminders;

DROP POLICY IF EXISTS "er_public_select" ON event_reminders;


CREATE POLICY "er_public_select" ON event_reminders FOR SELECT USING (true);


DROP POLICY IF EXISTS "er_admin_all" ON event_reminders;

DROP POLICY IF EXISTS "er_admin_all" ON event_reminders;


CREATE POLICY "er_admin_all" ON event_reminders FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);




-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 11 — COMMUNICATION & CONTENT
-- ═══════════════════════════════════════════════════════════════════════════

-- 31. newsletters
CREATE TABLE IF NOT EXISTS newsletters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  audience        TEXT NOT NULL DEFAULT 'all'
    CHECK (audience IN ('all','members','pastors','department')),
  department_id   UUID,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','sent')),
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_nl_status ON newsletters(status);


DO $$ BEGIN ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "nl_public_select" ON newsletters;

DROP POLICY IF EXISTS "nl_public_select" ON newsletters;


CREATE POLICY "nl_public_select" ON newsletters FOR SELECT USING (status = 'sent');


DROP POLICY IF EXISTS "nl_admin_all" ON newsletters;

DROP POLICY IF EXISTS "nl_admin_all" ON newsletters;


CREATE POLICY "nl_admin_all" ON newsletters FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 32. member_testimonies
CREATE TABLE IF NOT EXISTS member_testimonies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN (
      'general','guerison','finance','maternite','delivrance','miracle','salut','famille','autre'
    )),
  is_anonymous   BOOLEAN NOT NULL DEFAULT false,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','published')),
  reviewed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  reviewer_notes TEXT,
  admin_comment  TEXT,
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_mt_user   ON member_testimonies(user_id);


CREATE INDEX IF NOT EXISTS idx_mt_status ON member_testimonies(status);


DO $$ BEGIN ALTER TABLE member_testimonies ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "mt_public_select" ON member_testimonies;

DROP POLICY IF EXISTS "mt_public_select" ON member_testimonies;


CREATE POLICY "mt_public_select" ON member_testimonies FOR SELECT USING (status = 'published');


DROP POLICY IF EXISTS "mt_owner_insert" ON member_testimonies;

DROP POLICY IF EXISTS "mt_owner_insert" ON member_testimonies;


CREATE POLICY "mt_owner_insert" ON member_testimonies FOR INSERT WITH CHECK (user_id = auth.uid());


DROP POLICY IF EXISTS "mt_admin_all" ON member_testimonies;

DROP POLICY IF EXISTS "mt_admin_all" ON member_testimonies;


CREATE POLICY "mt_admin_all" ON member_testimonies FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 34. chat_messages (Community chat)
CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name  TEXT NOT NULL DEFAULT '',
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_cmsg_chat_created ON chat_messages(created_at);


DO $$ BEGIN ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "chat_authenticated_select" ON chat_messages;

DROP POLICY IF EXISTS "chat_authenticated_select" ON chat_messages;


CREATE POLICY "chat_authenticated_select" ON chat_messages FOR SELECT USING (auth.uid() IS NOT NULL);


DROP POLICY IF EXISTS "chat_authenticated_insert" ON chat_messages;

DROP POLICY IF EXISTS "chat_authenticated_insert" ON chat_messages;


CREATE POLICY "chat_authenticated_insert" ON chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


DROP POLICY IF EXISTS "chat_admin_all" ON chat_messages;

DROP POLICY IF EXISTS "chat_admin_all" ON chat_messages;


CREATE POLICY "chat_admin_all" ON chat_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 35. communication_messages
CREATE TABLE IF NOT EXISTS communication_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  channel         TEXT NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('sms','whatsapp','email','push','in_app')),
  target_type     TEXT NOT NULL DEFAULT 'all'
    CHECK (target_type IN ('all','equipe','department','cellule','role','custom')),
  target_ids      UUID[] DEFAULT '{}',
  target_label    TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','sent','failed')),
  sent_by         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_by_name    TEXT,
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  delivery_count  INTEGER NOT NULL DEFAULT 0,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_commmsg_status ON communication_messages(status);


CREATE INDEX IF NOT EXISTS idx_commmsg_sent_by ON communication_messages(sent_by);


DO $$ BEGIN ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "commmsg_admin_all" ON communication_messages;

DROP POLICY IF EXISTS "commmsg_admin_all" ON communication_messages;


CREATE POLICY "commmsg_admin_all" ON communication_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);



-- 36. media_library
CREATE TABLE IF NOT EXISTS media_library (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL DEFAULT 'autre'
    CHECK (category IN ('tract','guide','affiche','photo','video','document','autre')),
  file_url       TEXT NOT NULL,
  thumbnail_url  TEXT,
  file_type      TEXT NOT NULL DEFAULT '',
  file_size      BIGINT,
  access_role    TEXT NOT NULL DEFAULT 'admin'
    CHECK (access_role IN ('admin','pasteur','membre','public')),
  department_id  UUID,
  tags           TEXT[] DEFAULT '{}',
  download_count INTEGER NOT NULL DEFAULT 0,
  created_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_ml_category ON media_library(category);


CREATE INDEX IF NOT EXISTS idx_ml_access  ON media_library(access_role);


DO $$ BEGIN ALTER TABLE media_library ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;


DROP POLICY IF EXISTS "ml_public_select" ON media_library;

DROP POLICY IF EXISTS "ml_public_select" ON media_library;


CREATE POLICY "ml_public_select" ON media_library FOR SELECT USING (
  access_role = 'public' OR auth.uid() IS NOT NULL
);


DROP POLICY IF EXISTS "ml_admin_all" ON media_library;

DROP POLICY IF EXISTS "ml_admin_all" ON media_library;


CREATE POLICY "ml_admin_all" ON media_library FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role_level >= 6)
);




-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 12 — VIEW: Evangelism Statistics
-- ═══════════════════════════════════════════════════════════════════════════

-- 37. v_evangelism_stats
CREATE OR REPLACE VIEW v_evangelism_stats AS
SELECT
  (SELECT COUNT(*) FROM evangelism_outings WHERE status != 'annulee')::int AS total_outings,
  (SELECT COUNT(*) FROM evangelism_contacts)::int AS total_contacts,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE decision IN ('accepte_christ', 'veut_venir_eglise'))::int AS decisions,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE status = 'integre_eglise')::int AS integrated,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE came_to_culte = true)::int AS came_to_culte,
  (SELECT COUNT(*) FROM evangelism_followups
    WHERE completed_at IS NOT NULL)::int AS followups_done,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE status IN ('a_contacter', 'contacte', 'en_suivi'))::int AS active_followups,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE baptized = true)::int AS baptized,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE pipeline_stage = 'nouveau_contact')::int AS new_visitors,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE rdv_status = 'planifie')::int AS rdv_pending,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE discipleship_start_date IS NOT NULL)::int AS in_discipleship,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE rdv_status = 'realise')::int AS rdv_completed;




-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 13 — REALTIME: Enable realtime for chat_messages
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ═══ 20261026010000_articles_and_extension_fields.sql ════════════
-- ═══════════════════════════════════════════════════════════════════
-- Articles éditables + extensions enrichies + pages libres
-- Date: 2026-10-26
--
-- Objectifs :
--   1. Table `articles` pour publier les actualités depuis le back-office,
--      avec repli sur les articles statiques tant qu'elle est vide.
--   2. `locations` : GPS facultatif, description et photo pour les
--      extensions de la page Missions.
--   3. `page_contents` : suppression du CHECK qui limitait les pages
--      éditables (Missions, Ministères, Pasteurs, etc.).
--   4. Storage : upload réservé aux administrateurs connectés.
--
-- Aucune donnée d'église n'est insérée par cette migration.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Helper d'autorisation (évite la récursion RLS) ────────────────
CREATE OR REPLACE FUNCTION public.is_church_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;



REVOKE ALL ON FUNCTION public.is_church_admin() FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.is_church_admin() TO anon, authenticated;



-- ─── 1. ARTICLES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.articles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  category        text NOT NULL DEFAULT 'Annonce'
                  CHECK (category IN ('Enseignement', 'Événement', 'Annonce', 'Vision')),
  published_at    timestamptz NOT NULL DEFAULT now(),
  excerpt         text NOT NULL DEFAULT '',
  image_url       text,
  body            jsonb NOT NULL DEFAULT '[]'::jsonb,
  quote_text      text,
  quote_reference text,
  source_url      text,
  is_featured     boolean NOT NULL DEFAULT false,
  is_published    boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT articles_body_is_array CHECK (jsonb_typeof(body) = 'array')
);



CREATE INDEX IF NOT EXISTS idx_articles_published_at
  ON public.articles (published_at DESC);



ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "articles_public_read" ON public.articles;

DROP POLICY IF EXISTS "articles_public_read" ON public.articles;


CREATE POLICY "articles_public_read" ON public.articles
  FOR SELECT TO anon, authenticated
  USING (is_published = true);



DROP POLICY IF EXISTS "articles_admin_read" ON public.articles;

DROP POLICY IF EXISTS "articles_admin_read" ON public.articles;


CREATE POLICY "articles_admin_read" ON public.articles
  FOR SELECT TO authenticated
  USING (public.is_church_admin());



DROP POLICY IF EXISTS "articles_admin_write" ON public.articles;

DROP POLICY IF EXISTS "articles_admin_write" ON public.articles;


CREATE POLICY "articles_admin_write" ON public.articles
  FOR ALL TO authenticated
  USING (public.is_church_admin())
  WITH CHECK (public.is_church_admin());



CREATE OR REPLACE FUNCTION public.touch_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;



DROP TRIGGER IF EXISTS articles_set_updated_at ON public.articles;

DROP TRIGGER IF EXISTS articles_set_updated_at ON public.articles;


CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.touch_content_updated_at();



-- ─── 2. GALERIE PHOTOS (page Médias) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.media_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text NOT NULL DEFAULT '',
  file_url      text NOT NULL,
  thumbnail_url text,
  file_type     text NOT NULL DEFAULT 'image'
                CHECK (file_type IN ('image', 'video', 'audio')),
  category      text NOT NULL DEFAULT 'general'
                CHECK (category IN ('sermon', 'event', 'worship', 'community', 'general')),
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);



CREATE INDEX IF NOT EXISTS idx_media_items_active_order
  ON public.media_items (is_active, sort_order);



ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "media_items_public_read" ON public.media_items;

DROP POLICY IF EXISTS "media_items_public_read" ON public.media_items;


CREATE POLICY "media_items_public_read" ON public.media_items
  FOR SELECT TO anon, authenticated
  USING (is_active = true);



DROP POLICY IF EXISTS "media_items_admin_write" ON public.media_items;

DROP POLICY IF EXISTS "media_items_admin_write" ON public.media_items;


CREATE POLICY "media_items_admin_write" ON public.media_items
  FOR ALL TO authenticated
  USING (public.is_church_admin())
  WITH CHECK (public.is_church_admin());



DROP TRIGGER IF EXISTS media_items_set_updated_at ON public.media_items;

DROP TRIGGER IF EXISTS media_items_set_updated_at ON public.media_items;


CREATE TRIGGER media_items_set_updated_at
  BEFORE UPDATE ON public.media_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_content_updated_at();



-- ─── 3. LOCATIONS / EXTENSIONS ────────────────────────────────────
ALTER TABLE public.locations ALTER COLUMN latitude DROP NOT NULL;


ALTER TABLE public.locations ALTER COLUMN longitude DROP NOT NULL;


ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS description text;


ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS image_url text;



ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "anon_select_locations" ON public.locations;


DROP POLICY IF EXISTS "anon_insert_locations" ON public.locations;


DROP POLICY IF EXISTS "anon_update_locations" ON public.locations;


DROP POLICY IF EXISTS "anon_delete_locations" ON public.locations;


DROP POLICY IF EXISTS "locations_public_read" ON public.locations;

DROP POLICY IF EXISTS "locations_public_read" ON public.locations;


CREATE POLICY "locations_public_read" ON public.locations
  FOR SELECT TO anon, authenticated
  USING (true);



DROP POLICY IF EXISTS "locations_admin_write" ON public.locations;

DROP POLICY IF EXISTS "locations_admin_write" ON public.locations;


CREATE POLICY "locations_admin_write" ON public.locations
  FOR ALL TO authenticated
  USING (public.is_church_admin())
  WITH CHECK (public.is_church_admin());



-- ─── 4. PAGE_CONTENTS : toutes les pages sont éditables ────────────
-- Le CHECK historique empêchait d'enregistrer Missions, Ministères,
-- Pasteurs, Jeunesse, Blog, Vision, Enseignements, etc.
ALTER TABLE public.page_contents DROP CONSTRAINT IF EXISTS page_contents_page_check;



-- Lecture publique, écriture réservée aux administrateurs.
ALTER TABLE public.page_contents ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "content_public_read" ON public.page_contents;

DROP POLICY IF EXISTS "content_public_read" ON public.page_contents;


CREATE POLICY "content_public_read" ON public.page_contents
  FOR SELECT TO anon, authenticated
  USING (true);



DROP POLICY IF EXISTS "content_admin_write" ON public.page_contents;

DROP POLICY IF EXISTS "content_admin_write" ON public.page_contents;


CREATE POLICY "content_admin_write" ON public.page_contents
  FOR ALL TO authenticated
  USING (public.is_church_admin())
  WITH CHECK (public.is_church_admin());



-- ─── 5. STORAGE « media » ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media', 'media', true, 52428800)
ON CONFLICT (id) DO NOTHING;



DROP POLICY IF EXISTS "media_public_read" ON storage.objects;

DROP POLICY IF EXISTS "media_public_read" ON storage.objects;


CREATE POLICY "media_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media');



DROP POLICY IF EXISTS "media_public_upload" ON storage.objects;


DROP POLICY IF EXISTS "media_public_update" ON storage.objects;


DROP POLICY IF EXISTS "media_public_delete" ON storage.objects;


DROP POLICY IF EXISTS "media_admin_insert" ON storage.objects;

DROP POLICY IF EXISTS "media_admin_insert" ON storage.objects;


CREATE POLICY "media_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.is_church_admin());



DROP POLICY IF EXISTS "media_admin_update" ON storage.objects;

DROP POLICY IF EXISTS "media_admin_update" ON storage.objects;


CREATE POLICY "media_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.is_church_admin())
  WITH CHECK (bucket_id = 'media' AND public.is_church_admin());



DROP POLICY IF EXISTS "media_admin_delete" ON storage.objects;

DROP POLICY IF EXISTS "media_admin_delete" ON storage.objects;


CREATE POLICY "media_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.is_church_admin());


-- ═══════════════════════════════════════════════════════════════════
-- TABLES MANQUANTES DANS L'HISTORIQUE (référencées par l'application)
-- ═══════════════════════════════════════════════════════════════════

-- Colonnes de rôle attendues par les policies ERP et le module Départements
ALTER TABLE department_members
  ADD COLUMN IF NOT EXISTS role_in_dept TEXT NOT NULL DEFAULT 'member'
  CHECK (role_in_dept IN ('pending','member','leader'));

ALTER TABLE department_members
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;


CREATE TABLE IF NOT EXISTS calendar_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  category           TEXT NOT NULL CHECK (category IN (
    'culte', 'mission', 'jeunesse', 'communion',
    'emission', 'predication', 'reunion', 'formation'
  )),
  event_date         TIMESTAMPTZ NOT NULL,
  end_date           TIMESTAMPTZ,
  start_time         TEXT NOT NULL DEFAULT '00:00',
  end_time           TEXT NOT NULL DEFAULT '23:59',
  location_id        UUID REFERENCES locations(id) ON DELETE SET NULL,
  location_name      TEXT,
  department_id      UUID REFERENCES departments(id) ON DELETE SET NULL,
  image_url          TEXT,
  is_recurring       BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT,
  created_by         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cal_evt_select ON calendar_events;

CREATE POLICY cal_evt_select ON calendar_events FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS cal_evt_write ON calendar_events;

CREATE POLICY cal_evt_write ON calendar_events FOR ALL TO authenticated
  USING (public.is_church_admin()) WITH CHECK (public.is_church_admin());

CREATE INDEX IF NOT EXISTS idx_cal_evt_date ON calendar_events(event_date);

CREATE INDEX IF NOT EXISTS idx_cal_evt_category ON calendar_events(category);

CREATE INDEX IF NOT EXISTS idx_cal_evt_dept ON calendar_events(department_id) WHERE department_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cal_evt_created_by ON calendar_events(created_by);


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


CREATE OR REPLACE FUNCTION public.create_department_meetings_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.department_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_time TIME,
    location TEXT,
    agenda TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
END;
$$;


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


CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'sound', 'seating', 'lighting', 'literature',
    'generators', 'tents', 'vehicles', 'other'
  )),
  description TEXT,
  quantity_total INTEGER NOT NULL DEFAULT 0,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN (
    'excellent', 'good', 'fair', 'needs_repair', 'retired'
  )),
  location_stored TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;


CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name TEXT,
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  event_title TEXT,
  quantity_reserved INTEGER NOT NULL DEFAULT 1,
  reserved_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reserved_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'active', 'returned', 'overdue'
  )),
  reserved_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  return_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;


CREATE INDEX IF NOT EXISTS idx_inv_item_cat ON inventory_items(category);

CREATE INDEX IF NOT EXISTS idx_inv_res_item ON inventory_reservations(item_id);

CREATE INDEX IF NOT EXISTS idx_inv_res_event ON inventory_reservations(event_id);


-- Lecture publique, écriture réservée aux responsables connectés
DROP POLICY IF EXISTS inv_item_select ON inventory_items;

CREATE POLICY inv_item_select ON inventory_items FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS inv_item_write ON inventory_items;

CREATE POLICY inv_item_write ON inventory_items FOR ALL TO authenticated
  USING (public.is_church_admin()) WITH CHECK (public.is_church_admin());

DROP POLICY IF EXISTS inv_res_select ON inventory_reservations;

CREATE POLICY inv_res_select ON inventory_reservations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS inv_res_write ON inventory_reservations;

CREATE POLICY inv_res_write ON inventory_reservations FOR ALL TO authenticated
  USING (public.is_church_admin()) WITH CHECK (public.is_church_admin());


-- ═══════════════════════════════════════════════════════════════════
-- RPC TABLEAU DE BORD
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_members', (SELECT COUNT(*) FROM user_profiles),
    'new_converts_month', (SELECT COUNT(*) FROM convertis WHERE created_at >= date_trunc('month', NOW())),
    'upcoming_events', (SELECT COUNT(*) FROM calendar_events WHERE event_date >= NOW()),
    'pending_visit_requests', (SELECT COUNT(*) FROM visit_requests WHERE status = 'en_attente'),
    'open_prayer_requests', (SELECT COUNT(*) FROM prayer_requests WHERE status IN ('nouveau', 'en_priere')),
    'convertis_in_pipeline', (SELECT COUNT(*) FROM convertis WHERE pipeline_stage != 'membre_actif'),
    'unresolved_alerts', (SELECT COUNT(*) FROM pastoral_alerts WHERE status = 'ouverte')
  );
$$ LANGUAGE sql SECURITY DEFINER;



-- ═══════════════════════════════════════════════════════════════════
-- COLONNE sort_order PARTOUT OÙ L'ADMIN L'UTILISE
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'page_contents', 'site_settings', 'locations', 'ministries', 'media_items',
    'testimonials', 'departments', 'positions', 'department_members', 'sermons',
    'activity_cards', 'emissions', 'announcements', 'communications', 'audio_tracks',
    'pastors', 'extensions', 'worship_services', 'worship_order_items',
    'evangelism_outings', 'protocol_teams', 'protocol_schedules', 'daily_verses',
    'impact_counters', 'event_assignments', 'cellules_maison'
  ]::text[]) AS tbl
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = r.tbl
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = 'sort_order'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN sort_order INTEGER DEFAULT 0', r.tbl);
    END IF;
  END LOOP;
END $$;



-- 4. PASTORS TABLE — Enhanced with social links, video, extended bio
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE pastors ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '';


ALTER TABLE pastors ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;


ALTER TABLE pastors ADD COLUMN IF NOT EXISTS extended_bio TEXT DEFAULT '';


ALTER TABLE pastors ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;


ALTER TABLE pastors ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';


ALTER TABLE pastors ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';


CREATE POLICY positions_leader_manage ON positions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM department_members dm
      WHERE dm.department_id = positions.department_id
        AND dm.user_id = auth.uid()
        AND dm.role_in_dept = 'leader'
        AND dm.is_active = true
    )
  );


CREATE POLICY positions_leader_update ON positions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM department_members dm
      WHERE dm.department_id = positions.department_id
        AND dm.user_id = auth.uid()
        AND dm.role_in_dept = 'leader'
        AND dm.is_active = true
    )
  );


CREATE POLICY dept_members_leader_read ON department_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM department_members dm2
      WHERE dm2.department_id = department_members.department_id
        AND dm2.user_id = auth.uid()
        AND dm2.role_in_dept = 'leader'
        AND dm2.is_active = true
    )
  );


CREATE POLICY dept_members_leader_update ON department_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM department_members dm2
      WHERE dm2.department_id = department_members.department_id
        AND dm2.user_id = auth.uid()
        AND dm2.role_in_dept = 'leader'
        AND dm2.is_active = true
    )
  );


CREATE TRIGGER trg_refresh_member_count
  AFTER INSERT OR DELETE OR UPDATE OF is_active, role_in_dept ON department_members
  FOR EACH ROW EXECUTE FUNCTION refresh_department_member_count();
COMMIT;
