import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface GroupMemberBalance {
  member_id: string
  user_id?: string
  placeholder_name?: string
  is_placeholder: boolean
  total_paid: number
  total_share: number
  net_balance: number // positive = is owed money, negative = owes money
  name: string
}

interface GetGroupBalancesResponse {
  success: boolean
  balances?: GroupMemberBalance[]
  error?: string
}

/**
 * Calculate group member balances from expenses and expense splits
 * 
 * This function calculates net balances for all group members by:
 * 1. Summing all amounts paid by each member from expenses table
 * 2. Summing all shares owed by each member from expense_splits table  
 * 3. Computing net balance = total_paid - total_share
 * 
 * A positive net_balance means the member is owed money
 * A negative net_balance means the member owes money
 * 
 * @param supabase - Supabase client instance
 * @param groupId - Group ID to calculate balances for
 * @returns Promise<GroupMemberBalance[]> - Array of member balances
 */
async function calculateGroupBalances(
  supabase: any,
  groupId: string
): Promise<GroupMemberBalance[]> {
  // Get all group members
  const { data: groupMembers, error: membersError } = await supabase
    .from('group_members')
    .select(`
      id,
      user_id,
      placeholder_name,
      is_placeholder,
      profiles (
        name
      )
    `)
    .eq('group_id', groupId)

  if (membersError) {
    throw new Error(`Failed to fetch group members: ${membersError.message}`)
  }

  if (!groupMembers || groupMembers.length === 0) {
    return []
  }

  // Get all confirmed expenses for the group
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select(`
      id,
      total_amount,
      currency,
      payer_id,
      status
    `)
    .eq('group_id', groupId)
    .eq('status', 'confirmed')

  if (expensesError) {
    throw new Error(`Failed to fetch expenses: ${expensesError.message}`)
  }

  // Get all expense splits for confirmed expenses
  const expenseIds = expenses?.map(e => e.id) || []
  let expenseSplits: any[] = []
  
  if (expenseIds.length > 0) {
    const { data: splits, error: splitsError } = await supabase
      .from('expense_splits')
      .select(`
        expense_id,
        member_id,
        amount,
        percentage
      `)
      .in('expense_id', expenseIds)

    if (splitsError) {
      throw new Error(`Failed to fetch expense splits: ${splitsError.message}`)
    }

    expenseSplits = splits || []
  }

  // Initialize balances for all group members
  const memberBalances: Map<string, GroupMemberBalance> = new Map()

  groupMembers.forEach(member => {
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
  expenses?.forEach(expense => {
    const balance = memberBalances.get(expense.payer_id)
    if (balance) {
      balance.total_paid += expense.total_amount
    }
  })

  // Calculate total share for each member from splits
  expenseSplits.forEach(split => {
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Method not allowed. Use POST.' 
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing authorization header' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify JWT and get user
    const jwt = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid or expired token' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { group_id } = await req.json()

    if (!group_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required field: group_id' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify user has access to the group
    const { data: groupMember, error: memberError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group_id)
      .eq('user_id', userData.user.id)
      .eq('is_placeholder', false)
      .single()

    if (memberError || !groupMember) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Access denied. User is not a member of this group.' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Calculate group balances
    const balances = await calculateGroupBalances(supabase, group_id)

    const response: GetGroupBalancesResponse = {
      success: true,
      balances
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in get-group-balances function:', error)
    
    const response: GetGroupBalancesResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 