-- Ensure suggestion attachments storage bucket exists + policies are present
-- Idempotent: safe to run multiple times.

-- Create bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('suggestion_attachments', 'suggestion_attachments', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

-- Public read access (bucket is public, but still needs a SELECT policy)
DROP POLICY IF EXISTS "Suggestion attachments are publicly accessible" ON storage.objects;
CREATE POLICY "Suggestion attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'suggestion_attachments');

-- Allow anyone (anon or authed) to upload attachments
DROP POLICY IF EXISTS "Anyone can upload suggestion attachments" ON storage.objects;
CREATE POLICY "Anyone can upload suggestion attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'suggestion_attachments');

-- Only super admins can update/delete attachments
DROP POLICY IF EXISTS "Super admins can update suggestion attachments" ON storage.objects;
CREATE POLICY "Super admins can update suggestion attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'suggestion_attachments' AND public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can delete suggestion attachments" ON storage.objects;
CREATE POLICY "Super admins can delete suggestion attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'suggestion_attachments' AND public.has_role(auth.uid(), 'super_admin'));

