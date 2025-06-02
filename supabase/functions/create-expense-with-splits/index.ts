import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Types for the expense creation request
interface CreateExpenseRequest {
  group_id: string
  description: string
  total_amount: number
  currency: string
  date_of_expense: string
  category?: string
  tags?: string[]
  payer_id: string // The member who paid for the expense
  split_method: 'equal' | 'amount' | 'percentage'
  participants: ExpenseParticipantInput[]
  original_input_text?: string // For LLM-parsed expenses
}

interface ExpenseParticipantInput {
  member_id: string
  user_id?: string
  placeholder_name?: string
  split_amount?: number // For amount-based splits
  split_percentage?: number // For percentage-based splits
}

interface ExpenseSplit {
  expense_id: string
  member_id: string
  user_id?: string
  placeholder_name?: string
  split_amount: number
  share_description?: string
}

// Utility function for precise decimal calculations
function calculatePreciseAmount(amount: number): number {
  return Math.round(amount * 100) / 100
}

// Calculate equal splits with proper remainder distribution
function calculateEqualSplits(totalAmount: number, participantCount: number): number[] {
  const baseAmount = Math.floor((totalAmount * 100) / participantCount) / 100
  const remainder = Math.round((totalAmount * 100) - (baseAmount * 100 * participantCount))
  
  const splits = new Array(participantCount).fill(baseAmount)
  
  // Distribute remainder cents to first participants
  for (let i = 0; i < remainder; i++) {
    splits[i] = calculatePreciseAmount(splits[i] + 0.01)
  }
  
  return splits
}

// Validate split amounts sum to total
function validateSplitAmounts(totalAmount: number, splitAmounts: number[]): boolean {
  const totalSplits = splitAmounts.reduce((sum, amount) => sum + amount, 0)
  return Math.abs(calculatePreciseAmount(totalSplits) - calculatePreciseAmount(totalAmount)) < 0.01
}

// Validate percentages sum to 100%
function validateSplitPercentages(percentages: number[]): boolean {
  const totalPercentage = percentages.reduce((sum, pct) => sum + pct, 0)
  return Math.abs(totalPercentage - 100) < 0.01
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const requestData: CreateExpenseRequest = await req.json()

    // Validate required fields
    if (!requestData.group_id || !requestData.description || !requestData.total_amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: group_id, description, total_amount' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify user is member of the group
    const { data: membership, error: membershipError } = await supabaseClient
      .from('group_members')
      .select('id, role')
      .eq('group_id', requestData.group_id)
      .eq('user_id', user.id)
      .eq('is_placeholder', false)
      .single()

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'User is not a member of this group' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate participants exist in the group
    if (requestData.participants.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one participant is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const participantMemberIds = requestData.participants.map(p => p.member_id)
    const { data: validMembers, error: membersError } = await supabaseClient
      .from('group_members')
      .select('id, user_id, placeholder_name, is_placeholder')
      .eq('group_id', requestData.group_id)
      .in('id', participantMemberIds)

    if (membersError || !validMembers || validMembers.length !== requestData.participants.length) {
      return new Response(
        JSON.stringify({ error: 'Some participants are not valid group members' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Calculate splits based on method
    let splits: ExpenseSplit[] = []
    const participantCount = requestData.participants.length

    switch (requestData.split_method) {
      case 'equal': {
        const equalSplitAmounts = calculateEqualSplits(requestData.total_amount, participantCount)
        
        splits = requestData.participants.map((participant, index) => {
          const member = validMembers.find(m => m.id === participant.member_id)!
          return {
            expense_id: '', // Will be set after expense creation
            member_id: participant.member_id,
            user_id: member.user_id,
            placeholder_name: member.placeholder_name,
            split_amount: equalSplitAmounts[index],
            share_description: `Equal split of $${requestData.total_amount} among ${participantCount} people`
          }
        })
        break
      }

      case 'amount': {
        // Validate that split amounts are provided and sum to total
        const splitAmounts = requestData.participants.map(p => p.split_amount || 0)
        
        if (!validateSplitAmounts(requestData.total_amount, splitAmounts)) {
          return new Response(
            JSON.stringify({ 
              error: 'Split amounts do not sum to total expense amount',
              details: {
                total_amount: requestData.total_amount,
                split_sum: splitAmounts.reduce((sum, amount) => sum + amount, 0)
              }
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        splits = requestData.participants.map(participant => {
          const member = validMembers.find(m => m.id === participant.member_id)!
          return {
            expense_id: '',
            member_id: participant.member_id,
            user_id: member.user_id,
            placeholder_name: member.placeholder_name,
            split_amount: participant.split_amount!,
            share_description: `Custom amount: $${participant.split_amount}`
          }
        })
        break
      }

      case 'percentage': {
        // Validate that percentages are provided and sum to 100%
        const splitPercentages = requestData.participants.map(p => p.split_percentage || 0)
        
        if (!validateSplitPercentages(splitPercentages)) {
          return new Response(
            JSON.stringify({ 
              error: 'Split percentages do not sum to 100%',
              details: {
                percentage_sum: splitPercentages.reduce((sum, pct) => sum + pct, 0)
              }
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        splits = requestData.participants.map(participant => {
          const member = validMembers.find(m => m.id === participant.member_id)!
          const splitAmount = calculatePreciseAmount(requestData.total_amount * (participant.split_percentage! / 100))
          return {
            expense_id: '',
            member_id: participant.member_id,
            user_id: member.user_id,
            placeholder_name: member.placeholder_name,
            split_amount: splitAmount,
            share_description: `${participant.split_percentage}% of $${requestData.total_amount}`
          }
        })
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid split method. Must be equal, amount, or percentage' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
    }

    // Find payer information
    const payerMember = validMembers.find(m => m.id === requestData.payer_id)
    if (!payerMember) {
      return new Response(
        JSON.stringify({ error: 'Payer is not a valid group member' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create the expense record
    const { data: expense, error: expenseError } = await supabaseClient
      .from('expenses')
      .insert({
        group_id: requestData.group_id,
        description: requestData.description,
        original_input_text: requestData.original_input_text,
        total_amount: requestData.total_amount,
        currency: requestData.currency,
        date_of_expense: requestData.date_of_expense,
        category: requestData.category,
        tags: requestData.tags,
        payers: [{
          user_id: payerMember.user_id,
          placeholder_name: payerMember.placeholder_name,
          amount: requestData.total_amount
        }],
        participants: requestData.participants.map(p => ({
          user_id: p.user_id,
          placeholder_name: p.placeholder_name,
          amount: splits.find(s => s.member_id === p.member_id)?.split_amount || 0
        })),
        status: 'confirmed',
        created_by: user.id
      })
      .select()
      .single()

    if (expenseError) {
      console.error('Error creating expense:', expenseError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create expense',
          details: expenseError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create expense splits
    const splitsWithExpenseId = splits.map(split => ({
      ...split,
      expense_id: expense.id
    }))

    const { data: createdSplits, error: splitsError } = await supabaseClient
      .from('expense_splits')
      .insert(splitsWithExpenseId)
      .select()

    if (splitsError) {
      console.error('Error creating splits:', splitsError)
      
      // Clean up expense if splits creation failed
      await supabaseClient
        .from('expenses')
        .delete()
        .eq('id', expense.id)

      return new Response(
        JSON.stringify({ 
          error: 'Failed to create expense splits',
          details: splitsError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Return the created expense with splits
    const response = {
      success: true,
      data: {
        expense: expense,
        splits: createdSplits,
        summary: {
          total_amount: requestData.total_amount,
          currency: requestData.currency,
          split_method: requestData.split_method,
          participant_count: participantCount,
          payer: {
            member_id: requestData.payer_id,
            name: payerMember.user_id ? 'Registered User' : payerMember.placeholder_name
          }
        }
      }
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}) 