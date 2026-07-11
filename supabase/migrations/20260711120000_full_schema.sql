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
  is_admin boolean NOT NULL DEFAULT false,
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
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON user_profiles;
CREATE POLICY "profiles_select_own" ON user_profiles FOR SELECT
  TO anon, authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON user_profiles;
CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_admin_select_all" ON user_profiles;
CREATE POLICY "profiles_admin_select_all" ON user_profiles FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "profiles_admin_update" ON user_profiles;
CREATE POLICY "profiles_admin_update" ON user_profiles FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

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
CREATE POLICY "settings_public_read" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "settings_admin_write" ON site_settings;
CREATE POLICY "settings_admin_write" ON site_settings FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "settings_admin_update" ON site_settings;
CREATE POLICY "settings_admin_update" ON site_settings FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

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
CREATE POLICY "content_public_read" ON page_contents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "content_admin_write" ON page_contents;
CREATE POLICY "content_admin_write" ON page_contents FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "content_admin_update" ON page_contents;
CREATE POLICY "content_admin_update" ON page_contents FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

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
CREATE POLICY "anon_select_locations" ON locations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_locations" ON locations;
DROP POLICY IF EXISTS "locations_admin_insert" ON locations;
CREATE POLICY "locations_admin_insert" ON locations FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "anon_update_locations" ON locations;
DROP POLICY IF EXISTS "locations_admin_update" ON locations;
CREATE POLICY "locations_admin_update" ON locations FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "anon_delete_locations" ON locations;
DROP POLICY IF EXISTS "locations_admin_delete" ON locations;
CREATE POLICY "locations_admin_delete" ON locations FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

INSERT INTO locations (name, address, city, country, latitude, longitude, phone, email, service_times, pastor_name, is_main, is_active, sort_order)
VALUES (
  'Eglise Principale La Conquete',
  '520, Av. N''Djamena',
  'Lubumbashi',
  'RDC',
  -11.6876,
  27.4985,
  '+243 844 107 079',
  'egliseevangeliquelaconquete@gmail.com',
  'Dimanche 09h00 & 11h30 | Mardi 19h00 | Jeudi 18h30',
  'Pasteur Jacques-Daniel Kongolo',
  true,
  true,
  0
) ON CONFLICT DO NOTHING;

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
CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_events" ON events;
DROP POLICY IF EXISTS "events_admin_insert" ON events;
CREATE POLICY "events_admin_insert" ON events FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "anon_update_events" ON events;
DROP POLICY IF EXISTS "events_admin_update" ON events;
CREATE POLICY "events_admin_update" ON events FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "anon_delete_events" ON events;
DROP POLICY IF EXISTS "events_admin_delete" ON events;
CREATE POLICY "events_admin_delete" ON events FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

INSERT INTO events (title, description, category, image_url, event_date, location, is_live, is_featured) VALUES
  ('La Puissance de la Foi', 'Rejoignez-nous pour un moment exceptionnel de louange et de proclamation de la parole.', 'Cultes', 'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=800', '2026-07-12 10:00:00+02', 'Auditorium Principal', true, true),
  ('Impact Night', 'Une soirée dédiée à la nouvelle génération pour découvrir leurs dons spirituels.', 'Jeunesse', 'https://images.pexels.com/photos/8465180/pexels-photo-8465180.jpeg?auto=compress&cs=tinysrgb&w=800', '2026-07-15 19:00:00+02', 'Campus Nord', false, false),
  ('Mission Espoir', 'Expédition humanitaire et spirituelle pour soutenir les communautés rurales.', 'Missions', 'https://images.pexels.com/photos/290468/pexels-photo-290468.jpeg?auto=compress&cs=tinysrgb&w=800', '2026-07-18 08:00:00+02', 'Communautés Rurales', false, false),
  ('Dîner de Gala', 'Une soirée de célébration et de levée de fonds pour nos projets de construction.', 'Communion', 'https://images.pexels.com/photos/3760529/pexels-photo-3760529.jpeg?auto=compress&cs=tinysrgb&w=800', '2026-07-22 20:00:00+02', 'Salle Polyvalente', false, false)
ON CONFLICT DO NOTHING;

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
CREATE POLICY "ministries_public_read" ON ministries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ministries_admin_insert" ON ministries;
CREATE POLICY "ministries_admin_insert" ON ministries FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "ministries_admin_update" ON ministries;
CREATE POLICY "ministries_admin_update" ON ministries FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

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
CREATE POLICY "media_public_read" ON media_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "media_admin_insert" ON media_items;
CREATE POLICY "media_admin_insert" ON media_items FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "media_admin_update" ON media_items;
CREATE POLICY "media_admin_update" ON media_items FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

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
CREATE POLICY "testimonials_public_read" ON testimonials FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "testimonials_admin_insert" ON testimonials;
CREATE POLICY "testimonials_admin_insert" ON testimonials FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "testimonials_admin_update" ON testimonials;
CREATE POLICY "testimonials_admin_update" ON testimonials FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

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
CREATE POLICY "messages_public_insert" ON contact_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "messages_admin_read" ON contact_messages;
CREATE POLICY "messages_admin_read" ON contact_messages FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "messages_admin_update" ON contact_messages;
CREATE POLICY "messages_admin_update" ON contact_messages FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

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
CREATE POLICY "theme_public_read" ON theme_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "theme_admin_write" ON theme_settings;
CREATE POLICY "theme_admin_write" ON theme_settings FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "theme_admin_update" ON theme_settings;
CREATE POLICY "theme_admin_update" ON theme_settings FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

INSERT INTO theme_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ─── 11. SEED DATA — Paramètres globaux par défaut ──────────────
INSERT INTO site_settings (key, value, type, category, label, description, sort_order) VALUES
  ('church_name', 'Église Évangélique La Conquête', 'text', 'general', 'Nom de l''église', 'Affiché dans le header et le SEO', 1),
  ('church_slogan', 'Bâtir, Transformer et Conquérir', 'text', 'general', 'Slogan', 'Sous-titre principal du site', 2),
  ('logo_url', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuHDznVSbj77TcRuf-r0to8rCYGPa9lZ75G4Zm7hbC__8gp8d56nTozKyHZyybWU9xdaBURMxftyiZF-i4Zdp8XT_bJYNT-WVQWu3r32FHqxjRzt9cCMpPuHJJZryUrKgHbCiFJYnLg0boUgp8ATuXf_zhlyEhW-QlPQVcfIXjf8lrX2G3JGtujmvo3YKp_c94RqPQf5g8LvIBM1zRCErGSOVjRIw8SQ4aH3aliCJ-EOhKBq-PO5S3pZoaMuTk7u2iKCU', 'url', 'general', 'Logo URL', 'URL du logo de l''église', 3),
  ('phone', '+243 844 107 079', 'text', 'contact', 'Téléphone', 'Numéro de téléphone principal', 10),
  ('email', 'contact@laconquete.cd', 'text', 'contact', 'Email', 'Adresse email de contact', 11),
  ('address', 'Av. Kabambare, Lubumbashi', 'text', 'contact', 'Adresse', 'Adresse physique du siège', 12),
  ('city', 'Lubumbashi', 'text', 'contact', 'Ville', 'Ville du siège', 13),
  ('country', 'RDC', 'text', 'contact', 'Pays', 'Pays', 14),
  ('facebook_url', '', 'url', 'social', 'Facebook', 'Lien vers la page Facebook', 20),
  ('youtube_url', '', 'url', 'social', 'YouTube', 'Lien vers la chaîne YouTube', 21),
  ('whatsapp_url', 'https://wa.me/243844107079', 'url', 'social', 'WhatsApp', 'Lien WhatsApp', 22),
  ('instagram_url', '', 'url', 'social', 'Instagram', 'Lien Instagram', 23),
  ('tiktok_url', '', 'url', 'social', 'TikTok', 'Lien TikTok', 24),
  ('seo_title', 'Église Évangélique La Conquête — Lubumbashi, RDC', 'text', 'seo', 'Titre SEO', 'Titre affiché dans les résultats de recherche', 30),
  ('seo_description', 'Église Évangélique La Conquête de Lubumbashi. Bâtir, Transformer et Conquérir avec la puissance de Dieu.', 'text', 'seo', 'Description SEO', 'Description pour les moteurs de recherche', 31)
ON CONFLICT (key) DO NOTHING;

-- ─── 12. SEED DATA — Contenu par page (valeurs par défaut) ───────
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order) VALUES
  -- HOME PAGE
  ('home', 'hero', 'badge', 'Église Évangélique', 'text', 'Badge héro', 1),
  ('home', 'hero', 'title', 'Bâtir, Transformer et Conquérir', 'text', 'Titre héro', 2),
  ('home', 'hero', 'subtitle', 'Impactez votre génération, transformez votre communauté et conquérez votre destinée avec la puissance de Dieu.', 'text', 'Sous-titre héro', 3),
  ('home', 'hero', 'cta_1_text', 'Suivre le Direct', 'text', 'Bouton CTA 1', 4),
  ('home', 'hero', 'cta_1_link', 'media', 'text', 'Lien CTA 1', 5),
  ('home', 'hero', 'cta_2_text', 'Planifier une visite', 'text', 'Bouton CTA 2', 6),
  ('home', 'hero', 'cta_2_link', 'contact', 'text', 'Lien CTA 2', 7),
  ('home', 'hero', 'image_url', 'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=1920', 'image_url', 'Image héro', 8),
  ('home', 'pillars', 'section_label', 'Notre vision', 'text', 'Label section piliers', 10),
  ('home', 'pillars', 'section_title', 'Les trois piliers', 'text', 'Titre section piliers', 11),
  ('home', 'pillars', 'pillar_1_title', 'Bâtir', 'text', 'Pilier 1 titre', 12),
  ('home', 'pillars', 'pillar_1_desc', 'Construire des fondations solides ancrées dans la Parole de Dieu.', 'text', 'Pilier 1 description', 13),
  ('home', 'pillars', 'pillar_2_title', 'Transformer', 'text', 'Pilier 2 titre', 14),
  ('home', 'pillars', 'pillar_2_desc', 'Vivre une transformation intérieure par la puissance du Saint-Esprit.', 'text', 'Pilier 2 description', 15),
  ('home', 'pillars', 'pillar_3_title', 'Conquérir', 'text', 'Pilier 3 titre', 16),
  ('home', 'pillars', 'pillar_3_desc', 'Avancer dans notre mission divine pour impacter des nations.', 'text', 'Pilier 3 description', 17),
  ('home', 'vision', 'section_label', 'Notre mission', 'text', 'Label section vision', 20),
  ('home', 'vision', 'title', 'Conquérir des âmes pour le Royaume de Dieu', 'text', 'Titre vision', 21),
  ('home', 'vision', 'text_1', 'Fondée sur la Parole vivante de Dieu, l''Église La Conquête est une communauté de foi qui croit en la puissance transformatrice de l''Évangile. Nous sommes appelés à bâtir des vies, à transformer des cœurs et à conquérir des nations pour la gloire de Dieu.', 'text', 'Texte vision 1', 22),
  ('home', 'vision', 'text_2', 'Chaque croyant est un ambassadeur, porteur d''une vision divine pour sa génération. Ensemble, nous avançons dans notre destinée collective avec foi, amour et détermination.', 'text', 'Texte vision 2', 23),
  ('home', 'vision', 'image_url', 'https://images.pexels.com/photos/290468/pexels-photo-290468.jpeg?auto=compress&cs=tinysrgb&w=1200', 'image_url', 'Image vision', 24),
  ('home', 'vision', 'cta_text', 'En savoir plus', 'text', 'Bouton vision', 25),
  ('home', 'vision', 'cta_link', 'about', 'text', 'Lien bouton vision', 26),
  ('home', 'vision', 'bible_ref', 'Psaumes 2:8', 'text', 'Référence biblique', 27),
  ('home', 'vision', 'bible_text', 'Demande-moi, et je te donnerai les nations pour héritage.', 'text', 'Citation biblique', 28),
  ('home', 'quote', 'text', 'Impactez votre génération, transformez votre communauté et conquérez votre destinée avec la puissance de Dieu.', 'text', 'Citation principale', 30),
  ('home', 'quote', 'ref', 'Matthieu 28:19', 'text', 'Référence citation', 31),
  ('home', 'contact_strip', 'section_label', 'Nous rejoindre', 'text', 'Label contact strip', 40),
  ('home', 'contact_strip', 'title', 'Venez comme vous êtes', 'text', 'Titre contact strip', 41),

  -- ABOUT PAGE
  ('about', 'hero', 'badge', 'Qui sommes-nous', 'text', 'Badge héro à propos', 1),
  ('about', 'hero', 'title', 'Notre Histoire', 'text', 'Titre héro à propos', 2),
  ('about', 'hero', 'subtitle', 'Une communauté de foi en marche depuis Lubumbashi.', 'text', 'Sous-titre héro à propos', 3),
  ('about', 'mission', 'title', 'Notre Mission', 'text', 'Titre mission', 10),
  ('about', 'mission', 'text', 'Nous existons pour glorifier Dieu, former des disciples et transformer les communautés par la puissance de l''Évangile de Jésus-Christ.', 'text', 'Texte mission', 11),
  ('about', 'history', 'title', 'Notre Histoire', 'text', 'Titre historique', 20),
  ('about', 'history', 'text', 'L''Église Évangélique La Conquête a été fondée à Lubumbashi avec une vision claire : bâtir une communauté de croyants engagés, capables d''impacter leur génération. Depuis ses débuts modestes, l''église a grandi pour devenir une famille spirituelle accueillante, dynamique et en constante expansion.', 'text', 'Texte historique', 21),
  ('about', 'values', 'title', 'Nos Valeurs', 'text', 'Titre valeurs', 30),
  ('about', 'values', 'subtitle', 'Les fondements qui guident notre communauté.', 'text', 'Sous-titre valeurs', 31),

  -- ACTIVITIES PAGE
  ('activities', 'hero', 'badge', 'Communauté', 'text', 'Badge activités', 1),
  ('activities', 'hero', 'title', 'Nos Activités', 'text', 'Titre activités', 2),
  ('activities', 'hero', 'subtitle', 'Chaque ministère est un espace où vous pouvez grandir, servir et vous épanouir dans votre vocation.', 'text', 'Sous-titre activités', 3),
  ('activities', 'ministries', 'title', 'Nos ministères', 'text', 'Titre ministères', 10),
  ('activities', 'ministries', 'subtitle', 'Quel que soit votre parcours ou vos dons, il y a une place pour vous au sein de nos ministères.', 'text', 'Sous-titre ministères', 11),
  ('activities', 'cta', 'title', 'Impliquez-vous dans notre communauté', 'text', 'Titre CTA activités', 20),
  ('activities', 'cta', 'text', 'Chaque personne a une contribution unique à apporter. Que vous soyez musicien, enseignant, intercesseur ou missionnaire, vos dons sont nécessaires ici.', 'text', 'Texte CTA activités', 21),
  ('activities', 'cta', 'image_url', 'https://images.pexels.com/photos/8465180/pexels-photo-8465180.jpeg?auto=compress&cs=tinysrgb&w=800', 'image_url', 'Image CTA activités', 22),

  -- EVENTS PAGE
  ('events', 'hero', 'badge', 'Calendrier', 'text', 'Badge événements', 1),
  ('events', 'hero', 'title', 'Agenda', 'text', 'Titre événements', 2),
  ('events', 'hero', 'subtitle', 'Retrouvez tous nos événements, cultes et rassemblements.', 'text', 'Sous-titre événements', 3),

  -- MEDIA PAGE
  ('media', 'hero', 'badge', 'Galerie', 'text', 'Badge médias', 1),
  ('media', 'hero', 'title', 'Nos Médias', 'text', 'Titre médias', 2),
  ('media', 'hero', 'subtitle', 'Retrouvez nos sermons, photos d''événements et moments de louange.', 'text', 'Sous-titre médias', 3),

  -- CONTACT PAGE
  ('contact', 'hero', 'badge', 'Contact', 'text', 'Badge contact', 1),
  ('contact', 'hero', 'title', 'Parlons-en', 'text', 'Titre contact', 2),
  ('contact', 'hero', 'subtitle', 'Que vous ayez une question, un témoignage ou souhaitiez en savoir plus, nous sommes là pour vous.', 'text', 'Sous-titre contact', 3)
ON CONFLICT (page, section_key, field_key) DO NOTHING;

-- ─── 13. SEED DATA — Ministères par défaut ──────────────────────
INSERT INTO ministries (title, description, icon_name, schedule, accent_color, sort_order, is_active) VALUES
  ('Jeunesse', 'Un espace dynamique où les jeunes découvrent leur identité en Christ et développent leurs dons pour l''avenir.', 'Users', 'Samedi à 15h00', 'gold', 1, true),
  ('Femmes de Foi', 'Un ministère dédié à fortifier les femmes dans leur foi, leur famille et leur vocation divine.', 'Heart', 'Mercredi à 17h00', 'ember', 2, true),
  ('Hommes de Valeur', 'Former des hommes intègres, responsables et engagés dans leur famille, leur église et leur communauté.', 'Crown', 'Samedi à 08h00', 'gold', 3, true),
  ('Étude Biblique', 'Des sessions d''approfondissement de la Parole de Dieu pour affermir votre foi et votre compréhension.', 'BookOpen', 'Mardi à 19h00', 'ember', 4, true),
  ('Veillée d''Adoration', 'Des nuits dédiées à l''adoration, la prière et la présence de Dieu pour des percées spirituelles.', 'Moon', 'Vendredi à 22h00', 'gold', 5, true),
  ('Missions', 'Portez l''Évangile au-delà des frontières de notre église à travers des équipes missionnaires locales et internationales.', 'Flame', 'Mensuel', 'ember', 6, true),
  ('Intercession', 'Rejoignez des guerriers de la prière qui intercèdent pour l''église, la nation et le monde entier.', 'HandHeart', 'Jeudi à 18h30', 'gold', 7, true),
  ('Louange', 'Une équipe de musiciens et de chanteurs passionnés qui conduisent la congrégation dans un culte authentique.', 'Sparkles', 'Dimanche + répétitions', 'ember', 8, true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- FIN — Ce script est idempotent : vous pouvez le relancer autant
-- de fois que nécessaire sans erreur.
-- ═══════════════════════════════════════════════════════════════════