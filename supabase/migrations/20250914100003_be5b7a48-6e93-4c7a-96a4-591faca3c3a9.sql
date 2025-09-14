-- Add gmail_id column to emails table for Gmail integration
ALTER TABLE public.emails 
ADD COLUMN gmail_id TEXT UNIQUE;

-- Add index for gmail_id for better performance
CREATE INDEX idx_emails_gmail_id ON public.emails(gmail_id);

-- Add index for user_id and gmail_id combination
CREATE INDEX idx_emails_user_gmail ON public.emails(user_id, gmail_id);