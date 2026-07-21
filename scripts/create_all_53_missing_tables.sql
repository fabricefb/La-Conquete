-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: create_all_53_missing_tables.sql
-- PAS de BEGIN/COMMIT — chaque instruction est indépendante.
-- Si une instruction échoue, les autres continuent.
-- Exécuter TOUT ce fichier dans l'éditeur SQL Supabase.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. user_profiles (table fondamentale)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  full_name         TEXT,
  avatar_url        TEXT,
  phone             TEXT,
  address           TEXT,
  gender            TEXT,
  birth_date        DATE,
  bio               TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  is_admin          BOOLEAN NOT NULL DEFAULT false,
  role_level        INTEGER NOT NULL DEFAULT 1,
  pastor_category   TEXT CHECK (pastor_category IN ('ancien','diacre','collaborateur','partenaire','assistant_pastor')),
  extension_id      UUID,
  is_principal_pastor BOOLEAN NOT NULL DEFAULT false,
  is_blocked        BOOLEAN NOT NULL DEFAULT false,
  blocked_at        TIMESTAMPTZ,
  blocked_reason    TEXT,
  last_seen_at      TIMESTAMPTZ,
  joined_via        TEXT,
  membership_date   DATE,
  previous_role     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "up_public_read" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "up_self_all" ON public.user_profiles FOR ALL USING (id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. theme_settings
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.theme_settings (
  id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  primary_color   TEXT NOT NULL DEFAULT '#e8a73c',
  secondary_color TEXT NOT NULL DEFAULT '#f23c2e',
  accent_color    TEXT NOT NULL DEFAULT '#efc06a',
  button_style    TEXT NOT NULL DEFAULT 'pill' CHECK (button_style IN ('pill','rounded','sharp','outline','gradient')),
  card_style      TEXT NOT NULL DEFAULT 'glass' CHECK (card_style IN ('glass','flat','bordered','shadowed','glass-bordered')),
  border_radius   TEXT NOT NULL DEFAULT 'medium' CHECK (border_radius IN ('none','small','medium','large','full')),
  title_font      TEXT NOT NULL DEFAULT 'Cormorant Garamond',
  body_font       TEXT NOT NULL DEFAULT 'Inter',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ts_public_read" ON public.theme_settings FOR SELECT USING (true);
CREATE POLICY "ts_admin_all" ON public.theme_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. contact_messages
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  subject      TEXT NOT NULL DEFAULT '',
  message      TEXT NOT NULL,
  visitor_type TEXT CHECK (visitor_type IN ('nouveau','visiteur','membre','autre')),
  is_read      BOOLEAN NOT NULL DEFAULT false,
  status       TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau','en_cours','traite','ferme')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_public_insert" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "cm_admin_all" ON public.contact_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. events
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL DEFAULT 'Cultes',
  image_url       TEXT NOT NULL DEFAULT '',
  event_date      TIMESTAMPTZ NOT NULL,
  location        TEXT NOT NULL DEFAULT '',
  is_live         BOOLEAN NOT NULL DEFAULT false,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  youtube_url     TEXT NOT NULL DEFAULT '',
  facebook_url    TEXT NOT NULL DEFAULT '',
  category_custom TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ev_public_read" ON public.events FOR SELECT USING (true);
CREATE POLICY "ev_admin_all" ON public.events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. contents (blog, enseignements, actualites)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.contents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  value       TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'blog' CHECK (type IN ('blog','enseignement','communique','actualite','evenement','ressource')),
  category    TEXT NOT NULL DEFAULT '',
  speaker     TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL DEFAULT '',
  is_featured BOOLEAN DEFAULT false,
  audio_url   TEXT NOT NULL DEFAULT '',
  pdf_url     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  author_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_public_read" ON public.contents FOR SELECT USING (status = 'published');
CREATE POLICY "ct_admin_all" ON public.contents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. communiques
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.communiques (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  content          TEXT NOT NULL,
  author_id        UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  department_id    UUID,
  extension_scope  TEXT,
  category         TEXT NOT NULL DEFAULT 'global' CHECK (category IN ('spirituel','logistique','departement','urgent','global')),
  is_urgent        BOOLEAN NOT NULL DEFAULT false,
  is_published     BOOLEAN NOT NULL DEFAULT false,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.communiques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "com_public_read" ON public.communiques FOR SELECT USING (is_published = true);
CREATE POLICY "com_admin_all" ON public.communiques FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. prayer_requests
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  author_name   TEXT,
  content       TEXT NOT NULL,
  is_anonymous  BOOLEAN NOT NULL DEFAULT false,
  is_confidential BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau','en_priere','repondu','suivi_pastoral')),
  visibility    TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','intercesseurs','pastoral','confidentiel')),
  prayer_count  INTEGER NOT NULL DEFAULT 0,
  response      TEXT,
  prayed_by     UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  prayed_at     TIMESTAMPTZ,
  responded_by  UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  responded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_public_read" ON public.prayer_requests FOR SELECT USING (
  (visibility = 'public') OR (user_id = auth.uid())
);
CREATE POLICY "pr_admin_all" ON public.prayer_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. notifications
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  link        TEXT,
  ref_table   TEXT,
  ref_id      UUID,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_self" ON public.notifications FOR ALL USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. notification_preferences
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  email_notifications   BOOLEAN NOT NULL DEFAULT true,
  push_notifications    BOOLEAN NOT NULL DEFAULT true,
  pastoral_whatsapp     BOOLEAN NOT NULL DEFAULT false,
  pastoral_sms          BOOLEAN NOT NULL DEFAULT false,
  pastoral_call         BOOLEAN NOT NULL DEFAULT false,
  dept_notifications    BOOLEAN NOT NULL DEFAULT true,
  prayer_updates        BOOLEAN NOT NULL DEFAULT true,
  service_reminders     BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npref_self" ON public.notification_preferences FOR ALL USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. onboarding_answers
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.onboarding_answers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        TEXT,
  phone            TEXT,
  gender           TEXT,
  birth_date       DATE,
  department_id    UUID,
  department_name  TEXT,
  position_id      UUID,
  position_name    TEXT,
  motivation       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oa_self_all" ON public.onboarding_answers FOR ALL USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. daily_thoughts
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.daily_thoughts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  verse_reference TEXT,
  verse_text      TEXT NOT NULL,
  reflection      TEXT NOT NULL,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_thoughts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dt_public_read" ON public.daily_thoughts FOR SELECT USING (is_published = true);
CREATE POLICY "dt_admin_all" ON public.daily_thoughts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. role_requests
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.role_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  requested_role  TEXT NOT NULL,
  department_id   UUID,
  position_id     UUID,
  motivation      TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by     UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  admin_note      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr_self_read" ON public.role_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "rr_admin_all" ON public.role_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. department_posts
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.department_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES public.user_profiles(id),
  department_id UUID NOT NULL,
  content       TEXT NOT NULL,
  post_type     TEXT NOT NULL DEFAULT 'announcement' CHECK (post_type IN ('announcement','encouragement','prayer_need','info','testimony')),
  is_pinned     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.department_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dp_public_read" ON public.department_posts FOR SELECT USING (true);
CREATE POLICY "dp_admin_all" ON public.department_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 14. post_comments
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.post_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.department_posts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.user_profiles(id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc_public_read" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "pc_admin_all" ON public.post_comments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 15. service_plannings
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.service_plannings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL,
  service_date  DATE NOT NULL,
  service_type  TEXT NOT NULL DEFAULT 'culte' CHECK (service_type IN ('culte','repetition','special','veillerie','etude')),
  notes         TEXT,
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_plannings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_public_read" ON public.service_plannings FOR SELECT USING (true);
CREATE POLICY "sp_admin_all" ON public.service_plannings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 16. service_assignments
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.service_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id   UUID NOT NULL REFERENCES public.service_plannings(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  position_id   UUID NOT NULL,
  status        TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','accepted','declined')),
  responded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (planning_id, user_id, position_id)
);
ALTER TABLE public.service_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_public_read" ON public.service_assignments FOR SELECT USING (true);
CREATE POLICY "sa_admin_all" ON public.service_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 17. visitor_followups
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.visitor_followups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id    UUID NOT NULL,
  assigned_to   UUID NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','returned','lost')),
  contact_date  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visitor_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vf_admin_all" ON public.visitor_followups FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 18. department_requests
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.department_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL,
  position_id   UUID,
  message       TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente','accepte','refuse')),
  responded_by  UUID,
  responded_at  TIMESTAMPTZ,
  response      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.department_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_self_read" ON public.department_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "dr_admin_all" ON public.department_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 19. event_comments
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.event_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL,
  user_id     UUID,
  author_name TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ec_public_read" ON public.event_comments FOR SELECT USING (true);
CREATE POLICY "ec_admin_all" ON public.event_comments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 20. event_rsvps
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going','maybe','not_going')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_self_all" ON public.event_rsvps FOR ALL USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 21. event_reminders
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.event_reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  event_id    UUID NOT NULL,
  remind_at   TIMESTAMPTZ NOT NULL,
  is_sent     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emr_self_all" ON public.event_reminders FOR ALL USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 22. custom_icons
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.custom_icons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN ('svg','png')),
  svg_content TEXT,
  file_url    TEXT,
  size        INTEGER NOT NULL DEFAULT 24,
  color       TEXT NOT NULL DEFAULT '#d4a843',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_icons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ci_public_read" ON public.custom_icons FOR SELECT USING (true);
CREATE POLICY "ci_admin_all" ON public.custom_icons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 23. creneaux
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.creneaux (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name  TEXT,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  date          DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME,
  location      TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT 'visite' CHECK (type IN ('visite','entretien','culte','reunion','formation','evangelisation','priere','suivi','autre')),
  status        TEXT NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert','en_cours','termine','annule')),
  target_roles  TEXT[] NOT NULL DEFAULT ARRAY['collaborateur','diacre','ancien','assistant_pastor','pasteur_assoc'],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.creneaux ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cr_public_read" ON public.creneaux FOR SELECT USING (true);
CREATE POLICY "cr_admin_all" ON public.creneaux FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 24. creneau_responses
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.creneau_responses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creneau_id     UUID NOT NULL REFERENCES public.creneaux(id) ON DELETE CASCADE,
  responder_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responder_name TEXT,
  responder_role TEXT,
  status         TEXT NOT NULL DEFAULT 'accepte' CHECK (status IN ('accepte','refuse','termine','annule')),
  notes          TEXT NOT NULL DEFAULT '',
  responded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ,
  UNIQUE (creneau_id, responder_id)
);
ALTER TABLE public.creneau_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cres_self_all" ON public.creneau_responses FOR ALL USING (responder_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 25. bible_plans
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.bible_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  book         TEXT NOT NULL,
  chapter      INTEGER,
  start_verse  INTEGER NOT NULL DEFAULT 1,
  end_verse    INTEGER NOT NULL DEFAULT 1,
  total_days   INTEGER NOT NULL DEFAULT 7,
  start_date   DATE NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bible_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp_public_read" ON public.bible_plans FOR SELECT USING (is_active = true);
CREATE POLICY "bp_admin_all" ON public.bible_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 26. calendar_events
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  category         TEXT NOT NULL DEFAULT 'culte' CHECK (category IN ('culte','mission','jeunesse','communion','emission','predication','reunion','formation')),
  event_date       TIMESTAMPTZ NOT NULL,
  end_date         TIMESTAMPTZ,
  start_time       TEXT NOT NULL DEFAULT '00:00',
  end_time         TEXT NOT NULL DEFAULT '23:59',
  location_id      UUID,
  location_name    TEXT,
  department_id    UUID,
  image_url        TEXT,
  is_recurring     BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT,
  created_by       UUID NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cev_public_read" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "cev_admin_all" ON public.calendar_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 27. section_configs
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.section_configs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page       VARCHAR(50) NOT NULL,
  section    VARCHAR(50) NOT NULL,
  config     JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page, section)
);
ALTER TABLE public.section_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_public_read" ON public.section_configs FOR SELECT USING (true);
CREATE POLICY "sc_admin_all" ON public.section_configs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 28. donations
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.donations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount        NUMERIC(12,2) NOT NULL,
  donation_date DATE NOT NULL,
  donor_id      UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  donor_name    TEXT,
  purpose       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  currency      TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','CDF','EUR')),
  extension_id  UUID,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "don_public_read" ON public.donations FOR SELECT USING (true);
CREATE POLICY "don_admin_all" ON public.donations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 29. forum_messages
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.forum_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL,
  department_id UUID NOT NULL,
  parent_id     UUID REFERENCES public.forum_messages(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  is_pinned     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fm_public_read" ON public.forum_messages FOR SELECT USING (true);
CREATE POLICY "fm_admin_all" ON public.forum_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 30. tag_mentions
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tag_mentions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.forum_messages(id) ON DELETE CASCADE,
  tag_type   TEXT NOT NULL CHECK (tag_type IN ('department','user')),
  target_id  UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tag_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tm_admin_all" ON public.tag_mentions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 31. bureau_pastoral_members
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.bureau_pastoral_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  extension_id   UUID,
  role_in_bureau TEXT NOT NULL DEFAULT 'member' CHECK (role_in_bureau IN ('member','coordinator')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bureau_pastoral_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bpm_public_read" ON public.bureau_pastoral_members FOR SELECT USING (true);
CREATE POLICY "bpm_admin_all" ON public.bureau_pastoral_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 32. bureau_proposals
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.bureau_proposals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    UUID NOT NULL,
  extension_id UUID,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','voting','approved','rejected','archived')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at    TIMESTAMPTZ
);
ALTER TABLE public.bureau_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp_public_read" ON public.bureau_proposals FOR SELECT USING (true);
CREATE POLICY "bp_admin_all" ON public.bureau_proposals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 33. bureau_votes
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.bureau_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.bureau_proposals(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL,
  vote        TEXT NOT NULL CHECK (vote IN ('pour','contre','abstention')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, voter_id)
);
ALTER TABLE public.bureau_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bv_self_all" ON public.bureau_votes FOR ALL USING (voter_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 34. role_assignment_log
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.role_assignment_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by        UUID NOT NULL,
  target_user         UUID NOT NULL,
  action              TEXT NOT NULL CHECK (action IN ('promoted','assigned_extension','assigned_dept_leader','revoked','role_changed','pastor_category_changed')),
  old_role_level      INTEGER,
  new_role_level      INTEGER,
  old_pastor_category TEXT,
  new_pastor_category TEXT,
  details             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.role_assignment_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ral_admin_all" ON public.role_assignment_log FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 35-53. Tables du fichier 20260721000000 (sans BEGIN/COMMIT)
-- worship_services, worship_form_links, worship_orator_forms,
-- worship_order_items, worship_orator_points, protocol_teams,
-- protocol_team_members, protocol_dress_code, protocol_schedules,
-- cult_reports, evangelism_outings, evangelism_contacts,
-- evangelism_followups, zones_evangelisation, convertis,
-- converti_timeline, new_visitors, department_notes, daily_verses,
-- visit_requests, pastor_schedule, pastoral_alerts,
-- spiritual_assessments, spiritual_evaluations, impact_counters,
-- mission_reports, mission_finances, event_assignments, event_minutes,
-- event_reminders (déjà créé en #21), newsletters,
-- member_testimonies, cellules_maison, chat_messages,
-- communication_messages, media_library
-- ═══════════════════════════════════════════════════════════════════════════════

-- worship_services
CREATE TABLE IF NOT EXISTS public.worship_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE NOT NULL,
  time            TEXT NOT NULL DEFAULT '10:00',
  type            TEXT NOT NULL CHECK (type IN ('enseignement_priere','jeune_priere','jeune_gen_espoir','adoration_louange','seminaire','veillee','culte_special','conference','exposition','retraite','autre')),
  orator_name     TEXT,
  president_name  TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','planned','orator_submitted','president_submitted','completed','cancelled')),
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_delayed      BOOLEAN NOT NULL DEFAULT false,
  delayed_at      TIMESTAMPTZ,
  delayed_minutes INTEGER NOT NULL DEFAULT 0,
  form_deadline_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.worship_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_public_select" ON public.worship_services FOR SELECT USING (true);
CREATE POLICY "ws_admin_all" ON public.worship_services FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- worship_form_links
CREATE TABLE IF NOT EXISTS public.worship_form_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id   UUID NOT NULL REFERENCES public.worship_services(id) ON DELETE CASCADE,
  orator_name  TEXT,
  form_token   TEXT NOT NULL UNIQUE,
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.worship_form_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wfl_public_select" ON public.worship_form_links FOR SELECT USING (true);
CREATE POLICY "wfl_admin_all" ON public.worship_form_links FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- worship_orator_forms
CREATE TABLE IF NOT EXISTS public.worship_orator_forms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES public.worship_services(id) ON DELETE CASCADE,
  form_token  TEXT NOT NULL UNIQUE,
  orator_name TEXT NOT NULL DEFAULT '',
  title       TEXT NOT NULL DEFAULT '',
  scripture   TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  points      JSONB NOT NULL DEFAULT '[]',
  submitted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.worship_orator_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wof_public_select" ON public.worship_orator_forms FOR SELECT USING (true);
CREATE POLICY "wof_admin_all" ON public.worship_orator_forms FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- worship_order_items
CREATE TABLE IF NOT EXISTS public.worship_order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES public.worship_services(id) ON DELETE CASCADE,
  item_type   TEXT NOT NULL DEFAULT 'chant' CHECK (item_type IN ('priere_ouverture','louange','adoration','chant_congregation','offrande','predication','priere_finale','annonce','autre')),
  title       TEXT NOT NULL DEFAULT '',
  duration_min INTEGER NOT NULL DEFAULT 5,
  leader_name TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_woi_service ON public.worship_order_items(service_id, sort_order);
ALTER TABLE public.worship_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "woi_public_select" ON public.worship_order_items FOR SELECT USING (true);
CREATE POLICY "woi_admin_all" ON public.worship_order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- worship_orator_points
CREATE TABLE IF NOT EXISTS public.worship_orator_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id     UUID NOT NULL REFERENCES public.worship_orator_forms(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.worship_orator_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wop_public_select" ON public.worship_orator_points FOR SELECT USING (true);
CREATE POLICY "wop_admin_all" ON public.worship_orator_points FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role_level >= 6)
);

-- protocol_teams
CREATE TABLE IF NOT EXISTS public.protocol_teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#3b82f6',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.protocol_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pt_public_select" ON public.protocol_teams FOR SELECT USING (true);
CREATE POLICY "pt_admin_all" ON public.protocol_teams FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- protocol_team_members
CREATE TABLE IF NOT EXISTS public.protocol_team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES public.protocol_teams(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.protocol_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ptm_public_select" ON public.protocol_team_members FOR SELECT USING (true);
CREATE POLICY "ptm_admin_all" ON public.protocol_team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- protocol_dress_code
CREATE TABLE IF NOT EXISTS public.protocol_dress_code (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID REFERENCES public.protocol_teams(id) ON DELETE SET NULL,
  gender      TEXT NOT NULL DEFAULT 'all',
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.protocol_dress_code ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdc_public_select" ON public.protocol_dress_code FOR SELECT USING (true);
CREATE POLICY "pdc_admin_all" ON public.protocol_dress_code FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- protocol_schedules
CREATE TABLE IF NOT EXISTS public.protocol_schedules (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id   UUID NOT NULL REFERENCES public.protocol_teams(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'culte',
  members   JSONB NOT NULL DEFAULT '[]',
  notes     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.protocol_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps_public_select" ON public.protocol_schedules FOR SELECT USING (true);
CREATE POLICY "ps_admin_all" ON public.protocol_schedules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- cult_reports
CREATE TABLE IF NOT EXISTS public.cult_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id   UUID REFERENCES public.worship_services(id) ON DELETE SET NULL,
  reporter_id  UUID NOT NULL,
  date         DATE NOT NULL,
  attendance   INTEGER,
  newcomers    INTEGER DEFAULT 0,
  offerings    NUMERIC(12,2) DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cult_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crpt_public_select" ON public.cult_reports FOR SELECT USING (true);
CREATE POLICY "crpt_admin_all" ON public.cult_reports FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- evangelism_outings
CREATE TABLE IF NOT EXISTS public.evangelism_outings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  date        DATE NOT NULL,
  zone        TEXT,
  team_lead   TEXT,
  status      TEXT NOT NULL DEFAULT 'planifie' CHECK (status IN ('planifie','en_cours','termine','annule')),
  created_by  UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evangelism_outings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eo_public_select" ON public.evangelism_outings FOR SELECT USING (true);
CREATE POLICY "eo_admin_all" ON public.evangelism_outings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- evangelism_contacts
CREATE TABLE IF NOT EXISTS public.evangelism_contacts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name              TEXT NOT NULL,
  phone                  TEXT,
  address                TEXT,
  quartier               TEXT,
  zone                   TEXT,
  age                    INTEGER,
  gender                 TEXT,
  decision               TEXT CHECK (decision IN ('accepte_christ','veut_venir_eglise','en_reflexion','refuse')),
  pipeline_stage         TEXT NOT NULL DEFAULT 'nouveau_contact' CHECK (pipeline_stage IN ('nouveau_contact','premier_contact','rdv_planifie','en_suivi','venu_culte','etude_biblique','affermi','integre_eglise')),
  status                 TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif','inactif','integre_eglise')),
  rdv_status             TEXT CHECK (rdv_status IN ('planifie','realise','annule','reporte')),
  rdv_date               TIMESTAMPTZ,
  came_to_culte          BOOLEAN NOT NULL DEFAULT false,
  baptized               BOOLEAN NOT NULL DEFAULT false,
  discipleship_start_date DATE,
  is_new_visitor         BOOLEAN NOT NULL DEFAULT false,
  evangelist_id          UUID,
  evangelist_name        TEXT,
  outing_id              UUID REFERENCES public.evangelism_outings(id) ON DELETE SET NULL,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ec_pipeline ON public.evangelism_contacts(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_ec_status ON public.evangelism_contacts(status);
ALTER TABLE public.evangelism_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ec_public_select" ON public.evangelism_contacts FOR SELECT USING (true);
CREATE POLICY "ec_admin_all" ON public.evangelism_contacts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- evangelism_followups
CREATE TABLE IF NOT EXISTS public.evangelism_followups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL REFERENCES public.evangelism_contacts(id) ON DELETE CASCADE,
  contact_date TIMESTAMPTZ,
  method      TEXT NOT NULL DEFAULT 'visite' CHECK (method IN ('visite','telephone','whatsapp','sms','autre')),
  notes       TEXT,
  completed_by UUID,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evangelism_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ef_public_select" ON public.evangelism_followups FOR SELECT USING (true);
CREATE POLICY "ef_admin_all" ON public.evangelism_followups FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- zones_evangelisation
CREATE TABLE IF NOT EXISTS public.zones_evangelisation (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  quartier      TEXT,
  converti_count INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.zones_evangelisation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ze_public_select" ON public.zones_evangelisation FOR SELECT USING (true);
CREATE POLICY "ze_admin_all" ON public.zones_evangelisation FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- convertis
CREATE TABLE IF NOT EXISTS public.convertis (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  phone         TEXT,
  address       TEXT,
  quartier      TEXT,
  zone          TEXT,
  decision_date DATE NOT NULL,
  baptized      BOOLEAN NOT NULL DEFAULT false,
  baptism_date  DATE,
  disciple      TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.convertis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_public_select" ON public.convertis FOR SELECT USING (true);
CREATE POLICY "conv_admin_all" ON public.convertis FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- converti_timeline
CREATE TABLE IF NOT EXISTS public.converti_timeline (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  converti_id UUID NOT NULL REFERENCES public.convertis(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL DEFAULT 'decision' CHECK (event_type IN ('decision','premier_culte','bapteme','discipulat','integre','autre')),
  description TEXT NOT NULL DEFAULT '',
  event_date  DATE NOT NULL,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.converti_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_public_select" ON public.converti_timeline FOR SELECT USING (true);
CREATE POLICY "ct_admin_all" ON public.converti_timeline FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- new_visitors
CREATE TABLE IF NOT EXISTS public.new_visitors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  visit_date  DATE NOT NULL,
  culte_type  TEXT NOT NULL DEFAULT 'dominical',
  source      TEXT,
  assigned_to UUID,
  status      TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau','contacte','suivi','integre','inactif')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.new_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nv_public_select" ON public.new_visitors FOR SELECT USING (true);
CREATE POLICY "nv_admin_all" ON public.new_visitors FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- department_notes
CREATE TABLE IF NOT EXISTS public.department_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL,
  author_id     UUID NOT NULL,
  content       TEXT NOT NULL,
  is_pinned     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.department_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dn_public_select" ON public.department_notes FOR SELECT USING (true);
CREATE POLICY "dn_admin_all" ON public.department_notes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- daily_verses
CREATE TABLE IF NOT EXISTS public.daily_verses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verse_text  TEXT NOT NULL,
  reference   TEXT NOT NULL,
  translation TEXT NOT NULL DEFAULT 'LSG',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  scheduled_date DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_verses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dv_public_select" ON public.daily_verses FOR SELECT USING (true);
CREATE POLICY "dv_admin_all" ON public.daily_verses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- visit_requests
CREATE TABLE IF NOT EXISTS public.visit_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  address     TEXT NOT NULL DEFAULT '',
  motif       TEXT NOT NULL DEFAULT '',
  time_of_day TEXT NOT NULL DEFAULT 'Matin' CHECK (time_of_day IN ('Matin','Apres-midi','Soir')),
  day_range   TEXT NOT NULL DEFAULT 'Lundi-Vendredi' CHECK (day_range IN ('Lundi-Vendredi','Lundi-Samedi','Weekend','Flexible')),
  status      TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente','planifiee','en_cours','terminee','annulee')),
  assigned_to UUID,
  assigned_to_name TEXT,
  completed_at TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vr_public_insert" ON public.visit_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "vr_admin_all" ON public.visit_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- pastor_schedule
CREATE TABLE IF NOT EXISTS public.pastor_schedule (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pastor_id   UUID NOT NULL,
  date        DATE NOT NULL,
  time_slot   TEXT NOT NULL DEFAULT 'matin',
  activity    TEXT NOT NULL DEFAULT '',
  location    TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pastor_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psched_public_select" ON public.pastor_schedule FOR SELECT USING (true);
CREATE POLICY "psched_admin_all" ON public.pastor_schedule FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- pastoral_alerts
CREATE TABLE IF NOT EXISTS public.pastoral_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL DEFAULT 'visit' CHECK (type IN ('visit','prayer','crisis','followup','discipleship','autre')),
  description   TEXT NOT NULL,
  priority      TEXT NOT NULL DEFAULT 'normale' CHECK (priority IN ('basse','normale','haute','urgente')),
  status        TEXT NOT NULL DEFAULT 'ouverte' CHECK (status IN ('ouverte','en_cours','resolue','fermee')),
  created_by    UUID NOT NULL,
  assigned_to   UUID,
  assigned_to_name TEXT,
  resolved_by   UUID,
  resolved_at   TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pastoral_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa_public_select" ON public.pastoral_alerts FOR SELECT USING (true);
CREATE POLICY "pa_admin_all" ON public.pastoral_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- spiritual_assessments
CREATE TABLE IF NOT EXISTS public.spiritual_assessments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  assessor_id UUID NOT NULL,
  faith_life  INTEGER DEFAULT 0,
  prayer_life INTEGER DEFAULT 0,
  bible_knowledge INTEGER DEFAULT 0,
  service     INTEGER DEFAULT 0,
  evangelism  INTEGER DEFAULT 0,
  fellowship  INTEGER DEFAULT 0,
  stewardship INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.spiritual_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_admin_all" ON public.spiritual_assessments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- spiritual_evaluations
CREATE TABLE IF NOT EXISTS public.spiritual_evaluations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  evaluator_id UUID NOT NULL,
  answers     JSONB NOT NULL DEFAULT '[]',
  score       INTEGER DEFAULT 0,
  wants_interview BOOLEAN NOT NULL DEFAULT false,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.spiritual_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "se_admin_all" ON public.spiritual_evaluations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- impact_counters
CREATE TABLE IF NOT EXISTS public.impact_counters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric      TEXT NOT NULL UNIQUE,
  value       BIGINT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.impact_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_public_select" ON public.impact_counters FOR SELECT USING (true);
CREATE POLICY "ic_admin_all" ON public.impact_counters FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- mission_reports
CREATE TABLE IF NOT EXISTS public.mission_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  mission_type TEXT NOT NULL DEFAULT 'evangelisation' CHECK (mission_type IN ('evangelisation','social','formation','autre')),
  date        DATE NOT NULL,
  location    TEXT,
  participants INTEGER DEFAULT 0,
  results     TEXT,
  photos      TEXT[] DEFAULT ARRAY[]::TEXT[],
  author_id   UUID NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','published','archived')),
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mr_public_select" ON public.mission_reports FOR SELECT USING (status IN ('published','reviewed'));
CREATE POLICY "mr_admin_all" ON public.mission_reports FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- mission_finances
CREATE TABLE IF NOT EXISTS public.mission_finances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id    UUID REFERENCES public.mission_reports(id) ON DELETE SET NULL,
  category      TEXT NOT NULL DEFAULT 'transport' CHECK (category IN ('transport','hebergement','nourriture','materiel','autre')),
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_finances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mf_admin_all" ON public.mission_finances FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- event_assignments
CREATE TABLE IF NOT EXISTS public.event_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  event_id    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'participant',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ea_user ON public.event_assignments(user_id);
ALTER TABLE public.event_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ea_public_select" ON public.event_assignments FOR SELECT USING (true);
CREATE POLICY "ea_admin_all" ON public.event_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- event_minutes
CREATE TABLE IF NOT EXISTS public.event_minutes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         TEXT NOT NULL,
  time_slot        TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  responsible_id   UUID,
  responsible_name TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_completed     BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emin_event ON public.event_minutes(event_id);
ALTER TABLE public.event_minutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emin_public_select" ON public.event_minutes FOR SELECT USING (true);
CREATE POLICY "emin_admin_all" ON public.event_minutes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- newsletters
CREATE TABLE IF NOT EXISTS public.newsletters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  subject     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','scheduled','archived')),
  sent_at     TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_by  UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nl_public_select" ON public.newsletters FOR SELECT USING (status IN ('sent','scheduled'));
CREATE POLICY "nl_admin_all" ON public.newsletters FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- member_testimonies
CREATE TABLE IF NOT EXISTS public.member_testimonies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL,
  content     TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general','conversion','guerison','miracle','providence','autre')),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','published')),
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.member_testimonies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_public_read" ON public.member_testimonies FOR SELECT USING (status = 'published');
CREATE POLICY "mt_admin_all" ON public.member_testimonies FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- cellules_maison
CREATE TABLE IF NOT EXISTS public.cellules_maison (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  leader_name TEXT,
  leader_id   UUID,
  address     TEXT,
  day_of_week TEXT NOT NULL DEFAULT 'mercredi' CHECK (day_of_week IN ('lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche')),
  time        TEXT NOT NULL DEFAULT '18:00',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  members_count INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cellules_maison ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_public_select" ON public.cellules_maison FOR SELECT USING (is_active = true);
CREATE POLICY "cm_admin_all" ON public.cellules_maison FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL,
  sender_name TEXT NOT NULL,
  content     TEXT NOT NULL,
  channel     TEXT NOT NULL DEFAULT 'general',
  department_id UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_public_read" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_member_insert" ON public.chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid())
);

-- communication_messages
CREATE TABLE IF NOT EXISTS public.communication_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  channel       TEXT NOT NULL DEFAULT 'general' CHECK (channel IN ('general','departement','communaute','urgent','admin')),
  target_type   TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all','department','role','custom')),
  target_id     UUID,
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent','archived')),
  sent_at       TIMESTAMPTZ,
  scheduled_at  TIMESTAMPTZ,
  created_by    UUID NOT NULL,
  department_id UUID,
  category      TEXT NOT NULL DEFAULT 'info',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cmsg_public_read" ON public.communication_messages FOR SELECT USING (status = 'sent');
CREATE POLICY "cmsg_admin_all" ON public.communication_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- media_library
CREATE TABLE IF NOT EXISTS public.media_library (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT 'video' CHECK (type IN ('video','audio','image','document')),
  url           TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_sec  INTEGER,
  category      TEXT NOT NULL DEFAULT 'general',
  tags          TEXT[] DEFAULT ARRAY[]::TEXT[],
  department_id UUID,
  access_role   TEXT NOT NULL DEFAULT 'public' CHECK (access_role IN ('public','member','leader','admin')),
  is_featured   BOOLEAN NOT NULL DEFAULT false,
  published_at  TIMESTAMPTZ,
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ml_public_read" ON public.media_library FOR SELECT USING (
  (access_role = 'public' AND published_at IS NOT NULL)
);
CREATE POLICY "ml_admin_all" ON public.media_library FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW: v_evangelism_stats (sans BEGIN/COMMIT)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_evangelism_stats AS
SELECT
  (SELECT COUNT(*) FROM evangelism_outings WHERE status != 'annulee')::int AS total_outings,
  (SELECT COUNT(*) FROM evangelism_contacts)::int AS total_contacts,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE decision IN ('accepte_christ', 'veut_venir_eglise'))::int AS decisions,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE status = 'integre_eglise')::int AS integrated,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE came_to_culte = true)::int AS came_to_culte,
  (SELECT COUNT(*) FROM evangelism_followups
    WHERE completed_at IS NOT NULL)::int AS followups_done,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE status IN ('a_contacter', 'contacte', 'en_suivi'))::int AS active_followups,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE baptized = true)::int AS baptized,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE pipeline_stage = 'nouveau_contact')::int AS new_visitors,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE rdv_status = 'planifie')::int AS rdv_pending,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE discipleship_start_date IS NOT NULL)::int AS in_discipleship,
  (SELECT COUNT(*) FROM evangelism_contacts
    WHERE rdv_status = 'realise')::int AS rdv_completed;

-- ═══════════════════════════════════════════════════════════════════════════════
-- REALTIME: Enable realtime for chat_messages
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;