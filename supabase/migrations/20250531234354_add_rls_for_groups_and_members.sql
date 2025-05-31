-- Enable RLS for groups and group_members tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the current user is a member of a specific group
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE -- Indicates the function does not modify the database and returns same results for same arguments
SECURITY DEFINER -- Important if it needs to access tables with RLS enabled that the calling user might not directly access
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id
  );
$$;

-- Helper function to check if the current user is an admin of a specific group
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id AND gm.role = 'admin'
  );
$$;

-- RLS Policies for public.groups table

-- Users can see groups they are a member of
CREATE POLICY "Allow group SELECT for members" ON public.groups
  FOR SELECT
  USING (public.is_group_member(id, auth.uid()));

-- Authenticated users can insert new groups (they become created_by)
CREATE POLICY "Allow group INSERT for authenticated users" ON public.groups
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'); -- The created_by field should be set by the application to auth.uid()

-- Users can update groups they are an admin of, or if they created the group
CREATE POLICY "Allow group UPDATE for admins or creator" ON public.groups
  FOR UPDATE
  USING (public.is_group_admin(id, auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_group_admin(id, auth.uid()) OR created_by = auth.uid());

-- Users can delete groups they created (or admins - more complex, for now just creator)
CREATE POLICY "Allow group DELETE for creator" ON public.groups
  FOR DELETE
  USING (created_by = auth.uid());


-- RLS Policies for public.group_members table

-- Users can see members of groups they are part of
CREATE POLICY "Allow group_members SELECT for group members" ON public.group_members
  FOR SELECT
  USING (public.is_group_member(group_id, auth.uid()));

-- Group admins can insert new members into their group
CREATE POLICY "Allow group_members INSERT for group admins" ON public.group_members
  FOR INSERT
  WITH CHECK (public.is_group_admin(group_id, auth.uid()));

-- Group admins can update member roles (e.g. promote to admin, demote)
-- Users can update their own record (e.g. to change role if allowed, or for future self-leave)
CREATE POLICY "Allow group_members UPDATE for group admins or self" ON public.group_members
  FOR UPDATE
  USING (public.is_group_admin(group_id, auth.uid()) OR user_id = auth.uid());

-- Group admins can remove members from their group
-- Users can remove themselves (leave group)
CREATE POLICY "Allow group_members DELETE for group admins or self" ON public.group_members
  FOR DELETE
  USING (public.is_group_admin(group_id, auth.uid()) OR user_id = auth.uid());

-- Grant usage on helper functions to authenticated role
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(UUID, UUID) TO authenticated;
