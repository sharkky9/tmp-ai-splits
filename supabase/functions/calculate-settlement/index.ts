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

  // Process each expense
  expenses.forEach(expense => {
    // Add amounts paid (negative balance = is owed money)
    expense.payers.forEach(payer => {
      const payerId = payer.user_id || `placeholder-${payer.placeholder_name}`
      const existing = balances.get(payerId)
      if (existing) {
        existing.balance -= payer.amount
      }
    })

    // Add amounts owed (positive balance = owes money)
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
 * Simplify debts using a greedy algorithm to minimize transactions
 * This approach finds the member who owes the most and the member who is owed the most,
 * and creates a transaction between them, continuing until all debts are settled.
 */
function simplifyDebts(memberBalances: MemberBalance[], currency: string): SettlementTransaction[] {
  const transactions: SettlementTransaction[] = []
  const balances = new Map<string, number>()
  
  // Copy balances for manipulation
  memberBalances.forEach(member => {
    balances.set(member.memberId, member.balance)
  })

  let transactionId = 1

  while (true) {
    // Find the member who owes the most (highest positive balance)
    let maxOwed = 0
    let maxOwedMember = ''
    
    // Find the member who is owed the most (lowest negative balance)
    let minOwed = 0
    let minOwedMember = ''

    for (const [memberId, balance] of balances) {
      if (Math.abs(balance) < 0.01) continue // Skip near-zero balances
      
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
    const settlementAmount = Math.min(maxOwed, Math.abs(minOwed))
    
    // Find member details
    const fromMember = memberBalances.find(m => m.memberId === maxOwedMember)!
    const toMember = memberBalances.find(m => m.memberId === minOwedMember)!

    // Create transaction
    transactions.push({
      id: `settlement-${transactionId++}`,
      fromMemberId: maxOwedMember,
      fromMemberName: fromMember.memberName,
      toMemberId: minOwedMember,
      toMemberName: toMember.memberName,
      amount: Math.round(settlementAmount * 100) / 100, // Round to 2 decimal places
      currency,
      isFromPlaceholder: fromMember.isPlaceholder,
      isToPlaceholder: toMember.isPlaceholder
    })

    // Update balances
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