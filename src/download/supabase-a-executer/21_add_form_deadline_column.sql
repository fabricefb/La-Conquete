-- ─────────────────────────────────────────────────────────────
-- 21_add_form_deadline_column.sql
-- Ajoute la colonne GENERATED form_deadline_at sur worship_services
-- si elle n'existe pas encore.
-- form_deadline_at = date + heure - 12h (+ retard si culte en retard)
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'worship_services' AND column_name = 'form_deadline_at'
  ) THEN
    ALTER TABLE worship_services ADD COLUMN form_deadline_at TIMESTAMPTZ GENERATED ALWAYS AS (
      (date + COALESCE(time, '09:00'::TIME))
      - INTERVAL '12 hours'
      + CASE
          WHEN is_delayed AND delayed_minutes > 0
          THEN (delayed_minutes || ' minutes')::INTERVAL
          ELSE INTERVAL '0 minutes'
        END
    ) STORED;
    RAISE NOTICE 'Colonne form_deadline_at ajoutee avec succes.';
  ELSE
    RAISE NOTICE 'Colonne form_deadline_at existe deja.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur ajout colonne form_deadline_at: %', SQLERRM;
END $$;

-- Index pour filtrer/ordonner par deadline
DO $$ BEGIN
  CREATE INDEX idx_worship_services_deadline ON worship_services(form_deadline_at);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur creation index deadline: %', SQLERRM;
END $$;