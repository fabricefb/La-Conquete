-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE PLANIFICATION DE CULTE — Département Média & Presse
-- Tables: worship_services, worship_orator_forms, worship_orator_points,
--         worship_order_items, worship_form_links
-- RLS désactivé (même pattern que cult_reports / protocole)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. worship_services — Cultes planifiés ──────────────────────────
-- CONTRAINTE CLÉ : Les formulaires doivent être soumis AU PLUS TARD
-- 12 HEURES avant l'heure du culte. Si le culte est en retard,
-- la deadline est repoussée automatiquement.
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS worship_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time TIME NOT NULL DEFAULT '09:00',
  type TEXT NOT NULL DEFAULT 'dimanche' CHECK (type IN (
    'dimanche', 'midis', 'veille', 'special', 'jeune', 'autre'
  )),
  orator_name TEXT,
  president_name TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'draft', 'planned', 'orator_submitted', 'president_submitted',
    'completed', 'cancelled'
  )),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- ── Gestion des retards de culte ──
  is_delayed BOOLEAN NOT NULL DEFAULT FALSE,
  delayed_at TIMESTAMPTZ,                   -- Quand le retard a été signalé
  delayed_minutes INTEGER DEFAULT 0,        -- Nombre de minutes de retard

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ── Deadline calculée : date + heure - 12h (ou -12h + retard si en retard) ──
  -- Cette colonne GENERATED est recalculée automatiquement à chaque UPDATE.
  -- Elle sert de référence pour l'expiration des liens de formulaire.
  form_deadline_at TIMESTAMPTZ GENERATED ALWAYS AS (
    (date + COALESCE(time, '09:00'::TIME))
    - INTERVAL '12 hours'
    + CASE
        WHEN is_delayed AND delayed_minutes > 0
        THEN (delayed_minutes || ' minutes')::INTERVAL
        ELSE INTERVAL '0 minutes'
      END
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_worship_services_date ON worship_services(date DESC);
CREATE INDEX IF NOT EXISTS idx_worship_services_status ON worship_services(status);
CREATE INDEX IF NOT EXISTS idx_worship_services_deadline ON worship_services(form_deadline_at);

-- ─── 2. worship_orator_forms — Formulaire Orateur ────────────────────
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worship_orator_forms_service ON worship_orator_forms(service_id);

-- ─── 3. worship_orator_points — Points du message ────────────────────
CREATE TABLE IF NOT EXISTS worship_orator_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES worship_orator_forms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worship_orator_points_form ON worship_orator_points(form_id);

-- ─── 4. worship_order_items — Ordre du culte (Président) ─────────────
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worship_order_items_service ON worship_order_items(service_id);

-- ─── 5. worship_form_links — Liens token pour WhatsApp ───────────────
-- L'expires_at est calculé à la création/MAJ via trigger pour
-- pointer vers form_deadline_at du service parent.
-- Si le culte est marqué en retard, un trigger repousse
-- automatiquement l'expiration de tous les liens associés.
-- ───────────────────────────────────────────────────────────────────────
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worship_form_links_token ON worship_form_links(token);
CREATE INDEX IF NOT EXISTS idx_worship_form_links_service ON worship_form_links(service_id, link_type);

-- ═══════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Auto-update updated_at sur les tables qui l'ont ────────────────
CREATE OR REPLACE FUNCTION fn_worship_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_ws_updated
    BEFORE UPDATE ON worship_services
    FOR EACH ROW EXECUTE FUNCTION fn_worship_update_updated_at();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_wof_updated
    BEFORE UPDATE ON worship_orator_forms
    FOR EACH ROW EXECUTE FUNCTION fn_worship_update_updated_at();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_wfl_updated
    BEFORE UPDATE ON worship_form_links
    FOR EACH ROW EXECUTE FUNCTION fn_worship_update_updated_at();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

-- ─── Trigger : Auto-set expires_at des liens à la création ──────────
-- Quand un lien est créé, son expires_at = form_deadline_at du service
CREATE OR REPLACE FUNCTION fn_worship_set_link_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    SELECT form_deadline_at INTO NEW.expires_at
    FROM worship_services
    WHERE id = NEW.service_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_wfl_set_expiry
    BEFORE INSERT ON worship_form_links
    FOR EACH ROW EXECUTE FUNCTION fn_worship_set_link_expiry();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

-- ─── Trigger : Repousser expires_at quand le culte est mis en retard ──
-- Quand is_delayed passe à TRUE ou delayed_minutes change,
-- tous les liens NON UTILISÉS du service sont mis à jour.
CREATE OR REPLACE FUNCTION fn_worship_propagate_delay()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne déclencher que si is_delayed ou delayed_minutes change
  IF (NEW.is_delayed IS DISTINCT FROM OLD.is_delayed)
     OR (NEW.delayed_minutes IS DISTINCT FROM OLD.delayed_minutes) THEN
    UPDATE worship_form_links
    SET expires_at = NEW.form_deadline_at
    WHERE service_id = NEW.id
      AND is_used = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_ws_propagate_delay
    AFTER UPDATE ON worship_services
    FOR EACH ROW EXECUTE FUNCTION fn_worship_propagate_delay();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- RLS — DÉSACTIVÉ (même pattern que cult_reports / protocole)
-- L'accès est contrôlé au niveau applicatif.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE worship_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE worship_orator_forms DISABLE ROW LEVEL SECURITY;
ALTER TABLE worship_orator_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE worship_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE worship_form_links DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════
-- RÉCAPITULATIF
-- ═══════════════════════════════════════════════════════════════════════
-- Tables créées :
--   1. worship_services       — Cultes planifiés
--        * form_deadline_at (GENERATED) = date + heure - 12h + retard
--        * is_delayed, delayed_at, delayed_minutes
--   2. worship_orator_forms   — Formulaire orateur (thème, versets, points)
--   3. worship_orator_points  — Points du message de l'orateur
--   4. worship_order_items    — Ordre du culte défini par le président
--   5. worship_form_links     — Liens tokenisés pour WhatsApp
--        * expires_at auto-set à form_deadline_at du service
--        * Repoussé automatiquement si le culte est en retard
-- RLS : désactivé sur toutes les tables
-- Triggers :
--   * fn_worship_update_updated_at — auto updated_at (3 tables)
--   * fn_worship_set_link_expiry   — auto expires_at à la création
--   * fn_worship_propagate_delay   — repousse expires_at si retard
-- ═══════════════════════════════════════════════════════════════════════