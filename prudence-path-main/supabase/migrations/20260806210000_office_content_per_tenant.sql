-- Phase 3: Office content in DB (rules, timetable, pro requirements) per tenant

CREATE TABLE IF NOT EXISTS public.office_rule_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  category text NOT NULL,
  items text[] NOT NULL DEFAULT '{}'::text[],
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.office_timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  time_label text NOT NULL,
  activity text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.office_pro_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  icon_key text NOT NULL DEFAULT 'target',
  details text[] NOT NULL DEFAULT '{}'::text[],
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.office_content_meta (
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  page text NOT NULL CHECK (page IN ('rules', 'timetable', 'pro_requirements')),
  subtitle text,
  notice_text text,
  footer_text text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (office_id, page)
);

CREATE INDEX IF NOT EXISTS office_rule_sections_office_idx ON public.office_rule_sections (office_id, sort_order);
CREATE INDEX IF NOT EXISTS office_timetable_slots_office_idx ON public.office_timetable_slots (office_id, sort_order);
CREATE INDEX IF NOT EXISTS office_pro_requirements_office_idx ON public.office_pro_requirements (office_id, sort_order);

ALTER TABLE public.office_rule_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_pro_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_content_meta ENABLE ROW LEVEL SECURITY;

-- Read: approved members in same office (or super_admin)
CREATE POLICY "Members can view office rule sections"
  ON public.office_rule_sections FOR SELECT TO authenticated
  USING (
    public.user_can_access_office(office_id)
    AND public.is_approved(auth.uid())
  );

CREATE POLICY "Members can view office timetable slots"
  ON public.office_timetable_slots FOR SELECT TO authenticated
  USING (
    public.user_can_access_office(office_id)
    AND public.is_approved(auth.uid())
  );

CREATE POLICY "Members can view office pro requirements"
  ON public.office_pro_requirements FOR SELECT TO authenticated
  USING (
    public.user_can_access_office(office_id)
    AND public.is_approved(auth.uid())
  );

CREATE POLICY "Members can view office content meta"
  ON public.office_content_meta FOR SELECT TO authenticated
  USING (
    public.user_can_access_office(office_id)
    AND public.is_approved(auth.uid())
  );

-- Manage: office_admin or super_admin in office
CREATE POLICY "Admins manage office rule sections"
  ON public.office_rule_sections FOR ALL TO authenticated
  USING (
    public.user_can_access_office(office_id)
    AND (
      public.is_admin(auth.uid())
      OR public.user_is_office_admin(auth.uid(), office_id)
    )
  )
  WITH CHECK (
    public.user_can_access_office(office_id)
    AND (
      public.is_admin(auth.uid())
      OR public.user_is_office_admin(auth.uid(), office_id)
    )
  );

CREATE POLICY "Admins manage office timetable slots"
  ON public.office_timetable_slots FOR ALL TO authenticated
  USING (
    public.user_can_access_office(office_id)
    AND (
      public.is_admin(auth.uid())
      OR public.user_is_office_admin(auth.uid(), office_id)
    )
  )
  WITH CHECK (
    public.user_can_access_office(office_id)
    AND (
      public.is_admin(auth.uid())
      OR public.user_is_office_admin(auth.uid(), office_id)
    )
  );

CREATE POLICY "Admins manage office pro requirements"
  ON public.office_pro_requirements FOR ALL TO authenticated
  USING (
    public.user_can_access_office(office_id)
    AND (
      public.is_admin(auth.uid())
      OR public.user_is_office_admin(auth.uid(), office_id)
    )
  )
  WITH CHECK (
    public.user_can_access_office(office_id)
    AND (
      public.is_admin(auth.uid())
      OR public.user_is_office_admin(auth.uid(), office_id)
    )
  );

CREATE POLICY "Admins manage office content meta"
  ON public.office_content_meta FOR ALL TO authenticated
  USING (
    public.user_can_access_office(office_id)
    AND (
      public.is_admin(auth.uid())
      OR public.user_is_office_admin(auth.uid(), office_id)
    )
  )
  WITH CHECK (
    public.user_can_access_office(office_id)
    AND (
      public.is_admin(auth.uid())
      OR public.user_is_office_admin(auth.uid(), office_id)
    )
  );

-- Clone office content from template office (used by provisioning)
CREATE OR REPLACE FUNCTION public.clone_office_content(
  p_source_office_id uuid,
  p_target_office_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_source_office_id IS NULL OR p_target_office_id IS NULL THEN
    RAISE EXCEPTION 'Source and target office ids are required';
  END IF;

  INSERT INTO public.office_rule_sections (office_id, category, items, sort_order)
  SELECT p_target_office_id, category, items, sort_order
  FROM public.office_rule_sections
  WHERE office_id = p_source_office_id;

  INSERT INTO public.office_timetable_slots (office_id, time_label, activity, description, sort_order)
  SELECT p_target_office_id, time_label, activity, description, sort_order
  FROM public.office_timetable_slots
  WHERE office_id = p_source_office_id;

  INSERT INTO public.office_pro_requirements (office_id, title, description, icon_key, details, sort_order)
  SELECT p_target_office_id, title, description, icon_key, details, sort_order
  FROM public.office_pro_requirements
  WHERE office_id = p_source_office_id;

  INSERT INTO public.office_content_meta (office_id, page, subtitle, notice_text, footer_text, extra)
  SELECT p_target_office_id, page, subtitle, notice_text, footer_text, extra
  FROM public.office_content_meta
  WHERE office_id = p_source_office_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clone_office_content(uuid, uuid) TO authenticated;

-- Seed Office #1 (Prudence) from legacy hardcoded content
DO $$
DECLARE
  v_office_id uuid;
BEGIN
  SELECT id INTO v_office_id FROM public.offices WHERE slug = 'prudence' LIMIT 1;
  IF v_office_id IS NULL THEN
    RAISE EXCEPTION 'Office #1 (prudence) not found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.office_rule_sections WHERE office_id = v_office_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.office_content_meta (office_id, page, subtitle, notice_text, footer_text, extra)
  VALUES
    (
      v_office_id,
      'rules',
      'Guidelines and expectations for all members of THE PRUDENCE',
      'All members are expected to read, understand, and comply with these rules. Failure to follow these guidelines may result in account restrictions or deactivation.',
      'For questions or clarifications about these rules, please contact your assigned trainer or administrator.',
      '{}'::jsonb
    ),
    (
      v_office_id,
      'timetable',
      'Recommended daily schedule for THE PRUDENCE members',
      NULL,
      NULL,
      jsonb_build_object(
        'notes', jsonb_build_array(
          'Mandatory: This timetable must be followed by everyone in the office.',
          'Daily Reports: Must be submitted before 11:59 PM (Nigeria time). Submissions are locked after this time.',
          'Punctuality: Late coming starts by 9:15am (10 frog jumps per min or #50 per min).',
          'Daily Todo: All daily todos must be written/submitted on the website before 9am.'
        )
      )
    ),
    (
      v_office_id,
      'pro_requirements',
      'Requirements and criteria to become a Pro member in THE PRUDENCE',
      'Pro members have demonstrated exceptional commitment, consistency, and skill development. They are granted additional privileges including the ability to verify submissions and provide feedback to members within their assigned group.',
      'For questions about Pro requirements or to check your progress, please contact your assigned trainer.',
      jsonb_build_object(
        'privileges', jsonb_build_array(
          'Verify Submissions: Review and verify daily activity submissions for members in your assigned group',
          'Provide Feedback: Add comments and feedback on member submissions',
          'Section-by-Section Verification: Verify individual sections of daily activities',
          'Group Management: View and manage submissions for members in your assigned group'
        )
      )
    );

  INSERT INTO public.office_rule_sections (office_id, category, items, sort_order) VALUES
    (v_office_id, 'General Office Rules', ARRAY[
      'Be God-fearing ✅',
      'Respect each other (no use of abusive words) ✅',
      'Respect all leaders ✅',
      'All daily todo must be written/submitted on the website before 9am - 50 frog jumps',
      'If there are any arguments, report them to management instead of making judgments yourself 👍',
      'Late coming starts by 9:15am (10 frog jumps per min or #50 per min)‼️',
      'It is now prohibited for non-pros to create accounts on other services not related to their skills',
      'Failure to do your assignment will result in punishment or fine',
      'No newbie is permitted to open an account until they get to the appropriate training',
      'The timetable is to be followed by everyone',
      'All pros and trainers should do their duties diligently',
      'All members must learn a skill and become a pro',
      'Laziness won''t be tolerated 🚫',
      'No selfishness or withholding important information related to work ❌',
      'No fraudulent activities will be tolerated ❌',
      'Team leaders must be aware of all payments ✅',
      'Maintain professionalism in dress and behavior 👔',
      'A Pro or Distributor must not wear slippers or slides to the office ❌ - Will be seized for at least a week',
      'Keep your workspace clean and organized 🧹',
      'Office property must be handled with care – any damages must be reported immediately ⚠️',
      'No unnecessary visitors or personal guests during work hours 🚷',
      'No use of office internet or resources for inappropriate activities ❌',
      'Confidential company information must not be shared outside the office 🔒',
      'Respect office hierarchy and follow assigned duties diligently 📌',
      'Follow proper procedures for taking leave – unauthorized absences will not be tolerated 🚨',
      'You must not leave the office without informing any of the leaders 🚫',
      'If you won''t be present in the office on a particular day, you must inform the leaders - 2k fine per absence or 500 frog jumps',
      'No pressing of phones during training 📵 (your phone will be seized till the training is completed)',
      'Never disrupt a training session, no matter who is conducting it ❌ (20 frog jumps)',
      'It is now prohibited to enter Sir Niyor''s office unless you are called inside 🚷 - 1k fine if caught',
      'If you have a tip, information, or update that will benefit others, you must share it. Failure to do so, if caught, will result in discipline ⚠️'
    ], 1),
    (v_office_id, 'Attendance & Punctuality', ARRAY[
      'All members must be present and on time for daily activities',
      'Late arrivals must be reported to your trainer or group leader',
      'Absences require prior approval from your assigned trainer',
      'Consistent attendance is mandatory for skill development'
    ], 2),
    (v_office_id, 'Daily Reporting', ARRAY[
      'Submit daily activity reports before 11:59 PM (Nigeria time)',
      'All submissions are locked after 11:59 PM - no late submissions accepted',
      'Provide accurate and detailed information in all report sections',
      'Include proof images where required (reading, skills, etc.)',
      'Daily todos must be completed and submitted on time'
    ], 3),
    (v_office_id, 'Skill Development', ARRAY[
      'Mandatory skills (Digital Marketing, Prompt Engineering) must be completed',
      'Optional skills can be selected based on interest and career goals',
      'Follow training plans and complete all assigned modules',
      'Track your progress and update status regularly',
      'Seek help from assigned trainers when needed'
    ], 4),
    (v_office_id, 'Communication', ARRAY[
      'Maintain professional communication at all times',
      'Respond to trainer feedback and verification comments promptly',
      'Use appropriate channels for questions and support',
      'Respect group discussions and team interactions'
    ], 5),
    (v_office_id, 'Accountability', ARRAY[
      'Take responsibility for your daily activities and submissions',
      'Be honest in all reports and documentation',
      'Maintain consistency in your work and learning',
      'Follow through on commitments and goals'
    ], 6),
    (v_office_id, 'Team & Group Dynamics', ARRAY[
      'Respect your assigned group and group members',
      'Collaborate effectively with team members',
      'Support fellow members in their learning journey',
      'Follow group-specific guidelines set by your trainer'
    ], 7),
    (v_office_id, 'Role Responsibilities', ARRAY[
      'Members: Complete daily activities, follow training plans, maintain consistency',
      'Pros: Support group members, provide guidance within your group scope',
      'Sponsors: Track downlines, provide mentorship and support',
      'Trainers: Verify submissions, provide feedback, manage groups',
      'Super Admins: Oversee system operations and team management'
    ], 8),
    (v_office_id, 'Consequences', ARRAY[
      'Repeated late or missing submissions may result in account review',
      'Failure to complete mandatory skills may delay progression',
      'Violation of rules may result in account restrictions or deactivation',
      'Consistent performance is required for continued access',
      'FAILURE TO COMPLY WITH ANY OF THE ABOVE RULES WILL RESULT IN A FINE OR EXPULSION 💯💯💯'
    ], 9);

  INSERT INTO public.office_timetable_slots (office_id, time_label, activity, description, sort_order) VALUES
    (v_office_id, '9:00 AM - 11:00 AM', 'General Training', 'General training sessions for all members', 1),
    (v_office_id, '11:01 AM - 11:30 AM', 'Break Time', 'Break period for rest and refreshment', 2),
    (v_office_id, '11:31 AM - 1:00 PM', 'Skill Acquisition', 'Focus on learning and developing your chosen skills', 3),
    (v_office_id, '1:01 PM - 3:00 PM', 'Personal Activities', 'Time for personal work and individual tasks', 4),
    (v_office_id, '3:01 PM - 3:30 PM', 'Neolife Basics', 'Learning and understanding Neolife fundamentals', 5),
    (v_office_id, '3:31 PM - 4:00 PM', 'General Book Reading', 'Dedicated time for reading and learning from books', 6),
    (v_office_id, '4:00 PM - 4:30 PM', 'Personal Activities', 'Continue with personal work and tasks', 7),
    (v_office_id, '4:31 PM - 5:00 PM', 'To Do Reviewing', 'Review and assess daily todos and tasks', 8);

  INSERT INTO public.office_pro_requirements (office_id, title, description, icon_key, details, sort_order) VALUES
    (v_office_id, 'Complete 3 Books', 'Read and complete three books as part of your development', 'book', ARRAY[
      'Select books relevant to your skill development or personal growth',
      'Complete reading and demonstrate understanding',
      'Document your progress and key learnings',
      'Books must be approved by your trainer'
    ], 1),
    (v_office_id, 'Become a Pro at a Skill', 'Master and become proficient in at least one skill', 'target', ARRAY[
      'Complete mandatory skills (Digital Marketing, Prompt Engineering)',
      'Select and complete one optional skill',
      'Demonstrate proficiency through practical work',
      'Update skill status to ''Completed Training'''
    ], 2),
    (v_office_id, 'Portfolio Website', 'Create a portfolio website showcasing your work', 'star', ARRAY[
      'Build a portfolio website for your chosen skill',
      'Include at least 3-5 standard works/projects',
      'Website must be live and accessible',
      'Showcase your best work and capabilities'
    ], 3),
    (v_office_id, 'Understand Neolife Basics', 'Complete understanding of all Neolife fundamentals', 'check', ARRAY[
      'Learn all Neolife basics and principles',
      'Demonstrate understanding through assessments',
      'Apply Neolife knowledge in your work',
      'Complete all required Neolife training modules'
    ], 4),
    (v_office_id, 'Be Active and Punctual', 'Maintain consistent activity and punctuality', 'clock', ARRAY[
      'Maintain high attendance and punctuality',
      'Submit daily reports consistently and on time',
      'Participate actively in all office activities',
      'Follow the office timetable diligently'
    ], 5);
END $$;

-- Extend provisioning to clone office content
CREATE OR REPLACE FUNCTION public.provision_office_from_application(
  p_application_id uuid,
  p_slug text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.office_applications%ROWTYPE;
  v_template_office_id uuid;
  v_base_slug text;
  v_slug text;
  v_suffix integer := 0;
  v_office_id uuid;
  v_skills_cloned integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can provision offices';
  END IF;

  SELECT * INTO v_app
  FROM public.office_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.provisioned_office_id IS NOT NULL THEN
    RAISE EXCEPTION 'Application already provisioned';
  END IF;

  IF v_app.status NOT IN ('pending', 'contacted') THEN
    RAISE EXCEPTION 'Application status must be pending or contacted to provision';
  END IF;

  SELECT id INTO v_template_office_id
  FROM public.offices
  WHERE slug = 'prudence'
  LIMIT 1;

  IF v_template_office_id IS NULL THEN
    RAISE EXCEPTION 'Template office (prudence) not found';
  END IF;

  v_base_slug := COALESCE(
    NULLIF(lower(trim(p_slug)), ''),
    public.slugify_office_name(v_app.organization_name)
  );

  IF v_base_slug IS NULL OR length(v_base_slug) < 2 THEN
    RAISE EXCEPTION 'Could not derive a valid office slug';
  END IF;

  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM public.offices WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  END LOOP;

  INSERT INTO public.offices (slug, name, status, timezone, plan, settings)
  VALUES (
    v_slug,
    v_app.organization_name,
    'active',
    'Africa/Lagos',
    'free',
    jsonb_build_object(
      'provisioned_from_application', p_application_id,
      'pending_admin_email', lower(trim(v_app.contact_email)),
      'pending_admin_name', v_app.contact_name,
      'application_team_size', v_app.team_size,
      'application_country', v_app.country
    )
  )
  RETURNING id INTO v_office_id;

  INSERT INTO public.skills (
    name, overview, theory, practical, tools, outcomes,
    display_order, is_active, is_mandatory, trainers,
    training_plan_pdf_path, office_id
  )
  SELECT
    s.name, s.overview, s.theory, s.practical, s.tools, s.outcomes,
    s.display_order, s.is_active, s.is_mandatory, s.trainers,
    s.training_plan_pdf_path, v_office_id
  FROM public.skills s
  WHERE s.office_id = v_template_office_id;

  GET DIAGNOSTICS v_skills_cloned = ROW_COUNT;

  PERFORM public.clone_office_content(v_template_office_id, v_office_id);

  UPDATE public.office_applications
  SET
    status = 'approved',
    provisioned_office_id = v_office_id,
    admin_notes = trim(both E'\n' from concat_ws(
      E'\n',
      NULLIF(trim(COALESCE(admin_notes, '')), ''),
      'Provisioned ' || to_char(now(), 'YYYY-MM-DD') || ' as office slug: ' || v_slug
    )),
    updated_at = now()
  WHERE id = p_application_id;

  RETURN jsonb_build_object(
    'office_id', v_office_id,
    'slug', v_slug,
    'name', v_app.organization_name,
    'skills_cloned', v_skills_cloned,
    'pending_admin_email', lower(trim(v_app.contact_email)),
    'signup_path', '/auth?tab=signup&office=' || v_slug
  );
END;
$$;
