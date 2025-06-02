-- Fix SELECT policies that might be causing dashboard errors

-- Drop the problematic logging SELECT policy
DROP POLICY IF EXISTS "TEMP Log successful auth" ON public.groups;

-- Ensure there's a proper SELECT policy for groups
DROP POLICY IF EXISTS "Allow group SELECT for members" ON public.groups;

-- Create a simple SELECT policy that allows users to see groups they're members of
CREATE POLICY "Allow group SELECT for members" ON public.groups
  FOR SELECT
  USING (public.is_group_member(id, auth.uid()));

-- Also allow users to see groups they created
CREATE POLICY "Allow group SELECT for creators" ON public.groups
  FOR SELECT  
  USING (created_by = auth.uid()); 