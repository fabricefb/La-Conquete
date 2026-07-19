-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE ÉVANGÉLISATION v2 — Fusion Pipeline des Âmes + Rendez-vous
-- Ajoute: pipeline_stage, rendez-vous, nouveau_venu_source
-- ═══════════════════════════════════════════════════════════════════════════
-- IDÉMPOTENT : peut être ré-exécuté sans erreur.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Ajouter pipeline_stage aux contacts ──────────────────
DO $$ BEGIN
  ALTER TABLE evangelism_contacts
    ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'nouveau_contact'
    CHECK (pipeline_stage IN (
      'nouveau_contact', 'premier_contact', 'rdv_planifie', 'en_suivi',
      'venu_culte', 'etude_biblique', 'affermi', 'integre_eglise', 'baptise', 'perdu_de_vue'
    ));
EXCEPTION WHEN DUPLICATE_COLUMN THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_evangelism_contacts_pipeline ON evangelism_contacts(pipeline_stage);

-- ─── 2. Ajouter colonnes rendez-vous ─────────────────────────
DO $$ BEGIN
  ALTER TABLE evangelism_contacts ADD COLUMN IF NOT EXISTS rdv_date DATE;
EXCEPTION WHEN DUPLICATE_COLUMN THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE evangelism_contacts ADD COLUMN IF NOT EXISTS rdv_time TIME;
EXCEPTION WHEN DUPLICATE_COLUMN THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE evangelism_contacts ADD COLUMN IF NOT EXISTS rdv_type TEXT DEFAULT 'visite'
    CHECK (rdv_type IN ('visite', 'appel', 'etude_biblique', 'prie_domicile', 'cafe_chretien', 'autre'));
EXCEPTION WHEN DUPLICATE_COLUMN THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE evangelism_contacts ADD COLUMN IF NOT EXISTS rdv_notes TEXT;
EXCEPTION WHEN DUPLICATE_COLUMN THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE evangelism_contacts ADD COLUMN IF NOT EXISTS rdv_status TEXT DEFAULT 'planifie'
    CHECK (rdv_status IN ('planifie', 'confirme', 'realise', 'annule', 'reporte'));
EXCEPTION WHEN DUPLICATE_COLUMN THEN NULL;
END $$;

-- ─── 3. Ajouter source du nouveau venu ──────────────────────
DO $$ BEGIN
  ALTER TABLE evangelism_contacts ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'evangelisme'
    CHECK (source IN ('evangelisme', 'culte', 'evenement', 'recommandation', 'internet', 'autre'));
EXCEPTION WHEN DUPLICATE_COLUMN THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE evangelism_contacts ADD COLUMN IF NOT EXISTS source_culte_id UUID;
EXCEPTION WHEN DUPLICATE_COLUMN THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE evangelism_contacts ADD COLUMN IF NOT EXISTS is_new_visitor BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN DUPLICATE_COLUMN THEN NULL;
END $$;

-- ─── 4. Ajouter colonne affermissement ───────────────────────
DO $$ BEGIN
  ALTER TABLE evangelism_contacts ADD COLUMN IF NOT EXISTS discipleship_start_date DATE;
EXCEPTION WHEN DUPLICATE_COLUMN THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE evangelism_contacts ADD COLUMN IF NOT EXISTS discipleship_notes TEXT;
EXCEPTION WHEN DUPLICATE_COLUMN THEN NULL;
END $$;

-- ─── 5. Mettre à jour la vue stats ───────────────────────────
CREATE OR REPLACE VIEW v_evangelism_stats AS
SELECT
  (SELECT COUNT(*) FROM evangelism_outings WHERE status != 'annulee')::int AS total_outings,
  (SELECT COUNT(*) FROM evangelism_contacts)::int AS total_contacts,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE decision IN ('accepte_christ', 'veut_venir_eglise'))::int AS decisions,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE pipeline_stage = 'integre_eglise')::int AS integrated,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE came_to_culte = true)::int AS came_to_culte,
  (SELECT COUNT(*) FROM evangelism_followups WHERE completed_at IS NOT NULL)::int AS followups_done,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE pipeline_stage IN ('nouveau_contact', 'premier_contact', 'rdv_planifie', 'en_suivi'))::int AS active_followups,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE baptized = true)::int AS baptized,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE is_new_visitor = true)::int AS new_visitors,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE rdv_status = 'planifie')::int AS rdv_pending,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE pipeline_stage = 'affermi')::int AS in_discipleship,
  (SELECT COUNT(*) FROM evangelism_contacts WHERE rdv_status = 'realise')::int AS rdv_completed;

-- ─── 6. Pipeline counts par étape ────────────────────────────
CREATE OR REPLACE VIEW v_evangelism_pipeline_counts AS
SELECT
  pipeline_stage,
  COUNT(*)::int AS count
FROM evangelism_contacts
GROUP BY pipeline_stage
ORDER BY
  CASE pipeline_stage
    WHEN 'nouveau_contact' THEN 1
    WHEN 'premier_contact' THEN 2
    WHEN 'rdv_planifie' THEN 3
    WHEN 'en_suivi' THEN 4
    WHEN 'venu_culte' THEN 5
    WHEN 'etude_biblique' THEN 6
    WHEN 'affermi' THEN 7
    WHEN 'integre_eglise' THEN 8
    WHEN 'baptise' THEN 9
    WHEN 'perdu_de_vue' THEN 10
    ELSE 11
  END;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: Auto-pipeline stage update
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_evangelism_auto_pipeline()
RETURNS TRIGGER AS $$
BEGIN
  -- Si first_call_at est mis et stage = nouveau_contact → premier_contact
  IF NEW.first_call_at IS NOT NULL AND OLD.first_call_at IS NULL AND NEW.pipeline_stage = 'nouveau_contact' THEN
    NEW.pipeline_stage := 'premier_contact';
  END IF;

  -- Si rdv_date est mis et stage = premier_contact → rdv_planifie
  IF NEW.rdv_date IS NOT NULL AND OLD.rdv_date IS NULL AND NEW.pipeline_stage IN ('nouveau_contact', 'premier_contact') THEN
    NEW.pipeline_stage := 'rdv_planifie';
  END IF;

  -- Si came_to_culte = true → venu_culte
  IF NEW.came_to_culte = true AND (OLD.came_to_culte IS NULL OR OLD.came_to_culte = false) THEN
    IF NEW.pipeline_stage NOT IN ('etude_biblique', 'affermi', 'integre_eglise', 'baptise') THEN
      NEW.pipeline_stage := 'venu_culte';
    END IF;
  END IF;

  -- Si baptized = true → baptise
  IF NEW.baptized = true AND (OLD.baptized IS NULL OR OLD.baptized = false) THEN
    NEW.pipeline_stage := 'baptise';
  END IF;

  -- Si status = perdu_de_vue → pipeline perdu_de_vue
  IF NEW.status = 'perdu_de_vue' AND NEW.pipeline_stage != 'baptise' THEN
    NEW.pipeline_stage := 'perdu_de_vue';
  END IF;

  -- Si pipeline_stage = integre_eglise → status aussi
  IF NEW.pipeline_stage = 'integre_eglise' THEN
    NEW.status := 'integre_eglise';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_ec_auto_pipeline
    BEFORE UPDATE ON evangelism_contacts
    FOR EACH ROW EXECUTE FUNCTION fn_evangelism_auto_pipeline();
EXCEPTION WHEN DUPLICATE_OBJECT THEN NULL;
END $$;