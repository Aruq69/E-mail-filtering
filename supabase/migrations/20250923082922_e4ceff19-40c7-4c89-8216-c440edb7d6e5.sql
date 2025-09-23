-- Reset email statistics to match actual emails in database
-- This will fix the statistics mismatch between dashboard and insights

-- Clear existing statistics to avoid inconsistencies
DELETE FROM public.email_statistics;

-- Recreate statistics based on actual emails in the database
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
  suspicious_emails,
  created_at,
  updated_at
)
SELECT 
  user_id,
  CURRENT_DATE as date,
  COUNT(*) as total_emails,
  COUNT(CASE WHEN threat_level = 'safe' OR threat_level IS NULL OR threat_level = 'low' THEN 1 END) as safe_emails,
  COUNT(CASE WHEN threat_level = 'low' THEN 1 END) as low_threat_emails,
  COUNT(CASE WHEN threat_level = 'medium' THEN 1 END) as medium_threat_emails,
  COUNT(CASE WHEN threat_level = 'high' THEN 1 END) as high_threat_emails,
  COUNT(CASE WHEN threat_type = 'spam' THEN 1 END) as spam_emails,
  COUNT(CASE WHEN threat_type = 'phishing' THEN 1 END) as phishing_emails,
  COUNT(CASE WHEN threat_type = 'malware' THEN 1 END) as malware_emails,
  COUNT(CASE WHEN threat_type = 'suspicious' THEN 1 END) as suspicious_emails,
  now() as created_at,
  now() as updated_at
FROM public.emails
GROUP BY user_id
HAVING COUNT(*) > 0;