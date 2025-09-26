-- Update the classification check constraint to include new classification types
ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_classification_check;

-- Add updated constraint with all valid classification types
ALTER TABLE emails ADD CONSTRAINT emails_classification_check 
CHECK (classification IN ('spam', 'legitimate', 'phishing', 'suspicious', 'questionable', 'safe', 'ham'));

-- Update threat_level constraint if it exists
ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_threat_level_check;

-- Add updated threat level constraint
ALTER TABLE emails ADD CONSTRAINT emails_threat_level_check 
CHECK (threat_level IN ('safe', 'low', 'medium', 'high'));

-- Update threat_type constraint if it exists  
ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_threat_type_check;

-- Add updated threat type constraint
ALTER TABLE emails ADD CONSTRAINT emails_threat_type_check 
CHECK (threat_type IN ('spam', 'phishing', 'suspicious', 'questionable', 'malware') OR threat_type IS NULL);