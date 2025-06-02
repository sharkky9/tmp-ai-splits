import { supabase } from './supabaseClient'

export interface Group {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
  member_count?: number
  total_expenses?: number
  user_balance?: number
}

export interface Expense {
  id: string
  group_id: string
  description: string
  total_amount: number
  currency: string
  date_of_expense: string
  payers: Payer[]
  participants: Participant[]
  status: string
  created_by: string
  created_at: string
}

export interface GroupMember {
  id?: string // UUID, primary key (optional for backward compatibility)
  group_id: string
  user_id: string | null // nullable for placeholder members
  role: string
  is_placeholder?: boolean // optional for backward compatibility
  placeholder_name?: string | null // optional for backward compatibility
  email?: string | null // optional for backward compatibility
  joined_at: string // domain-specific timestamp
  created_at?: string // standard audit column (optional for backward compatibility)
  updated_at?: string // standard audit column (optional for backward compatibility)
}

interface Payer {
  user_id: string
  amount: string
}

interface Participant {
  user_id: string
  amount: string
}

interface FetchedGroup extends Group {
  group_members: Array<{ user_id: string; role: string }>
}

// Get all groups for the current user
export async function getUserGroups(userId: string): Promise<Group[]> {
  const { data: groups, error } = await supabase
    .from('groups')
    .select(
      `
      id,
      name,
      description,
      created_by,
      created_at,
      updated_at,
      group_members (
        user_id,
        role
      )
    `
    )
    .eq('group_members.user_id', userId)

  if (error) {
    console.error('Error fetching user groups:', error)
    throw error
  }

  return groups || []
}

// Get expenses for a specific group
export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('group_id', groupId)
    .order('date_of_expense', { ascending: false })

  if (error) {
    console.error('Error fetching group expenses:', error)
    throw error
  }

  return expenses || []
}

// Get all expenses for user's groups
export async function getAllUserExpenses(userId: string): Promise<Expense[]> {
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select(
      `
      *,
      groups!inner (
        group_members!inner (
          user_id
        )
      )
    `
    )
    .eq('groups.group_members.user_id', userId)
    .order('date_of_expense', { ascending: false })

  if (error) {
    console.error('Error fetching user expenses:', error)
    throw error
  }

  return expenses || []
}

// Calculate user balance for a specific group
export function calculateUserBalanceInGroup(expenses: Expense[], userId: string): number {
  let balance = 0

  for (const expense of expenses) {
    // Check if user paid for this expense
    const userPaid = expense.payers.find((payer: Payer) => payer.user_id === userId)
    const amountPaid = userPaid ? parseFloat(userPaid.amount) : 0

    // Check if user is a participant in this expense
    const userParticipant = expense.participants.find(
      (participant: Participant) => participant.user_id === userId
    )
    const amountOwed = userParticipant ? parseFloat(userParticipant.amount) : 0

    // Balance = what user paid - what user owes
    balance += amountPaid - amountOwed
  }

  return balance
}

// Create a new group
export async function createGroup(
  name: string,
  description: string | null,
  userId: string
): Promise<Group> {
  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      name,
      description,
      created_by: userId,
    })
    .select()
    .single<Group>()

  if (error) {
    console.error('Error creating group:', error)
    throw error
  }

  return group
}

// Get dashboard data for the home page
export async function getDashboardData(userId: string) {
  try {
    // Get user's groups with member counts
    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select(
        `
        id,
        name,
        description,
        created_by,
        created_at,
        updated_at,
        group_members (
          user_id,
          role
        )
      `
      )
      .eq('group_members.user_id', userId)

    if (groupsError) {
      console.error('Error fetching groups:', groupsError)
      throw groupsError
    }

    const groups = groupsData || []

    // For each group, get expenses and calculate totals
    const groupsWithStats = await Promise.all(
      groups.map(async (group: FetchedGroup) => {
        const expenses = await getGroupExpenses(group.id)

        const totalExpenses = expenses.reduce((sum, expense) => {
          return sum + parseFloat(expense.total_amount.toString())
        }, 0)

        const userBalance = calculateUserBalanceInGroup(expenses, userId)
        const memberCount = group.group_members?.length || 0

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          created_by: group.created_by,
          created_at: group.created_at,
          updated_at: group.updated_at,
          member_count: memberCount,
          total_expenses: totalExpenses,
          user_balance: userBalance,
        }
      })
    )

    // Get recent expenses across all groups
    const recentExpenses = await getAllUserExpenses(userId)

    return {
      groups: groupsWithStats as Group[],
      recentExpenses: recentExpenses.slice(0, 10), // Get 10 most recent
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    throw error
  }
}
