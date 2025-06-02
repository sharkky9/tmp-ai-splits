import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import OpenAI from 'https://esm.sh/openai@4.20.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExpenseParseRequest {
  input_text: string
  group_id: string
  group_members: Array<{
    id: string
    name: string
    is_placeholder: boolean
  }>
}

interface ExpenseParseResponse {
  success: boolean
  expenses?: Array<{
    description: string
    total_amount: number
    currency: string
    date_of_expense?: string
    payers: Array<{
      user_id?: string
      placeholder_name?: string
      amount: number
    }>
    participants: Array<{
      user_id?: string
      placeholder_name?: string
      amount: number
      percentage?: number
    }>
    items?: Array<{
      id: string
      description: string
      amount: number
      participants: Array<{
        user_id?: string
        placeholder_name?: string
        amount: number
        percentage?: number
      }>
    }>
    llm_assumptions: string[]
    llm_confidence_score: number
  }>
  error?: string
  clarifying_questions?: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!openaiApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    // Initialize clients
    const openai = new OpenAI({ apiKey: openaiApiKey })
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { input_text, group_id, group_members }: ExpenseParseRequest = await req.json()

    if (!input_text || !group_id || !group_members) {
      throw new Error('Missing required fields: input_text, group_id, group_members')
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', group_id)
      .eq('user_id', user.id)
      .eq('is_placeholder', false)
      .single()

    if (membershipError || !membership) {
      throw new Error('User is not a member of this group')
    }

    // Prepare member list for AI prompt
    const memberList = group_members.map(member => 
      member.is_placeholder ? member.name : member.name
    ).join(', ')

    // Create structured prompt for OpenAI
    const systemPrompt = `You are an expense parsing assistant. Parse natural language expense descriptions into structured data.

Group members: ${memberList}

Return a JSON object with this exact structure:
{
  "expenses": [
    {
      "description": "string (brief, clear description)",
      "total_amount": number (decimal, positive),
      "currency": "USD" (always USD for now),
      "date_of_expense": "YYYY-MM-DD" (today if not specified),
      "payers": [{"placeholder_name": "string", "amount": number}],
      "participants": [{"placeholder_name": "string", "amount": number, "percentage": number}],
      "items": [{"id": "uuid", "description": "string", "amount": number, "participants": [...]}] (optional),
      "llm_assumptions": ["string array of assumptions made"],
      "llm_confidence_score": number (0.0-1.0)
    }
  ],
  "clarifying_questions": ["string array"] (if needed)
}

Rules:
1. Match member names case-insensitively to the group member list
2. If splitting evenly, calculate exact amounts (participants.amount should sum to total_amount)
3. Use percentage only when explicitly mentioned
4. Default to today's date if no date specified
5. Include items array only for itemized expenses
6. Confidence score: 0.9+ for clear input, 0.7+ for some assumptions, <0.7 for unclear
7. Ask clarifying questions if critical information is missing or ambiguous
8. Always ensure payers.amount sums to total_amount
9. Always ensure participants.amount sums to total_amount

Examples of good assumptions to include:
- "Assumed even split among mentioned participants"
- "Assumed payer paid the full amount"
- "Assumed today's date"
- "Matched 'john' to group member 'John Smith'"

Be precise with calculations and conservative with confidence scores.`

    const userPrompt = `Parse this expense: "${input_text}"`

    // Call OpenAI with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API timeout')), 10000)
    })

    const openaiPromise = openai.chat.completions.create({
      model: 'o3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1500
    })

    const completion = await Promise.race([openaiPromise, timeoutPromise]) as any

    if (!completion.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI')
    }

    // Parse and validate response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(completion.choices[0].message.content)
    } catch (error) {
      throw new Error('Failed to parse OpenAI response as JSON')
    }

    // Validate response structure
    if (!parsedResponse.expenses || !Array.isArray(parsedResponse.expenses)) {
      throw new Error('Invalid response structure from OpenAI')
    }

    // Validate each expense
    for (const expense of parsedResponse.expenses) {
      if (!expense.description || !expense.total_amount || !expense.payers || !expense.participants) {
        throw new Error('Missing required expense fields')
      }
      
      // Validate amounts
      const payerTotal = expense.payers.reduce((sum: number, payer: any) => sum + payer.amount, 0)
      const participantTotal = expense.participants.reduce((sum: number, participant: any) => sum + participant.amount, 0)
      
      if (Math.abs(payerTotal - expense.total_amount) > 0.01) {
        throw new Error(`Payer amounts (${payerTotal}) don't match total amount (${expense.total_amount})`)
      }
      
      if (Math.abs(participantTotal - expense.total_amount) > 0.01) {
        throw new Error(`Participant amounts (${participantTotal}) don't match total amount (${expense.total_amount})`)
      }
    }

    const response: ExpenseParseResponse = {
      success: true,
      expenses: parsedResponse.expenses,
      clarifying_questions: parsedResponse.clarifying_questions || []
    }

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    })

  } catch (error) {
    console.error('Error in parse-expense function:', error)
    
    const response: ExpenseParseResponse = {
      success: false,
      error: error.message || 'Unknown error occurred'
    }

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    })
  }
}) 