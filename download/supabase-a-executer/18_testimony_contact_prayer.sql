-- ═══════════════════════════════════════════════════════════════════
-- 18. Témoignages membres, Contact créneaux, Prières urgence/expiry,
--     Notification assignation département
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Colonne urgence + expires_at sur prayer_requests ─────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prayer_requests' AND column_name = 'urgency') THEN
    ALTER TABLE prayer_requests ADD COLUMN urgency TEXT NOT NULL DEFAULT 'normale'
      CHECK (urgency IN ('basse', 'normale', 'haute', 'urgente'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prayer_requests' AND column_name = 'expires_at') THEN
    ALTER TABLE prayer_requests ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  -- Mettre à jour les existantes sans expires_at à 30 jours
  UPDATE prayer_requests SET expires_at = created_at + INTERVAL '30 days'
    WHERE expires_at IS NULL;
END $$;

-- ── 2. Même chose pour visit_requests ──────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visit_requests' AND column_name = 'urgency') THEN
    ALTER TABLE visit_requests ADD COLUMN urgency TEXT NOT NULL DEFAULT 'normale'
      CHECK (urgency IN ('basse', 'normale', 'haute', 'urgente'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visit_requests' AND column_name = 'expires_at') THEN
    ALTER TABLE visit_requests ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  UPDATE visit_requests SET expires_at = created_at + INTERVAL '30 days'
    WHERE expires_at IS NULL;
END $$;

-- ── 3. Témoignages soumis par les membres (table séparée) ──────
CREATE TABLE IF NOT EXISTS member_testimonies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('general','guerison','finance','maternite','delivrance','miracle','salut','famille','autre')),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','published')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  admin_comment  TEXT,           -- commentaire pasteur/diacre (visible publiquement)
  published_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE member_testimonies DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_mt_user ON member_testimonies(user_id);
CREATE INDEX IF NOT EXISTS idx_mt_status ON member_testimonies(status);

-- ── 4. Contrainte téléphone unique sur user_profiles ────────────
-- (déjà dans 17, mais on double avec CREATE UNIQUE INDEX IF NOT EXISTS)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_phone_unique') THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_phone_unique UNIQUE (phone);
  END IF;
END $$;

-- ── 5. Contact messages : colonnes manquantes + statut créneau ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_messages' AND column_name = 'phone') THEN
    ALTER TABLE contact_messages ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_messages' AND column_name = 'visitor_type') THEN
    ALTER TABLE contact_messages ADD COLUMN visitor_type TEXT
      CHECK (visitor_type IN ('nouveau','visiteur','membre','autre'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_messages' AND column_name = 'status') THEN
    ALTER TABLE contact_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'nouveau'
      CHECK (status IN ('nouveau','en_cours','traite','ferme'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_messages' AND column_name = 'assigned_to') THEN
    ALTER TABLE contact_messages ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_messages' AND column_name = 'handled_at') THEN
    ALTER TABLE contact_messages ADD COLUMN handled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_messages' AND column_name = 'handler_notes') THEN
    ALTER TABLE contact_messages ADD COLUMN handler_notes TEXT;
  END IF;
END $$;