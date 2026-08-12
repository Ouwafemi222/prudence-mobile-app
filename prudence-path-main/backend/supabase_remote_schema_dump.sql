-- supabase_remote_schema_dump.sql
-- Project ref: xpvabdfleomjpytvvjux
--
-- Part A: Consolidated SQL from local repo migrations (same content as
--         backend/supabase_full_dump.sql).
--
-- Part B: CREATE OR REPLACE for all functions in schema public, captured from
--         production via pg_get_functiondef (Supabase MCP export, cached in
--         .cursor agent-tools). Re-run after Part A so function bodies match
--         the database snapshot.
--
-- Regeneration: Supabase MCP execute_sql was unavailable in-session; this file
-- was assembled from migrations + cached MCP output. For a fresh pull, use
-- MCP again or: supabase db dump / pg_dump with the database password.
--
-- Schema only (no table data). Edge function source: supabase/backups/...


-- =============================================
-- Part A: Migrations (local)
-- =============================================

-- Supabase full local SQL snapshot
-- Generated from local Supabase migrations
-- Date: 2026-03-24
-- Source directory: supabase/migrations


-- =============================================
-- Migration: 20251231143757_80697c64-8885-4435-a01c-b32e174437dc.sql
-- =============================================

-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'trainer', 'sub_trainer', 'pro', 'sponsor', 'member');

-- Create approval_status enum for user approval workflow
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    sponsor_username TEXT NOT NULL,
    avatar_url TEXT,
    email TEXT,
    approval_status approval_status NOT NULL DEFAULT 'pending',
    assigned_trainer_id UUID,
    assigned_group_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create groups table for team management
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trainer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key to profiles for assigned_group_id after groups table exists
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_assigned_group_id_fkey
FOREIGN KEY (assigned_group_id) REFERENCES public.groups(id) ON DELETE SET NULL;

-- Create daily_activities table for daily reporting
CREATE TABLE public.daily_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Reading & Learning
    pages_read INTEGER DEFAULT 0,
    reading_proof_image TEXT,
    reading_notes TEXT,
    
    -- Gig Creation
    gigs_created INTEGER DEFAULT 0,
    gig_platform TEXT,
    gig_service TEXT,
    gig_link TEXT,
    
    -- Account Creation
    accounts_created INTEGER DEFAULT 0,
    account_platform TEXT,
    account_service TEXT,
    account_country TEXT,
    account_creation_date DATE,
    
    -- Income Tracking
    gross_income DECIMAL(10,2) DEFAULT 0,
    net_income DECIMAL(10,2) DEFAULT 0,
    income_platform TEXT,
    order_type TEXT,
    delivery_days INTEGER,
    work_type TEXT,
    
    -- Prospecting
    daily_contacts INTEGER DEFAULT 0,
    follow_ups INTEGER DEFAULT 0,
    expected_conversions INTEGER DEFAULT 0,
    
    -- Skill Acquisition
    skill_learned TEXT,
    skill_description TEXT,
    skill_proof_image TEXT,
    
    -- Trainer-only fields
    skill_taught TEXT,
    is_theory BOOLEAN DEFAULT false,
    is_practical BOOLEAN DEFAULT false,
    students_trained INTEGER DEFAULT 0,
    training_duration_minutes INTEGER DEFAULT 0,
    submissions_reviewed INTEGER DEFAULT 0,
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_feedback TEXT,
    
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(user_id, activity_date)
);

-- Create weekly_reports table
CREATE TABLE public.weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    
    -- Auto-aggregated data
    total_pages_read INTEGER DEFAULT 0,
    total_gigs_created INTEGER DEFAULT 0,
    total_accounts_created INTEGER DEFAULT 0,
    total_gross_income DECIMAL(10,2) DEFAULT 0,
    total_net_income DECIMAL(10,2) DEFAULT 0,
    total_contacts INTEGER DEFAULT 0,
    total_follow_ups INTEGER DEFAULT 0,
    submission_count INTEGER DEFAULT 0,
    consistency_score DECIMAL(5,2) DEFAULT 0,
    
    -- Reflection prompts
    wins TEXT,
    challenges TEXT,
    lessons_learned TEXT,
    goals_next_week TEXT,
    
    -- Trainer feedback
    trainer_feedback TEXT,
    trainer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(user_id, week_start_date)
);

-- Create monthly_goals table
CREATE TABLE public.monthly_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    month_year DATE NOT NULL, -- First day of the month
    
    -- Goals
    target_pages INTEGER DEFAULT 0,
    target_gigs INTEGER DEFAULT 0,
    target_accounts INTEGER DEFAULT 0,
    target_income DECIMAL(10,2) DEFAULT 0,
    target_contacts INTEGER DEFAULT 0,
    
    -- Actuals (auto-calculated)
    actual_pages INTEGER DEFAULT 0,
    actual_gigs INTEGER DEFAULT 0,
    actual_accounts INTEGER DEFAULT 0,
    actual_income DECIMAL(10,2) DEFAULT 0,
    actual_contacts INTEGER DEFAULT 0,
    
    -- Metrics
    consistency_score DECIMAL(5,2) DEFAULT 0,
    skill_progress_notes TEXT,
    income_summary TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(user_id, month_year)
);

-- Create skills table for Skills Hub
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    overview TEXT,
    theory TEXT,
    practical TEXT,
    tools TEXT,
    outcomes TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'reminder', 'verification', 'summary', 'alert'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to check if user is admin (super_admin or trainer)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('super_admin', 'trainer')
    )
$$;

-- Function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE user_id = _user_id
          AND approval_status = 'approved'
    )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (public.is_admin(auth.uid()));

-- User roles policies (only admins can manage roles)
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.is_admin(auth.uid()));

-- Groups policies
CREATE POLICY "Approved users can view groups"
ON public.groups FOR SELECT
USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage groups"
ON public.groups FOR ALL
USING (public.is_admin(auth.uid()));

-- Daily activities policies
CREATE POLICY "Users can view their own activities"
ON public.daily_activities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activities"
ON public.daily_activities FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own activities"
ON public.daily_activities FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities"
ON public.daily_activities FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any activities"
ON public.daily_activities FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Weekly reports policies
CREATE POLICY "Users can view their own weekly reports"
ON public.weekly_reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all weekly reports"
ON public.weekly_reports FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can manage their own weekly reports"
ON public.weekly_reports FOR ALL
USING (auth.uid() = user_id);

-- Monthly goals policies
CREATE POLICY "Users can view their own monthly goals"
ON public.monthly_goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all monthly goals"
ON public.monthly_goals FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can manage their own monthly goals"
ON public.monthly_goals FOR ALL
USING (auth.uid() = user_id);

-- Skills policies (read-only for all approved users)
CREATE POLICY "Approved users can view skills"
ON public.skills FOR SELECT
USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage skills"
ON public.skills FOR ALL
USING (public.is_admin(auth.uid()));

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON public.groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_activities_updated_at
    BEFORE UPDATE ON public.daily_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_reports_updated_at
    BEFORE UPDATE ON public.weekly_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_goals_updated_at
    BEFORE UPDATE ON public.monthly_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skills_updated_at
    BEFORE UPDATE ON public.skills
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, username, sponsor_username, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'username', ''),
        COALESCE(NEW.raw_user_meta_data->>'sponsor_username', ''),
        NEW.email
    );
    
    -- Assign default 'member' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to call handle_new_user on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- =============================================
-- Migration: 20251231144207_c078313e-772b-4fb0-b18b-a5bdc75b7bce.sql
-- =============================================

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public access to avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Create policy for authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);


-- =============================================
-- Migration: 20260109110000_fix_nigeria_timezone_dates_and_weekstart.sql
-- =============================================

-- Ensure all "today/week/month" calculations align with Nigeria time (Africa/Lagos)
-- and fix weekly start logic to Monday (ISO week).

CREATE OR REPLACE FUNCTION public.is_submission_locked(p_activity_date date)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_lock_time timestamptz;
BEGIN
  -- Lock time is 10 PM Nigeria time (WAT) on the activity date
  v_lock_time := (p_activity_date::timestamp + time '22:00') AT TIME ZONE 'Africa/Lagos';
  RETURN now() >= v_lock_time;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_today_submission_locked()
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN public.is_submission_locked((timezone('Africa/Lagos', now()))::date);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_generate_weekly_report(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  week_start_date date,
  week_end_date date,
  total_pages_read integer,
  total_gigs_created integer,
  total_accounts_created integer,
  total_gross_income numeric,
  total_net_income numeric,
  total_contacts integer,
  total_follow_ups integer,
  submission_count integer,
  consistency_score numeric,
  wins text,
  challenges text,
  lessons_learned text,
  goals_next_week text,
  trainer_feedback text,
  trainer_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date;
  v_week_start_date date;
  v_report_id uuid;
BEGIN
  -- Nigeria "today" (Africa/Lagos)
  v_today := (timezone('Africa/Lagos', now()))::date;

  -- Monday-start week (ISO): isodow Mon=1..Sun=7
  v_week_start_date := v_today - (extract(isodow from v_today)::int - 1);

  -- Generate or update the weekly report
  v_report_id := public.generate_weekly_report(p_user_id, v_week_start_date);

  -- Return the report
  RETURN QUERY
  SELECT
    wr.id,
    wr.user_id,
    wr.week_start_date,
    wr.week_end_date,
    wr.total_pages_read,
    wr.total_gigs_created,
    wr.total_accounts_created,
    wr.total_gross_income,
    wr.total_net_income,
    wr.total_contacts,
    wr.total_follow_ups,
    wr.submission_count,
    wr.consistency_score,
    wr.wins,
    wr.challenges,
    wr.lessons_learned,
    wr.goals_next_week,
    wr.trainer_feedback,
    wr.trainer_id,
    wr.created_at,
    wr.updated_at
  FROM public.weekly_reports wr
  WHERE wr.id = v_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_generate_monthly_goal(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  month_year date,
  target_pages integer,
  target_gigs integer,
  target_accounts integer,
  target_income numeric,
  target_contacts integer,
  actual_pages integer,
  actual_gigs integer,
  actual_accounts integer,
  actual_income numeric,
  actual_contacts integer,
  consistency_score numeric,
  skill_progress_notes text,
  income_summary text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date;
  v_month_start date;
  v_goal_id uuid;
BEGIN
  -- Nigeria "today" (Africa/Lagos)
  v_today := (timezone('Africa/Lagos', now()))::date;

  -- First day of current month (Nigeria time)
  v_month_start := date_trunc('month', v_today)::date;

  -- Calculate or update the monthly actuals
  v_goal_id := public.calculate_monthly_actuals(p_user_id, v_month_start);

  -- Return the monthly goal
  RETURN QUERY
  SELECT
    mg.id,
    mg.user_id,
    mg.month_year,
    mg.target_pages,
    mg.target_gigs,
    mg.target_accounts,
    mg.target_income,
    mg.target_contacts,
    mg.actual_pages,
    mg.actual_gigs,
    mg.actual_accounts,
    mg.actual_income,
    mg.actual_contacts,
    mg.consistency_score,
    mg.skill_progress_notes,
    mg.income_summary,
    mg.created_at,
    mg.updated_at
  FROM public.monthly_goals mg
  WHERE mg.id = v_goal_id;
END;
$$;




-- =============================================
-- Migration: 20260109111500_add_activity_comments_and_role_based_submission_visibility.sql
-- =============================================

-- Role-based visibility + comments
-- Rules:
-- - super_admin/trainer: view all submissions, comment on all, verify/update all
-- - sub_trainer: view submissions within their assigned group, comment within group, verify/update within group
-- - pro: view all submissions (read-only)

-- Helper: sub-trainer group access
CREATE OR REPLACE FUNCTION public.sub_trainer_can_access_user(_sub_trainer_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles st
    JOIN public.profiles target
      ON target.assigned_group_id = st.assigned_group_id
    WHERE st.user_id = _sub_trainer_id
      AND target.user_id = _target_user_id
      AND st.assigned_group_id IS NOT NULL
  );
$$;

-- Extend profiles visibility
DROP POLICY IF EXISTS "Pros can view all profiles" ON public.profiles;
CREATE POLICY "Pros can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'pro'));

DROP POLICY IF EXISTS "Sub-trainers can view group profiles" ON public.profiles;
CREATE POLICY "Sub-trainers can view group profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'sub_trainer')
  AND public.sub_trainer_can_access_user(auth.uid(), user_id)
);

-- Extend daily_activities visibility
DROP POLICY IF EXISTS "Pros can view all activities" ON public.daily_activities;
CREATE POLICY "Pros can view all activities"
ON public.daily_activities FOR SELECT
USING (public.has_role(auth.uid(), 'pro'));

DROP POLICY IF EXISTS "Sub-trainers can view group activities" ON public.daily_activities;
CREATE POLICY "Sub-trainers can view group activities"
ON public.daily_activities FOR SELECT
USING (
  public.has_role(auth.uid(), 'sub_trainer')
  AND public.sub_trainer_can_access_user(auth.uid(), user_id)
);

-- Allow sub-trainers to update activities in their group (for verification + feedback)
DROP POLICY IF EXISTS "Sub-trainers can update group activities" ON public.daily_activities;
CREATE POLICY "Sub-trainers can update group activities"
ON public.daily_activities FOR UPDATE
USING (
  public.has_role(auth.uid(), 'sub_trainer')
  AND public.sub_trainer_can_access_user(auth.uid(), user_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS public.activity_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.daily_activities(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;

-- Helper: can current viewer see the activity?
CREATE OR REPLACE FUNCTION public.can_view_activity(_viewer_id uuid, _activity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.daily_activities da
    WHERE da.id = _activity_id
      AND (
        da.user_id = _viewer_id
        OR public.is_admin(_viewer_id)
        OR public.has_role(_viewer_id, 'pro')
        OR (
          public.has_role(_viewer_id, 'sub_trainer')
          AND public.sub_trainer_can_access_user(_viewer_id, da.user_id)
        )
      )
  );
$$;

-- Comments policies
DROP POLICY IF EXISTS "View comments for accessible activities" ON public.activity_comments;
CREATE POLICY "View comments for accessible activities"
ON public.activity_comments FOR SELECT
USING (public.can_view_activity(auth.uid(), activity_id));

DROP POLICY IF EXISTS "Insert comments for accessible activities" ON public.activity_comments;
CREATE POLICY "Insert comments for accessible activities"
ON public.activity_comments FOR INSERT
WITH CHECK (
  author_user_id = auth.uid()
  AND public.can_view_activity(auth.uid(), activity_id)
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'sub_trainer')
    OR EXISTS (
      SELECT 1
      FROM public.daily_activities da
      WHERE da.id = activity_id
        AND da.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Delete own comments (or admin)" ON public.activity_comments;
CREATE POLICY "Delete own comments (or admin)"
ON public.activity_comments FOR DELETE
USING (
  author_user_id = auth.uid()
  OR public.is_admin(auth.uid())
);




-- =============================================
-- Migration: 20260109113000_add_daily_todos_morning_plan.sql
-- =============================================

-- Morning Daily Todo (plan) feature

CREATE TABLE IF NOT EXISTS public.daily_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  todo_date date NOT NULL,
  plan text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, todo_date)
);

ALTER TABLE public.daily_todos ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
DROP TRIGGER IF EXISTS update_daily_todos_updated_at ON public.daily_todos;
CREATE TRIGGER update_daily_todos_updated_at
  BEFORE UPDATE ON public.daily_todos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Policies
DROP POLICY IF EXISTS "Users can view their own daily todos" ON public.daily_todos;
CREATE POLICY "Users can view their own daily todos"
ON public.daily_todos FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own daily todos" ON public.daily_todos;
CREATE POLICY "Users can manage their own daily todos"
ON public.daily_todos FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all daily todos" ON public.daily_todos;
CREATE POLICY "Admins can view all daily todos"
ON public.daily_todos FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Pros can view all daily todos" ON public.daily_todos;
CREATE POLICY "Pros can view all daily todos"
ON public.daily_todos FOR SELECT
USING (public.has_role(auth.uid(), 'pro'));

DROP POLICY IF EXISTS "Sub-trainers can view group daily todos" ON public.daily_todos;
CREATE POLICY "Sub-trainers can view group daily todos"
ON public.daily_todos FOR SELECT
USING (
  public.has_role(auth.uid(), 'sub_trainer')
  AND public.sub_trainer_can_access_user(auth.uid(), user_id)
);




-- =============================================
-- Migration: 20260109114500_add_other_activities_to_daily_activities.sql
-- =============================================

ALTER TABLE public.daily_activities
ADD COLUMN IF NOT EXISTS other_activities text;




-- =============================================
-- Migration: 20260109120000_add_income_payment_type_and_methods.sql
-- =============================================

ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS outside_payment_method text,
  ADD COLUMN IF NOT EXISTS outside_payment_method_other text,
  ADD COLUMN IF NOT EXISTS fiverr_fee numeric;




-- =============================================
-- Migration: 20260109121500_add_recursive_sponsor_downlines.sql
-- =============================================

-- Recursive sponsor downlines (downline of downline ...)

CREATE OR REPLACE FUNCTION public.get_sponsor_downlines(p_sponsor_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  sponsor_username text,
  depth integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT
      p.user_id,
      p.username,
      p.sponsor_username,
      1 AS depth,
      ARRAY[p.username]::text[] AS path
    FROM public.profiles p
    WHERE p.sponsor_username = (
      SELECT s.username
      FROM public.profiles s
      WHERE s.user_id = p_sponsor_user_id
      LIMIT 1
    )

    UNION ALL

    SELECT
      c.user_id,
      c.username,
      c.sponsor_username,
      t.depth + 1 AS depth,
      t.path || c.username
    FROM public.profiles c
    JOIN tree t ON c.sponsor_username = t.username
    WHERE NOT (c.username = ANY(t.path))
  )
  SELECT user_id, username, sponsor_username, depth
  FROM tree;
$$;

CREATE OR REPLACE FUNCTION public.sponsor_can_access_user(_sponsor_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _sponsor_user_id = _target_user_id
    OR EXISTS (
      SELECT 1
      FROM public.get_sponsor_downlines(_sponsor_user_id) d
      WHERE d.user_id = _target_user_id
    )
  );
$$;

-- Profiles: sponsors can view their full downline tree
DROP POLICY IF EXISTS "Sponsors can view downline profiles" ON public.profiles;
CREATE POLICY "Sponsors can view downline profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- Daily activities: sponsors can view activities for their tree
DROP POLICY IF EXISTS "Sponsors can view downline activities" ON public.daily_activities;
CREATE POLICY "Sponsors can view downline activities"
ON public.daily_activities FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- Roles: sponsors can view roles for their tree
DROP POLICY IF EXISTS "Sponsors can view downline roles" ON public.user_roles;
CREATE POLICY "Sponsors can view downline roles"
ON public.user_roles FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- Todos: sponsors can view daily todos for their tree
DROP POLICY IF EXISTS "Sponsors can view downline daily todos" ON public.daily_todos;
CREATE POLICY "Sponsors can view downline daily todos"
ON public.daily_todos FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);




-- =============================================
-- Migration: 20260109123000_add_anonymous_suggestions.sql
-- =============================================

-- Anonymous suggestions

CREATE TABLE IF NOT EXISTS public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon or authed) to insert. If authed, we store user_id automatically.
DROP POLICY IF EXISTS "Anyone can submit suggestions" ON public.suggestions;
CREATE POLICY "Anyone can submit suggestions"
ON public.suggestions FOR INSERT
WITH CHECK (true);

-- Only admins can view
DROP POLICY IF EXISTS "Admins can view suggestions" ON public.suggestions;
CREATE POLICY "Admins can view suggestions"
ON public.suggestions FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only admins can delete
DROP POLICY IF EXISTS "Admins can delete suggestions" ON public.suggestions;
CREATE POLICY "Admins can delete suggestions"
ON public.suggestions FOR DELETE
USING (public.is_admin(auth.uid()));

-- Trigger to set user_id when authenticated
CREATE OR REPLACE FUNCTION public.set_suggestion_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_suggestion_user_id_trigger ON public.suggestions;
CREATE TRIGGER set_suggestion_user_id_trigger
BEFORE INSERT ON public.suggestions
FOR EACH ROW
EXECUTE FUNCTION public.set_suggestion_user_id();




-- =============================================
-- Migration: 20260109130000_add_cancelled_orders_and_section_verification.sql
-- =============================================

-- Cancelled orders tracking (income)
ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS cancelled_orders_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_order_amount_received numeric DEFAULT 0;

-- Section-based verification
CREATE TABLE IF NOT EXISTS public.activity_section_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.daily_activities(id) ON DELETE CASCADE,
  section text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  feedback text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(activity_id, section)
);

ALTER TABLE public.activity_section_verifications ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
DROP TRIGGER IF EXISTS update_activity_section_verifications_updated_at ON public.activity_section_verifications;
CREATE TRIGGER update_activity_section_verifications_updated_at
  BEFORE UPDATE ON public.activity_section_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure default section rows exist when a daily activity is created
CREATE OR REPLACE FUNCTION public.ensure_activity_section_verifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sections text[] := ARRAY['reading','gigs','accounts','income','prospecting','skills','other','training'];
  s text;
BEGIN
  FOREACH s IN ARRAY sections LOOP
    INSERT INTO public.activity_section_verifications(activity_id, section, status)
    VALUES (NEW.id, s, 'pending')
    ON CONFLICT (activity_id, section) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_activity_section_verifications_trigger ON public.daily_activities;
CREATE TRIGGER ensure_activity_section_verifications_trigger
AFTER INSERT ON public.daily_activities
FOR EACH ROW
EXECUTE FUNCTION public.ensure_activity_section_verifications();

-- Sync overall verification fields from section statuses
CREATE OR REPLACE FUNCTION public.sync_activity_verification_from_sections()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id uuid;
  v_any_rejected boolean;
  v_all_approved boolean;
  v_any_rows boolean;
BEGIN
  v_activity_id := COALESCE(NEW.activity_id, OLD.activity_id);

  SELECT
    (COUNT(*) > 0),
    COALESCE(BOOL_OR(status = 'rejected'), false),
    COALESCE(BOOL_AND(status = 'approved'), false)
  INTO v_any_rows, v_any_rejected, v_all_approved
  FROM public.activity_section_verifications
  WHERE activity_id = v_activity_id;

  IF NOT v_any_rows THEN
    -- No sections: treat as pending
    UPDATE public.daily_activities
    SET is_verified = false,
        verified_at = NULL,
        verified_by = NULL
    WHERE id = v_activity_id;
    RETURN NULL;
  END IF;

  IF v_any_rejected THEN
    UPDATE public.daily_activities
    SET is_verified = false,
        verified_at = now(),
        verified_by = auth.uid(),
        verification_feedback = COALESCE(verification_feedback, 'See section feedback')
    WHERE id = v_activity_id;
  ELSIF v_all_approved THEN
    UPDATE public.daily_activities
    SET is_verified = true,
        verified_at = now(),
        verified_by = auth.uid(),
        verification_feedback = NULL
    WHERE id = v_activity_id;
  ELSE
    -- Some pending (and none rejected)
    UPDATE public.daily_activities
    SET is_verified = false,
        verified_at = NULL,
        verified_by = NULL
    WHERE id = v_activity_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_activity_verification_from_sections_trigger ON public.activity_section_verifications;
CREATE TRIGGER sync_activity_verification_from_sections_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.activity_section_verifications
FOR EACH ROW
EXECUTE FUNCTION public.sync_activity_verification_from_sections();

-- RLS for section verifications
DROP POLICY IF EXISTS "View section verifications for accessible activities" ON public.activity_section_verifications;
CREATE POLICY "View section verifications for accessible activities"
ON public.activity_section_verifications FOR SELECT
USING (public.can_view_activity(auth.uid(), activity_id));

DROP POLICY IF EXISTS "Upsert section verifications (admins/sub-trainers)" ON public.activity_section_verifications;
CREATE POLICY "Upsert section verifications (admins/sub-trainers)"
ON public.activity_section_verifications FOR INSERT
WITH CHECK (
  public.can_view_activity(auth.uid(), activity_id)
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'sub_trainer')
  )
);

DROP POLICY IF EXISTS "Update section verifications (admins/sub-trainers)" ON public.activity_section_verifications;
CREATE POLICY "Update section verifications (admins/sub-trainers)"
ON public.activity_section_verifications FOR UPDATE
USING (
  public.can_view_activity(auth.uid(), activity_id)
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'sub_trainer')
  )
);




-- =============================================
-- Migration: 20260109140000_add_other_activities_proof_image.sql
-- =============================================

-- Add proof image for Other Activities

ALTER TABLE public.daily_activities
ADD COLUMN IF NOT EXISTS other_activities_proof_image text;




-- =============================================
-- Migration: 20260109141000_suggestions_images_and_super_admin_only.sql
-- =============================================

-- Suggestions: allow images and restrict admin access to SUPER ADMIN only

ALTER TABLE public.suggestions
ADD COLUMN IF NOT EXISTS image_paths text[] NULL;

-- Tighten access: super_admin only (not trainer)
DROP POLICY IF EXISTS "Admins can view suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Admins can delete suggestions" ON public.suggestions;

CREATE POLICY "Super admins can view suggestions"
ON public.suggestions FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete suggestions"
ON public.suggestions FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));




-- =============================================
-- Migration: 20260109141500_add_suggestion_attachments_bucket.sql
-- =============================================

-- Storage bucket for suggestion attachments (public read, anon upload, super_admin manage)

INSERT INTO storage.buckets (id, name, public)
VALUES ('suggestion_attachments', 'suggestion_attachments', true)
ON CONFLICT (id) DO NOTHING;

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




-- =============================================
-- Migration: 20260111120000_fix_suggestion_attachments_bucket.sql
-- =============================================

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



-- =============================================
-- Migration: 20260114143000_remove_sub_trainer_and_scope_pro_to_group.sql
-- =============================================

-- Remove sub_trainer role entirely and scope "pro" access to same-group only.
--
-- New rules:
-- - super_admin/trainer: full admin visibility + verification
-- - pro: can view submissions + todos + profiles of members in the same assigned_group_id and can comment within that scope
-- - sponsor: unchanged (downline scoped via sponsor_can_access_user)
-- - member: self only

-- 1) Drop policies/functions that reference sub_trainer (must happen before enum change)
DROP POLICY IF EXISTS "Sub-trainers can view group profiles" ON public.profiles;
DROP POLICY IF EXISTS "Sub-trainers can view group activities" ON public.daily_activities;
DROP POLICY IF EXISTS "Sub-trainers can update group activities" ON public.daily_activities;
DROP POLICY IF EXISTS "Sub-trainers can view group daily todos" ON public.daily_todos;

DROP POLICY IF EXISTS "Upsert section verifications (admins/sub-trainers)" ON public.activity_section_verifications;
DROP POLICY IF EXISTS "Update section verifications (admins/sub-trainers)" ON public.activity_section_verifications;

DROP FUNCTION IF EXISTS public.sub_trainer_can_access_user(uuid, uuid);

-- IMPORTANT: app_role enum swap requires dropping/recreating *all* policies that reference app_role literals.
-- Otherwise they keep dependencies on the old enum OID (and will break function resolution).
DROP POLICY IF EXISTS "Pros can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Sponsors can view downline profiles" ON public.profiles;
DROP POLICY IF EXISTS "Pros can view all activities" ON public.daily_activities;
DROP POLICY IF EXISTS "Sponsors can view downline activities" ON public.daily_activities;
DROP POLICY IF EXISTS "Pros can view all daily todos" ON public.daily_todos;
DROP POLICY IF EXISTS "Sponsors can view downline daily todos" ON public.daily_todos;
DROP POLICY IF EXISTS "Sponsors can view downline roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Super admins can delete suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Super admins can update suggestion attachments" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can delete suggestion attachments" ON storage.objects;

-- Trainer role-management policies: remove sub_trainer from allowed list
DROP POLICY IF EXISTS "Trainers can insert limited roles" ON public.user_roles;
DROP POLICY IF EXISTS "Trainers can update limited roles" ON public.user_roles;
DROP POLICY IF EXISTS "Trainers can delete limited roles" ON public.user_roles;

CREATE POLICY "Trainers can insert limited roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'trainer')
  AND (role = ANY (ARRAY['member'::app_role, 'pro'::app_role, 'sponsor'::app_role]))
);

CREATE POLICY "Trainers can update limited roles"
ON public.user_roles FOR UPDATE
USING (
  public.has_role(auth.uid(), 'trainer')
  AND (role = ANY (ARRAY['member'::app_role, 'pro'::app_role, 'sponsor'::app_role]))
)
WITH CHECK (
  role = ANY (ARRAY['member'::app_role, 'pro'::app_role, 'sponsor'::app_role])
);

CREATE POLICY "Trainers can delete limited roles"
ON public.user_roles FOR DELETE
USING (
  public.has_role(auth.uid(), 'trainer')
  AND (role = ANY (ARRAY['member'::app_role, 'pro'::app_role, 'sponsor'::app_role]))
);

-- 2) Migrate any existing sub_trainer roles to pro (least privilege, group-scoped)
DELETE FROM public.user_roles ur
WHERE ur.role = 'sub_trainer'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id
      AND ur2.role = 'pro'
  );

UPDATE public.user_roles
SET role = 'pro'
WHERE role = 'sub_trainer';

-- 3) Replace enum type to remove sub_trainer
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('super_admin', 'trainer', 'pro', 'sponsor', 'member');

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role
  USING role::text::public.app_role;

-- Recreate has_role() signature so casts keep working after enum swap
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Recreate is_admin() against the new enum type
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('super_admin'::public.app_role, 'trainer'::public.app_role)
    )
$$;

DROP TYPE public.app_role_old;

-- 4) Pro group access helper
CREATE OR REPLACE FUNCTION public.pro_can_access_user(_pro_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles pro
    JOIN public.profiles target
      ON target.assigned_group_id = pro.assigned_group_id
    WHERE pro.user_id = _pro_id
      AND target.user_id = _target_user_id
      AND pro.assigned_group_id IS NOT NULL
      AND pro.approval_status = 'approved'
      AND target.approval_status = 'approved'
  );
$$;

-- 5) Tighten "pro" visibility (profiles)
CREATE POLICY "Pros can view group profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'pro')
  AND public.pro_can_access_user(auth.uid(), user_id)
);

-- Sponsors can view their full downline tree (unchanged semantics)
CREATE POLICY "Sponsors can view downline profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- 6) Tighten "pro" visibility (daily_activities)
CREATE POLICY "Pros can view group activities"
ON public.daily_activities FOR SELECT
USING (
  public.has_role(auth.uid(), 'pro')
  AND public.pro_can_access_user(auth.uid(), user_id)
);

-- Sponsors can view activities for their tree (unchanged semantics)
CREATE POLICY "Sponsors can view downline activities"
ON public.daily_activities FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- 7) Tighten "pro" visibility (daily_todos)
CREATE POLICY "Pros can view group daily todos"
ON public.daily_todos FOR SELECT
USING (
  public.has_role(auth.uid(), 'pro')
  AND public.pro_can_access_user(auth.uid(), user_id)
);

-- Sponsors can view daily todos for their tree (unchanged semantics)
CREATE POLICY "Sponsors can view downline daily todos"
ON public.daily_todos FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- 8) Update can_view_activity() for comments + section-verifications view
CREATE OR REPLACE FUNCTION public.can_view_activity(_viewer_id uuid, _activity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.daily_activities da
    WHERE da.id = _activity_id
      AND (
        da.user_id = _viewer_id
        OR public.is_admin(_viewer_id)
        OR (
          public.has_role(_viewer_id, 'sponsor')
          AND public.sponsor_can_access_user(_viewer_id, da.user_id)
        )
        OR (
          public.has_role(_viewer_id, 'pro')
          AND public.pro_can_access_user(_viewer_id, da.user_id)
        )
      )
  );
$$;

-- 9) Comments: allow pros (group scoped via can_view_activity)
DROP POLICY IF EXISTS "Insert comments for accessible activities" ON public.activity_comments;
CREATE POLICY "Insert comments for accessible activities"
ON public.activity_comments FOR INSERT
WITH CHECK (
  author_user_id = auth.uid()
  AND public.can_view_activity(auth.uid(), activity_id)
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'pro')
    OR EXISTS (
      SELECT 1
      FROM public.daily_activities da
      WHERE da.id = activity_id
        AND da.user_id = auth.uid()
    )
  )
);

-- 10) Section verifications: admins only (no sub-trainers)
CREATE POLICY "Upsert section verifications (admins)"
ON public.activity_section_verifications FOR INSERT
WITH CHECK (
  public.can_view_activity(auth.uid(), activity_id)
  AND public.is_admin(auth.uid())
);

CREATE POLICY "Update section verifications (admins)"
ON public.activity_section_verifications FOR UPDATE
USING (
  public.can_view_activity(auth.uid(), activity_id)
  AND public.is_admin(auth.uid())
);

-- user_roles policies re-created against the new enum
CREATE POLICY "Super admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Sponsors can view downline roles"
ON public.user_roles FOR SELECT
USING (
  public.has_role(auth.uid(), 'sponsor')
  AND public.sponsor_can_access_user(auth.uid(), user_id)
);

-- suggestions policies re-created against the new enum
CREATE POLICY "Super admins can view suggestions"
ON public.suggestions FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete suggestions"
ON public.suggestions FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

-- storage policies re-created against the new enum
CREATE POLICY "Super admins can update suggestion attachments"
ON storage.objects FOR UPDATE
USING ((bucket_id = 'suggestion_attachments'::text) AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete suggestion attachments"
ON storage.objects FOR DELETE
USING ((bucket_id = 'suggestion_attachments'::text) AND public.has_role(auth.uid(), 'super_admin'));


-- =============================================
-- Migration: 20260114145000_fix_sponsor_dashboard_access_and_case.sql
-- =============================================

-- Sponsor dashboard fixes:
-- 1) Make sponsor downline tree case-insensitive (username comparisons).
-- 2) Allow sponsor/pro to fetch weekly/monthly reports for allowed users only (secure).

-- 1) Case-insensitive sponsor downline tree
CREATE OR REPLACE FUNCTION public.get_sponsor_downlines(p_sponsor_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  sponsor_username text,
  depth integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT
      p.user_id,
      p.username,
      p.sponsor_username,
      1 AS depth,
      ARRAY[lower(p.username)]::text[] AS path
    FROM public.profiles p
    WHERE lower(coalesce(p.sponsor_username, '')) = (
      SELECT lower(coalesce(s.username, ''))
      FROM public.profiles s
      WHERE s.user_id = p_sponsor_user_id
      LIMIT 1
    )

    UNION ALL

    SELECT
      c.user_id,
      c.username,
      c.sponsor_username,
      t.depth + 1 AS depth,
      t.path || lower(c.username)
    FROM public.profiles c
    JOIN tree t ON lower(coalesce(c.sponsor_username, '')) = lower(coalesce(t.username, ''))
    WHERE NOT (lower(c.username) = ANY(t.path))
  )
  SELECT user_id, username, sponsor_username, depth
  FROM tree;
$$;

-- 2) Gate weekly/monthly report RPCs by access rules
CREATE OR REPLACE FUNCTION public.get_or_generate_weekly_report(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  week_start_date date,
  week_end_date date,
  total_pages_read integer,
  total_gigs_created integer,
  total_accounts_created integer,
  total_gross_income numeric,
  total_net_income numeric,
  total_contacts integer,
  total_follow_ups integer,
  submission_count integer,
  consistency_score numeric,
  wins text,
  challenges text,
  lessons_learned text,
  goals_next_week text,
  trainer_feedback text,
  trainer_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date;
  v_week_start_date date;
  v_report_id uuid;
BEGIN
  -- Access control: self, admins, sponsor-downline, pro-same-group
  IF NOT (
    auth.uid() = p_user_id
    OR public.is_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'sponsor') AND public.sponsor_can_access_user(auth.uid(), p_user_id))
    OR (public.has_role(auth.uid(), 'pro') AND public.pro_can_access_user(auth.uid(), p_user_id))
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_today := (timezone('Africa/Lagos', now()))::date;
  v_week_start_date := v_today - (extract(isodow from v_today)::int - 1);
  v_report_id := public.generate_weekly_report(p_user_id, v_week_start_date);

  RETURN QUERY
  SELECT
    wr.id,
    wr.user_id,
    wr.week_start_date,
    wr.week_end_date,
    wr.total_pages_read,
    wr.total_gigs_created,
    wr.total_accounts_created,
    wr.total_gross_income,
    wr.total_net_income,
    wr.total_contacts,
    wr.total_follow_ups,
    wr.submission_count,
    wr.consistency_score,
    wr.wins,
    wr.challenges,
    wr.lessons_learned,
    wr.goals_next_week,
    wr.trainer_feedback,
    wr.trainer_id,
    wr.created_at,
    wr.updated_at
  FROM public.weekly_reports wr
  WHERE wr.id = v_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_generate_monthly_goal(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  month_year date,
  target_pages integer,
  target_gigs integer,
  target_accounts integer,
  target_income numeric,
  target_contacts integer,
  actual_pages integer,
  actual_gigs integer,
  actual_accounts integer,
  actual_income numeric,
  actual_contacts integer,
  consistency_score numeric,
  skill_progress_notes text,
  income_summary text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today date;
  v_month_start date;
  v_goal_id uuid;
BEGIN
  -- Access control: self, admins, sponsor-downline, pro-same-group
  IF NOT (
    auth.uid() = p_user_id
    OR public.is_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'sponsor') AND public.sponsor_can_access_user(auth.uid(), p_user_id))
    OR (public.has_role(auth.uid(), 'pro') AND public.pro_can_access_user(auth.uid(), p_user_id))
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_today := (timezone('Africa/Lagos', now()))::date;
  v_month_start := date_trunc('month', v_today)::date;
  v_goal_id := public.calculate_monthly_actuals(p_user_id, v_month_start);

  RETURN QUERY
  SELECT
    mg.id,
    mg.user_id,
    mg.month_year,
    mg.target_pages,
    mg.target_gigs,
    mg.target_accounts,
    mg.target_income,
    mg.target_contacts,
    mg.actual_pages,
    mg.actual_gigs,
    mg.actual_accounts,
    mg.actual_income,
    mg.actual_contacts,
    mg.consistency_score,
    mg.skill_progress_notes,
    mg.income_summary,
    mg.created_at,
    mg.updated_at
  FROM public.monthly_goals mg
  WHERE mg.id = v_goal_id;
END;
$$;



-- =============================================
-- Migration: 20260115000000_skills_system_overhaul.sql
-- =============================================

-- Skills System Overhaul Migration
-- Adds PDF support, mandatory/optional flags, trainers, and user skill tracking

-- Step 1: Add new columns to skills table
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS training_plan_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trainers TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Step 2: Create user_skills table for tracking user skill assignments and statuses
CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'yet_to_begin' CHECK (status IN ('yet_to_begin', 'started_training', 'completed_training')),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- Step 3: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON public.user_skills(skill_id);

-- Step 4: Enable RLS on user_skills
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for user_skills
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own skill assignments" ON public.user_skills;
DROP POLICY IF EXISTS "Admins can view all skill assignments" ON public.user_skills;
DROP POLICY IF EXISTS "Admins can insert skill assignments" ON public.user_skills;
DROP POLICY IF EXISTS "Admins can update skill assignments" ON public.user_skills;

-- Users can view their own skill assignments
CREATE POLICY "Users can view their own skill assignments"
  ON public.user_skills
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all skill assignments
CREATE POLICY "Admins can view all skill assignments"
  ON public.user_skills
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'trainer')
    )
  );

-- Admins can insert skill assignments
CREATE POLICY "Admins can insert skill assignments"
  ON public.user_skills
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'trainer')
    )
  );

-- Admins can update skill assignments
CREATE POLICY "Admins can update skill assignments"
  ON public.user_skills
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'trainer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'trainer')
    )
  );

-- Step 6: Create function to auto-assign mandatory skills to new approved members
CREATE OR REPLACE FUNCTION public.auto_assign_mandatory_skills()
RETURNS TRIGGER AS $$
DECLARE
  mandatory_skill RECORD;
BEGIN
  -- Only trigger when approval_status changes to 'approved'
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    -- Loop through all mandatory skills
    FOR mandatory_skill IN
      SELECT id FROM public.skills WHERE is_mandatory = true
    LOOP
      -- Insert user_skill assignment if it doesn't already exist
      INSERT INTO public.user_skills (user_id, skill_id, status, assigned_at)
      VALUES (NEW.user_id, mandatory_skill.id, 'yet_to_begin', now())
      ON CONFLICT (user_id, skill_id) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger to auto-assign mandatory skills
DROP TRIGGER IF EXISTS trigger_auto_assign_mandatory_skills ON public.profiles;
CREATE TRIGGER trigger_auto_assign_mandatory_skills
  AFTER UPDATE OF approval_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_mandatory_skills();

-- Step 8: Update existing approved users with mandatory skills (one-time migration)
DO $$
DECLARE
  approved_user RECORD;
  mandatory_skill RECORD;
BEGIN
  -- Loop through all approved users
  FOR approved_user IN
    SELECT user_id FROM public.profiles WHERE approval_status = 'approved'
  LOOP
    -- Loop through all mandatory skills
    FOR mandatory_skill IN
      SELECT id FROM public.skills WHERE is_mandatory = true
    LOOP
      -- Insert user_skill assignment if it doesn't already exist
      INSERT INTO public.user_skills (user_id, skill_id, status, assigned_at)
      VALUES (approved_user.user_id, mandatory_skill.id, 'yet_to_begin', now())
      ON CONFLICT (user_id, skill_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Step 9: Add RLS policy for skills table PDF access (if not exists)
-- Users can view all active skills
DROP POLICY IF EXISTS "Users can view active skills" ON public.skills;
CREATE POLICY "Users can view active skills"
  ON public.skills
  FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'trainer')
  ));


-- =============================================
-- Migration: 20260115000001_create_training_plans_bucket.sql
-- =============================================

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


-- =============================================
-- Migration: 20260115000002_support_multiple_trainers_per_group.sql
-- =============================================

-- Support Multiple Trainers Per Group
-- Changes groups.trainer_id to groups.trainer_ids (array)

-- Step 1: Add new column for multiple trainers
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS trainer_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Step 2: Migrate existing single trainer_id to trainer_ids array
UPDATE public.groups
SET trainer_ids = CASE
  WHEN trainer_id IS NOT NULL THEN ARRAY[trainer_id]
  ELSE ARRAY[]::UUID[]
END
WHERE trainer_ids IS NULL OR array_length(trainer_ids, 1) IS NULL;

-- Step 3: Create index for array queries
CREATE INDEX IF NOT EXISTS idx_groups_trainer_ids ON public.groups USING GIN (trainer_ids);

-- Note: We keep trainer_id column for backward compatibility but it's deprecated
-- New code should use trainer_ids array instead


-- =============================================
-- Migration: 20260115000003_populate_skills_data.sql
-- =============================================

-- Populate Skills Data
-- Inserts all 8 skills with trainers and PDF paths

-- Digital Marketing (Mandatory)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'Digital Marketing') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'Digital Marketing',
      true,
      'Digital Marketing Training Manual.pdf',
      ARRAY['Miss Boluwatife', 'Miss Mercy', 'Mr Damilare', 'Mr Sheriff']::TEXT[],
      1,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = true,
      training_plan_pdf_path = 'Digital Marketing Training Manual.pdf',
      trainers = ARRAY['Miss Boluwatife', 'Miss Mercy', 'Mr Damilare', 'Mr Sheriff']::TEXT[],
      display_order = 1,
      is_active = true
    WHERE name = 'Digital Marketing';
  END IF;
END $$;

-- Prompt Engineering (Mandatory)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'Prompt Engineering') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'Prompt Engineering',
      true,
      'Intro_to_Prompt_Engineering_Overview.pdf',
      ARRAY['Miss Morufat', 'Mr Femi Gratitude', 'Mr Boluwatife', 'Miss Feranmi']::TEXT[],
      2,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = true,
      training_plan_pdf_path = 'Intro_to_Prompt_Engineering_Overview.pdf',
      trainers = ARRAY['Miss Morufat', 'Mr Femi Gratitude', 'Mr Boluwatife', 'Miss Feranmi']::TEXT[],
      display_order = 2,
      is_active = true
    WHERE name = 'Prompt Engineering';
  END IF;
END $$;

-- AI Coding (Optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'AI Coding') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'AI Coding',
      false,
      'AI CODING.pdf',
      ARRAY['Mr Abbey', 'Mr Femi Gratitude', 'Mr Quoreeb', 'Mr Emmanuel']::TEXT[],
      3,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = false,
      training_plan_pdf_path = 'AI CODING.pdf',
      trainers = ARRAY['Mr Abbey', 'Mr Femi Gratitude', 'Mr Quoreeb', 'Mr Emmanuel']::TEXT[],
      display_order = 3,
      is_active = true
    WHERE name = 'AI Coding';
  END IF;
END $$;

-- WordPress Website Design (Optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'WordPress Website Design') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'WordPress Website Design',
      false,
      'Wordpress Website Training.pdf',
      ARRAY['IPK', 'Miss Boluwatife']::TEXT[],
      4,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = false,
      training_plan_pdf_path = 'Wordpress Website Training.pdf',
      trainers = ARRAY['IPK', 'Miss Boluwatife']::TEXT[],
      display_order = 4,
      is_active = true
    WHERE name = 'WordPress Website Design';
  END IF;
END $$;

-- Shopify Website Design (Optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'Shopify Website Design') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'Shopify Website Design',
      false,
      'Unified Ecommerce And Shopify Training.pdf',
      ARRAY['IPK', 'Miss Ini', 'Miss Bidemi']::TEXT[],
      5,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = false,
      training_plan_pdf_path = 'Unified Ecommerce And Shopify Training.pdf',
      trainers = ARRAY['IPK', 'Miss Ini', 'Miss Bidemi']::TEXT[],
      display_order = 5,
      is_active = true
    WHERE name = 'Shopify Website Design';
  END IF;
END $$;

-- Graphics & Design (Optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'Graphics & Design') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'Graphics & Design',
      false,
      'Graphics & Design.pdf',
      ARRAY['Mr Ridwan']::TEXT[],
      6,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = false,
      training_plan_pdf_path = 'Graphics & Design.pdf',
      trainers = ARRAY['Mr Ridwan']::TEXT[],
      display_order = 6,
      is_active = true
    WHERE name = 'Graphics & Design';
  END IF;
END $$;

-- Content Writing (Optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'Content Writing') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'Content Writing',
      false,
      'Content_Writing_and_Copywriting_Training.pdf',
      ARRAY['IPK']::TEXT[],
      7,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = false,
      training_plan_pdf_path = 'Content_Writing_and_Copywriting_Training.pdf',
      trainers = ARRAY['IPK']::TEXT[],
      display_order = 7,
      is_active = true
    WHERE name = 'Content Writing';
  END IF;
END $$;

-- Automation (Optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE name = 'Automation') THEN
    INSERT INTO public.skills (name, is_mandatory, training_plan_pdf_path, trainers, display_order, is_active)
    VALUES (
      'Automation',
      false,
      '_AI Automation & Spreadsheets.pdf',
      ARRAY['Miss Morufat', 'Miss Seyifunmi', 'Miss Jummy']::TEXT[],
      8,
      true
    );
  ELSE
    UPDATE public.skills SET
      is_mandatory = false,
      training_plan_pdf_path = '_AI Automation & Spreadsheets.pdf',
      trainers = ARRAY['Miss Morufat', 'Miss Seyifunmi', 'Miss Jummy']::TEXT[],
      display_order = 8,
      is_active = true
    WHERE name = 'Automation';
  END IF;
END $$;


-- =============================================
-- Migration: 20260115000004_fix_skills_rls_policies.sql
-- =============================================

-- Fix Skills RLS Policies
-- Drops old conflicting policies and ensures correct access

-- Drop old policies that might conflict
DROP POLICY IF EXISTS "Approved users can view skills" ON public.skills;
DROP POLICY IF EXISTS "Admins can manage skills" ON public.skills;
DROP POLICY IF EXISTS "Users can view active skills" ON public.skills;

-- Create unified policy for viewing skills
-- All authenticated users can view active skills
-- Admins and trainers can view all skills (including inactive)
CREATE POLICY "Users can view active skills"
  ON public.skills
  FOR SELECT
  USING (
    is_active = true 
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'trainer')
    )
  );

-- Admins can manage (insert, update, delete) all skills
CREATE POLICY "Admins can manage skills"
  ON public.skills
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'trainer')
    )
  );


-- =============================================
-- Migration: 20260116000000_support_multiple_images_and_links.sql
-- =============================================

-- Migration: Support multiple images and links in daily_activities
-- Changes:
-- 1. Convert single image fields to arrays (reading_proof_image, skill_proof_image, other_activities_proof_image)
-- 2. Convert gig_link to gig_links array
-- 3. Add account_links array for account creation links

-- Step 1: Add new array columns
ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS reading_proof_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS skill_proof_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS other_activities_proof_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS gig_links TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS account_links TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Step 2: Migrate existing single values to arrays
-- Migrate reading_proof_image to reading_proof_images
UPDATE public.daily_activities
SET reading_proof_images = CASE 
  WHEN reading_proof_image IS NOT NULL AND reading_proof_image != '' 
  THEN ARRAY[reading_proof_image]
  ELSE ARRAY[]::TEXT[]
END
WHERE reading_proof_images = ARRAY[]::TEXT[] OR reading_proof_images IS NULL;

-- Migrate skill_proof_image to skill_proof_images
UPDATE public.daily_activities
SET skill_proof_images = CASE 
  WHEN skill_proof_image IS NOT NULL AND skill_proof_image != '' 
  THEN ARRAY[skill_proof_image]
  ELSE ARRAY[]::TEXT[]
END
WHERE skill_proof_images = ARRAY[]::TEXT[] OR skill_proof_images IS NULL;

-- Migrate other_activities_proof_image to other_activities_proof_images
UPDATE public.daily_activities
SET other_activities_proof_images = CASE 
  WHEN other_activities_proof_image IS NOT NULL AND other_activities_proof_image != '' 
  THEN ARRAY[other_activities_proof_image]
  ELSE ARRAY[]::TEXT[]
END
WHERE other_activities_proof_images = ARRAY[]::TEXT[] OR other_activities_proof_images IS NULL;

-- Migrate gig_link to gig_links
UPDATE public.daily_activities
SET gig_links = CASE 
  WHEN gig_link IS NOT NULL AND gig_link != '' 
  THEN ARRAY[gig_link]
  ELSE ARRAY[]::TEXT[]
END
WHERE gig_links = ARRAY[]::TEXT[] OR gig_links IS NULL;

-- Step 3: Keep old columns for backward compatibility during transition
-- We'll drop them in a future migration after confirming everything works
-- For now, we'll keep both old and new columns

-- Add comments
COMMENT ON COLUMN public.daily_activities.reading_proof_images IS 'Array of reading proof image paths';
COMMENT ON COLUMN public.daily_activities.skill_proof_images IS 'Array of skill proof image paths';
COMMENT ON COLUMN public.daily_activities.other_activities_proof_images IS 'Array of other activities proof image paths';
COMMENT ON COLUMN public.daily_activities.gig_links IS 'Array of gig links';
COMMENT ON COLUMN public.daily_activities.account_links IS 'Array of account creation links';


-- =============================================
-- Migration: 20260205120000_submission_deadline_1159pm.sql
-- =============================================

-- Change daily submission deadline from 10 PM to 11:59 PM (Nigeria / Africa/Lagos)

CREATE OR REPLACE FUNCTION public.is_submission_locked(p_activity_date date)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_lock_time timestamptz;
BEGIN
  -- Lock time is 11:59 PM Nigeria time (WAT) on the activity date
  v_lock_time := (p_activity_date::timestamp + time '23:59') AT TIME ZONE 'Africa/Lagos';
  RETURN now() >= v_lock_time;
END;
$$;


-- =============================================
-- Part B: Public functions (remote pg_get_functiondef)
-- =============================================

CREATE OR REPLACE FUNCTION public.auto_assign_mandatory_skills()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  mandatory_skill RECORD;
BEGIN
  -- Only trigger when approval_status changes to 'approved'
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    -- Loop through all mandatory skills
    FOR mandatory_skill IN
      SELECT id FROM public.skills WHERE is_mandatory = true
    LOOP
      -- Insert user_skill assignment if it doesn't already exist
      INSERT INTO public.user_skills (user_id, skill_id, status, assigned_at)
      VALUES (NEW.user_id, mandatory_skill.id, 'yet_to_begin', now())
      ON CONFLICT (user_id, skill_id) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$


CREATE OR REPLACE FUNCTION public.calculate_monthly_actuals(p_user_id uuid, p_month_year date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_month_start DATE;
    v_month_end DATE;
    v_goal_id UUID;
    v_actual_pages INTEGER := 0;
    v_actual_gigs INTEGER := 0;
    v_actual_accounts INTEGER := 0;
    v_actual_income NUMERIC := 0;
    v_actual_contacts INTEGER := 0;
    v_consistency_score NUMERIC := 0;
    v_days_in_month INTEGER;
    v_days_submitted INTEGER := 0;
BEGIN
    -- Calculate month start (first day of the month)
    v_month_start := DATE_TRUNC('month', p_month_year)::DATE;
    -- Calculate month end (last day of the month)
    v_month_end := (DATE_TRUNC('month', p_month_year) + INTERVAL '1 month - 1 day')::DATE;
    
    -- Get number of days in the month
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', p_month_year) + INTERVAL '1 month - 1 day'))::INTEGER;
    
    -- Aggregate data from daily activities for the month
    SELECT 
        COALESCE(SUM(pages_read), 0),
        COALESCE(SUM(gigs_created), 0),
        COALESCE(SUM(accounts_created), 0),
        COALESCE(SUM(net_income), 0),
        COALESCE(SUM(daily_contacts), 0),
        COUNT(DISTINCT activity_date)
    INTO 
        v_actual_pages,
        v_actual_gigs,
        v_actual_accounts,
        v_actual_income,
        v_actual_contacts,
        v_days_submitted
    FROM public.daily_activities
    WHERE user_id = p_user_id
        AND activity_date >= v_month_start
        AND activity_date <= v_month_end;
    
    -- Calculate consistency score (days submitted / days in month * 100)
    v_consistency_score := ROUND((v_days_submitted::NUMERIC / v_days_in_month::NUMERIC) * 100, 2);
    
    -- Check if monthly goal already exists
    SELECT id INTO v_goal_id
    FROM public.monthly_goals
    WHERE user_id = p_user_id
        AND month_year = v_month_start;
    
    -- Insert or update the monthly goal
    IF v_goal_id IS NULL THEN
        INSERT INTO public.monthly_goals (
            user_id,
            month_year,
            actual_pages,
            actual_gigs,
            actual_accounts,
            actual_income,
            actual_contacts,
            consistency_score
        ) VALUES (
            p_user_id,
            v_month_start,
            v_actual_pages,
            v_actual_gigs,
            v_actual_accounts,
            v_actual_income,
            v_actual_contacts,
            v_consistency_score
        )
        RETURNING id INTO v_goal_id;
    ELSE
        UPDATE public.monthly_goals
        SET 
            actual_pages = v_actual_pages,
            actual_gigs = v_actual_gigs,
            actual_accounts = v_actual_accounts,
            actual_income = v_actual_income,
            actual_contacts = v_actual_contacts,
            consistency_score = v_consistency_score,
            updated_at = now()
        WHERE id = v_goal_id;
    END IF;
    
    RETURN v_goal_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.can_view_activity(_viewer_id uuid, _activity_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.daily_activities da
    WHERE da.id = _activity_id
      AND (
        da.user_id = _viewer_id
        OR public.is_admin(_viewer_id)
        OR (public.has_role(_viewer_id, 'sponsor') AND public.sponsor_can_access_user(_viewer_id, da.user_id))
        OR (public.has_role(_viewer_id, 'pro') AND public.pro_can_access_user(_viewer_id, da.user_id))
      )
  );
$function$


CREATE OR REPLACE FUNCTION public.check_submission_lock()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if submission is locked for the activity date
  IF public.is_submission_locked(NEW.activity_date) THEN
    RAISE EXCEPTION 'Submissions are locked after 10 PM (GMT+1). The deadline for % has passed.', NEW.activity_date;
  END IF;
  
  RETURN NEW;
END;
$function$


CREATE OR REPLACE FUNCTION public.create_system_sponsor()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_system_user_id UUID;
BEGIN
  -- Try to find system user (created manually via dashboard)
  -- Email: system@prudencepath.com (or any system email)
  SELECT id INTO v_system_user_id
  FROM auth.users
  WHERE email = 'system@prudencepath.com'
  LIMIT 1;
  
  -- If system user exists, create profile
  IF v_system_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (
      user_id,
      full_name,
      username,
      sponsor_username,
      email,
      approval_status
    )
    VALUES (
      v_system_user_id,
      'System Sponsor',
      'system',
      'system', -- System sponsors itself
      'system@prudencepath.com',
      'approved'
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Assign system role (or keep as member)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_system_user_id, 'member')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$function$


CREATE OR REPLACE FUNCTION public.ensure_activity_section_verifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sections text[] := ARRAY['reading','gigs','accounts','income','prospecting','skills','other','training'];
  s text;
BEGIN
  FOREACH s IN ARRAY sections LOOP
    INSERT INTO public.activity_section_verifications(activity_id, section, status)
    VALUES (NEW.id, s, 'pending')
    ON CONFLICT (activity_id, section) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$function$


CREATE OR REPLACE FUNCTION public.generate_weekly_report(p_user_id uuid, p_week_start_date date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_week_end_date DATE;
    v_report_id UUID;
    v_total_pages_read INTEGER := 0;
    v_total_gigs_created INTEGER := 0;
    v_total_accounts_created INTEGER := 0;
    v_total_gross_income NUMERIC := 0;
    v_total_net_income NUMERIC := 0;
    v_total_contacts INTEGER := 0;
    v_total_follow_ups INTEGER := 0;
    v_submission_count INTEGER := 0;
    v_consistency_score NUMERIC := 0;
    v_days_in_week INTEGER := 7;
BEGIN
    -- Calculate week end date (6 days after start)
    v_week_end_date := p_week_start_date + INTERVAL '6 days';
    
    -- Aggregate data from daily activities for the week
    SELECT 
        COALESCE(SUM(pages_read), 0),
        COALESCE(SUM(gigs_created), 0),
        COALESCE(SUM(accounts_created), 0),
        COALESCE(SUM(gross_income), 0),
        COALESCE(SUM(net_income), 0),
        COALESCE(SUM(daily_contacts), 0),
        COALESCE(SUM(follow_ups), 0),
        COUNT(*)
    INTO 
        v_total_pages_read,
        v_total_gigs_created,
        v_total_accounts_created,
        v_total_gross_income,
        v_total_net_income,
        v_total_contacts,
        v_total_follow_ups,
        v_submission_count
    FROM public.daily_activities
    WHERE user_id = p_user_id
        AND activity_date >= p_week_start_date
        AND activity_date <= v_week_end_date;
    
    -- Calculate consistency score (submissions / 7 days * 100)
    v_consistency_score := ROUND((v_submission_count::NUMERIC / v_days_in_week::NUMERIC) * 100, 2);
    
    -- Check if report already exists
    SELECT id INTO v_report_id
    FROM public.weekly_reports
    WHERE user_id = p_user_id
        AND week_start_date = p_week_start_date;
    
    -- Insert or update the weekly report
    IF v_report_id IS NULL THEN
        INSERT INTO public.weekly_reports (
            user_id,
            week_start_date,
            week_end_date,
            total_pages_read,
            total_gigs_created,
            total_accounts_created,
            total_gross_income,
            total_net_income,
            total_contacts,
            total_follow_ups,
            submission_count,
            consistency_score
        ) VALUES (
            p_user_id,
            p_week_start_date,
            v_week_end_date,
            v_total_pages_read,
            v_total_gigs_created,
            v_total_accounts_created,
            v_total_gross_income,
            v_total_net_income,
            v_total_contacts,
            v_total_follow_ups,
            v_submission_count,
            v_consistency_score
        )
        RETURNING id INTO v_report_id;
    ELSE
        UPDATE public.weekly_reports
        SET 
            week_end_date = v_week_end_date,
            total_pages_read = v_total_pages_read,
            total_gigs_created = v_total_gigs_created,
            total_accounts_created = v_total_accounts_created,
            total_gross_income = v_total_gross_income,
            total_net_income = v_total_net_income,
            total_contacts = v_total_contacts,
            total_follow_ups = v_total_follow_ups,
            submission_count = v_submission_count,
            consistency_score = v_consistency_score,
            updated_at = now()
        WHERE id = v_report_id;
    END IF;
    
    RETURN v_report_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_or_generate_monthly_goal(p_user_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, month_year date, target_pages integer, target_gigs integer, target_accounts integer, target_income numeric, target_contacts integer, actual_pages integer, actual_gigs integer, actual_accounts integer, actual_income numeric, actual_contacts integer, consistency_score numeric, skill_progress_notes text, income_summary text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today date;
  v_month_start date;
  v_goal_id uuid;
BEGIN
  -- Access control: self, admins, sponsor-downline, pro-same-group
  IF NOT (
    auth.uid() = p_user_id
    OR public.is_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'sponsor') AND public.sponsor_can_access_user(auth.uid(), p_user_id))
    OR (public.has_role(auth.uid(), 'pro') AND public.pro_can_access_user(auth.uid(), p_user_id))
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_today := (timezone('Africa/Lagos', now()))::date;
  v_month_start := date_trunc('month', v_today)::date;
  v_goal_id := public.calculate_monthly_actuals(p_user_id, v_month_start);

  RETURN QUERY
  SELECT
    mg.id,
    mg.user_id,
    mg.month_year,
    mg.target_pages,
    mg.target_gigs,
    mg.target_accounts,
    mg.target_income,
    mg.target_contacts,
    mg.actual_pages,
    mg.actual_gigs,
    mg.actual_accounts,
    mg.actual_income,
    mg.actual_contacts,
    mg.consistency_score,
    mg.skill_progress_notes,
    mg.income_summary,
    mg.created_at,
    mg.updated_at
  FROM public.monthly_goals mg
  WHERE mg.id = v_goal_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_or_generate_weekly_report(p_user_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, week_start_date date, week_end_date date, total_pages_read integer, total_gigs_created integer, total_accounts_created integer, total_gross_income numeric, total_net_income numeric, total_contacts integer, total_follow_ups integer, submission_count integer, consistency_score numeric, wins text, challenges text, lessons_learned text, goals_next_week text, trainer_feedback text, trainer_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today date;
  v_week_start_date date;
  v_report_id uuid;
BEGIN
  -- Access control: self, admins, sponsor-downline, pro-same-group
  IF NOT (
    auth.uid() = p_user_id
    OR public.is_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'sponsor') AND public.sponsor_can_access_user(auth.uid(), p_user_id))
    OR (public.has_role(auth.uid(), 'pro') AND public.pro_can_access_user(auth.uid(), p_user_id))
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_today := (timezone('Africa/Lagos', now()))::date;
  v_week_start_date := v_today - (extract(isodow from v_today)::int - 1);
  v_report_id := public.generate_weekly_report(p_user_id, v_week_start_date);

  RETURN QUERY
  SELECT
    wr.id,
    wr.user_id,
    wr.week_start_date,
    wr.week_end_date,
    wr.total_pages_read,
    wr.total_gigs_created,
    wr.total_accounts_created,
    wr.total_gross_income,
    wr.total_net_income,
    wr.total_contacts,
    wr.total_follow_ups,
    wr.submission_count,
    wr.consistency_score,
    wr.wins,
    wr.challenges,
    wr.lessons_learned,
    wr.goals_next_week,
    wr.trainer_feedback,
    wr.trainer_id,
    wr.created_at,
    wr.updated_at
  FROM public.weekly_reports wr
  WHERE wr.id = v_report_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_sponsor_downlines(p_sponsor_user_id uuid)
 RETURNS TABLE(user_id uuid, username text, sponsor_username text, depth integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH RECURSIVE tree AS (
    SELECT
      p.user_id,
      p.username,
      p.sponsor_username,
      1 AS depth,
      ARRAY[lower(p.username)]::text[] AS path
    FROM public.profiles p
    WHERE lower(coalesce(p.sponsor_username, '')) = (
      SELECT lower(coalesce(s.username, ''))
      FROM public.profiles s
      WHERE s.user_id = p_sponsor_user_id
      LIMIT 1
    )

    UNION ALL

    SELECT
      c.user_id,
      c.username,
      c.sponsor_username,
      t.depth + 1 AS depth,
      t.path || lower(c.username)
    FROM public.profiles c
    JOIN tree t ON lower(coalesce(c.sponsor_username, '')) = lower(coalesce(t.username, ''))
    WHERE NOT (lower(c.username) = ANY(t.path))
  )
  SELECT user_id, username, sponsor_username, depth
  FROM tree;
$function$


CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, username, sponsor_username, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'username', ''),
        NULLIF(COALESCE(NEW.raw_user_meta_data->>'sponsor_username', ''), ''),
        NEW.email
    );
    
    -- Assign default 'member' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
    
    RETURN NEW;
END;
$function$


CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$function$


CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('super_admin'::public.app_role, 'trainer'::public.app_role)
    )
$function$


CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE user_id = _user_id
          AND approval_status = 'approved'
    )
$function$


CREATE OR REPLACE FUNCTION public.is_submission_locked(p_activity_date date)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_lock_time timestamptz;
BEGIN
  -- Lock time is 11:59 PM Nigeria time (WAT) on the activity date
  v_lock_time := (p_activity_date::timestamp + time '23:59') AT TIME ZONE 'Africa/Lagos';
  RETURN now() >= v_lock_time;
END;
$function$


CREATE OR REPLACE FUNCTION public.is_today_submission_locked()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN public.is_submission_locked((timezone('Africa/Lagos', now()))::date);
END;
$function$


CREATE OR REPLACE FUNCTION public.pro_can_access_user(_pro_id uuid, _target_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles pro
    JOIN public.profiles target
      ON target.assigned_group_id = pro.assigned_group_id
    WHERE pro.user_id = _pro_id
      AND target.user_id = _target_user_id
      AND pro.assigned_group_id IS NOT NULL
      AND pro.approval_status = 'approved'
      AND target.approval_status = 'approved'
  );
$function$


CREATE OR REPLACE FUNCTION public.promote_to_super_admin(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update profile approval status
  UPDATE public.profiles
  SET approval_status = 'approved'
  WHERE user_id = p_user_id;
  
  -- Update or insert super_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- If user has other roles, keep super_admin as primary
  -- Super admin should have all permissions
END;
$function$


CREATE OR REPLACE FUNCTION public.set_suggestion_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$


CREATE OR REPLACE FUNCTION public.sponsor_can_access_user(_sponsor_user_id uuid, _target_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (
    _sponsor_user_id = _target_user_id
    OR EXISTS (
      SELECT 1
      FROM public.get_sponsor_downlines(_sponsor_user_id) d
      WHERE d.user_id = _target_user_id
    )
  );
$function$


CREATE OR REPLACE FUNCTION public.sync_activity_verification_from_sections()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_activity_id uuid;
  v_any_rejected boolean;
  v_all_approved boolean;
  v_any_rows boolean;
BEGIN
  v_activity_id := COALESCE(NEW.activity_id, OLD.activity_id);

  SELECT
    (COUNT(*) > 0),
    COALESCE(BOOL_OR(status = 'rejected'), false),
    COALESCE(BOOL_AND(status = 'approved'), false)
  INTO v_any_rows, v_any_rejected, v_all_approved
  FROM public.activity_section_verifications
  WHERE activity_id = v_activity_id;

  IF NOT v_any_rows THEN
    -- No sections: treat as pending
    UPDATE public.daily_activities
    SET is_verified = false,
        verified_at = NULL,
        verified_by = NULL
    WHERE id = v_activity_id;
    RETURN NULL;
  END IF;

  IF v_any_rejected THEN
    UPDATE public.daily_activities
    SET is_verified = false,
        verified_at = now(),
        verified_by = auth.uid(),
        verification_feedback = COALESCE(verification_feedback, 'See section feedback')
    WHERE id = v_activity_id;
  ELSIF v_all_approved THEN
    UPDATE public.daily_activities
    SET is_verified = true,
        verified_at = now(),
        verified_by = auth.uid(),
        verification_feedback = NULL
    WHERE id = v_activity_id;
  ELSE
    -- Some pending (and none rejected)
    UPDATE public.daily_activities
    SET is_verified = false,
        verified_at = NULL,
        verified_by = NULL
    WHERE id = v_activity_id;
  END IF;

  RETURN NULL;
END;
$function$


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$

