import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface Expense {
  id: string
  total_amount: number
  currency: string
  payers: Array<{
    user_id?: string
    placeholder_name?: string
    amount: number
  }>
  participants: Array<{
    user_id?: string
    placeholder_name?: string
    amount: number
  }>
}

interface MemberBalance {
  memberId: string
  memberName: string
  isPlaceholder: boolean
  balance: number // positive = owes money, negative = is owed money
}

interface SettlementTransaction {
  id: string
  fromMemberId: string
  fromMemberName: string
  toMemberId: string
  toMemberName: string
  amount: number
  currency: string
  isFromPlaceholder: boolean
  isToPlaceholder: boolean
}

interface SettlementResult {
  transactions: SettlementTransaction[]
  memberBalances: MemberBalance[]
  totalSettlementAmount: number
  currency: string
  minimumTransactions: number
}

/**
 * Calculate net balances for all group members based on confirmed expenses
 * 
 * This function processes all confirmed expenses in a group and calculates the net
 * balance for each member. A negative balance means the member is owed money,
 * while a positive balance means the member owes money.
 * 
 * @param expenses - Array of confirmed expenses with payers and participants
 * @param groupMembers - Array of group members including both users and placeholders
 * @returns Map of member IDs to their balance information
 * 
 * @example
 * // For an expense where Alice paid $30 and it's split equally among Alice, Bob, Charlie:
 * // Alice: paid $30, owes $10 → balance = -$20 (is owed $20)
 * // Bob: paid $0, owes $10 → balance = +$10 (owes $10)
 * // Charlie: paid $0, owes $10 → balance = +$10 (owes $10)
 */
function calculateMemberBalances(expenses: Expense[], groupMembers: any[]): Map<string, MemberBalance> {
  const balances = new Map<string, MemberBalance>()
  
  // Initialize all group members with zero balance
  groupMembers.forEach(member => {
    const memberId = member.user_id || `placeholder-${member.id}`
    const memberName = member.profiles?.name || member.placeholder_name || 'Unknown'
    balances.set(memberId, {
      memberId,
      memberName,
      isPlaceholder: member.is_placeholder || false,
      balance: 0
    })
  })

  // Process each expense to calculate net balances
  expenses.forEach(expense => {
    // Add amounts paid (negative balance = is owed money)
    // When someone pays, they should receive money back, so we subtract from their balance
    expense.payers.forEach(payer => {
      const payerId = payer.user_id || `placeholder-${payer.placeholder_name}`
      const existing = balances.get(payerId)
      if (existing) {
        existing.balance -= payer.amount
      }
    })

    // Add amounts owed (positive balance = owes money)
    // When someone participates in an expense, they owe money, so we add to their balance
    expense.participants.forEach(participant => {
      const participantId = participant.user_id || `placeholder-${participant.placeholder_name}`
      const existing = balances.get(participantId)
      if (existing) {
        existing.balance += participant.amount
      }
    })
  })

  return balances
}

/**
 * Simplify debts using a greedy algorithm to minimize the number of transactions
 * 
 * This algorithm implements a debt simplification strategy that finds the optimal
 * set of transactions to settle all debts with the minimum number of transfers.
 * It uses a greedy approach where in each iteration, it finds the member who owes
 * the most money and the member who is owed the most money, then creates a
 * transaction between them for the maximum possible amount.
 * 
 * Algorithm complexity: O(n²) where n is the number of members with non-zero balances
 * 
 * @param memberBalances - Array of member balance information
 * @param currency - Currency code for the transactions
 * @returns Array of settlement transactions that will balance all debts
 * 
 * @example
 * // Input balances: Alice: -$20, Bob: +$10, Charlie: +$10
 * // Output: [
 * //   { from: Bob, to: Alice, amount: $10 },
 * //   { from: Charlie, to: Alice, amount: $10 }
 * // ]
 * // This settles all debts with 2 transactions (minimum possible)
 */
function simplifyDebts(memberBalances: MemberBalance[], currency: string): SettlementTransaction[] {
  const transactions: SettlementTransaction[] = []
  const balances = new Map<string, number>()
  
  // Copy balances for manipulation during the algorithm
  memberBalances.forEach(member => {
    balances.set(member.memberId, member.balance)
  })

  let transactionId = 1

  // Continue until all significant debts are settled
  while (true) {
    // Find the member who owes the most (highest positive balance)
    let maxOwed = 0
    let maxOwedMember = ''
    
    // Find the member who is owed the most (lowest negative balance)
    let minOwed = 0
    let minOwedMember = ''

    // Scan all balances to find the extremes
    for (const [memberId, balance] of balances) {
      if (Math.abs(balance) < 0.01) continue // Skip near-zero balances to handle floating-point precision
      
      if (balance > maxOwed) {
        maxOwed = balance
        maxOwedMember = memberId
      }
      
      if (balance < minOwed) {
        minOwed = balance
        minOwedMember = memberId
      }
    }

    // If no significant debts remain, we're done
    if (maxOwedMember === '' || minOwedMember === '' || Math.abs(maxOwed) < 0.01 || Math.abs(minOwed) < 0.01) {
      break
    }

    // Calculate settlement amount (minimum of what's owed and what's due)
    // This ensures we don't overpay or under-receive
    const settlementAmount = Math.min(maxOwed, Math.abs(minOwed))
    
    // Find member details for the transaction
    const fromMember = memberBalances.find(m => m.memberId === maxOwedMember)!
    const toMember = memberBalances.find(m => m.memberId === minOwedMember)!

    // Create the settlement transaction
    transactions.push({
      id: `settlement-${transactionId++}`,
      fromMemberId: maxOwedMember,
      fromMemberName: fromMember.memberName,
      toMemberId: minOwedMember,
      toMemberName: toMember.memberName,
      amount: Math.round(settlementAmount * 100) / 100, // Round to 2 decimal places for currency precision
      currency,
      isFromPlaceholder: fromMember.isPlaceholder,
      isToPlaceholder: toMember.isPlaceholder
    })

    // Update balances after the transaction
    balances.set(maxOwedMember, maxOwed - settlementAmount)
    balances.set(minOwedMember, minOwed + settlementAmount)
  }

  return transactions
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request
    const { groupId } = await req.json()
    
    if (!groupId) {
      return new Response(
        JSON.stringify({ error: 'Group ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch group members
    const { data: groupMembers, error: membersError } = await supabase
      .from('group_members')
      .select(`
        id,
        user_id,
        placeholder_name,
        is_placeholder,
        profiles (
          name,
          email
        )
      `)
      .eq('group_id', groupId)

    if (membersError) {
      throw new Error(`Failed to fetch group members: ${membersError.message}`)
    }

    // Fetch confirmed expenses for the group
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select(`
        id,
        total_amount,
        currency,
        payers,
        participants
      `)
      .eq('group_id', groupId)
      .eq('status', 'confirmed')

    if (expensesError) {
      throw new Error(`Failed to fetch expenses: ${expensesError.message}`)
    }

    if (!expenses || expenses.length === 0) {
      // No expenses to settle
      return new Response(
        JSON.stringify({
          transactions: [],
          memberBalances: [],
          totalSettlementAmount: 0,
          currency: 'USD',
          minimumTransactions: 0
        } as SettlementResult),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get currency from first expense (assume all expenses use same currency)
    const currency = expenses[0].currency || 'USD'

    // Calculate member balances
    const memberBalances = calculateMemberBalances(expenses, groupMembers || [])
    const memberBalancesList = Array.from(memberBalances.values())

    // Generate settlement transactions
    const transactions = simplifyDebts(memberBalancesList, currency)

    // Calculate total settlement amount
    const totalSettlementAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0)

    const result: SettlementResult = {
      transactions,
      memberBalances: memberBalancesList,
      totalSettlementAmount: Math.round(totalSettlementAmount * 100) / 100,
      currency,
      minimumTransactions: transactions.length
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Settlement calculation error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 