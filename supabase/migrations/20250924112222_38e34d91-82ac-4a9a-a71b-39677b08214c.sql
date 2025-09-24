-- Create user roles enum (admin, user)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create email alerts table for users to report suspicious emails
CREATE TABLE public.email_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'suspicious',
  alert_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed, resolved
  admin_user_id UUID,
  admin_action TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email blocking table for admin actions
CREATE TABLE public.email_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  blocked_by_user_id UUID NOT NULL,
  block_reason TEXT NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'spam', -- spam, phishing, malware, suspicious
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin audit log for tracking admin actions
CREATE TABLE public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- block_email, classify_spam, review_alert, etc.
  target_type TEXT NOT NULL, -- email, user, alert
  target_id UUID NOT NULL,
  action_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
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

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- RLS Policies for email_alerts
CREATE POLICY "Users can create their own alerts"
ON public.email_alerts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own alerts"
ON public.email_alerts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all alerts"
ON public.email_alerts
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update alerts"
ON public.email_alerts
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- RLS Policies for email_blocks
CREATE POLICY "Admins can manage email blocks"
ON public.email_blocks
FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view blocks on their emails"
ON public.email_blocks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.emails
    WHERE emails.id = email_blocks.email_id
    AND emails.user_id = auth.uid()
  )
);

-- RLS Policies for admin_audit_log
CREATE POLICY "Admins can view audit log"
ON public.admin_audit_log
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert audit log"
ON public.admin_audit_log
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()) AND auth.uid() = admin_user_id);

-- Update profiles table RLS to allow admins to see all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Update emails table RLS to allow admins to see all emails
CREATE POLICY "Admins can view all emails"
ON public.emails
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all emails"
ON public.emails
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Add triggers for updated_at columns
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_alerts_updated_at
BEFORE UPDATE ON public.email_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_blocks_updated_at
BEFORE UPDATE ON public.email_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically assign 'user' role to new users
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'user');
  RETURN NEW;
END;
$$;

-- Trigger to assign default role when profile is created
CREATE TRIGGER on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_role();