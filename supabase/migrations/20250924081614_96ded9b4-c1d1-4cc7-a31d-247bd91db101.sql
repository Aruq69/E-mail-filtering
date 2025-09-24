-- Add unique constraint to outlook_tokens table for user_id
ALTER TABLE public.outlook_tokens ADD CONSTRAINT outlook_tokens_user_id_unique UNIQUE (user_id);