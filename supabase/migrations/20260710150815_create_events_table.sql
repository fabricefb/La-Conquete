/*
# Create events table for La Conquête church

1. New Tables
- `events`
- `id` (uuid, primary key)
- `title` (text, not null) - event title
- `description` (text, not null) - event description
- `category` (text, not null) - one of: Cultes, Missions, Jeunesse, Communion
- `image_url` (text, not null) - cover image URL
- `event_date` (timestamptz, not null) - when the event takes place
- `location` (text, not null) - venue/location string
- `is_live` (boolean, default false) - whether the event is currently live
- `is_featured` (boolean, default false) - whether to show as featured card
- `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `events`.
- Allow anon + authenticated CRUD since events are public/shared (single-tenant, no auth).

3. Seed Data
- Inserts sample events matching the HTML references.
*/

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('Cultes', 'Missions', 'Jeunesse', 'Communion')),
  image_url text NOT NULL,
  event_date timestamptz NOT NULL,
  location text NOT NULL,
  is_live boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events" ON events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "anon_update_events" ON events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "anon_delete_events" ON events FOR DELETE
  TO anon, authenticated USING (true);

-- Seed sample events
INSERT INTO events (title, description, category, image_url, event_date, location, is_live, is_featured) VALUES
  (
    'La Puissance de la Foi',
    'Rejoignez-nous pour un moment exceptionnel de louange et de proclamation de la parole avec le Pasteur Senior.',
    'Cultes',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAHSztyYLRkE6Wno7wd1do35iq9y47k8UW1BqUh1PeSMSU_wxry7Jsj6AzU_WpdoIeGdbClALALqzfM9O08hW9ShFikcfsLXYgkczOpfJZEqwm4i5o6ky4xunYvdm5C9nO8sQhf4SwWCgCYor6hD9Fwvx6QnuePyDjoE3-PEdHpw8-8RghUQ7Imnpg4s-9i8TpntIlFkAgengmcTNcsJGvTn7HWZ50sRUJzIx0LgwsyN1r2SUR8sU_i1g',
    '2026-07-12 10:00:00+02',
    'Auditorium Principal / En Ligne',
    true,
    true
  ),
  (
    'Impact Night',
    'Une soirée dédiée à la nouvelle génération pour découvrir et cultiver leurs dons spirituels.',
    'Jeunesse',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBFZplf5TonAC191637AvO3ooUu9NvHtkSNfe0OCLUoi6-4NBlXx-kB4xdchsM03804Vrn6xMRSjbnNpfwLFE173L6CUbBnZraRd8-bk1BYWprgTWkEPRePXVu9cgD9kxtaquhZQ9lgXRpajKUBVN333mWMiJLfWHOhXUevJj_cd84Lle5hnyeVMc0QGnuuq7mkMj0vdU5irbFKpayec0QlGmZ9h7Ug8tHjK9OBxh2vTjC56GvZRsT9Yw',
    '2026-07-15 19:00:00+02',
    'Campus Nord',
    false,
    false
  ),
  (
    'Mission Espoir',
    'Expédition humanitaire et spirituelle pour soutenir les communautés rurales.',
    'Missions',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCBrNod5qW_crNGKwsxtRWNszFX9AMpJl850RQeMoSFGXq0-7jTTWxbxgj6QyzufMyYRpI15i5iUE2zzjE_dKK13sb3dtspofxkkG6gzPioKUSL7wcCwQFwUas4PiJx3csaeIVkMkmFExy6pyaTeV42hV6ZJoLZZ98AlY3XpJUe1fBLT6pxKHPl-J3YcZph6o8shc8l9eT4HFVjbZWDiUz8O5G664Xf6KhJbMDlsf0GaheluoJwNzfktg',
    '2026-07-18 08:00:00+02',
    'Communautés Rurales',
    false,
    false
  ),
  (
    'Dîner de Gala',
    'Une soirée de célébration et de levée de fonds pour nos projets de construction.',
    'Communion',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDuMsPAQOrl0hFxnlFc2Nwp_iWN58J6beYqm_Jc3JPrSwHDyMCD31ZdRVIG6uYjKTwySXgcIZ4vdg_FtE1OZ_RksYln6bqyDdQFoTocdkpVC_nHrFW6X3JinOyZQ1WjZ-pt9xMKzqoXQP7j-fTG-W-QBHdyg0UIaJj5_3UEMZj55Qsy9NbwNgxvCM0BZ7HBh_1DY0xCBVvuBJnPK2qsThecn8c2Qr83AUBnBMKmf4XRcp9j6a0J-c-QDA',
    '2026-07-22 20:00:00+02',
    'Salle Polyvalente',
    false,
    false
  )
ON CONFLICT DO NOTHING;
