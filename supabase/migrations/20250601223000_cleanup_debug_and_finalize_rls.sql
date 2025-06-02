-- Clean up debug policies and finalize secure RLS for groups
-- The secure RLS policy is now working correctly

-- Remove debug policy since we've confirmed everything works
DROP POLICY IF EXISTS "DEBUG Log INSERT attempts" ON public.groups;

-- Keep the main secure INSERT policy (this one is working correctly)
-- "Allow group INSERT for authenticated users with matching UID" - already exists

-- Ensure we have proper SELECT policies for groups
-- Users can see groups they're members of OR groups they created
DROP POLICY IF EXISTS "Allow group SELECT for members" ON public.groups;
DROP POLICY IF EXISTS "Allow group SELECT for creators" ON public.groups;

-- Create comprehensive SELECT policy
CREATE POLICY "Allow group SELECT for members and creators" ON public.groups
  FOR SELECT
  USING (
    public.is_group_member(id, auth.uid()) 
    OR created_by = auth.uid()
  );

-- Ensure proper UPDATE policy exists
DROP POLICY IF EXISTS "Allow group UPDATE for admins or creator" ON public.groups;

CREATE POLICY "Allow group UPDATE for admins or creator" ON public.groups
  FOR UPDATE
  USING (
    public.is_group_admin(id, auth.uid()) 
    OR created_by = auth.uid()
  )
  WITH CHECK (
    public.is_group_admin(id, auth.uid()) 
    OR created_by = auth.uid()
  );

-- Ensure proper DELETE policy exists  
DROP POLICY IF EXISTS "Allow group DELETE for creator" ON public.groups;

CREATE POLICY "Allow group DELETE for creator" ON public.groups
  FOR DELETE
  USING (created_by = auth.uid());

-- Optional: Keep debug table for future troubleshooting but clean up debug function
-- You can remove these later if not needed:
-- DROP TABLE IF EXISTS public.debug_auth_log;
-- DROP FUNCTION IF EXISTS public.debug_and_allow_insert(UUID);
-- DROP FUNCTION IF EXISTS public.log_successful_auth(); 