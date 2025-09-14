-- Enable leaked password protection for enhanced security
-- This helps prevent users from using passwords that have been compromised in data breaches
UPDATE auth.config 
SET leaked_password_protection = true 
WHERE NOT leaked_password_protection;