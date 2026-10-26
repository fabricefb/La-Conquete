-- ═══════════════════════════════════════════════════════════════════════════
-- LA CONQUÊTE — IMPORT DU CONTENU RÉEL SAISI DANS LE BACK-OFFICE LOCAL
-- À exécuter APRÈS cloud_setup.sql, dans le SQL Editor Supabase.
-- Idempotent : peut être relancé sans créer de doublons.
-- Source : .local-admin/state.json (contenu validé en local).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Contenus éditables (132 champs) ───────────────────────────

INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'topbar', 'phone', '+243 997 030 259', 'text', 'Téléphone', 0, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'topbar', 'email', 'egliseevangeliquelaconquete@gmail.com', 'text', 'Email', 1, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'topbar', 'marquee_text', '', 'text', 'Texte défilant personnalisé (vide = communiqués auto)', 2, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'bg_image', '', 'image_url', 'Image de fond', 3, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'bg_images', '', 'text', 'Images diaporama (séparées par ,)', 4, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'title_line1', 'La Conquête', 'text', 'Titre ligne 1', 5, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'title_line2', 'des Âmes', 'text', 'Titre ligne 2', 6, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'subtitle', 'Église Évangélique La Conquête — Lubumbashi, RD Congo', 'text', 'Sous-titre', 7, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'bible_verse', 'Psaumes 2:8 — "Demande-moi, et je te donnerai les nations pour héritage"', 'text', 'Verset biblique (typing)', 8, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'cta_primary', 'Rejoindre le culte', 'text', 'Bouton CTA principal', 9, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'cta_secondary', 'Notre vision', 'text', 'Bouton CTA secondaire', 10, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'eyebrow', 'Événements', 'text', 'En-tête section (label)', 11, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'title', 'À ne pas manquer', 'text', 'En-tête section (titre)', 12, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'subtitle', 'Le marathon de prière et les rendez-vous qui rythment la vie de l''église.', 'text', 'En-tête section (sous-titre)', 13, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_kicker', 'À la une', 'text', 'Affiche — Sur-titre', 14, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_badge', '1er – 30 novembre 2026', 'text', 'Affiche — Date', 15, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_title', 'Marathon de prière', 'text', 'Affiche — Titre', 16, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_time', 'Lundi – vendredi, 16h00 – 18h45 · Dimanche, 08h00 – 10h30', 'text', 'Affiche — Horaires / lieu', 17, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_description', '« La mission de l''Église locale face au monde moderne » — Matthieu 28:19-20.', 'text', 'Affiche — Description', 18, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_image', '/marathon-priere-2026-slide.webp', 'image_url', 'Affiche — Image du slide (paysage)', 19, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_cta', 'Voir l''événement', 'text', 'Affiche — Texte du bouton', 20, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'services', 'service_0_image', '/church-photo-3.webp', 'image_url', 'Dimanche — Culte principal', 21, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'services', 'service_3_image', '/bible.webp', 'image_url', 'Mercredi — Enseignement et prière', 22, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'services', 'service_5_image', '/church-photo-1.webp', 'image_url', 'Vendredi — Jeûne et prière', 23, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'services', 'service_6_image', '/church-photo-2.webp', 'image_url', 'Samedi — Génération Espoir', 24, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'heading_label', 'Nos Fondements', 'text', 'En-tête section (label)', 25, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'heading_title', 'Trois piliers qui nous guident', 'text', 'En-tête section (titre)', 26, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'pillar_1_title', 'Foi', 'text', 'Pilier 1 — Titre', 27, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'pillar_1_desc', '', 'text', 'Pilier 1 — Description', 28, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'pillar_2_title', 'Communauté', 'text', 'Pilier 2 — Titre', 29, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'pillar_2_desc', '', 'text', 'Pilier 2 — Description', 30, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'pillar_3_title', 'Mission', 'text', 'Pilier 3 — Titre', 31, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'pillar_3_desc', '', 'text', 'Pilier 3 — Description', 32, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'heading_label', 'Qui sommes-nous', 'text', 'En-tête section (label)', 33, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'heading_title', 'Une église qui fait la différence', 'text', 'En-tête section (titre)', 34, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'text_1', '', 'text', 'Texte principal', 35, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'text_2', '', 'text', 'Texte secondaire', 36, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'bible_text', '', 'text', 'Citation biblique', 37, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'image', '', 'image_url', 'Photo', 38, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'cta_text', 'En savoir plus', 'text', 'Texte du bouton', 39, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'label', 'Mot du pasteur', 'text', 'Label de section', 40, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'title', 'Conseils pastoraux', 'text', 'Titre', 41, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'text_1', '', 'text', 'Texte principal', 42, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'text_2', '', 'text', 'Texte secondaire', 43, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'bible_text', '', 'text', 'Citation biblique', 44, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'bible_ref', '', 'text', 'Référence biblique', 45, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'portrait_image', '/pasteur-romain-kazadi.webp', 'image_url', 'Photo portrait', 46, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'portrait_scale', '1.25', 'text', 'Échelle du portrait (ex: 1, 1.2, 0.8)', 47, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'portrait_pos_x', 'center', 'text', 'Position horizontale (left / center / right)', 48, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'portrait_pos_y', 'top', 'text', 'Position verticale (top / center / bottom)', 49, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'signature_image', '', 'image_url', 'Image signature (PNG)', 50, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'signature_scale', '1', 'text', 'Échelle de la signature (ex: 1, 1.5, 0.7)', 51, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'signature_pos_x', 'center', 'text', 'Position signature (left / center / right)', 52, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'firstvisit', 'image', '/church-photo-2.webp', 'image_url', 'Photo — Premier dimanche', 53, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'news', 'title', 'Dernières nouvelles', 'text', 'Titre de la section', 54, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'news', 'subtitle', '', 'text', 'Sous-titre', 55, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'cta_map', 'title', 'Rejoignez notre famille', 'text', 'Titre du CTA', 56, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'cta_map', 'text', '', 'text', 'Texte du CTA', 57, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'explore', 'heading_label', 'Explorer', 'text', 'Label de section', 58, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'explore', 'heading_title', 'Découvrez nos activités', 'text', 'Titre de la section', 59, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'explore', 'description', 'Gérez les prédications affichées sur la page #predications et modifiez chaque carte depuis le back-office.', 'text', 'Sous-titre / Description', 60, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastors', 'label', 'Bureau pastoral', 'text', 'Label de section', 61, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastors', 'title', 'Une équipe au service de l''Église', 'text', 'Titre', 62, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'quote', 'heading_label', '', 'text', 'En-tête (label)', 63, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'quote', 'text', '', 'text', 'Texte de la citation', 64, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'quote', 'reference', '', 'text', 'Référence', 65, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'topbar', 'phone', '+243 997 030 259', 'text', 'Téléphone', 0, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'topbar', 'email', 'egliseevangeliquelaconquete@gmail.com', 'text', 'Email', 1, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'topbar', 'marquee_text', '', 'text', 'Texte défilant personnalisé (vide = communiqués auto)', 2, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'bg_image', '', 'image_url', 'Image de fond', 3, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'bg_images', '', 'text', 'Images diaporama (séparées par ,)', 4, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'title_line1', 'La Conquête', 'text', 'Titre ligne 1', 5, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'title_line2', 'des Âmes', 'text', 'Titre ligne 2', 6, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'subtitle', 'Église Évangélique La Conquête — Lubumbashi, RD Congo', 'text', 'Sous-titre', 7, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'bible_verse', 'Psaumes 2:8 — "Demande-moi, et je te donnerai les nations pour héritage"', 'text', 'Verset biblique (typing)', 8, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'cta_primary', 'Rejoindre le culte', 'text', 'Bouton CTA principal', 9, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'hero', 'cta_secondary', 'Notre vision', 'text', 'Bouton CTA secondaire', 10, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'eyebrow', 'Événements', 'text', 'En-tête section (label)', 11, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'title', 'À ne pas manquer', 'text', 'En-tête section (titre)', 12, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'subtitle', 'Le marathon de prière et les rendez-vous qui rythment la vie de l''église.', 'text', 'En-tête section (sous-titre)', 13, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_kicker', 'À la une', 'text', 'Affiche — Sur-titre', 14, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_badge', '1er – 30 novembre 2026', 'text', 'Affiche — Date', 15, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_title', 'Marathon de prière', 'text', 'Affiche — Titre', 16, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_time', 'Lundi – vendredi, 16h00 – 18h45 · Dimanche, 08h00 – 10h30', 'text', 'Affiche — Horaires / lieu', 17, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_description', '« La mission de l''Église locale face au monde moderne » — Matthieu 28:19-20.', 'text', 'Affiche — Description', 18, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_image', '/marathon-priere-2026-slide.webp', 'image_url', 'Affiche — Image du slide (paysage)', 19, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'agenda', 'featured_cta', 'Voir l''événement', 'text', 'Affiche — Texte du bouton', 20, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'services', 'service_0_image', '/church-photo-3.webp', 'image_url', 'Dimanche — Culte principal', 21, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'services', 'service_3_image', '/bible.webp', 'image_url', 'Mercredi — Enseignement et prière', 22, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'services', 'service_5_image', '/church-photo-1.webp', 'image_url', 'Vendredi — Jeûne et prière', 23, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'services', 'service_6_image', '/church-photo-2.webp', 'image_url', 'Samedi — Génération Espoir', 24, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'heading_label', 'Nos Fondements', 'text', 'En-tête section (label)', 25, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'heading_title', 'Trois piliers qui nous guident', 'text', 'En-tête section (titre)', 26, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'pillar_1_title', 'Foi', 'text', 'Pilier 1 — Titre', 27, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'pillar_1_desc', '', 'text', 'Pilier 1 — Description', 28, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'pillar_2_title', 'Communauté', 'text', 'Pilier 2 — Titre', 29, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'pillar_2_desc', '', 'text', 'Pilier 2 — Description', 30, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'pillar_3_title', 'Mission', 'text', 'Pilier 3 — Titre', 31, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pillars', 'pillar_3_desc', '', 'text', 'Pilier 3 — Description', 32, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'heading_label', 'Qui sommes-nous', 'text', 'En-tête section (label)', 33, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'heading_title', 'Une église qui fait la différence', 'text', 'En-tête section (titre)', 34, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'text_1', '', 'text', 'Texte principal', 35, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'text_2', '', 'text', 'Texte secondaire', 36, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'bible_text', '', 'text', 'Citation biblique', 37, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'image', '', 'image_url', 'Photo', 38, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'about', 'cta_text', 'En savoir plus', 'text', 'Texte du bouton', 39, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'label', 'Mot du pasteur', 'text', 'Label de section', 40, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'title', 'Conseils pastoraux', 'text', 'Titre', 41, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'text_1', '', 'text', 'Texte principal', 42, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'text_2', '', 'text', 'Texte secondaire', 43, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'bible_text', '', 'text', 'Citation biblique', 44, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'bible_ref', '', 'text', 'Référence biblique', 45, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'portrait_image', '/pasteur-romain-kazadi.webp', 'image_url', 'Photo portrait', 46, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'portrait_scale', '1.25', 'text', 'Échelle du portrait (ex: 1, 1.2, 0.8)', 47, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'portrait_pos_x', 'center', 'text', 'Position horizontale (left / center / right)', 48, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'portrait_pos_y', 'top', 'text', 'Position verticale (top / center / bottom)', 49, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'signature_image', '', 'image_url', 'Image signature (PNG)', 50, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'signature_scale', '1', 'text', 'Échelle de la signature (ex: 1, 1.5, 0.7)', 51, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastor_word', 'signature_pos_x', 'center', 'text', 'Position signature (left / center / right)', 52, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'firstvisit', 'image', '/church-photo-2.webp', 'image_url', 'Photo — Premier dimanche', 53, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'news', 'title', 'Dernières nouvelles', 'text', 'Titre de la section', 54, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'news', 'subtitle', '', 'text', 'Sous-titre', 55, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'cta_map', 'title', 'Rejoignez notre famille', 'text', 'Titre du CTA', 56, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'cta_map', 'text', '', 'text', 'Texte du CTA', 57, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'explore', 'heading_label', 'Explorer', 'text', 'Label de section', 58, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'explore', 'heading_title', 'Découvrez nos activités', 'text', 'Titre de la section', 59, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'explore', 'description', 'Gérez les prédications affichées sur la page #predications et modifiez chaque carte depuis le back-office.', 'text', 'Sous-titre / Description', 60, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastors', 'label', 'Bureau pastoral', 'text', 'Label de section', 61, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'pastors', 'title', 'Une équipe au service de l''Église', 'text', 'Titre', 62, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'quote', 'heading_label', '', 'text', 'En-tête (label)', 63, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'quote', 'text', '', 'text', 'Texte de la citation', 64, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();
INSERT INTO page_contents (page, section_key, field_key, value, type, label, sort_order, is_active)
VALUES ('home', 'quote', 'reference', '', 'text', 'Référence', 65, true)
ON CONFLICT (page, section_key, field_key) DO UPDATE
  SET value = EXCLUDED.value, type = EXCLUDED.type, label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();

-- ─── Actualités (6) ─────────────────────────────────────────

INSERT INTO articles (slug, title, category, published_at, excerpt, image_url, body, quote_text, quote_reference, source_url, is_featured, is_published)
VALUES ('marathon-de-priere-2026', 'Marathon de prière : trente jours pour la mission de l''Église', 'Annonce', '2026-10-11', 'Du 1er au 30 novembre 2026, l''Église Évangélique La Conquête consacre un mois entier à la prière autour du thème « La mission de l''Église locale face au monde moderne ».', '/priere.webp', '["Du 1er au 30 novembre 2026, l''Église Évangélique La Conquête ouvre un mois de prière continu. Le thème retenu est celui qui structure l''enseignement de la saison : « La mission de l''Église locale face au monde moderne », appuyé sur Matthieu 28:19-20.","Les rencontres se tiennent au temple, au 520, avenue N''Djamena, coin Mama Yemo, à Lubumbashi. Du lundi au vendredi, le marathon se déroule de 16 h à 18 h 45 ; le dimanche, de 8 h à 10 h 30. Trente jours, sans interruption, pour porter ensemble la ville, les familles et les extensions de l''église.","Prier avant d''agir n''est pas une précaution, c''est l''ordre du Royaume. Avant de confier une mission à ses disciples, Jésus leur demande d''attendre la promesse du Père. L''Église locale ne tire pas sa force de ses moyens, mais de la présence de Dieu au milieu d''elle.","Que demander pendant ce mois ? Que la Parole soit annoncée avec clarté ; que les malades soient visités et fortifiés ; que les familles trouvent la paix ; que les jeunes de la Génération Espoir grandissent dans la foi ; que les extensions, notamment à Kakana, soient soutenues ; et que la ville de Lubumbashi entende l''Évangile.","Chaque membre est invité à prendre sa part, même pour une heure. Une heure de prière ajoutée à celles des autres devient un mur de feu autour de l''église. Venez avec votre Bible, un carnet et une intention précise.","Que ceux qui ne peuvent pas se déplacer s''associent depuis leur maison, aux mêmes horaires, et invitent une personne à les rejoindre. Un marathon se gagne ensemble."]'::jsonb, 'Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit.', 'Matthieu 28:19', 'https://web.facebook.com/laconquete.eec', true, true)
ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title, category = EXCLUDED.category, published_at = EXCLUDED.published_at,
      excerpt = EXCLUDED.excerpt, image_url = EXCLUDED.image_url, body = EXCLUDED.body,
      quote_text = EXCLUDED.quote_text, quote_reference = EXCLUDED.quote_reference,
      source_url = EXCLUDED.source_url, is_featured = EXCLUDED.is_featured,
      is_published = EXCLUDED.is_published, updated_at = now();
INSERT INTO articles (slug, title, category, published_at, excerpt, image_url, body, quote_text, quote_reference, source_url, is_featured, is_published)
VALUES ('la-vision-de-la-conquete', 'Notre vision : les âmes, les terres habitables et cultivables', 'Vision', '2026-10-11', 'La Conquête porte une vision en deux mouvements, inscrite dans Psaumes 2:8 : gagner des âmes et ouvrir des terres où la vie peut s''enraciner.', '/church-photo-1.webp', '["La vision de l''Église Évangélique La Conquête s''énonce en une phrase : « La conquête des âmes, la conquête des terres habitables et cultivables ». Elle s''appuie sur Psaumes 2:8 : « Demande-moi, et je te donnerai les nations pour héritage, les extrémités de la terre pour possession. »","La conquête commence par une demande. Avant d''être un programme, elle est une prière adressée au Père. Une église qui ne demande rien reçoit peu ; une église qui demande selon la promesse reçoit des nations.","Conquérir des âmes, c''est refuser de considérer une personne comme un simple chiffre. C''est annoncer Jésus-Christ à celui qui est loin, accueillir celui qui revient, former celui qui débute. L''Évangile n''est pas une idée à défendre, c''est une vie à partager.","Conquérir des terres habitables et cultivables, c''est prendre au sérieux l''enracinement. Une église ne s''arrête pas à un culte : elle bâtit des lieux où l''on vit, où l''on travaille, où l''on nourrit les siens, où l''on transmet la foi aux enfants. La terre, dans la Bible, est toujours le lieu de la promesse et de la responsabilité.","Cette seconde partie de la vision a déjà un visage. Le dimanche 20 juillet 2025, le pasteur Josué Romain Kazadi, représentant légal de la communauté des églises évangéliques La Conquête, a posé la première pierre du Centre Évangélique Missionnaire La Conquête Kakana, à 50 km de Lubumbashi. La vision est devenue un chantier.","Une vision n''engage jamais un seul homme. Elle engage des pasteurs assistants, des anciens, des diacres, des responsables de départements et chaque membre. C''est pourquoi nous la rappelons régulièrement : ce que Dieu nous confie, il le confie à un peuple."]'::jsonb, 'Demande-moi, et je te donnerai les nations pour héritage, les extrémités de la terre pour possession.', 'Psaumes 2:8', 'https://web.facebook.com/profile.php?id=61569888994546', false, true)
ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title, category = EXCLUDED.category, published_at = EXCLUDED.published_at,
      excerpt = EXCLUDED.excerpt, image_url = EXCLUDED.image_url, body = EXCLUDED.body,
      quote_text = EXCLUDED.quote_text, quote_reference = EXCLUDED.quote_reference,
      source_url = EXCLUDED.source_url, is_featured = EXCLUDED.is_featured,
      is_published = EXCLUDED.is_published, updated_at = now();
INSERT INTO articles (slug, title, category, published_at, excerpt, image_url, body, quote_text, quote_reference, source_url, is_featured, is_published)
VALUES ('la-mission-de-leglise-locale', 'La mission de l''Église locale face au monde moderne', 'Enseignement', '2026-10-11', 'Série d''enseignement de la saison : comment l''Église locale demeure missionnaire dans un monde qui change de visage, sans rien perdre de l''essentiel.', '/predication-1.webp', '["Depuis le mois d''octobre 2026, l''Église Évangélique La Conquête enseigne sur un thème unique : « La mission de l''Église locale face au monde moderne ». Le texte de référence est l''envoi de Jésus à ses disciples en Matthieu 28:19-20.","Le monde moderne n''est pas d''abord un ennemi à combattre : c''est un champ à labourer. Les habitudes changent, les familles se dispersent, les écrans prennent la place des conversations, mais la soif de sens reste intacte. L''Église locale est placée exactement là où cette soif se manifeste.","Trois convictions structurent cet enseignement. La première est la présence : une église doit être physiquement là, dans son quartier, disponible aux heures où les gens souffrent. La deuxième est la Parole : sans elle, la communauté devient une association de bonne volonté. La troisième est l''envoi : chaque membre est un missionnaire dans sa maison, son travail et son école.","La mission ne se réduit pas à des événements. Elle se vérifie dans la fidélité quotidienne : visiter un malade, soutenir une veuve, accompagner un jeune, prier avant de décider. C''est ainsi que l''Évangile devient crédible aux yeux de la ville.","L''Église locale est aussi une famille de familles. Ce que nous enseignons le dimanche doit pouvoir être vécu le lundi. C''est pourquoi les cultes sont diffusés en direct sur nos pages : celui qui ne peut pas venir peut encore entendre, et celui qui a entendu peut transmettre.","Une église missionnaire n''est pas une église qui court plus vite, mais une église qui sait pourquoi elle marche. Face au monde moderne, notre réponse n''est pas la peur ni l''imitation : c''est la fidélité créative à l''ordre reçu."]'::jsonb, 'Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit, et enseignez-leur à observer tout ce que je vous ai prescrit.', 'Matthieu 28:19-20', 'https://web.facebook.com/laconquete.eec', false, true)
ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title, category = EXCLUDED.category, published_at = EXCLUDED.published_at,
      excerpt = EXCLUDED.excerpt, image_url = EXCLUDED.image_url, body = EXCLUDED.body,
      quote_text = EXCLUDED.quote_text, quote_reference = EXCLUDED.quote_reference,
      source_url = EXCLUDED.source_url, is_featured = EXCLUDED.is_featured,
      is_published = EXCLUDED.is_published, updated_at = now();
INSERT INTO articles (slug, title, category, published_at, excerpt, image_url, body, quote_text, quote_reference, source_url, is_featured, is_published)
VALUES ('le-nom-de-jesus-notre-heritage', 'Le nom de Jésus, l''héritage commun de tous les croyants', 'Enseignement', '2026-10-11', 'Sous-thème développé lors du culte du 11 octobre 2026 : ce que nous partageons, bien avant nos différences, c''est un même nom.', '/bible.webp', '["Dans la série « La mission de l''Église locale face au monde moderne », le culte du dimanche 11 octobre 2026 a ouvert un sous-thème décisif : « Le nom de Jésus, l''héritage commun de tous les croyants ».","Un héritage est ce que l''on reçoit sans l''avoir gagné, et ce que l''on transmet sans pouvoir le garder pour soi. Le nom de Jésus est de cet ordre. Il n''appartient pas à une génération, à une sensibilité ou à un quartier : il est la part commune de tous ceux qui croient.","La Bible ne laisse aucune place à l''ambiguïté : « Il n''y a sous le ciel aucun autre nom qui ait été donné parmi les hommes, par lequel nous devions être sauvés » (Actes 4:12). Ce nom n''est pas un slogan, c''est une puissance qui sauve, qui relève et qui rassemble.","Parce que l''héritage est commun, la division entre croyants devient une contradiction. On peut différer sur des méthodes ; on ne peut pas se réclamer du même nom et refuser de porter ensemble la mission. L''unité n''est pas une option diplomatique, c''est une conséquence de l''héritage.","Cet héritage se reçoit dans la prière et se confesse dans la vie. Prier au nom de Jésus, ce n''est pas ajouter une formule à la fin d''une requête ; c''est s''approcher du Père avec les seuls droits du Fils.","En ce mois de prière, une question simple nous est posée : que faisons-nous de ce nom ? Le porter dans nos maisons, au travail, auprès de ceux qui ne le connaissent pas encore."]'::jsonb, 'Il n''y a sous le ciel aucun autre nom qui ait été donné parmi les hommes, par lequel nous devions être sauvés.', 'Actes 4:12', 'https://web.facebook.com/laconquete.eec', false, true)
ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title, category = EXCLUDED.category, published_at = EXCLUDED.published_at,
      excerpt = EXCLUDED.excerpt, image_url = EXCLUDED.image_url, body = EXCLUDED.body,
      quote_text = EXCLUDED.quote_text, quote_reference = EXCLUDED.quote_reference,
      source_url = EXCLUDED.source_url, is_featured = EXCLUDED.is_featured,
      is_published = EXCLUDED.is_published, updated_at = now();
INSERT INTO articles (slug, title, category, published_at, excerpt, image_url, body, quote_text, quote_reference, source_url, is_featured, is_published)
VALUES ('engager-avec-dieu-et-la-recompense', 'Engager avec Dieu et la récompense', 'Enseignement', '2026-10-19', 'Sous-thème du culte du 19 octobre 2026 : s''engager n''est pas acheter la faveur de Dieu, mais répondre à une grâce qui nous a déjà précédés.', '/church-photo-2.webp', '["Dans la série consacrée à la mission de l''Église locale, le culte du dimanche 19 octobre 2026 a mis en avant un sous-thème exigeant : « Engager avec Dieu et la récompense ».","S''engager, dans le langage biblique, c''est offrir son corps comme un sacrifice vivant (Romains 12:1). Ce n''est pas une transaction par laquelle on obtiendrait un avantage, mais la réponse normale d''une personne qui a compris ce qu''elle a reçu.","Le renoncement n''est jamais une perte sèche dans l''économie de Dieu. « Celui qui s''approche de Dieu doit croire qu''il existe et qu''il récompense ceux qui le cherchent » (Hébreux 11:6). La récompense est une réalité promise, mais elle n''est pas toujours immédiate ni matérielle.","C''est ici que la foi est éprouvée. Le monde moderne mesure tout au résultat visible ; l''Évangile parle d''un travail qui n''est jamais vain dans le Seigneur (1 Corinthiens 15:58). Une visite, une offre de service, une prière fidèle peuvent sembler invisibles et peser pourtant plus lourd que des projets bruyants.","L''engagement a aussi une forme communautaire. Une église avance quand des membres prennent des responsabilités concrètes : accueil, intercession, enseignement des enfants, entretien du temple, accompagnement des familles. Chacun reçoit une part.","La récompense ultime n''est pas un prix à décrocher, c''est une présence : entendre un jour : « C''est bien, bon et fidèle serviteur ». Tout le reste est supplément."]'::jsonb, 'Celui qui s''approche de Dieu doit croire qu''il existe et qu''il récompense ceux qui le cherchent.', 'Hébreux 11:6', 'https://web.facebook.com/laconquete.eec', false, true)
ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title, category = EXCLUDED.category, published_at = EXCLUDED.published_at,
      excerpt = EXCLUDED.excerpt, image_url = EXCLUDED.image_url, body = EXCLUDED.body,
      quote_text = EXCLUDED.quote_text, quote_reference = EXCLUDED.quote_reference,
      source_url = EXCLUDED.source_url, is_featured = EXCLUDED.is_featured,
      is_published = EXCLUDED.is_published, updated_at = now();
INSERT INTO articles (slug, title, category, published_at, excerpt, image_url, body, quote_text, quote_reference, source_url, is_featured, is_published)
VALUES ('premiere-pierre-kakana', 'Kakana : la première pierre du Centre Évangélique Missionnaire', 'Événement', '2025-07-23', 'Le dimanche 20 juillet 2025, l''église a posé la première pierre de sa nouvelle extension au village Kakana, à 50 km de Lubumbashi.', '/church-photo-3.webp', '["Le dimanche 20 juillet 2025, en début d''après-midi, le pasteur Josué Romain Kazadi, représentant légal de la communauté des églises évangéliques La Conquête, a posé la première pierre du Centre Évangélique Missionnaire La Conquête Kakana.","La cérémonie s''est déroulée dans la concession de la nouvelle extension, au village Kakana, à environ 50 km de la ville de Lubumbashi. Elle s''est tenue en présence des pasteurs assistants, des pasteurs des autres extensions, des anciens et diacres, des responsables de départements et de nombreux membres.","Ce geste n''est pas symbolique. Poser une première pierre, dans la Bible, c''est fixer un lieu, nommer une espérance et engager une responsabilité. Kakana n''est pas une antenne lointaine : c''est une terre confiée à la prière et au travail de l''église.","L''événement donne corps à la seconde partie de la vision de La Conquête : « la conquête des terres habitables et cultivables ». Une église s''implante là où des familles vivent, travaillent et doivent entendre l''Évangile dans leur propre langue et leur propre quotidien.","Les photographies de la journée ont été partagées sur la page officielle de l''église. Elles rappellent que derrière chaque extension, il y a des visages, des trajets et des offrandes discrètes.","L''extension de Kakana reste aujourd''hui portée par la prière de toute la communauté. La première pierre est posée ; le chantier, lui, continue dans les cœurs."]'::jsonb, NULL, NULL, 'https://web.facebook.com/laconquete.eec', false, true)
ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title, category = EXCLUDED.category, published_at = EXCLUDED.published_at,
      excerpt = EXCLUDED.excerpt, image_url = EXCLUDED.image_url, body = EXCLUDED.body,
      quote_text = EXCLUDED.quote_text, quote_reference = EXCLUDED.quote_reference,
      source_url = EXCLUDED.source_url, is_featured = EXCLUDED.is_featured,
      is_published = EXCLUDED.is_published, updated_at = now();

-- ─── Galerie médias (6) ───────────────────────────────────

INSERT INTO media_items (id, title, description, file_url, thumbnail_url, file_type, category, sort_order, is_active)
VALUES ('301dcc57-f0fa-3d3f-ad7f-cf7d831fe009', 'Assemblée dominicale', 'Assemblée de l''Église La Conquête', '/church-photo-1.webp', '/church-photo-1.webp', 'image', 'general', 0, true)
ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title, description = EXCLUDED.description, file_url = EXCLUDED.file_url,
      thumbnail_url = EXCLUDED.thumbnail_url, file_type = EXCLUDED.file_type,
      category = EXCLUDED.category, sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active, updated_at = now();
INSERT INTO media_items (id, title, description, file_url, thumbnail_url, file_type, category, sort_order, is_active)
VALUES ('f7c8394b-2547-3de6-ae09-f8c9086a5a8e', 'Moment de prière', 'Moment de prière', '/church-photo-2.webp', '/church-photo-2.webp', 'image', 'general', 1, true)
ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title, description = EXCLUDED.description, file_url = EXCLUDED.file_url,
      thumbnail_url = EXCLUDED.thumbnail_url, file_type = EXCLUDED.file_type,
      category = EXCLUDED.category, sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active, updated_at = now();
INSERT INTO media_items (id, title, description, file_url, thumbnail_url, file_type, category, sort_order, is_active)
VALUES ('0dd0398a-761c-3713-a470-be4b5932cf55', 'Rencontre de l''église', 'Assemblée de l''Église La Conquête', '/church-photo-3.webp', '/church-photo-3.webp', 'image', 'general', 2, true)
ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title, description = EXCLUDED.description, file_url = EXCLUDED.file_url,
      thumbnail_url = EXCLUDED.thumbnail_url, file_type = EXCLUDED.file_type,
      category = EXCLUDED.category, sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active, updated_at = now();
INSERT INTO media_items (id, title, description, file_url, thumbnail_url, file_type, category, sort_order, is_active)
VALUES ('2a7c4d37-f22c-3635-abb7-0d1ba67c7206', 'Prédication', 'Prédication', '/predication-1.webp', '/predication-1.webp', 'image', 'general', 3, true)
ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title, description = EXCLUDED.description, file_url = EXCLUDED.file_url,
      thumbnail_url = EXCLUDED.thumbnail_url, file_type = EXCLUDED.file_type,
      category = EXCLUDED.category, sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active, updated_at = now();
INSERT INTO media_items (id, title, description, file_url, thumbnail_url, file_type, category, sort_order, is_active)
VALUES ('dd7d1d3a-4ddc-3223-a8cd-eeb6678c925a', 'Prière', 'Prière', '/priere.webp', '/priere.webp', 'image', 'general', 4, true)
ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title, description = EXCLUDED.description, file_url = EXCLUDED.file_url,
      thumbnail_url = EXCLUDED.thumbnail_url, file_type = EXCLUDED.file_type,
      category = EXCLUDED.category, sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active, updated_at = now();
INSERT INTO media_items (id, title, description, file_url, thumbnail_url, file_type, category, sort_order, is_active)
VALUES ('7675586d-93cb-3dc1-a39d-1ba9e1f13c69', 'Étude biblique', 'Étude biblique', '/bible.webp', '/bible.webp', 'image', 'general', 5, true)
ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title, description = EXCLUDED.description, file_url = EXCLUDED.file_url,
      thumbnail_url = EXCLUDED.thumbnail_url, file_type = EXCLUDED.file_type,
      category = EXCLUDED.category, sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active, updated_at = now();

-- ─── Lieux : temple principal + extensions ────────────────────────
INSERT INTO locations (id, name, address, city, country, phone, email, is_main, is_active, sort_order, description)
VALUES ('72308507-5aa7-3d6c-ab10-c4872f2f609f', 'Église Évangélique La Conquête — Temple principal', '520, Avenue N''Djamena, coin Mama Yemo', 'Lubumbashi', 'RD Congo', '+243 997 030 259', 'egliseevangeliquelaconquete@gmail.com', true, true, 0, 'Temple principal de l''Église Évangélique La Conquête.')
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city,
      country = EXCLUDED.country, phone = EXCLUDED.phone, email = EXCLUDED.email,
      is_main = true, is_active = true, sort_order = EXCLUDED.sort_order,
      description = EXCLUDED.description, updated_at = now();

INSERT INTO locations (id, name, address, city, country, latitude, longitude, phone, service_times, pastor_name, is_main, is_active, sort_order, image_url, description)
VALUES ('21959595-811a-301f-a56b-045893ad567e', 'Centre Évangélique Missionnaire La Conquête Kakana', 'Village Kakana', 'Kakana', 'RD Congo', NULL, NULL, NULL, NULL, NULL, false, true, 0, '/teachings/kakana.jpg', NULL)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city,
      country = EXCLUDED.country, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
      phone = EXCLUDED.phone, service_times = EXCLUDED.service_times,
      pastor_name = EXCLUDED.pastor_name, is_main = EXCLUDED.is_main,
      is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order,
      image_url = EXCLUDED.image_url, description = EXCLUDED.description,
      updated_at = now();

COMMIT;
