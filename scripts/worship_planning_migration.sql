-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE PLANIFICATION DE CULTE — Département Média & Presse
-- Tables: worship_services, worship_orator_forms, worship_orator_points,
--         worship_order_items, worship_form_links
-- RLS désactivé (même pattern que cult_reports / protocole)
--
-- IDÉMPOTENT : peut être ré-exécuté sans erreur.
-- Si les tables existent déjà, les colonnes manquantes sont ajoutées.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── OPTIONNEL : Supprimer et recréer (décommenter pour repartir à zéro) ──
-- DROP TABLE IF EXISTS worship_form_links CASCADE;
-- DROP TABLE IF EXISTS worship_order_items CASCADE;
-- DROP TABLE IF EXISTS worship_orator_points CASCADE;
-- DROP TABLE IF EXISTS worship_orator_forms CASCADE;
-- DROP TABLE IF EXISTS worship_services CASCADE;

-- ─── 1. worship_services — Cultes planifiés ──────────────────────────
CREATE TABLE IF NOT EXISTS worship_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time TIME NOT NULL DEFAULT '09:00',
  type TEXT NOT NULL DEFAULT 'adoration_louange' CHECK (type IN (
    -- 4 cultes hebdomadaires standards
    'enseignement_priere', 'jeune_priere', 'jeune_gen_espoir', 'adoration_louange',
    -- événements spéciaux
    'seminaire', 'veillee', 'culte_special', 'conference', 'exposition', 'retraite', 'autre'
  )),
  orator_name TEXT,
  president_name TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'draft', 'planned', 'orator_submitted', 'president_submitted',
    'completed', 'cancelled'
  )),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Ajouter les colonnes de gestion du retard si manquantes ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worship_services' AND column_name = 'is_delayed') THEN
    ALTER TABLE worship_services ADD COLUMN is_delayed BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worship_services' AND column_name = 'delayed_at') THEN
    ALTER TABLE worship_services ADD COLUMN delayed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worship_services' AND column_name = 'delayed_minutes') THEN
    ALTER TABLE worship_services ADD COLUMN delayed_minutes INTEGER DEFAULT 0;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur ajout colonnes retard: %', SQLERRM;
END $$;

-- ── Ajouter la colonne GENERATED form_deadline_at si manquante ──
-- date + heure - 12h (+ retard si en retard)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worship_services' AND column_name = 'form_deadline_at') THEN
    ALTER TABLE worship_services ADD COLUMN form_deadline_at TIMESTAMPTZ GENERATED ALWAYS AS (
      (date + COALESCE(time, '09:00'::TIME))
      - INTERVAL '12 hours'
      + CASE
          WHEN is_delayed AND delayed_minutes > 0
          THEN (delayed_minutes || ' minutes')::INTERVAL
          ELSE INTERVAL '0 minutes'
        END
    ) STORED;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur ajout colonne form_deadline_at: %', SQLERRM;
END $$;

-- ── Migrer les anciens types vers les nouveaux AVANT de changer la contrainte ──
UPDATE worship_services SET type = 'enseignement_priere' WHERE type IN ('dimanche', 'enseignement');
UPDATE worship_services SET type = 'jeune_priere' WHERE type IN ('jeune', 'jeudi');
UPDATE worship_services SET type = 'jeune_gen_espoir' WHERE type IN ('samedi', 'gen_espoir');
UPDATE worship_services SET type = 'adoration_louange' WHERE type IN ('dim', 'midis');
UPDATE worship_services SET type = 'veillee' WHERE type = 'veille';
UPDATE worship_services SET type = 'culte_special' WHERE type = 'special';
UPDATE worship_services SET type = 'autre' WHERE type NOT IN (
  'enseignement_priere', 'jeune_priere', 'jeune_gen_espoir', 'adoration_louange',
  'seminaire', 'veillee', 'culte_special', 'conference', 'exposition', 'retraite', 'autre'
);

-- ── Mettre à jour le CHECK constraint sur type si ancienne version ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'worship_services' AND constraint_name = 'worship_services_type_check') THEN
    ALTER TABLE worship_services DROP CONSTRAINT worship_services_type_check;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Supprimer toute autre contrainte CHECK résiduelle sur "type"
DO $$ BEGIN
  DECLARE
    cname TEXT;
  BEGIN
    FOR cname IN
      SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'worship_services'
          AND constraint_type = 'CHECK'
          AND constraint_name != 'worship_services_type_check'
    LOOP
      EXECUTE format('ALTER TABLE worship_services DROP CONSTRAINT %I', cname);
    END LOOP;
  END;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Recréer le CHECK constraint avec les bons types
DO $$ BEGIN
  ALTER TABLE worship_services ADD CONSTRAINT worship_services_type_check CHECK (type IN (
    'enseignement_priere', 'jeune_priere', 'jeune_gen_espoir', 'adoration_louange',
    'seminaire', 'veillee', 'culte_special', 'conference', 'exposition', 'retraite', 'autre'
  ));
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_worship_services_date ON worship_services(date DESC);
CREATE INDEX IF NOT EXISTS idx_worship_services_status ON worship_services(status);
DO $$ BEGIN
  CREATE INDEX idx_worship_services_deadline ON worship_services(form_deadline_at);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

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

-- ─── Auto-update updated_at ────────────────────────────────────────
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
CREATE OR REPLACE FUNCTION fn_worship_propagate_delay()
RETURNS TRIGGER AS $$
BEGIN
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
-- RLS — DÉSACTIVÉ
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE worship_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE worship_orator_forms DISABLE ROW LEVEL SECURITY;
ALTER TABLE worship_orator_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE worship_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE worship_form_links DISABLE ROW LEVEL SECURITY;