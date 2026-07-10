/*
# Create locations table for church extensions/implantations

## Purpose
Store all church extensions and implantations with GPS coordinates
for display on the interactive map on the Contact page.
Managed through the Admin page.

## Table: locations
- id: UUID primary key
- name: Extension name
- address, city, country: Physical location
- latitude, longitude: GPS coordinates (numeric precision 7 decimal places)
- phone, email: Contact info (nullable)
- service_times: Schedule text (nullable)
- pastor_name: Pastor at this location (nullable)
- is_main: Marks the headquarters
- is_active: Soft visibility toggle
- sort_order: Display ordering
- created_at, updated_at: Timestamps

## Security
- RLS enabled — public read/write (no auth in this app)
- Policies use TO anon, authenticated (no login screen)
*/

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  country text NOT NULL DEFAULT 'RDC',
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  phone text,
  email text,
  service_times text,
  pastor_name text,
  is_main boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_locations" ON locations;
CREATE POLICY "anon_select_locations" ON locations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_locations" ON locations;
CREATE POLICY "anon_insert_locations" ON locations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_locations" ON locations;
CREATE POLICY "anon_update_locations" ON locations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_locations" ON locations;
CREATE POLICY "anon_delete_locations" ON locations FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO locations (name, address, city, country, latitude, longitude, phone, email, service_times, pastor_name, is_main, is_active, sort_order)
VALUES (
  'Eglise Principale La Conquete',
  '520, Av. N''Djamena',
  'Lubumbashi',
  'RDC',
  -11.6876,
  27.4985,
  '+243 844 107 079',
  'egliseevangeliquelaconquete@gmail.com',
  'Dimanche 09h00 & 11h30 | Mardi 19h00 | Jeudi 18h30',
  'Pasteur Jacques-Daniel Kongolo',
  true,
  true,
  0
) ON CONFLICT DO NOTHING;
