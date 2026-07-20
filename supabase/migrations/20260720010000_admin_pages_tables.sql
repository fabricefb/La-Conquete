-- ═══════════════════════════════════════════════════════════════════
-- Admin-controllable pages: new tables
-- ═══════════════════════════════════════════════════════════════════

-- 1. announcements (AnnoncesPage)
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_select" ON public.announcements FOR SELECT USING (is_active = true);
CREATE POLICY "announcements_admin" ON public.announcements FOR ALL USING (auth.uid() IS NOT NULL);

-- 2. communications (CommuniquesPage)
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Général',
  is_active BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "communications_select" ON public.communications FOR SELECT USING (is_active = true);
CREATE POLICY "communications_admin" ON public.communications FOR ALL USING (auth.uid() IS NOT NULL);

-- 3. worship_schedules (CultePage)
CREATE TABLE IF NOT EXISTS public.worship_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day TEXT NOT NULL DEFAULT 'Dimanche',
  time TEXT NOT NULL DEFAULT '09h00',
  label TEXT NOT NULL DEFAULT 'Culte',
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.worship_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_select" ON public.worship_schedules FOR SELECT USING (is_active = true);
CREATE POLICY "ws_admin" ON public.worship_schedules FOR ALL USING (auth.uid() IS NOT NULL);

-- 4. emissions (EmissionsPage)
CREATE TABLE IF NOT EXISTS public.emissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'youtube' CHECK (platform IN ('youtube','facebook','other')),
  schedule TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  host TEXT NOT NULL DEFAULT '',
  is_live BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.emissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emissions_select" ON public.emissions FOR SELECT USING (is_active = true);
CREATE POLICY "emissions_admin" ON public.emissions FOR ALL USING (auth.uid() IS NOT NULL);
