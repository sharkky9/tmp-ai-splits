/**
 * Balance calculation utilities for group expense management
 */

export interface GroupMemberBalance {
  member_id: string
  user_id?: string
  placeholder_name?: string
  is_placeholder: boolean
  total_paid: number
  total_share: number
  net_balance: number // positive = is owed money, negative = owes money
  name: string
}

export interface GroupMember {
  id: string
  user_id?: string
  placeholder_name?: string
  is_placeholder: boolean
  profiles?: {
    name: string
  } | null
}

export interface Expense {
  id: string
  total_amount: number
  payer_id: string
  status: string
}

export interface ExpenseSplit {
  expense_id: string
  member_id: string
  amount: number
}

/**
 * Calculate group member balances from expenses and expense splits
 *
 * This function calculates net balances for all group members by:
 * 1. Summing all amounts paid by each member from expenses
 * 2. Summing all shares owed by each member from expense splits
 * 3. Computing net balance = total_paid - total_share
 *
 * A positive net_balance means the member is owed money
 * A negative net_balance means the member owes money
 *
 * @param groupMembers - Array of group members
 * @param expenses - Array of confirmed expenses
 * @param expenseSplits - Array of expense splits
 * @returns Array of member balances
 */
export function calculateGroupBalances(
  groupMembers: GroupMember[],
  expenses: Expense[],
  expenseSplits: ExpenseSplit[]
): GroupMemberBalance[] {
  if (!groupMembers || groupMembers.length === 0) {
    return []
  }

  // Filter only confirmed expenses
  const confirmedExpenses = expenses.filter((expense) => expense.status === 'confirmed')

  // Get expense IDs for confirmed expenses
  const confirmedExpenseIds = new Set(confirmedExpenses.map((e) => e.id))

  // Filter splits to only include confirmed expenses
  const confirmedSplits = expenseSplits.filter((split) => confirmedExpenseIds.has(split.expense_id))

  // Initialize balances for all group members
  const memberBalances: Map<string, GroupMemberBalance> = new Map()

  groupMembers.forEach((member) => {
    memberBalances.set(member.id, {
      member_id: member.id,
      user_id: member.user_id,
      placeholder_name: member.placeholder_name,
      is_placeholder: member.is_placeholder,
      total_paid: 0,
      total_share: 0,
      net_balance: 0,
      name: member.is_placeholder
        ? member.placeholder_name || 'Unknown'
        : member.profiles?.name || 'Unknown',
    })
  })

  // Calculate total paid by each member
  confirmedExpenses.forEach((expense) => {
    const balance = memberBalances.get(expense.payer_id)
    if (balance) {
      balance.total_paid += expense.total_amount
    }
  })

  // Calculate total share for each member from splits
  confirmedSplits.forEach((split) => {
    const balance = memberBalances.get(split.member_id)
    if (balance) {
      balance.total_share += split.amount
    }
  })

  // Calculate net balances
  memberBalances.forEach((balance) => {
    balance.net_balance = balance.total_paid - balance.total_share
  })

  return Array.from(memberBalances.values())
}

/**
 * Format balance for display
 */
export function formatBalance(balance: number): string {
  if (Math.abs(balance) < 0.01) {
    return 'Settled up'
  } else if (balance > 0) {
    return `Gets back $${balance.toFixed(2)}`
  } else {
    return `Owes $${Math.abs(balance).toFixed(2)}`
  }
}

/**
 * Sort balances by amount (highest owed first, then highest owes)
 */
export function sortBalancesByAmount(balances: GroupMemberBalance[]): GroupMemberBalance[] {
  return [...balances].sort((a, b) => {
    // If both are positive (owed money), sort by highest amount
    if (a.net_balance > 0 && b.net_balance > 0) {
      return b.net_balance - a.net_balance
    }
    // If both are negative (owe money), sort by highest absolute amount
    if (a.net_balance < 0 && b.net_balance < 0) {
      return Math.abs(b.net_balance) - Math.abs(a.net_balance)
    }
    // Mixed: positive balances first
    return b.net_balance - a.net_balance
  })
}
