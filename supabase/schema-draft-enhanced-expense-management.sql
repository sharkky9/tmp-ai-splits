-- Enhanced Expense Management Schema Draft
-- This file contains proposed schema changes for supporting advanced expense splitting

-- Modify existing expenses table to support additional fields
-- Note: Some fields may already exist, this shows the desired final structure
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'confirmed', 'edited', 'discarded')),
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create expense_splits table to track individual member splits
CREATE TABLE IF NOT EXISTS expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    member_id UUID NOT NULL, -- References group_members.id
    user_id UUID REFERENCES profiles(id), -- For registered users
    placeholder_name TEXT, -- For placeholder members
    split_amount DECIMAL(10,2) NOT NULL CHECK (split_amount >= 0),
    share_description TEXT, -- Explanation of how this split was calculated (e.g., "Equal split of $30 among 3 people")
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure either user_id or placeholder_name is provided (but not both)
    CONSTRAINT expense_splits_member_check 
        CHECK ((user_id IS NOT NULL AND placeholder_name IS NULL) OR (user_id IS NULL AND placeholder_name IS NOT NULL)),
    
    -- Unique constraint to prevent duplicate splits for same expense/member
    CONSTRAINT expense_splits_unique_member_per_expense 
        UNIQUE (expense_id, member_id)
);

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_member_id ON expense_splits(member_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_expense_splits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_splits_updated_at
    BEFORE UPDATE ON expense_splits
    FOR EACH ROW
    EXECUTE FUNCTION update_expense_splits_updated_at();

-- RLS Policies for expense_splits
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- Users can only see splits for groups they belong to
CREATE POLICY expense_splits_select_policy ON expense_splits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM expenses e
            JOIN group_members gm ON e.group_id = gm.group_id
            WHERE e.id = expense_splits.expense_id 
            AND gm.user_id = auth.uid()
        )
    );

-- Users can only insert splits for expenses in groups they belong to
CREATE POLICY expense_splits_insert_policy ON expense_splits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM expenses e
            JOIN group_members gm ON e.group_id = gm.group_id
            WHERE e.id = expense_splits.expense_id 
            AND gm.user_id = auth.uid()
        )
    );

-- Users can only update splits for expenses in groups they belong to
CREATE POLICY expense_splits_update_policy ON expense_splits
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM expenses e
            JOIN group_members gm ON e.group_id = gm.group_id
            WHERE e.id = expense_splits.expense_id 
            AND gm.user_id = auth.uid()
        )
    );

-- Users can only delete splits for expenses in groups they belong to
CREATE POLICY expense_splits_delete_policy ON expense_splits
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM expenses e
            JOIN group_members gm ON e.group_id = gm.group_id
            WHERE e.id = expense_splits.expense_id 
            AND gm.user_id = auth.uid()
        )
    );

-- Add some sample categories (could be moved to a separate categories table later)
COMMENT ON COLUMN expenses.category IS 'Expense category such as food, transport, accommodation, entertainment, etc.';

-- Helper view for getting expenses with their splits
CREATE OR REPLACE VIEW expenses_with_splits AS
SELECT 
    e.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', es.id,
                'member_id', es.member_id,
                'user_id', es.user_id,
                'placeholder_name', es.placeholder_name,
                'split_amount', es.split_amount,
                'share_description', es.share_description
            ) ORDER BY es.created_at
        ) FILTER (WHERE es.id IS NOT NULL),
        '[]'::json
    ) as expense_splits
FROM expenses e
LEFT JOIN expense_splits es ON e.id = es.expense_id
GROUP BY e.id; 