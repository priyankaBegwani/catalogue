-- Update handle_new_user trigger to include can_order_individual_sizes field
-- This ensures the field is properly set when users are created via auth

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with can_order_individual_sizes support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, party_id, can_order_individual_sizes, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'retailer'),
    NEW.raw_user_meta_data->>'party_id',
    COALESCE((NEW.raw_user_meta_data->>'can_order_individual_sizes')::boolean, false),
    true
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment to document the update
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile with party_id and can_order_individual_sizes support from auth metadata';
