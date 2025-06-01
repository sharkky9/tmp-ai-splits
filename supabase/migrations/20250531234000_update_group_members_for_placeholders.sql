-- Migration to update group_members table to support placeholder members
-- This aligns the existing schema with the implementation plan requirements

-- Drop existing composite primary key constraint on group_members table
ALTER TABLE public.group_members DROP CONSTRAINT group_members_pkey;

-- Add UUID primary key column id with default uuid_generate_v4()
ALTER TABLE public.group_members ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4();

-- Make user_id column nullable to support placeholder members
ALTER TABLE public.group_members ALTER COLUMN user_id DROP NOT NULL;

-- Add placeholder_name, email, and is_placeholder columns
ALTER TABLE public.group_members ADD COLUMN placeholder_name TEXT;
ALTER TABLE public.group_members ADD COLUMN email TEXT;
ALTER TABLE public.group_members ADD COLUMN is_placeholder BOOLEAN DEFAULT FALSE;

-- Add constraint to ensure either user_id OR placeholder_name is provided
ALTER TABLE public.group_members ADD CONSTRAINT check_user_or_placeholder CHECK (user_id IS NOT NULL OR placeholder_name IS NOT NULL);

-- Update existing records to comply with new constraint (assuming user_id was always populated)
UPDATE public.group_members SET is_placeholder = FALSE WHERE user_id IS NOT NULL;

-- Add unique constraints to prevent duplicate members and placeholders
-- A user cannot be in the same group twice
ALTER TABLE public.group_members ADD CONSTRAINT unique_user_in_group UNIQUE (group_id, user_id);

-- A placeholder name must be unique within a group
ALTER TABLE public.group_members ADD CONSTRAINT unique_placeholder_in_group UNIQUE (group_id, placeholder_name);

-- Update helper functions to work with new schema
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id 
      AND gm.user_id = p_user_id 
      AND gm.is_placeholder = FALSE
  );
$$; 