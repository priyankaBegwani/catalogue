-- Add foreign key constraint between login_history and user_profiles
-- This allows Supabase to recognize the relationship for joins

-- First, we need to add a foreign key that references user_profiles
-- Since login_history.user_id already references auth.users(id) and 
-- user_profiles.id also references auth.users(id), we can create this relationship

ALTER TABLE login_history 
ADD CONSTRAINT login_history_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(id) 
ON DELETE CASCADE;

-- Add comment explaining the relationship
COMMENT ON CONSTRAINT login_history_user_id_fkey ON login_history IS 
'Links login history records to user profiles for easier querying';
