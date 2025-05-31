-- Create the groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL, -- Or ON DELETE RESTRICT depending on desired behavior
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add a trigger to update the updated_at timestamp on groups table
CREATE TRIGGER handle_group_update
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column(); -- Assumes update_updated_at_column function from previous migration

-- Create the group_members table (junction table)
CREATE TABLE public.group_members (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member', -- Example roles
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (group_id, user_id) -- Composite primary key
);

-- Add indexes for faster lookups
CREATE INDEX idx_groups_created_by ON public.groups(created_by);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);

-- RLS policies will be defined in a separate step/migration as per task 2.1.2
