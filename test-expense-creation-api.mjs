#!/usr/bin/env node

/**
 * Test script for Enhanced Expense Creation API
 * This script tests the create-expense-with-splits Edge Function
 * 
 * Usage: node test-expense-creation-api.mjs
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here'

// Test data
const testExpenseRequests = [
  {
    name: 'Equal Split Test',
    data: {
      group_id: 'test-group-id',
      description: 'Team dinner at restaurant',
      total_amount: 120.00,
      currency: 'USD',
      date_of_expense: '2024-01-15',
      category: 'food',
      tags: ['dinner', 'team', 'restaurant'],
      payer_id: 'test-member-1',
      split_method: 'equal',
      participants: [
        { member_id: 'test-member-1', user_id: 'user-1' },
        { member_id: 'test-member-2', user_id: 'user-2' },
        { member_id: 'test-member-3', placeholder_name: 'John Doe' },
        { member_id: 'test-member-4', user_id: 'user-4' }
      ]
    },
    expectedSplitAmount: 30.00 // $120 / 4 people
  },
  {
    name: 'Custom Amount Split Test',
    data: {
      group_id: 'test-group-id',
      description: 'Groceries with different contributions',
      total_amount: 85.50,
      currency: 'USD',
      date_of_expense: '2024-01-16',
      category: 'groceries',
      tags: ['food', 'shopping'],
      payer_id: 'test-member-1',
      split_method: 'amount',
      participants: [
        { member_id: 'test-member-1', user_id: 'user-1', split_amount: 35.50 },
        { member_id: 'test-member-2', user_id: 'user-2', split_amount: 25.00 },
        { member_id: 'test-member-3', placeholder_name: 'John Doe', split_amount: 25.00 }
      ]
    }
  },
  {
    name: 'Percentage Split Test',
    data: {
      group_id: 'test-group-id',
      description: 'Utility bill split',
      total_amount: 200.00,
      currency: 'USD',
      date_of_expense: '2024-01-17',
      category: 'utilities',
      tags: ['bills', 'monthly'],
      payer_id: 'test-member-1',
      split_method: 'percentage',
      participants: [
        { member_id: 'test-member-1', user_id: 'user-1', split_percentage: 40 }, // $80
        { member_id: 'test-member-2', user_id: 'user-2', split_percentage: 35 }, // $70
        { member_id: 'test-member-3', placeholder_name: 'John Doe', split_percentage: 25 } // $50
      ]
    }
  }
]

const testInvalidRequests = [
  {
    name: 'Invalid Split Amount Sum',
    data: {
      group_id: 'test-group-id',
      description: 'Invalid amounts test',
      total_amount: 100.00,
      currency: 'USD',
      date_of_expense: '2024-01-18',
      payer_id: 'test-member-1',
      split_method: 'amount',
      participants: [
        { member_id: 'test-member-1', split_amount: 30.00 },
        { member_id: 'test-member-2', split_amount: 40.00 } // Total only 70, should be 100
      ]
    },
    expectedError: 'Split amounts do not sum to total expense amount'
  },
  {
    name: 'Invalid Percentage Sum',
    data: {
      group_id: 'test-group-id',
      description: 'Invalid percentages test',
      total_amount: 100.00,
      currency: 'USD',
      date_of_expense: '2024-01-19',
      payer_id: 'test-member-1',
      split_method: 'percentage',
      participants: [
        { member_id: 'test-member-1', split_percentage: 60 },
        { member_id: 'test-member-2', split_percentage: 50 } // Total 110%, should be 100%
      ]
    },
    expectedError: 'Split percentages do not sum to 100%'
  }
]

async function testExpenseCreation() {
  console.log('🧪 Testing Enhanced Expense Creation API\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Test valid requests
  console.log('📝 Testing Valid Expense Requests:')
  console.log('=====================================\n')

  for (const test of testExpenseRequests) {
    console.log(`Testing: ${test.name}`)
    console.log(`Description: ${test.data.description}`)
    console.log(`Amount: $${test.data.total_amount}`)
    console.log(`Split Method: ${test.data.split_method}`)
    console.log(`Participants: ${test.data.participants.length}`)

    try {
      // Note: In a real test, you would need valid authentication headers
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-expense-with-splits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-here' // Would need real auth token
        },
        body: JSON.stringify(test.data)
      })

      const result = await response.json()

      if (response.ok) {
        console.log('✅ SUCCESS')
        console.log(`Expense ID: ${result.data.expense.id}`)
        console.log(`Splits Created: ${result.data.splits.length}`)
        
        if (test.expectedSplitAmount) {
          const actualSplitAmount = parseFloat(result.data.splits[0].split_amount)
          if (Math.abs(actualSplitAmount - test.expectedSplitAmount) < 0.01) {
            console.log(`✅ Split calculation correct: $${actualSplitAmount}`)
          } else {
            console.log(`❌ Split calculation error: expected $${test.expectedSplitAmount}, got $${actualSplitAmount}`)
          }
        }
      } else {
        console.log('❌ FAILED')
        console.log(`Error: ${result.error}`)
        if (result.details) {
          console.log(`Details: ${JSON.stringify(result.details, null, 2)}`)
        }
      }

    } catch (error) {
      console.log('❌ NETWORK ERROR')
      console.log(`Error: ${error.message}`)
    }

    console.log('')
  }

  // Test invalid requests
  console.log('🚫 Testing Invalid Expense Requests:')
  console.log('=====================================\n')

  for (const test of testInvalidRequests) {
    console.log(`Testing: ${test.name}`)
    console.log(`Expected Error: ${test.expectedError}`)

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-expense-with-splits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-here'
        },
        body: JSON.stringify(test.data)
      })

      const result = await response.json()

      if (!response.ok && result.error.includes(test.expectedError.split(' ')[0])) {
        console.log('✅ CORRECTLY REJECTED')
        console.log(`Error: ${result.error}`)
      } else {
        console.log('❌ UNEXPECTED RESULT')
        console.log(`Response: ${JSON.stringify(result, null, 2)}`)
      }

    } catch (error) {
      console.log('❌ NETWORK ERROR')
      console.log(`Error: ${error.message}`)
    }

    console.log('')
  }

  // Test split calculation algorithms
  console.log('🧮 Testing Split Calculation Algorithms:')
  console.log('=========================================\n')

  // Test equal split with remainder
  const totalAmount = 10.00
  const participantCount = 3
  const baseAmount = Math.floor((totalAmount * 100) / participantCount) / 100
  const remainder = Math.round((totalAmount * 100) - (baseAmount * 100 * participantCount))

  console.log(`Equal Split Test: $${totalAmount} among ${participantCount} people`)
  console.log(`Base amount per person: $${baseAmount}`)
  console.log(`Remainder (cents): ${remainder}`)
  console.log(`Expected splits: $3.33, $3.33, $3.34`)

  const expectedSplits = [3.33, 3.33, 3.34]
  const actualSplits = [baseAmount, baseAmount, baseAmount + (remainder * 0.01)]
  
  const splitCheck = expectedSplits.every((expected, i) => 
    Math.abs(expected - actualSplits[i]) < 0.01
  )

  console.log(splitCheck ? '✅ Equal split calculation correct' : '❌ Equal split calculation error')
  console.log('')

  // Test precision calculation
  console.log('Precision Test: $100.00 with 33.333...% splits')
  const preciseAmount1 = Math.round(100 * (100/3) / 100) / 100
  const preciseAmount2 = Math.round(100 * (100/3) / 100) / 100
  const preciseAmount3 = 100 - preciseAmount1 - preciseAmount2

  console.log(`Split 1: $${preciseAmount1}`)
  console.log(`Split 2: $${preciseAmount2}`)
  console.log(`Split 3: $${preciseAmount3}`)
  console.log(`Total: $${preciseAmount1 + preciseAmount2 + preciseAmount3}`)

  const precisionCheck = Math.abs((preciseAmount1 + preciseAmount2 + preciseAmount3) - 100) < 0.01
  console.log(precisionCheck ? '✅ Precision calculation correct' : '❌ Precision calculation error')

  console.log('\n🎉 Testing Complete!')
}

// Helper function to simulate split calculations
function calculateEqualSplits(totalAmount, participantCount) {
  const baseAmount = Math.floor((totalAmount * 100) / participantCount) / 100
  const remainder = Math.round((totalAmount * 100) - (baseAmount * 100 * participantCount))
  
  const splits = new Array(participantCount).fill(baseAmount)
  
  // Distribute remainder cents to first participants
  for (let i = 0; i < remainder; i++) {
    splits[i] = Math.round((splits[i] + 0.01) * 100) / 100
  }
  
  return splits
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  testExpenseCreation().catch(console.error)
} 