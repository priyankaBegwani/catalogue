/*
  # Allow Self Profile Creation

  This migration allows users to create their own profile on first login.
  This is needed because email confirmation might be enabled in Supabase,
  preventing the trigger from working during signup.

  ## Changes
  - Add RLS policy allowing users to insert their own profile
*/

-- Allow users to create their own profile
CREATE POLICY "Users can create own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);