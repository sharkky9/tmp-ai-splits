-- Restore secure RLS policy for groups with proper UID checking
-- Now that we know auth.uid() works correctly

-- Drop the temporary permissive policy
DROP POLICY IF EXISTS "TEMP Allow authenticated users to create groups" ON public.groups;

-- Create the secure INSERT policy that ensures created_by matches auth.uid()
CREATE POLICY "Allow group INSERT for authenticated users with matching UID" ON public.groups
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND created_by = auth.uid()
  );

-- Update our debug function to also log created_by for INSERT operations
CREATE OR REPLACE FUNCTION public.debug_and_allow_insert(created_by_val UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the auth context and created_by value for debugging
  INSERT INTO public.debug_auth_log (auth_uid, auth_role, created_by_value)
  VALUES (auth.uid()::TEXT, auth.role()::TEXT, created_by_val);
  
  -- Check if auth context matches
  RETURN (
    auth.role() = 'authenticated' 
    AND created_by_val = auth.uid()
  );
END;
$$;

-- Create an additional debug policy to log INSERT attempts
CREATE POLICY "DEBUG Log INSERT attempts" ON public.groups
  FOR INSERT
  WITH CHECK (public.debug_and_allow_insert(created_by)); 