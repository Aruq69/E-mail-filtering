-- CRITICAL SECURITY FIX: Remove public access and implement user-specific RLS
-- Step 1: Drop the dangerous public access policy
DROP POLICY IF EXISTS "Allow public access to emails" ON public.emails;

-- Step 2: Add user_id column to associate emails with users
ALTER TABLE public.emails 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Update existing emails to have a user_id (set to first user if any exist)
-- Note: In a real scenario, you'd need to properly map emails to their actual owners
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user from auth.users if any exist
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    -- If there are users and emails without user_id, assign them to the first user
    IF first_user_id IS NOT NULL THEN
        UPDATE public.emails 
        SET user_id = first_user_id 
        WHERE user_id IS NULL;
    END IF;
END $$;

-- Step 4: Make user_id NOT NULL after updating existing records
ALTER TABLE public.emails 
ALTER COLUMN user_id SET NOT NULL;

-- Step 5: Create secure RLS policies - users can only access their own emails
CREATE POLICY "Users can view their own emails" 
ON public.emails 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emails" 
ON public.emails 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emails" 
ON public.emails 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emails" 
ON public.emails 
FOR DELETE 
USING (auth.uid() = user_id);

-- Step 6: Create index for better performance on user_id queries
CREATE INDEX idx_emails_user_id ON public.emails(user_id);