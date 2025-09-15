-- Add unique constraint on user_id for gmail_tokens table
ALTER TABLE public.gmail_tokens 
ADD CONSTRAINT gmail_tokens_user_id_unique UNIQUE (user_id);