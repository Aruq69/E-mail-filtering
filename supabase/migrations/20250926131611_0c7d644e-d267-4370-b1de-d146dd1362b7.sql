-- Update existing emails with incorrect threat levels
-- Spam and suspicious emails should be HIGH threat, not medium

UPDATE emails 
SET threat_level = 'high'
WHERE classification IN ('spam', 'suspicious') 
AND threat_level != 'high';

-- Update email statistics to reflect correct threat levels
UPDATE email_statistics 
SET 
  high_threat_emails = high_threat_emails + medium_threat_emails,
  medium_threat_emails = 0
WHERE medium_threat_emails > 0 
AND (spam_emails > 0 OR suspicious_emails > 0);

-- Log the update
INSERT INTO admin_audit_log (admin_user_id, action_type, target_type, target_id, action_details)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'system_update',
  'email_classification',
  '00000000-0000-0000-0000-000000000000'::uuid,
  jsonb_build_object(
    'description', 'Updated spam/suspicious emails to high threat level',
    'reason', 'Classification logic enhancement - non-legitimate emails = high threat',
    'timestamp', now()
  )
);