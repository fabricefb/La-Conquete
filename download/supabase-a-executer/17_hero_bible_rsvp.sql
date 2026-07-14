-- ═══════════════════════════════════════════════════════════════════
-- 17. Hero, Bible, RSVP, Contact amélioré, Contraintes
-- ═══════════════════════════════════════════════════════════════════

-- ── 0. Un téléphone = un compte ────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_phone_unique'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_phone_unique UNIQUE (phone);
  END IF;
END $$;

-- ── 0b. Ajouter colonnes au contact_messages si manquantes ─────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_messages' AND column_name = 'phone') THEN
    ALTER TABLE contact_messages ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_messages' AND column_name = 'visitor_type') THEN
    ALTER TABLE contact_messages ADD COLUMN visitor_type TEXT CHECK (visitor_type IN ('nouveau','visiteur','membre','autre'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_messages' AND column_name = 'status') THEN
    ALTER TABLE contact_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau','en_cours','traite','ferme'));
  END IF;
END $$;

-- ── 1. Plans de lecture biblique ──────────────────────────────────
CREATE TABLE IF NOT EXISTS bible_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  book        TEXT NOT NULL,
  chapter     INTEGER,
  start_verse INTEGER NOT NULL DEFAULT 1,
  end_verse   INTEGER NOT NULL DEFAULT 1,
  total_days  INTEGER NOT NULL DEFAULT 7,
  start_date  DATE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE bible_plans DISABLE ROW LEVEL SECURITY;

-- ── 2. Versets du jour ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_verses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verse_date    DATE NOT NULL,
  reference     TEXT NOT NULL,
  content       TEXT NOT NULL,
  exhortation   TEXT,
  plan_id       UUID REFERENCES bible_plans(id) ON DELETE SET NULL,
  day_number    INTEGER,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(verse_date)
);
ALTER TABLE daily_verses DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_daily_verses_date ON daily_verses(verse_date);

-- ── 3. RSVP Événements ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_rsvps (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id  TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going','maybe','not_going')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);
ALTER TABLE event_rsvps DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_rsvp_user ON event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_event ON event_rsvps(event_id);

-- ── 4. Hero settings dans site_settings ──────────────────────────
INSERT INTO site_settings (key, value, type, category, label, sort_order)
VALUES
  ('hero_image_url', '', 'url', 'general', 'Image du Hero', 1),
  ('hero_default_exhortation', 'Que la paix du Seigneur soit avec vous aujourd''hui !', 'text', 'general', 'Exhortation par défaut', 2)
ON CONFLICT (key) DO NOTHING;

-- ── 5. Données de démonstration: verset du jour pour 10 jours ────
-- Psaume 91:1-16 divisé sur 10 jours (2 versets par jour)
INSERT INTO daily_verses (verse_date, reference, content, exhortation, day_number) VALUES
  (CURRENT_DATE,              'Psaume 91:1-2',
   'Celui qui demeure sous l''abri du Très-Haut repose à l''ombre du Tout-Puissant. Je dis à l''Éternel: Mon refuge et ma forteresse, mon Dieu en qui je me confie!',
   'Dieu est votre refuge ultime. Aujourd''hui, choisissez de vous reposer en Lui.', 1),

  (CURRENT_DATE + INTERVAL '1 day', 'Psaume 91:3-4',
   'C''est lui qui te délivre du piège de l''oiseleur, de la peste et de ses ravages. Il te couvrira de ses plumes, et tu trouveras un refuge sous ses ailes; sa fidélité est un bouclier et une cuirasse.',
   'Même dans les pièges de la vie, la protection de Dieu est totale.', 2),

  (CURRENT_DATE + INTERVAL '2 days', 'Psaume 91:5-6',
   'Tu ne craindras ni les terreurs de la nuit, ni la flèche qui vole de jour, ni la peste qui marche dans les ténèbres, ni la contagion qui frappe en plein midi.',
   'Quelque soit l''heure, Dieu veille sur vous. N''ayez aucune crainte!', 3),

  (CURRENT_DATE + INTERVAL '3 days', 'Psaume 91:7-8',
   'Mille tomberont à ton côté, et dix mille à ta droite; mais tu ne seras pas atteint. De tes yeux tu contempleras et tu verras la rétribution des méchants.',
   'La foi vous met à l''abri, même quand d''autres chancellent autour de vous.', 4),

  (CURRENT_DATE + INTERVAL '4 days', 'Psaume 91:9-10',
   'Parce que tu as dit: L''Éternel est mon refuge, tu as fait du Très-Haut ton habitation, aucun mal ne t''atteindra, aucune plaie n''approchera de ta tente.',
   'Faire de Dieu votre habitation, c''est la meilleure décision de chaque jour.', 5),

  (CURRENT_DATE + INTERVAL '5 days', 'Psaume 91:11-12',
   'Car il ordonnera à ses anges de te garder dans toutes tes voies; ils te porteront sur les mains, de peur que ton pied ne heurte contre une pierre.',
   'Dieu a assigné des anges pour vous. Vous n''êtes jamais seul!', 6),

  (CURRENT_DATE + INTERVAL '6 days', 'Psaume 91:13-14',
   'Tu marcheras sur le lion et sur l''aspic, tu fouleras le lionceau et le dragon. Puisqu''il s''attache à moi, je le délivrerai; je le protégerai, puisqu''il connaît mon nom.',
   'La puissance de Dieu en vous est plus grande que toute adversité.', 7),

  (CURRENT_DATE + INTERVAL '7 days', 'Psaume 91:15-16',
   'Il m''invoquera, et je lui répondrai; je serai avec lui dans la détresse, je le délivrerai et je le glorifierai. Je le rassasierai de longs jours, et je lui ferai voir mon salut.',
   'Dieu répond toujours à ceux qui l''invoquent. Il est fidèle en toute circonstance!', 8)
ON CONFLICT (verse_date) DO NOTHING;