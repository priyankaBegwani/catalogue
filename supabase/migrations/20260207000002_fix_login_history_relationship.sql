-- Fix the login_history foreign key relationship
-- Drop the original constraint to auth.users and keep only the one to user_profiles

-- Drop the inline constraint created with REFERENCES auth.users(id)
ALTER TABLE login_history 
DROP CONSTRAINT IF EXISTS login_history_user_id_fkey;

-- Drop any auto-generated constraint name
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find and drop any constraint on user_id that references auth.users
    FOR constraint_name IN 
        SELECT con.conname
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'login_history'
        AND con.contype = 'f'
        AND con.conkey::text = (
            SELECT array_agg(attnum)::text 
            FROM pg_attribute 
            WHERE attrelid = rel.oid AND attname = 'user_id'
        )
    LOOP
        EXECUTE format('ALTER TABLE login_history DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

-- Now add the correct foreign key to user_profiles
ALTER TABLE login_history 
ADD CONSTRAINT login_history_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(id) 
ON DELETE CASCADE;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Add comment
COMMENT ON CONSTRAINT login_history_user_id_fkey ON login_history IS 
'Links login history records to user profiles for querying user information';
