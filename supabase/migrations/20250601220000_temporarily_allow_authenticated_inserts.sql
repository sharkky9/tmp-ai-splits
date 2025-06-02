-- Temporarily allow any authenticated user to create groups
-- This will help us diagnose if the issue is with JWT authentication vs the specific UID check

-- Drop the debug policy
DROP POLICY IF EXISTS "TEMP Debug Allow All Group INSERT" ON public.groups;

-- Create a simple policy that only checks if user is authenticated
CREATE POLICY "TEMP Allow authenticated users to create groups" ON public.groups
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Also log successful authentications to our debug table
CREATE OR REPLACE FUNCTION public.log_successful_auth()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log when auth.role() = 'authenticated' 
  INSERT INTO public.debug_auth_log (auth_uid, auth_role, created_by_value)
  VALUES (auth.uid()::TEXT, auth.role()::TEXT, NULL);
  
  RETURN auth.role() = 'authenticated';
END;
$$;

-- Grant execute to authenticated users  
GRANT EXECUTE ON FUNCTION public.log_successful_auth() TO authenticated;

-- Create an additional policy that logs successful authentication
CREATE POLICY "TEMP Log successful auth" ON public.groups
  FOR SELECT
  USING (public.log_successful_auth()); 