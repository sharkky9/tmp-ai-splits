-- Simple auth debugging migration
-- This will add direct debugging to INSERT policy to see actual auth context values

-- 1. Drop any existing policies
DROP POLICY IF EXISTS "TEMP RLS DEBUG Log Auth Context" ON public.groups;
DROP POLICY IF EXISTS "TEMP Allow group INSERT if created_by matches uid" ON public.groups;
DROP POLICY IF EXISTS "Allow group INSERT for authenticated users" ON public.groups;

-- 2. Create a simpler debug function that logs to a table instead of RAISE NOTICE
CREATE TABLE IF NOT EXISTS public.debug_auth_log (
  id SERIAL PRIMARY KEY,
  logged_at TIMESTAMP DEFAULT NOW(),
  auth_uid TEXT,
  auth_role TEXT,
  created_by_value UUID
);

-- Grant access to authenticated users
GRANT INSERT ON public.debug_auth_log TO authenticated;

-- 3. Create function that logs to table and always returns true
CREATE OR REPLACE FUNCTION public.debug_and_allow_insert(created_by_val UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the auth context to our debug table
  INSERT INTO public.debug_auth_log (auth_uid, auth_role, created_by_value)
  VALUES (auth.uid()::TEXT, auth.role()::TEXT, created_by_val);
  
  -- Always return true to allow the insert
  RETURN TRUE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.debug_and_allow_insert(UUID) TO authenticated;

-- 4. Create a temporary INSERT policy that calls our debug function
CREATE POLICY "TEMP Debug Allow All Group INSERT" ON public.groups
  FOR INSERT
  WITH CHECK (public.debug_and_allow_insert(created_by)); 