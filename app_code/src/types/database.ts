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
  created_at: string // ISO 8601 timestamp
  updated_at: string // ISO 8601 timestamp
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
