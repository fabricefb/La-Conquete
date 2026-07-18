-- ═══════════════════════════════════════════════════════════════════
-- Migration: Planification de Culte
-- Module: Département Média & Presse
-- ═══════════════════════════════════════════════════════════════════

-- 1. Table des cultes (services)
CREATE TABLE IF NOT EXISTS worship_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time TIME DEFAULT '09:00',
  type TEXT NOT NULL DEFAULT 'dimanche' CHECK (type IN ('dimanche', 'midis', 'veille', 'special', 'jeune', 'autre')),
  orator_name TEXT,
  president_name TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('draft', 'planned', 'orator_submitted', 'president_submitted', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Formulaire orateur
CREATE TABLE IF NOT EXISTS worship_orator_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES worship_services(id) ON DELETE CASCADE,
  orator_name TEXT NOT NULL,
  theme TEXT NOT NULL,
  sub_theme TEXT,
  bible_book TEXT,
  bible_chapter TEXT,
  bible_verses TEXT,
  summary TEXT,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Points du message de l'orateur
CREATE TABLE IF NOT EXISTS worship_orator_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES worship_orator_forms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Éléments de l'ordre du culte (président)
CREATE TABLE IF NOT EXISTS worship_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES worship_services(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'louange' CHECK (item_type IN (
    'louange', 'adoration', 'offrande', 'communique', 'predication',
    'temoignage', 'sainte_cene', 'priere_nouveaux', 'accueil_invites',
    'intervention_speciale', 'priere_finale', 'autre'
  )),
  custom_label TEXT,
  notes TEXT,
  duration_minutes INTEGER DEFAULT 10,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Liens de formulaires (tokens pour WhatsApp)
CREATE TABLE IF NOT EXISTS worship_form_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES worship_services(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('orator', 'president')),
  token TEXT NOT NULL UNIQUE,
  recipient_name TEXT,
  recipient_phone TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- Index pour la performance
-- ═══════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_worship_services_date ON worship_services(date DESC);
CREATE INDEX IF NOT EXISTS idx_worship_services_status ON worship_services(status);
CREATE INDEX IF NOT EXISTS idx_worship_orator_forms_service ON worship_orator_forms(service_id);
CREATE INDEX IF NOT EXISTS idx_worship_orator_points_form ON worship_orator_points(form_id);
CREATE INDEX IF NOT EXISTS idx_worship_order_items_service ON worship_order_items(service_id);
CREATE INDEX IF NOT EXISTS idx_worship_form_links_token ON worship_form_links(token);
CREATE INDEX IF NOT EXISTS idx_worship_form_links_service ON worship_form_links(service_id, link_type);

-- ═══════════════════════════════════════════════════════════════════
-- RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE worship_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE worship_orator_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE worship_orator_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE worship_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE worship_form_links ENABLE ROW LEVEL SECURITY;

-- Politique publique pour les formulaires via token (pas d'auth requise)
CREATE POLICY "Public read form links by token"
  ON worship_form_links FOR SELECT
  USING (true);

CREATE POLICY "Public update form links (mark used)"
  ON worship_form_links FOR UPDATE
  USING (true);

-- Politique pour les orator_forms via service_id lié au token
CREATE POLICY "Public insert orator forms"
  ON worship_orator_forms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update orator forms"
  ON worship_orator_forms FOR UPDATE
  USING (true);

-- Politique pour les orator_points
CREATE POLICY "Public insert orator points"
  ON worship_orator_points FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update orator points"
  ON worship_orator_points FOR UPDATE
  USING (true);

CREATE POLICY "Public delete orator points"
  ON worship_orator_points FOR DELETE
  USING (true);

-- Politique pour worship_order_items
CREATE POLICY "Public insert order items"
  ON worship_order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update order items"
  ON worship_order_items FOR UPDATE
  USING (true);

CREATE POLICY "Public delete order items"
  ON worship_order_items FOR DELETE
  USING (true);

-- Politique pour worship_services (lecture publique)
CREATE POLICY "Public read services"
  ON worship_services FOR SELECT
  USING (true);

-- Admin complet : toutes les opérations
CREATE POLICY "Admin all on worship_services"
  ON worship_services FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin all on worship_form_links"
  ON worship_form_links FOR ALL
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
-- Trigger: auto-update updated_at
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_worship_services_updated
  BEFORE UPDATE ON worship_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_worship_orator_forms_updated
  BEFORE UPDATE ON worship_orator_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_worship_form_links_updated
  BEFORE UPDATE ON worship_form_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();