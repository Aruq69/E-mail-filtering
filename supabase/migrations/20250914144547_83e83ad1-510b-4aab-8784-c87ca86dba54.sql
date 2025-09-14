-- Create table for Nylas tokens (replacing Gmail-specific approach)
CREATE TABLE IF NOT EXISTS public.nylas_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  email_address TEXT NOT NULL,
  provider TEXT NOT NULL, -- gmail, outlook, yahoo, etc.
  grant_id TEXT NOT NULL, -- Nylas grant ID
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nylas_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for Nylas tokens
CREATE POLICY "Users can view their own nylas tokens" 
ON public.nylas_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nylas tokens" 
ON public.nylas_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nylas tokens" 
ON public.nylas_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nylas tokens" 
ON public.nylas_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for timestamp updates
CREATE TRIGGER update_nylas_tokens_updated_at
BEFORE UPDATE ON public.nylas_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();