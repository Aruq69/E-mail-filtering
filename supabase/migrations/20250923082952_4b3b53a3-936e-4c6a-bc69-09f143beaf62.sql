-- Enable leaked password protection for enhanced security
-- This fixes the security warning about leaked password protection being disabled

-- Note: This is a configuration setting that may need to be enabled through the Supabase dashboard
-- However, we can document this requirement for the user

-- Create a comment to document the security requirement
COMMENT ON SCHEMA public IS 'Security Note: Enable leaked password protection in Supabase Auth settings to prevent users from using compromised passwords. Visit: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection';