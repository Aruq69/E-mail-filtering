-- Fix email statistics calculation to match dashboard logic
-- The current statistics have incorrect counts where low_threat_emails are not being counted properly

-- First, clear existing statistics to recalculate them correctly
DELETE FROM email_statistics;

-- Recalculate email statistics based on actual email data
-- This matches the dashboard logic where:
-- - legitimate emails and low threat emails are considered "safe"
-- - only spam emails with medium/high threat are considered threats
INSERT INTO email_statistics (
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
SELECT 
  user_id,
  DATE(received_date) as date,
  COUNT(*) as total_emails,
  -- Safe emails: legitimate + low threat level emails
  COUNT(*) FILTER (WHERE classification = 'legitimate' OR threat_level = 'low') as safe_emails,
  -- Low threat emails (these are actually safe)
  COUNT(*) FILTER (WHERE threat_level = 'low') as low_threat_emails,
  -- Medium threats: spam with medium threat level OR pending emails
  COUNT(*) FILTER (WHERE (classification = 'spam' AND threat_level = 'medium') OR classification = 'pending') as medium_threat_emails,
  -- High threats: spam with high threat level
  COUNT(*) FILTER (WHERE classification = 'spam' AND threat_level = 'high') as high_threat_emails,
  -- Spam emails
  COUNT(*) FILTER (WHERE classification = 'spam') as spam_emails,
  -- Phishing emails (based on threat_type)
  COUNT(*) FILTER (WHERE threat_type = 'phishing') as phishing_emails,
  -- Malware emails (based on threat_type)
  COUNT(*) FILTER (WHERE threat_type = 'malware') as malware_emails,
  -- Suspicious emails (based on threat_type)
  COUNT(*) FILTER (WHERE threat_type = 'suspicious') as suspicious_emails
FROM emails
GROUP BY user_id, DATE(received_date)
ON CONFLICT (user_id, date) 
DO UPDATE SET
  total_emails = EXCLUDED.total_emails,
  safe_emails = EXCLUDED.safe_emails,
  low_threat_emails = EXCLUDED.low_threat_emails,
  medium_threat_emails = EXCLUDED.medium_threat_emails,
  high_threat_emails = EXCLUDED.high_threat_emails,
  spam_emails = EXCLUDED.spam_emails,
  phishing_emails = EXCLUDED.phishing_emails,
  malware_emails = EXCLUDED.malware_emails,
  suspicious_emails = EXCLUDED.suspicious_emails,
  updated_at = now();