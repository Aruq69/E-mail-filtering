-- Add specific threat type field to emails table
ALTER TABLE public.emails 
ADD COLUMN threat_type TEXT;

-- Create constraint for threat types based on your image
ALTER TABLE public.emails 
ADD CONSTRAINT emails_threat_type_check 
CHECK (threat_type IS NULL OR threat_type = ANY (ARRAY[
  'spam',
  'business_email_compromise', 
  'phishing',
  'spoofing',
  'ransomware',
  'malware',
  'conversation_hijacking',
  'account_takeover', 
  'spear_phishing',
  'social_engineering',
  'lateral_phishing',
  'data_exfiltration',
  'mitm_attacks',
  'email_phishing',
  'vishing',
  'insider_threats',
  'whaling',
  'virus',
  'brand_impersonation',
  'password_attacks',
  'malicious_links',
  'pharming',
  'email_bombing',
  'darknet_email_threat'
]));

-- Add index for better performance on threat_type queries
CREATE INDEX idx_emails_threat_type ON public.emails(threat_type);

-- Add index for combined threat_level and threat_type queries
CREATE INDEX idx_emails_threat_level_type ON public.emails(threat_level, threat_type);