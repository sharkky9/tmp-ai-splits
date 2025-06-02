-- Test script to validate group_members created_at column access
-- This query replicates the pattern used in GroupDetailView.tsx that was failing
-- Related to: BKLOG-20250101-004 - Step 4 Verification

-- =============================================================================
-- Test 1: Verify basic column access  
-- =============================================================================

-- This should work after migration (previously failed)
SELECT 
  id,
  group_id,
  user_id,
  role,
  is_placeholder,
  placeholder_name,
  email,
  joined_at,
  created_at,  -- This was missing before migration
  updated_at   -- This was missing before migration
FROM public.group_members 
LIMIT 5;

-- =============================================================================
-- Test 2: Verify the exact query pattern from GroupDetailView.tsx
-- =============================================================================

-- This replicates the exact query from GroupDetailView.tsx line 66-72
-- SELECT with profiles join and ORDER BY created_at
SELECT 
  gm.*,
  p.id as profile_id,
  p.name as profile_name,
  p.email as profile_email,
  p.created_at as profile_created_at,
  p.updated_at as profile_updated_at
FROM public.group_members gm
LEFT JOIN public.profiles p ON gm.user_id = p.id
WHERE gm.group_id = (SELECT id FROM public.groups LIMIT 1) -- Use any existing group
ORDER BY gm.created_at ASC; -- This was the failing part

-- =============================================================================
-- Test 3: Verify timestamp data consistency 
-- =============================================================================

-- Check that created_at was properly backfilled from joined_at
SELECT 
  id,
  role,
  joined_at,
  created_at,
  updated_at,
  CASE 
    WHEN created_at = joined_at THEN 'Backfilled correctly'
    ELSE 'Data inconsistency detected'
  END as backfill_status
FROM public.group_members
LIMIT 10;

-- =============================================================================
-- Test 4: Verify new indexes are being used
-- =============================================================================

-- Test performance with created_at ordering (should use new index)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM public.group_members 
WHERE group_id = (SELECT id FROM public.groups LIMIT 1)
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Should show Index Scan using idx_group_members_created_at

-- =============================================================================
-- Test 5: Verify trigger functionality
-- =============================================================================

-- Test that updated_at trigger works
-- Note: This would modify data, so commented out for safety
-- UPDATE public.group_members 
-- SET role = role  -- No-op update to trigger updated_at
-- WHERE id = (SELECT id FROM public.group_members LIMIT 1);

-- Then verify updated_at changed:
-- SELECT id, role, created_at, updated_at, 
--   CASE WHEN updated_at > created_at THEN 'Trigger works' ELSE 'Trigger issue' END
-- FROM public.group_members 
-- WHERE updated_at > created_at 
-- LIMIT 5;

-- =============================================================================
-- Expected Results
-- =============================================================================

-- All queries should execute successfully without "column does not exist" errors
-- Test 1: Shows all columns including created_at and updated_at
-- Test 2: Executes the exact failing query pattern without errors
-- Test 3: Shows created_at = joined_at for existing records (backfilled correctly)
-- Test 4: Shows index usage for performance optimization
-- Test 5: Would show trigger working correctly (commented for safety) 