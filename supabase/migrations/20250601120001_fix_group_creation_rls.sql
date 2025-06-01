-- Fix RLS policies for group creation
-- This migration addresses issues with creating groups and automatically adding the creator as a member

-- Update the INSERT policy for groups to be more specific about created_by
DROP POLICY IF EXISTS "Allow group INSERT for authenticated users" ON public.groups;

CREATE POLICY "Allow group INSERT for authenticated users" ON public.groups
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND created_by = auth.uid()
  );

-- Create a function to automatically add the group creator as an admin member
CREATE OR REPLACE FUNCTION public.add_creator_as_group_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creator as an admin member of the group
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically add creator as admin when group is created
DROP TRIGGER IF EXISTS trigger_add_creator_as_admin ON public.groups;

CREATE TRIGGER trigger_add_creator_as_admin
  AFTER INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_group_admin();

-- Update the INSERT policy for group_members to allow the automatic trigger
-- We need to allow the system to insert the creator as admin
CREATE POLICY "Allow group_members INSERT for creator during group creation" ON public.group_members
  FOR INSERT
  WITH CHECK (
    -- Allow if user is admin of the group OR if this is during group creation (creator becoming admin)
    public.is_group_admin(group_id, auth.uid()) 
    OR (role = 'admin' AND user_id = auth.uid())
  );

-- Drop the old policy that was too restrictive
DROP POLICY IF EXISTS "Allow group_members INSERT for group admins" ON public.group_members;

-- Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION public.add_creator_as_group_admin() TO authenticated; 