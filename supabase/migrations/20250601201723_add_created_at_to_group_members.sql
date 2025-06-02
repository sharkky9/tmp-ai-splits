-- Add missing created_at and updated_at columns to group_members table
-- This migration resolves the schema inconsistency where group_members table
-- was missing standard audit columns that are present in all other tables
-- Related to: BKLOG-20250101-004

-- =============================================================================
-- STEP 1: Add the missing columns with appropriate defaults
-- =============================================================================

-- Add created_at column with default timestamp
ALTER TABLE public.group_members 
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Add updated_at column with default timestamp  
ALTER TABLE public.group_members
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- =============================================================================
-- STEP 2: Backfill existing data to maintain data consistency
-- =============================================================================

-- Set created_at to joined_at for all existing records
-- This preserves the original membership creation timestamp
UPDATE public.group_members 
SET created_at = joined_at;

-- Set updated_at to joined_at for existing records (no modifications yet)
UPDATE public.group_members 
SET updated_at = joined_at;

-- =============================================================================
-- STEP 3: Create update trigger for updated_at column
-- =============================================================================

-- The update_updated_at_column function already exists from previous migrations
-- Add trigger to automatically update updated_at on record modifications
CREATE TRIGGER update_group_members_updated_at 
  BEFORE UPDATE ON public.group_members 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- STEP 4: Add performance indexes for new timestamp columns
-- =============================================================================

-- Index for created_at (most common query pattern will be ordering by creation time)
CREATE INDEX IF NOT EXISTS idx_group_members_created_at 
ON public.group_members (group_id, created_at DESC);

-- Index for updated_at (for tracking recent membership changes)  
CREATE INDEX IF NOT EXISTS idx_group_members_updated_at
ON public.group_members (group_id, updated_at DESC);

-- Composite index for common query patterns (group + role + creation time)
CREATE INDEX IF NOT EXISTS idx_group_members_group_role_created 
ON public.group_members (group_id, role, created_at DESC);

-- =============================================================================
-- STEP 5: Update existing performance indexes to use created_at
-- =============================================================================

-- The existing index idx_group_members_group_role uses joined_at DESC
-- We'll keep it for backward compatibility but add the new created_at version above

-- =============================================================================
-- STEP 6: Add comments for documentation
-- =============================================================================

-- Document the columns for future reference
COMMENT ON COLUMN public.group_members.created_at IS 'Timestamp when the group membership was created. Backfilled from joined_at for existing records.';
COMMENT ON COLUMN public.group_members.updated_at IS 'Timestamp when the group membership was last modified. Automatically updated by trigger.';
COMMENT ON COLUMN public.group_members.joined_at IS 'Original domain-specific timestamp for when user joined the group. Maintained for backward compatibility.';

-- Document the new indexes
COMMENT ON INDEX idx_group_members_created_at IS 'Optimizes group member queries ordered by creation time';
COMMENT ON INDEX idx_group_members_updated_at IS 'Optimizes queries tracking recent membership changes';  
COMMENT ON INDEX idx_group_members_group_role_created IS 'Optimizes complex group member queries with role and creation time filters';

-- =============================================================================
-- VALIDATION QUERIES (for manual testing)
-- =============================================================================

-- Verify columns were added successfully
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'group_members' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Verify data backfill was successful
-- SELECT 
--   COUNT(*) as total_records,
--   COUNT(CASE WHEN created_at = joined_at THEN 1 END) as backfilled_created_at,
--   COUNT(CASE WHEN updated_at = joined_at THEN 1 END) as backfilled_updated_at
-- FROM public.group_members;

-- Verify trigger was created
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'group_members' AND event_object_schema = 'public';

-- Verify indexes were created
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'group_members' AND schemaname = 'public'
-- AND indexname LIKE '%created_at%' OR indexname LIKE '%updated_at%';

-- =============================================================================
-- ROLLBACK PLAN (for emergency use only)
-- =============================================================================

-- To rollback this migration if needed:
-- DROP TRIGGER IF EXISTS update_group_members_updated_at ON public.group_members;
-- DROP INDEX IF EXISTS idx_group_members_created_at;
-- DROP INDEX IF EXISTS idx_group_members_updated_at; 
-- DROP INDEX IF EXISTS idx_group_members_group_role_created;
-- ALTER TABLE public.group_members DROP COLUMN IF EXISTS created_at;
-- ALTER TABLE public.group_members DROP COLUMN IF EXISTS updated_at; 