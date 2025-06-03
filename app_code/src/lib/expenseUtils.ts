import { Expense, MemberBalance, SimplifiedDebt, ExpenseWithSplits } from '../types/database'

/**
 * Calculate equal split amount per member
 */
export function calculateEqualSplit(totalAmount: number, numberOfMembers: number): number {
  if (numberOfMembers <= 0) {
    throw new Error('Number of members must be greater than 0')
  }

  if (totalAmount < 0) {
    throw new Error('Total amount must be non-negative')
  }

  return Number((totalAmount / numberOfMembers).toFixed(2))
}

/**
 * Validate that amount splits sum to the total expense amount
 */
export function validateAmountSplits(totalAmount: number, memberAmounts: number[]): boolean {
  if (memberAmounts.length === 0) {
    return totalAmount === 0
  }

  // Check for negative amounts
  if (memberAmounts.some((amount) => amount < 0)) {
    return false
  }

  const sum = memberAmounts.reduce((acc, amount) => acc + amount, 0)
  // Allow for small floating point precision differences
  return Math.abs(sum - totalAmount) < 0.01
}

/**
 * Validate that percentage splits sum to 100%
 */
export function validatePercentageSplits(memberPercentages: number[]): boolean {
  if (memberPercentages.length === 0) {
    return true
  }

  // Check for negative percentages
  if (memberPercentages.some((percentage) => percentage < 0)) {
    return false
  }

  const sum = memberPercentages.reduce((acc, percentage) => acc + percentage, 0)
  // Allow for small floating point precision differences
  return Math.abs(sum - 100) < 0.01
}

/**
 * Calculate net balances for all group members based on expenses
 */
export function calculateMemberBalances(
  expenses: (Expense | ExpenseWithSplits)[],
  members: Array<{ id: string; user_id?: string; name: string }>
): MemberBalance[] {
  const balanceMap = new Map<string, MemberBalance>()

  // Initialize balances for all members
  members.forEach((member) => {
    balanceMap.set(member.user_id || member.id, {
      member_id: member.id,
      user_id: member.user_id,
      name: member.name,
      total_paid: 0,
      total_owed: 0,
      net_balance: 0,
    })
  })

  // Process each expense
  expenses.forEach((expense) => {
    // Add to payer's total_paid (handling different data structures)
    if ((expense as any).payers) {
      // Legacy test data structure with payers array
      ;(expense as any).payers.forEach((payer: any) => {
        const payerBalance = balanceMap.get(payer.user_id)
        if (payerBalance) {
          payerBalance.total_paid += payer.amount
        }
      })
    } else if ((expense as any).payer_id) {
      // Enhanced structure with payer_id (for CreateExpenseRequest-style data)
      const payerBalance = balanceMap.get((expense as any).payer_id)
      if (payerBalance) {
        payerBalance.total_paid += expense.total_amount
      }
    }

    // Add to each participant's total_owed
    if ((expense as any).participants) {
      // Legacy test data structure with participants array
      ;(expense as any).participants.forEach((participant: any) => {
        const memberBalance = balanceMap.get(participant.user_id)
        if (memberBalance) {
          memberBalance.total_owed += participant.amount
        }
      })
    } else if ('expense_splits' in expense && expense.expense_splits) {
      // Enhanced structure with expense_splits
      expense.expense_splits.forEach((split) => {
        const memberBalance = balanceMap.get(split.user_id || split.member_id)
        if (memberBalance) {
          memberBalance.total_owed += split.split_amount
        }
      })
    }
  })

  // Calculate net balances (positive = owed money, negative = owes money)
  const balances = Array.from(balanceMap.values())
  balances.forEach((balance) => {
    balance.net_balance = Number((balance.total_paid - balance.total_owed).toFixed(2))
  })

  return balances
}

/**
 * Simplify debts into minimum number of transactions
 * Uses a greedy algorithm to minimize the number of transactions
 */
export function simplifyDebts(balances: MemberBalance[]): SimplifiedDebt[] {
  const debts: SimplifiedDebt[] = []

  // Create working copies sorted by balance
  const creditors = balances
    .filter((b) => b.net_balance > 0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net_balance - a.net_balance)

  const debtors = balances
    .filter((b) => b.net_balance < -0.01)
    .map((b) => ({ ...b, net_balance: Math.abs(b.net_balance) }))
    .sort((a, b) => b.net_balance - a.net_balance)

  // Match creditors with debtors
  let i = 0,
    j = 0

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i]
    const debtor = debtors[j]

    const amount = Math.min(creditor.net_balance, debtor.net_balance)

    if (amount > 0.01) {
      debts.push({
        from_member_id: debtor.member_id,
        from_name: debtor.name,
        to_member_id: creditor.member_id,
        to_name: creditor.name,
        amount: Number(amount.toFixed(2)),
      })
    }

    creditor.net_balance -= amount
    debtor.net_balance -= amount

    if (creditor.net_balance < 0.01) i++
    if (debtor.net_balance < 0.01) j++
  }

  return debts
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0.00'
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    // Fallback for unsupported currencies
    return `$${amount.toFixed(2)}`
  }
}

/**
 * Generate split rationale explanation for each participant
 */
export function generateSplitRationale(
  participants: Array<{
    user_id?: string
    placeholder_name?: string
    amount: number
    percentage?: number
  }>,
  totalAmount: number,
  currency: string = 'USD'
): Array<{ participantKey: string; name: string; amount: number; rationale: string }> {
  if (!participants || participants.length === 0) {
    return []
  }

  const explanations = participants.map((participant) => {
    const participantKey = participant.user_id || participant.placeholder_name || 'Unknown'
    const name = participant.placeholder_name || participantKey
    const amount = participant.amount

    let rationale: string

    // Determine the type of split based on the data
    if (participant.percentage !== undefined) {
      // Percentage-based split
      rationale = `${participant.percentage}% of ${formatCurrency(totalAmount, currency)} total`
    } else {
      // Check if it's an equal split by comparing amounts
      const expectedEqualSplit = Number((totalAmount / participants.length).toFixed(2))

      // Check if ALL participants have approximately equal amounts
      // Use a slightly larger tolerance to handle floating point precision
      const allParticipantsEqual = participants.every(
        (p) => Math.abs(p.amount - expectedEqualSplit) < 0.02
      )

      if (allParticipantsEqual) {
        // Equal split
        rationale = `Split equally among ${participants.length} ${participants.length === 1 ? 'person' : 'people'}`
      } else {
        // Custom amount split
        const percentage = ((amount / totalAmount) * 100).toFixed(1)
        rationale = `Custom amount (${percentage}% of total)`
      }
    }

    return {
      participantKey,
      name,
      amount,
      rationale,
    }
  })

  return explanations
}
