-- Office applications from public /apply page (Phase 2 foundation)

CREATE TABLE IF NOT EXISTS public.office_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  country text NOT NULL DEFAULT 'Nigeria',
  team_size text NOT NULL,
  use_case text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'contacted')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS office_applications_status_idx ON public.office_applications (status);
CREATE INDEX IF NOT EXISTS office_applications_created_at_idx ON public.office_applications (created_at DESC);

ALTER TABLE public.office_applications ENABLE ROW LEVEL SECURITY;

-- Public can submit applications (anon + authenticated)
CREATE POLICY "Anyone can submit office application"
  ON public.office_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only super_admin can read and manage applications
CREATE POLICY "Super admin can read office applications"
  ON public.office_applications
  FOR SELECT
  TO authenticated
  USING (public.user_is_super_admin(auth.uid()));

CREATE POLICY "Super admin can update office applications"
  ON public.office_applications
  FOR UPDATE
  TO authenticated
  USING (public.user_is_super_admin(auth.uid()));

COMMENT ON TABLE public.office_applications IS 'Public office signup applications from /apply marketing page';
