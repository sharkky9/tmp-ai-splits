-- Performance Indexes for LLM Expense Splitting Application
-- These indexes optimize common query patterns for production use

-- =============================================================================
-- GROUP-RELATED INDEXES
-- =============================================================================

-- Index for finding groups by creator (frequent query for user dashboard)
CREATE INDEX IF NOT EXISTS idx_groups_created_by_enhanced 
ON groups (created_by, created_at DESC);

-- Index for group name searches
CREATE INDEX IF NOT EXISTS idx_groups_name 
ON groups (name);

-- =============================================================================
-- GROUP MEMBER INDEXES
-- =============================================================================

-- Composite index for finding group members with role
CREATE INDEX IF NOT EXISTS idx_group_members_group_role 
ON group_members (group_id, role, joined_at DESC);

-- Index for active members (non-placeholder)
CREATE INDEX IF NOT EXISTS idx_group_members_active 
ON group_members (group_id, user_id) 
WHERE is_placeholder = false;

-- =============================================================================
-- EXPENSE INDEXES
-- =============================================================================

-- Primary index for expenses by group with date (main dashboard view)
CREATE INDEX IF NOT EXISTS idx_expenses_group_date_enhanced 
ON expenses (group_id, date_of_expense DESC, status);

-- Index for expenses by creator (settlement calculations)
CREATE INDEX IF NOT EXISTS idx_expenses_created_by_group 
ON expenses (created_by, group_id, date_of_expense DESC);

-- Index for finding expenses by amount range (analytics)
CREATE INDEX IF NOT EXISTS idx_expenses_amount 
ON expenses (group_id, total_amount DESC);

-- Composite index for expense queries with all common filters
CREATE INDEX IF NOT EXISTS idx_expenses_comprehensive 
ON expenses (group_id, date_of_expense DESC, created_by, total_amount);

-- Index for currency-based queries
CREATE INDEX IF NOT EXISTS idx_expenses_currency 
ON expenses (group_id, currency, date_of_expense DESC);

-- =============================================================================
-- PROFILE INDEXES
-- =============================================================================

-- Index for profile lookups by email (authentication flows)
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles (email);

-- Index for profile name searches (user lookup in groups)
CREATE INDEX IF NOT EXISTS idx_profiles_name 
ON profiles (name);

-- =============================================================================
-- PARTIAL INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Partial index for confirmed expenses only
CREATE INDEX IF NOT EXISTS idx_expenses_confirmed 
ON expenses (group_id, date_of_expense DESC) 
WHERE status = 'confirmed';

-- Partial index for pending expenses (requiring review)
CREATE INDEX IF NOT EXISTS idx_expenses_pending 
ON expenses (group_id, created_at DESC) 
WHERE status = 'pending_confirmation';

-- Note: Commented out due to CURRENT_DATE not being immutable in index predicates
-- Partial index for recent expenses (last 30 days)
-- CREATE INDEX IF NOT EXISTS idx_expenses_recent 
-- ON expenses (group_id, date_of_expense DESC) 
-- WHERE date_of_expense >= CURRENT_DATE - INTERVAL '30 days';

-- =============================================================================
-- ANALYTICS AND REPORTING INDEXES
-- =============================================================================

-- Index for monthly expense aggregations
CREATE INDEX IF NOT EXISTS idx_expenses_monthly_stats 
ON expenses (group_id, EXTRACT(YEAR FROM date_of_expense), EXTRACT(MONTH FROM date_of_expense));

-- Index for LLM confidence analysis
CREATE INDEX IF NOT EXISTS idx_expenses_confidence 
ON expenses (group_id, llm_confidence_score DESC) 
WHERE llm_confidence_score IS NOT NULL;

-- =============================================================================
-- JSONB INDEXES FOR COMPLEX QUERIES
-- =============================================================================

-- GIN index for payers JSONB queries
CREATE INDEX IF NOT EXISTS idx_expenses_payers_gin 
ON expenses USING GIN (payers);

-- GIN index for participants JSONB queries
CREATE INDEX IF NOT EXISTS idx_expenses_participants_gin 
ON expenses USING GIN (participants);

-- GIN index for items JSONB queries
CREATE INDEX IF NOT EXISTS idx_expenses_items_gin 
ON expenses USING GIN (items);

-- =============================================================================
-- PERFORMANCE MONITORING
-- =============================================================================

-- Add comments for index monitoring
COMMENT ON INDEX idx_groups_created_by_enhanced IS 'Optimizes user dashboard group queries with date sorting';
COMMENT ON INDEX idx_expenses_group_date_enhanced IS 'Primary index for expense list views with status filter';
COMMENT ON INDEX idx_group_members_active IS 'Optimizes group membership checks for non-placeholder users';
COMMENT ON INDEX idx_expenses_comprehensive IS 'Composite index for complex expense filters';

-- =============================================================================
-- INDEX STATISTICS UPDATE
-- =============================================================================

-- Update table statistics for query planner optimization
ANALYZE groups;
ANALYZE group_members;
ANALYZE expenses;
ANALYZE profiles; 