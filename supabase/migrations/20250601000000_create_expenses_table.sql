-- Create expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  original_input_text TEXT,
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  date_of_expense DATE NOT NULL DEFAULT CURRENT_DATE,
  payers JSONB NOT NULL DEFAULT '[]'::jsonb,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  items JSONB DEFAULT '[]'::jsonb,
  llm_assumptions TEXT[],
  llm_confidence_score NUMERIC(3,2) CHECK (llm_confidence_score >= 0.0 AND llm_confidence_score <= 1.0),
  status TEXT NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'confirmed', 'edited')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_expenses_group_id ON expenses(group_id);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_expenses_date_of_expense ON expenses(date_of_expense);
CREATE INDEX idx_expenses_status ON expenses(status);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses
-- Users can only access expenses from groups they are members of

-- Policy for SELECT: Users can read expenses from their groups
CREATE POLICY "Users can read expenses from their groups" ON expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = expenses.group_id 
        AND group_members.user_id = auth.uid()
        AND group_members.is_placeholder = false
    )
  );

-- Policy for INSERT: Users can create expenses in their groups
CREATE POLICY "Users can create expenses in their groups" ON expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = expenses.group_id 
        AND group_members.user_id = auth.uid()
        AND group_members.is_placeholder = false
    )
    AND created_by = auth.uid()
  );

-- Policy for UPDATE: Users can update expenses they created in their groups
CREATE POLICY "Users can update their own expenses in their groups" ON expenses
  FOR UPDATE
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = expenses.group_id 
        AND group_members.user_id = auth.uid()
        AND group_members.is_placeholder = false
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = expenses.group_id 
        AND group_members.user_id = auth.uid()
        AND group_members.is_placeholder = false
    )
  );

-- Policy for DELETE: Users can delete expenses they created in their groups
CREATE POLICY "Users can delete their own expenses in their groups" ON expenses
  FOR DELETE
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = expenses.group_id 
        AND group_members.user_id = auth.uid()
        AND group_members.is_placeholder = false
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expenses_updated_at 
  BEFORE UPDATE ON expenses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 