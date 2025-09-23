-- Clear expired Gmail tokens to force re-authentication
DELETE FROM gmail_tokens WHERE expires_at < now();