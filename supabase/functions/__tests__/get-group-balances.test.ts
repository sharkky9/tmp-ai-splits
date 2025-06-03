import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Mock Supabase client for testing
class MockSupabaseClient {
  private groupMembers: any[] = []
  private expenses: any[] = []
  private expenseSplits: any[] = []
  private currentUserId = 'test-user-1'

  setMockData(groupMembers: any[], expenses: any[], expenseSplits: any[]) {
    this.groupMembers = groupMembers
    this.expenses = expenses
    this.expenseSplits = expenseSplits
  }

  setCurrentUser(userId: string) {
    this.currentUserId = userId
  }

  from(table: string) {
    return {
      select: (fields: string) => ({
        eq: (field: string, value: any) => {
          if (table === 'group_members') {
            if (field === 'group_id') {
              return {
                single: () => ({ 
                  data: this.groupMembers.find(m => m.user_id === this.currentUserId),
                  error: this.groupMembers.find(m => m.user_id === this.currentUserId) ? null : new Error('Not found')
                }),
                data: this.groupMembers.filter(m => m.group_id === value),
                error: null
              }
            }
          } else if (table === 'expenses') {
            const filtered = this.expenses.filter(e => e.group_id === value)
            return {
              eq: (statusField: string, statusValue: any) => ({
                data: statusField === 'status' ? filtered.filter(e => e.status === statusValue) : filtered,
                error: null
              }),
              data: filtered,
              error: null
            }
          }
          return { data: [], error: null }
        },
        in: (field: string, values: any[]) => {
          if (table === 'expense_splits') {
            return {
              data: this.expenseSplits.filter(s => values.includes(s.expense_id)),
              error: null
            }
          }
          return { data: [], error: null }
        }
      })
    }
  }

  auth = {
    getUser: () => ({
      data: { user: { id: this.currentUserId } },
      error: null
    })
  }
}

// Test data setup
const mockGroupMembers = [
  {
    id: 'member-1',
    group_id: 'test-group',
    user_id: 'test-user-1',
    placeholder_name: null,
    is_placeholder: false,
    profiles: { name: 'Alice Smith' }
  },
  {
    id: 'member-2',
    group_id: 'test-group',
    user_id: 'test-user-2',
    placeholder_name: null,
    is_placeholder: false,
    profiles: { name: 'Bob Johnson' }
  },
  {
    id: 'member-3',
    group_id: 'test-group',
    user_id: null,
    placeholder_name: 'Charlie Wilson',
    is_placeholder: true,
    profiles: null
  }
]

const mockExpenses = [
  {
    id: 'expense-1',
    group_id: 'test-group',
    total_amount: 30.00,
    currency: 'USD',
    payer_id: 'member-1', // Alice paid $30
    status: 'confirmed'
  },
  {
    id: 'expense-2',
    group_id: 'test-group',
    total_amount: 60.00,
    currency: 'USD',
    payer_id: 'member-2', // Bob paid $60
    status: 'confirmed'
  },
  {
    id: 'expense-3',
    group_id: 'test-group',
    total_amount: 45.00,
    currency: 'USD',
    payer_id: 'member-1', // Alice paid $45
    status: 'pending_confirmation' // This should be excluded
  }
]

const mockExpenseSplits = [
  // Expense 1 ($30) split equally among Alice, Bob, Charlie ($10 each)
  { expense_id: 'expense-1', member_id: 'member-1', amount: 10.00, percentage: null },
  { expense_id: 'expense-1', member_id: 'member-2', amount: 10.00, percentage: null },
  { expense_id: 'expense-1', member_id: 'member-3', amount: 10.00, percentage: null },
  
  // Expense 2 ($60) split: Alice $20, Bob $30, Charlie $10
  { expense_id: 'expense-2', member_id: 'member-1', amount: 20.00, percentage: null },
  { expense_id: 'expense-2', member_id: 'member-2', amount: 30.00, percentage: null },
  { expense_id: 'expense-2', member_id: 'member-3', amount: 10.00, percentage: null },
  
  // Expense 3 splits (should be excluded since expense is not confirmed)
  { expense_id: 'expense-3', member_id: 'member-1', amount: 15.00, percentage: null },
  { expense_id: 'expense-3', member_id: 'member-2', amount: 15.00, percentage: null },
  { expense_id: 'expense-3', member_id: 'member-3', amount: 15.00, percentage: null }
]

// Import the balance calculation function (we'll need to extract it for testing)
async function calculateGroupBalances(supabase: any, groupId: string) {
  // Get all group members
  const groupMembersResult = supabase.from('group_members').select(`
    id,
    user_id,
    placeholder_name,
    is_placeholder,
    profiles (
      name
    )
  `).eq('group_id', groupId)

  const groupMembers = groupMembersResult.data
  if (!groupMembers || groupMembers.length === 0) {
    return []
  }

  // Get all confirmed expenses for the group
  const expensesResult = supabase.from('expenses').select(`
    id,
    total_amount,
    currency,
    payer_id,
    status
  `).eq('group_id', groupId).eq('status', 'confirmed')

  const expenses = expensesResult.data

  // Get all expense splits for confirmed expenses
  const expenseIds = expenses?.map((e: any) => e.id) || []
  let expenseSplits: any[] = []
  
  if (expenseIds.length > 0) {
    const splitsResult = supabase.from('expense_splits').select(`
      expense_id,
      member_id,
      amount,
      percentage
    `).in('expense_id', expenseIds)

    expenseSplits = splitsResult.data || []
  }

  // Initialize balances for all group members
  const memberBalances: Map<string, any> = new Map()

  groupMembers.forEach((member: any) => {
    memberBalances.set(member.id, {
      member_id: member.id,
      user_id: member.user_id,
      placeholder_name: member.placeholder_name,
      is_placeholder: member.is_placeholder,
      total_paid: 0,
      total_share: 0,
      net_balance: 0,
      name: member.is_placeholder 
        ? (member.placeholder_name || 'Unknown') 
        : (member.profiles?.name || 'Unknown')
    })
  })

  // Calculate total paid by each member
  expenses?.forEach((expense: any) => {
    const balance = memberBalances.get(expense.payer_id)
    if (balance) {
      balance.total_paid += expense.total_amount
    }
  })

  // Calculate total share for each member from splits
  expenseSplits.forEach((split: any) => {
    const balance = memberBalances.get(split.member_id)
    if (balance) {
      balance.total_share += split.amount
    }
  })

  // Calculate net balances
  memberBalances.forEach(balance => {
    balance.net_balance = balance.total_paid - balance.total_share
  })

  return Array.from(memberBalances.values())
}

Deno.test('Get Group Balances - Basic balance calculation', async () => {
  const mockClient = new MockSupabaseClient()
  mockClient.setMockData(mockGroupMembers, mockExpenses, mockExpenseSplits)
  
  const balances = await calculateGroupBalances(mockClient as any, 'test-group')
  
  assertEquals(balances.length, 3)
  
  // Alice: paid $30, owes $30 ($10 + $20) → net balance = $0
  const aliceBalance = balances.find(b => b.member_id === 'member-1')
  assertExists(aliceBalance)
  assertEquals(aliceBalance.total_paid, 30.00)
  assertEquals(aliceBalance.total_share, 30.00)
  assertEquals(aliceBalance.net_balance, 0.00)
  assertEquals(aliceBalance.name, 'Alice Smith')
  assertEquals(aliceBalance.is_placeholder, false)
  
  // Bob: paid $60, owes $40 ($10 + $30) → net balance = $20 (is owed $20)
  const bobBalance = balances.find(b => b.member_id === 'member-2')
  assertExists(bobBalance)
  assertEquals(bobBalance.total_paid, 60.00)
  assertEquals(bobBalance.total_share, 40.00)
  assertEquals(bobBalance.net_balance, 20.00)
  assertEquals(bobBalance.name, 'Bob Johnson')
  assertEquals(bobBalance.is_placeholder, false)
  
  // Charlie: paid $0, owes $20 ($10 + $10) → net balance = -$20 (owes $20)
  const charlieBalance = balances.find(b => b.member_id === 'member-3')
  assertExists(charlieBalance)
  assertEquals(charlieBalance.total_paid, 0.00)
  assertEquals(charlieBalance.total_share, 20.00)
  assertEquals(charlieBalance.net_balance, -20.00)
  assertEquals(charlieBalance.name, 'Charlie Wilson')
  assertEquals(charlieBalance.is_placeholder, true)
})

Deno.test('Get Group Balances - Payer is not participant scenario', async () => {
  const specialExpenses = [
    {
      id: 'expense-special',
      group_id: 'test-group',
      total_amount: 50.00,
      currency: 'USD',
      payer_id: 'member-1', // Alice paid
      status: 'confirmed'
    }
  ]
  
  const specialSplits = [
    // Alice paid $50 but only Bob and Charlie share it ($25 each)
    { expense_id: 'expense-special', member_id: 'member-2', amount: 25.00, percentage: null },
    { expense_id: 'expense-special', member_id: 'member-3', amount: 25.00, percentage: null }
  ]
  
  const mockClient = new MockSupabaseClient()
  mockClient.setMockData(mockGroupMembers, specialExpenses, specialSplits)
  
  const balances = await calculateGroupBalances(mockClient as any, 'test-group')
  
  // Alice: paid $50, owes $0 → net balance = $50 (is owed $50)
  const aliceBalance = balances.find(b => b.member_id === 'member-1')
  assertExists(aliceBalance)
  assertEquals(aliceBalance.total_paid, 50.00)
  assertEquals(aliceBalance.total_share, 0.00)
  assertEquals(aliceBalance.net_balance, 50.00)
  
  // Bob: paid $0, owes $25 → net balance = -$25 (owes $25)
  const bobBalance = balances.find(b => b.member_id === 'member-2')
  assertExists(bobBalance)
  assertEquals(bobBalance.total_paid, 0.00)
  assertEquals(bobBalance.total_share, 25.00)
  assertEquals(bobBalance.net_balance, -25.00)
  
  // Charlie: paid $0, owes $25 → net balance = -$25 (owes $25)
  const charlieBalance = balances.find(b => b.member_id === 'member-3')
  assertExists(charlieBalance)
  assertEquals(charlieBalance.total_paid, 0.00)
  assertEquals(charlieBalance.total_share, 25.00)
  assertEquals(charlieBalance.net_balance, -25.00)
})

Deno.test('Get Group Balances - Multiple expenses complex scenario', async () => {
  const complexExpenses = [
    { id: 'exp-1', group_id: 'test-group', total_amount: 90.00, payer_id: 'member-1', status: 'confirmed' },
    { id: 'exp-2', group_id: 'test-group', total_amount: 60.00, payer_id: 'member-2', status: 'confirmed' },
    { id: 'exp-3', group_id: 'test-group', total_amount: 30.00, payer_id: 'member-3', status: 'confirmed' }
  ]
  
  const complexSplits = [
    // Expense 1: Alice paid $90, split equally ($30 each)
    { expense_id: 'exp-1', member_id: 'member-1', amount: 30.00, percentage: null },
    { expense_id: 'exp-1', member_id: 'member-2', amount: 30.00, percentage: null },
    { expense_id: 'exp-1', member_id: 'member-3', amount: 30.00, percentage: null },
    
    // Expense 2: Bob paid $60, Alice owes $40, Bob owes $20
    { expense_id: 'exp-2', member_id: 'member-1', amount: 40.00, percentage: null },
    { expense_id: 'exp-2', member_id: 'member-2', amount: 20.00, percentage: null },
    
    // Expense 3: Charlie paid $30, split equally between Bob and Charlie ($15 each)
    { expense_id: 'exp-3', member_id: 'member-2', amount: 15.00, percentage: null },
    { expense_id: 'exp-3', member_id: 'member-3', amount: 15.00, percentage: null }
  ]
  
  const mockClient = new MockSupabaseClient()
  mockClient.setMockData(mockGroupMembers, complexExpenses, complexSplits)
  
  const balances = await calculateGroupBalances(mockClient as any, 'test-group')
  
  // Alice: paid $90, owes $70 ($30 + $40) → net balance = $20
  const aliceBalance = balances.find(b => b.member_id === 'member-1')
  assertExists(aliceBalance)
  assertEquals(aliceBalance.total_paid, 90.00)
  assertEquals(aliceBalance.total_share, 70.00)
  assertEquals(aliceBalance.net_balance, 20.00)
  
  // Bob: paid $60, owes $65 ($30 + $20 + $15) → net balance = -$5
  const bobBalance = balances.find(b => b.member_id === 'member-2')
  assertExists(bobBalance)
  assertEquals(bobBalance.total_paid, 60.00)
  assertEquals(bobBalance.total_share, 65.00)
  assertEquals(bobBalance.net_balance, -5.00)
  
  // Charlie: paid $30, owes $45 ($30 + $15) → net balance = -$15
  const charlieBalance = balances.find(b => b.member_id === 'member-3')
  assertExists(charlieBalance)
  assertEquals(charlieBalance.total_paid, 30.00)
  assertEquals(charlieBalance.total_share, 45.00)
  assertEquals(charlieBalance.net_balance, -15.00)
})

Deno.test('Get Group Balances - Only confirmed expenses included', async () => {
  const mixedExpenses = [
    { id: 'confirmed-1', group_id: 'test-group', total_amount: 30.00, payer_id: 'member-1', status: 'confirmed' },
    { id: 'pending-1', group_id: 'test-group', total_amount: 60.00, payer_id: 'member-2', status: 'pending_confirmation' },
    { id: 'draft-1', group_id: 'test-group', total_amount: 90.00, payer_id: 'member-3', status: 'draft' }
  ]
  
  const mixedSplits = [
    // Only splits for confirmed expense should be counted
    { expense_id: 'confirmed-1', member_id: 'member-1', amount: 10.00, percentage: null },
    { expense_id: 'confirmed-1', member_id: 'member-2', amount: 10.00, percentage: null },
    { expense_id: 'confirmed-1', member_id: 'member-3', amount: 10.00, percentage: null },
    
    // These splits should be ignored
    { expense_id: 'pending-1', member_id: 'member-1', amount: 20.00, percentage: null },
    { expense_id: 'pending-1', member_id: 'member-2', amount: 20.00, percentage: null },
    { expense_id: 'pending-1', member_id: 'member-3', amount: 20.00, percentage: null },
    
    { expense_id: 'draft-1', member_id: 'member-1', amount: 30.00, percentage: null },
    { expense_id: 'draft-1', member_id: 'member-2', amount: 30.00, percentage: null },
    { expense_id: 'draft-1', member_id: 'member-3', amount: 30.00, percentage: null }
  ]
  
  const mockClient = new MockSupabaseClient()
  mockClient.setMockData(mockGroupMembers, mixedExpenses, mixedSplits)
  
  const balances = await calculateGroupBalances(mockClient as any, 'test-group')
  
  // Only the confirmed expense should affect balances
  // Alice: paid $30, owes $10 → net balance = $20
  const aliceBalance = balances.find(b => b.member_id === 'member-1')
  assertExists(aliceBalance)
  assertEquals(aliceBalance.total_paid, 30.00)
  assertEquals(aliceBalance.total_share, 10.00)
  assertEquals(aliceBalance.net_balance, 20.00)
  
  // Bob: paid $0, owes $10 → net balance = -$10
  const bobBalance = balances.find(b => b.member_id === 'member-2')
  assertExists(bobBalance)
  assertEquals(bobBalance.total_paid, 0.00)
  assertEquals(bobBalance.total_share, 10.00)
  assertEquals(bobBalance.net_balance, -10.00)
  
  // Charlie: paid $0, owes $10 → net balance = -$10
  const charlieBalance = balances.find(b => b.member_id === 'member-3')
  assertExists(charlieBalance)
  assertEquals(charlieBalance.total_paid, 0.00)
  assertEquals(charlieBalance.total_share, 10.00)
  assertEquals(charlieBalance.net_balance, -10.00)
})

Deno.test('Get Group Balances - Empty group scenario', async () => {
  const mockClient = new MockSupabaseClient()
  mockClient.setMockData([], [], [])
  
  const balances = await calculateGroupBalances(mockClient as any, 'empty-group')
  
  assertEquals(balances.length, 0)
})

Deno.test('Get Group Balances - No expenses scenario', async () => {
  const mockClient = new MockSupabaseClient()
  mockClient.setMockData(mockGroupMembers, [], [])
  
  const balances = await calculateGroupBalances(mockClient as any, 'test-group')
  
  assertEquals(balances.length, 3)
  
  // All members should have zero balances
  balances.forEach(balance => {
    assertEquals(balance.total_paid, 0.00)
    assertEquals(balance.total_share, 0.00)
    assertEquals(balance.net_balance, 0.00)
  })
})

Deno.test('Get Group Balances - Placeholder member handling', async () => {
  const mockClient = new MockSupabaseClient()
  mockClient.setMockData(mockGroupMembers, mockExpenses, mockExpenseSplits)
  
  const balances = await calculateGroupBalances(mockClient as any, 'test-group')
  
  const placeholderBalance = balances.find(b => b.is_placeholder === true)
  assertExists(placeholderBalance)
  assertEquals(placeholderBalance.name, 'Charlie Wilson')
  assertEquals(placeholderBalance.placeholder_name, 'Charlie Wilson')
  assertEquals(placeholderBalance.user_id, null)
  
  const userBalance = balances.find(b => b.is_placeholder === false && b.member_id === 'member-1')
  assertExists(userBalance)
  assertEquals(userBalance.name, 'Alice Smith')
  assertEquals(userBalance.user_id, 'test-user-1')
}) 