-- Create the "media" storage bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Allow public reads on all objects in the media bucket
DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
CREATE POLICY "media_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media');

-- Allow public uploads to the media bucket
DROP POLICY IF EXISTS "media_public_upload" ON storage.objects;
CREATE POLICY "media_public_upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'media');

-- Allow public updates (upsert) in the media bucket
DROP POLICY IF EXISTS "media_public_update" ON storage.objects;
CREATE POLICY "media_public_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');

-- Allow public deletes in the media bucket
DROP POLICY IF EXISTS "media_public_delete" ON storage.objects;
CREATE POLICY "media_public_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'media');