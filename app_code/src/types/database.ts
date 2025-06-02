/**
 * Represents a user profile as stored in the 'profiles' table.
 */
export interface Profile {
  id: string // UUID, matches auth.users.id
  name: string
  email: string // Denormalized for convenience, should match auth.users.email
  created_at: string // ISO 8601 timestamp
  updated_at: string // ISO 8601 timestamp
}

/**
 * Represents a group as stored in the 'groups' table.
 */
export interface Group {
  id: string // UUID, primary key
  name: string
  description: string | null
  created_by: string // UUID, foreign key to profiles.id
  created_at: string // ISO 8601 timestamp
  updated_at: string // ISO 8601 timestamp
}

/**
 * Represents a member within a group, as stored in the 'group_members' table.
 */
export interface GroupMember {
  id: string // UUID, primary key
  group_id: string // UUID, foreign key to groups.id
  user_id: string | null // UUID, foreign key to profiles.id (nullable for placeholders)
  placeholder_name: string | null
  email: string | null // Email for placeholder/invited members not yet registered
  is_placeholder: boolean // True if this member is a placeholder
  role: string | null // e.g., 'admin', 'member' (can be extended)
  joined_at: string // ISO 8601 timestamp - domain-specific timestamp for when user joined
  created_at: string // ISO 8601 timestamp - standard audit column for record creation
  updated_at: string // ISO 8601 timestamp - standard audit column for record modification
}

// --- Enums and other specific types can be added below ---

/**
 * Possible roles for a group member.
 */
export enum GroupMemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  // Add other roles as needed
}

// --- Helper types for Supabase queries (joining tables) ---

/**
 * Group with its creator's profile included.
 */
export interface GroupWithCreator extends Group {
  profiles: Profile | null // Creator's profile
}

/**
 * GroupMember with the associated user's profile included.
 */
export interface GroupMemberWithProfile extends GroupMember {
  profiles: Profile | null // Member's profile (if not a placeholder)
}

/**
 * Detailed group information including members and their profiles.
 */
export interface GroupDetails extends GroupWithCreator {
  group_members: GroupMemberWithProfile[]
}

export interface Expense {
  id: string
  group_id: string
  description: string
  original_input_text?: string
  total_amount: number
  currency: string
  date_of_expense: string
  payers: ExpensePayer[]
  participants: ExpenseParticipant[]
  items?: ExpenseItem[]
  llm_assumptions?: string[]
  llm_confidence_score?: number
  status: 'pending_confirmation' | 'confirmed' | 'edited'
  created_by: string
  created_at: string
  updated_at: string
}

export interface ExpensePayer {
  user_id?: string
  placeholder_name?: string
  amount: number
}

export interface ExpenseParticipant {
  user_id?: string
  placeholder_name?: string
  amount: number
  percentage?: number
}

export interface ExpenseItem {
  id: string
  description: string
  amount: number
  participants: ExpenseParticipant[]
}

// New types for enhanced expense management

/**
 * Represents an expense split entry showing how much each member owes for a specific expense
 */
export interface ExpenseSplit {
  id: string
  expense_id: string
  member_id: string
  user_id?: string // For registered users
  placeholder_name?: string // For placeholder members
  split_amount: number
  share_description?: string // Explanation of how this split was calculated
  created_at: string
  updated_at: string
}

/**
 * Represents the calculated balance for a group member
 */
export interface MemberBalance {
  member_id: string
  user_id?: string
  placeholder_name?: string
  name: string // Display name (from profile or placeholder_name)
  total_paid: number // Total amount this member has paid for expenses
  total_owed: number // Total amount this member owes for their share of expenses
  net_balance: number // Positive means they are owed money, negative means they owe money
}

/**
 * Enhanced expense type with split information
 */
export interface ExpenseWithSplits extends Expense {
  expense_splits: ExpenseSplit[]
}

/**
 * Split method types for manual expense creation
 */
export enum SplitMethod {
  EQUAL = 'equal',
  AMOUNT = 'amount',
  PERCENTAGE = 'percentage',
}

/**
 * Data structure for creating a new expense with custom splits
 */
export interface CreateExpenseRequest {
  group_id: string
  description: string
  total_amount: number
  currency: string
  date_of_expense: string
  category?: string
  payer_id: string // The member who paid
  split_method: SplitMethod
  participants: ExpenseParticipantInput[]
}

/**
 * Input structure for expense participants when creating an expense
 */
export interface ExpenseParticipantInput {
  member_id: string
  user_id?: string
  placeholder_name?: string
  split_amount?: number // For amount-based splits
  split_percentage?: number // For percentage-based splits
}

/**
 * Simplified debt structure for settlement suggestions
 */
export interface SimplifiedDebt {
  from_member_id: string
  from_name: string
  to_member_id: string
  to_name: string
  amount: number
}
