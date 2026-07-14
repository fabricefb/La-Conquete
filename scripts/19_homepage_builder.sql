-- ═══════════════════════════════════════════════════════════════════════════
-- 19_homepage_builder.sql
-- Schéma pour le système de gestion de contenu avancé + Page Builder
-- Église Évangélique La Conquête
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Configurations visuelles des sections ─────────────────────────

CREATE TABLE IF NOT EXISTS section_configs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page          VARCHAR(50)  NOT NULL,
  section       VARCHAR(50)  NOT NULL,
  config        JSONB        NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ  DEFAULT now(),
  UNIQUE(page, section)
);

COMMENT ON TABLE section_configs IS 'Configurations visuelles par section (design, animations, carte)';
COMMENT ON COLUMN section_configs.config IS 'JSON: {card_radius, card_shadow, card_opacity, card_border_top, animation_type, animation_speed, columns, ...}';

INSERT INTO section_configs (page, section, config) VALUES
  ('home', 'hero', '{"animation_type":"fade-up","animation_speed":0.7,"overlay_opacity":0.75,"show_scroll_indicator":true}'),
  ('home', 'verses', '{"card_radius":24,"card_shadow":true,"columns":4,"animation_type":"fade-up","animation_speed":0.6}'),
  ('home', 'pillars', '{"card_radius":24,"card_shadow":true,"card_border_top":true,"card_opacity":0.3,"columns":3,"hover_scale":1.02}'),
  ('home', 'unique', '{"image_offset":40,"show_signature":true,"overlay_position":"right"}'),
  ('home', 'explore', '{"card_radius":32,"columns":3,"hover_zoom":1.1,"featured_card":true}'),
  ('home', 'pastors', '{"card_radius":16,"overlay_animation":"slide-up","columns":4,"show_bio":true}'),
  ('home', 'testimonials', '{"auto_play":true,"interval":5000,"show_rating":true,"card_radius":24}'),
  ('home', 'cta', '{"full_width":true,"overlay_opacity":0.85}'),
  ('home', 'contact', '{"card_radius":24,"columns":3,"hover_scale":1.05}')
ON CONFLICT (page, section) DO UPDATE SET config = EXCLUDED.config;


-- ─── 2. Versets bibliques ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bible_verses (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  verse_text    TEXT         NOT NULL,
  reference     VARCHAR(100) NOT NULL,
  translation   VARCHAR(50)  DEFAULT 'LSG',
  sort_order    INT          DEFAULT 0,
  is_active     BOOLEAN      DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT now()
);

COMMENT ON TABLE bible_verses IS 'Versets bibliques affichés sur la page d''accueil';

INSERT INTO bible_verses (verse_text, reference, translation, sort_order) VALUES
  ('Car je connais les projets que j''ai formés sur vous, dit l''Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l''espérance.', 'Jérémie 29:11', 'LSG', 1),
  ('Je peux tout par celui qui me fortifie.', 'Philippiens 4:13', 'LSG', 2),
  ('Les pas de l''homme sont dirigés par l''Éternel, et il aime sa voie.', 'Proverbes 16:9', 'LSG', 3),
  ('Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d''eux.', 'Matthieu 18:20', 'LSG', 4);


-- ─── 3. Pages personnalisées (Page Builder) ────────────────────────────

CREATE TABLE IF NOT EXISTS custom_pages (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT         DEFAULT '',
  template      VARCHAR(50)  DEFAULT 'blank',
  status        VARCHAR(20)  DEFAULT 'draft'
    CHECK (status IN ('draft','published','hidden')),
  sort_order    INT          DEFAULT 0,
  meta_title    VARCHAR(200) DEFAULT '',
  meta_desc     TEXT         DEFAULT '',
  created_at    TIMESTAMPTZ  DEFAULT now(),
  updated_at    TIMESTAMPTZ  DEFAULT now()
);

COMMENT ON TABLE custom_pages IS 'Pages créées via le Page Builder';

INSERT INTO custom_pages (slug, title, template, status, sort_order, description) VALUES
  ('evenement',   'Événement',    'event',      'published', 1, 'Page dédiée à un événement spécial'),
  ('predication', 'Prédication',  'sermon',     'published', 2, 'Page de prédication avec vidéo et notes'),
  ('don',         'Faire un don', 'donation',   'published', 3, 'Page de collecte de dons'),
  ('equipe',      'Notre Équipe', 'team',       'published', 4, 'Présentation de l''équipe pastorale'),
  ('contact-av',  'Contact',      'contact-adv','published', 5, 'Page de contact avancée avec carte'),
  ('histoire',    'Notre Histoire','history',    'published', 6, 'Histoire et fondation de l''église'),
  ('temoignages', 'Témoignages',  'testimonials','published',7, 'Page de témoignages complète'),
  ('ministere',   'Ministères',   'ministry',   'published', 8, 'Présentation des ministères'),
  ('ecole',       'École Biblique','school',    'published', 9, 'Programme de formation biblique'),
  ('media',       'Médias',       'media-hub',  'published',10, 'Hub multimédia: podcasts, vidéos, photos')
ON CONFLICT (slug) DO NOTHING;


-- ─── 4. Sections du Page Builder ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS page_builder_sections (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id       UUID REFERENCES custom_pages(id) ON DELETE CASCADE,
  section_type  VARCHAR(50)  NOT NULL,
  title         VARCHAR(200) DEFAULT '',
  config        JSONB        NOT NULL DEFAULT '{}',
  sort_order    INT          DEFAULT 0,
  is_visible    BOOLEAN      DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT now()
);

COMMENT ON TABLE page_builder_sections IS 'Sections constitutives des pages du Page Builder';
COMMENT ON COLUMN page_builder_sections.section_type IS 'Type: hero, text, image, cards, quote, contact, cta, gallery, video, testimonials, bible_verses, team, faq, timeline';
COMMENT ON COLUMN page_builder_sections.config IS 'JSON contenant le contenu et les réglages de la section';

-- Sections initiales pour chaque template
-- Template: evenement
INSERT INTO page_builder_sections (page_id, section_type, title, sort_order, config)
SELECT p.id, 'hero', 'En-tête', 1, '{"subtitle":"Dimanche 15 Juillet 2025 • 08h00","cta_text":"S''inscrire","cta_link":"#contact"}'::jsonb FROM custom_pages p WHERE p.slug='evenement'
UNION ALL
SELECT p.id, 'text', 'Description', 2, '{"body":"Découvrez notre prochain grand événement..."}'::jsonb FROM custom_pages p WHERE p.slug='evenement'
UNION ALL
SELECT p.id, 'contact', 'Contact', 3, '{}'::jsonb FROM custom_pages p WHERE p.slug='evenement';

-- Template: predication
INSERT INTO page_builder_sections (page_id, section_type, title, sort_order, config)
SELECT p.id, 'hero', 'En-tête', 1, '{"subtitle":"Prédication du dimanche","cta_text":"Écouter","cta_link":""}'::jsonb FROM custom_pages p WHERE p.slug='predication'
UNION ALL
SELECT p.id, 'video', 'Vidéo', 2, '{"url":"","placeholder":"Collez l''URL YouTube ici"}'::jsonb FROM custom_pages p WHERE p.slug='predication'
UNION ALL
SELECT p.id, 'text', 'Notes de prédication', 3, '{"body":""}'::jsonb FROM custom_pages p WHERE p.slug='predication';

-- Template: don
INSERT INTO page_builder_sections (page_id, section_type, title, sort_order, config)
SELECT p.id, 'hero', 'En-tête', 1, '{"subtitle":"Votre générosité change des vies","cta_text":"Donner maintenant","cta_link":""}'::jsonb FROM custom_pages p WHERE p.slug='don'
UNION ALL
SELECT p.id, 'text', 'Pourquoi donner', 2, '{"body":"Chaque don contribue à l''avancement du Royaume..."}'::jsonb FROM custom_pages p WHERE p.slug='don'
UNION ALL
SELECT p.id, 'cta', 'Appel à don', 3, '{"title":"Participez à l''œuvre de Dieu","body":"Votre don, quelle que soit sa taille, a un impact éternel."}'::jsonb FROM custom_pages p WHERE p.slug='don';

-- Template: temoignages
INSERT INTO page_builder_sections (page_id, section_type, title, sort_order, config)
SELECT p.id, 'hero', 'En-tête', 1, '{"subtitle":"Ce que Dieu fait parmi nous","cta_text":"Partager votre témoignage","cta_link":"#contact"}'::jsonb FROM custom_pages p WHERE p.slug='temoignages'
UNION ALL
SELECT p.id, 'testimonials', 'Témoignages', 2, '{}'::jsonb FROM custom_pages p WHERE p.slug='temoignages';

-- Template: ecole
INSERT INTO page_builder_sections (page_id, section_type, title, sort_order, config)
SELECT p.id, 'hero', 'En-tête', 1, '{"subtitle":"Croître dans la connaissance de Dieu","cta_text":"S''inscrire","cta_link":"#contact"}'::jsonb FROM custom_pages p WHERE p.slug='ecole'
UNION ALL
SELECT p.id, 'cards', 'Programmes', 2, '{"columns":3}'::jsonb FROM custom_pages p WHERE p.slug='ecole'
UNION ALL
SELECT p.id, 'faq', 'Questions fréquentes', 3, '{}'::jsonb FROM custom_pages p WHERE p.slug='ecole';


-- ─── 5. Contenus par défaut pour les nouvelles sections de l'accueil ───

INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order) VALUES
  ('home', 'verses', 'section_label', 'La Parole de Dieu', 'text', 'Label section versets', 1),
  ('home', 'verses', 'section_title', 'Ancrez votre vie dans les promesses divines', 'text', 'Titre section versets', 2);

INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order) VALUES
  ('home', 'unique', 'section_label', 'Qui sommes-nous', 'text', 'Label section unique', 1),
  ('home', 'unique', 'title', 'Une église qui fait la différence', 'text', 'Titre section unique', 2),
  ('home', 'unique', 'text_1', 'L''Église Évangélique La Conquête n''est pas simplement un lieu de culte — c''est une famille où chaque membre est formé, équipé et envoyé pour transformer son environnement. Notre approche unique combine l''enseignement profond de la Parole, la puissance du Saint-Esprit et un engagement authentique envers la communauté.', 'text', 'Texte principal unique', 3),
  ('home', 'unique', 'text_2', 'Nous croyons que chaque croyant est appelé à être un agent de changement. À La Conquête, nous ne nous contentons pas d''assister aux cultes — nous bâtissons, nous transformons et nous conquérons ensemble.', 'text', 'Texte secondaire unique', 4),
  ('home', 'unique', 'quote_text', 'Dieu ne nous a pas donné un esprit de timidité, mais un esprit de force, d''amour et de sagesse.', 'text', 'Citation pasteur', 5),
  ('home', 'unique', 'quote_author', 'Pasteur Fondateur', 'text', 'Auteur citation', 6),
  ('home', 'unique', 'image_url', '', 'image_url', 'Image PNG détourée du pasteur', 7),
  ('home', 'unique', 'signature_url', '', 'image_url', 'Image de signature PNG', 8);

INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order) VALUES
  ('home', 'pastors', 'section_label', 'Notre équipe', 'text', 'Label section pasteurs', 1),
  ('home', 'pastors', 'section_title', 'Rencontrez ceux qui servent', 'text', 'Titre section pasteurs', 2);

INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order) VALUES
  ('home', 'testimonials', 'section_label', 'Témoignages', 'text', 'Label section témoignages', 1),
  ('home', 'testimonials', 'section_title', 'Ce que Dieu fait parmi nous', 'text', 'Titre section témoignages', 2);

INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order) VALUES
  ('home', 'cta', 'title', 'Rejoignez-nous dans cette aventure de foi', 'text', 'Titre CTA', 1),
  ('home', 'cta', 'text', 'Que vous soyez nouveau dans la foi ou un chrétien engagé, il y a une place pour vous à La Conquête. Venez découvrir une communauté où vous grandirez, servirez et transformerez votre monde.', 'text', 'Texte CTA', 2),
  ('home', 'cta', 'cta_text', 'Nous contacter', 'text', 'Bouton CTA', 3),
  ('home', 'cta', 'cta_link', 'contact', 'url', 'Lien CTA', 4),
  ('home', 'cta', 'image_url', '', 'image_url', 'Image de fond CTA', 5);


-- ─── 6. Statut live YouTube / Facebook ─────────────────────────────────

INSERT INTO site_settings (key, value, type, category, label, sort_order) VALUES
  ('youtube_live', 'false', 'boolean', 'social', 'YouTube en direct', 20),
  ('facebook_live', 'false', 'boolean', 'social', 'Facebook en direct', 21),
  ('youtube_channel_url', '', 'url', 'social', 'URL chaîne YouTube', 22),
  ('facebook_page_url', '', 'url', 'social', 'URL page Facebook', 23)
ON CONFLICT (key) DO NOTHING;


-- ─── Index pour performance ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_section_configs_page ON section_configs(page);
CREATE INDEX IF NOT EXISTS idx_bible_verses_active ON bible_verses(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_custom_pages_status ON custom_pages(status, sort_order);
CREATE INDEX IF NOT EXISTS idx_page_builder_sections_page ON page_builder_sections(page_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_page_builder_sections_type ON page_builder_sections(section_type);