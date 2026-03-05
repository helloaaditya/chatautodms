-- Create bucket for automation images (Upload Image in Flow Setup)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'automation-assets',
  'automation-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow authenticated users to upload/update/delete in this bucket (public bucket allows read by URL)
DROP POLICY IF EXISTS "Users can upload automation assets" ON storage.objects;
CREATE POLICY "Users can upload automation assets"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'automation-assets');

DROP POLICY IF EXISTS "Users can update automation assets" ON storage.objects;
CREATE POLICY "Users can update automation assets"
ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'automation-assets');

DROP POLICY IF EXISTS "Users can delete automation assets" ON storage.objects;
CREATE POLICY "Users can delete automation assets"
ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'automation-assets');
