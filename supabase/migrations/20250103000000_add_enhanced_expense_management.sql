-- Enhanced Expense Management Migration
-- Adds support for advanced expense splitting with dedicated expense_splits table

-- Add missing fields to existing expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Update status check constraint to include 'discarded' status
ALTER TABLE expenses 
DROP CONSTRAINT IF EXISTS expenses_status_check;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_status_check 
CHECK (status IN ('pending_confirmation', 'confirmed', 'edited', 'discarded'));

-- Create expense_splits table to track individual member splits
CREATE TABLE expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    member_id UUID NOT NULL, -- References group_members.id (we'll add FK later if needed)
    user_id UUID REFERENCES profiles(id), -- For registered users
    placeholder_name TEXT, -- For placeholder members
    split_amount DECIMAL(10,2) NOT NULL CHECK (split_amount >= 0),
    share_description TEXT, -- Explanation of how this split was calculated
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure either user_id or placeholder_name is provided (but not both)
    CONSTRAINT expense_splits_member_check 
        CHECK ((user_id IS NOT NULL AND placeholder_name IS NULL) OR (user_id IS NULL AND placeholder_name IS NOT NULL)),
    
    -- Unique constraint to prevent duplicate splits for same expense/member
    CONSTRAINT expense_splits_unique_member_per_expense 
        UNIQUE (expense_id, member_id)
);

-- Add indices for performance on expense_splits
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_member_id ON expense_splits(member_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);

-- Add trigger to update updated_at timestamp on expense_splits
CREATE TRIGGER update_expense_splits_updated_at
    BEFORE UPDATE ON expense_splits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on expense_splits
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_splits
-- Users can only see splits for groups they belong to
CREATE POLICY "Users can read expense splits from their groups" ON expense_splits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM expenses e
            JOIN group_members gm ON e.group_id = gm.group_id
            WHERE e.id = expense_splits.expense_id 
            AND gm.user_id = auth.uid()
            AND gm.is_placeholder = false
        )
    );

-- Users can only insert splits for expenses in groups they belong to
CREATE POLICY "Users can create expense splits in their groups" ON expense_splits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM expenses e
            JOIN group_members gm ON e.group_id = gm.group_id
            WHERE e.id = expense_splits.expense_id 
            AND gm.user_id = auth.uid()
            AND gm.is_placeholder = false
        )
    );

-- Users can only update splits for expenses in groups they belong to
CREATE POLICY "Users can update expense splits in their groups" ON expense_splits
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM expenses e
            JOIN group_members gm ON e.group_id = gm.group_id
            WHERE e.id = expense_splits.expense_id 
            AND gm.user_id = auth.uid()
            AND gm.is_placeholder = false
        )
    );

-- Users can only delete splits for expenses in groups they belong to
CREATE POLICY "Users can delete expense splits in their groups" ON expense_splits
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM expenses e
            JOIN group_members gm ON e.group_id = gm.group_id
            WHERE e.id = expense_splits.expense_id 
            AND gm.user_id = auth.uid()
            AND gm.is_placeholder = false
        )
    );

-- Add comment for category field documentation
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
                'share_description', es.share_description,
                'created_at', es.created_at,
                'updated_at', es.updated_at
            ) ORDER BY es.created_at
        ) FILTER (WHERE es.id IS NOT NULL),
        '[]'::json
    ) as expense_splits
FROM expenses e
LEFT JOIN expense_splits es ON e.id = es.expense_id
GROUP BY e.id; 