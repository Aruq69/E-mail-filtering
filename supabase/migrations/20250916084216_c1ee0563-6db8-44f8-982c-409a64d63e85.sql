-- Create email statistics table for privacy-friendly analytics
CREATE TABLE public.email_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_emails INTEGER DEFAULT 0,
  safe_emails INTEGER DEFAULT 0,
  low_threat_emails INTEGER DEFAULT 0,
  medium_threat_emails INTEGER DEFAULT 0,
  high_threat_emails INTEGER DEFAULT 0,
  spam_emails INTEGER DEFAULT 0,
  phishing_emails INTEGER DEFAULT 0,
  malware_emails INTEGER DEFAULT 0,
  suspicious_emails INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.email_statistics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own email statistics" 
ON public.email_statistics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email statistics" 
ON public.email_statistics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email statistics" 
ON public.email_statistics 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_email_statistics_updated_at
BEFORE UPDATE ON public.email_statistics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create or update function for incrementing statistics
CREATE OR REPLACE FUNCTION public.increment_email_statistics(
  p_user_id UUID,
  p_threat_level TEXT DEFAULT 'safe',
  p_threat_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.email_statistics (
    user_id,
    date,
    total_emails,
    safe_emails,
    low_threat_emails,
    medium_threat_emails,
    high_threat_emails,
    spam_emails,
    phishing_emails,
    malware_emails,
    suspicious_emails
  )
  VALUES (
    p_user_id,
    CURRENT_DATE,
    1,
    CASE WHEN p_threat_level = 'safe' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_level = 'low' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_level = 'medium' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_level = 'high' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_type = 'spam' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_type = 'phishing' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_type = 'malware' THEN 1 ELSE 0 END,
    CASE WHEN p_threat_type = 'suspicious' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_emails = email_statistics.total_emails + 1,
    safe_emails = email_statistics.safe_emails + CASE WHEN p_threat_level = 'safe' THEN 1 ELSE 0 END,
    low_threat_emails = email_statistics.low_threat_emails + CASE WHEN p_threat_level = 'low' THEN 1 ELSE 0 END,
    medium_threat_emails = email_statistics.medium_threat_emails + CASE WHEN p_threat_level = 'medium' THEN 1 ELSE 0 END,
    high_threat_emails = email_statistics.high_threat_emails + CASE WHEN p_threat_level = 'high' THEN 1 ELSE 0 END,
    spam_emails = email_statistics.spam_emails + CASE WHEN p_threat_type = 'spam' THEN 1 ELSE 0 END,
    phishing_emails = email_statistics.phishing_emails + CASE WHEN p_threat_type = 'phishing' THEN 1 ELSE 0 END,
    malware_emails = email_statistics.malware_emails + CASE WHEN p_threat_type = 'malware' THEN 1 ELSE 0 END,
    suspicious_emails = email_statistics.suspicious_emails + CASE WHEN p_threat_type = 'suspicious' THEN 1 ELSE 0 END,
    updated_at = now();
END;
$$;