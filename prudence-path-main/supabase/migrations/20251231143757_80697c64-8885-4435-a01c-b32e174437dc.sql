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