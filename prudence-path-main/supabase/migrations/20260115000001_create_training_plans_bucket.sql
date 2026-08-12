-- Create training-plans storage bucket for skill PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-plans',
  'training-plans',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone authenticated can view training plan PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can upload training plan PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can update training plan PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete training plan PDFs" ON storage.objects;

-- RLS Policy: Anyone authenticated can view PDFs
CREATE POLICY "Anyone authenticated can view training plan PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'training-plans' 
  AND auth.role() = 'authenticated'
);

-- RLS Policy: Only admins can upload PDFs
CREATE POLICY "Only admins can upload training plan PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'training-plans'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'trainer')
  )
);

-- RLS Policy: Only admins can update PDFs
CREATE POLICY "Only admins can update training plan PDFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'training-plans'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'trainer')
  )
)
WITH CHECK (
  bucket_id = 'training-plans'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'trainer')
  )
);

-- RLS Policy: Only admins can delete PDFs
CREATE POLICY "Only admins can delete training plan PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'training-plans'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'trainer')
  )
);
