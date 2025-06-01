'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Loader2, Sparkles, RefreshCw } from 'lucide-react'
import type { Expense, GroupMemberWithProfile } from '@/types/database'

const expenseInputSchema = z.object({
  input_text: z.string().min(3, 'Please enter at least 3 characters').max(1000, 'Input too long'),
})

type ExpenseInputData = z.infer<typeof expenseInputSchema>

interface ParsedExpense {
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
}

interface NLLExpenseInputProps {
  groupId: string
  groupMembers: GroupMemberWithProfile[]
  onSuccess?: (expense: Expense) => void
  onCancel?: () => void
}

export function NLLExpenseInput({
  groupId,
  groupMembers,
  onSuccess,
  onCancel,
}: NLLExpenseInputProps) {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([])
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([])
  const [showFallback, setShowFallback] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<ExpenseInputData>({
    resolver: zodResolver(expenseInputSchema),
  })

  const inputText = watch('input_text')

  // Parse expense using Edge Function
  const parseExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseInputData) => {
      if (!user) throw new Error('User not authenticated')

      const session = await supabase.auth.getSession()
      if (!session.data.session?.access_token) {
        throw new Error('No valid session')
      }

      // Prepare group members data for AI
      const memberData = groupMembers.map((member) => ({
        id: member.id,
        name: member.is_placeholder ? member.placeholder_name! : member.profiles?.name || 'Unknown',
        is_placeholder: member.is_placeholder,
      }))

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/parse-expense`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.data.session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            input_text: data.input_text,
            group_id: groupId,
            group_members: memberData,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to parse expense')
      }

      return result
    },
    onSuccess: (result) => {
      setParsedExpenses(result.expenses || [])
      setClarifyingQuestions(result.clarifying_questions || [])
      setShowFallback(false)
    },
    onError: (error) => {
      console.error('Failed to parse expense:', error)
      setShowFallback(true)
    },
  })

  // Save expense to database
  const saveExpenseMutation = useMutation({
    mutationFn: async (expense: ParsedExpense) => {
      if (!user) throw new Error('User not authenticated')

      const { data: newExpense, error } = await supabase
        .from('expenses')
        .insert({
          group_id: groupId,
          description: expense.description,
          original_input_text: inputText,
          total_amount: expense.total_amount,
          currency: expense.currency,
          date_of_expense: expense.date_of_expense || new Date().toISOString().split('T')[0],
          payers: expense.payers,
          participants: expense.participants,
          items: expense.items || [],
          llm_assumptions: expense.llm_assumptions,
          llm_confidence_score: expense.llm_confidence_score,
          status: expense.llm_confidence_score >= 0.8 ? 'confirmed' : 'pending_confirmation',
          created_by: user.id,
        })
        .select()
        .single<Expense>()

      if (error) throw error
      return newExpense
    },
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
      reset()
      setParsedExpenses([])
      setClarifyingQuestions([])
      setShowFallback(false)
      onSuccess?.(expense)
    },
    onError: (error) => {
      console.error('Failed to save expense:', error)
    },
  })

  const onSubmit = (data: ExpenseInputData) => {
    parseExpenseMutation.mutate(data)
  }

  const handleSaveExpense = (expense: ParsedExpense) => {
    saveExpenseMutation.mutate(expense)
  }

  const handleRetry = () => {
    setShowFallback(false)
    setParsedExpenses([])
    setClarifyingQuestions([])
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center space-x-2'>
            <Sparkles className='w-5 h-5 text-blue-600' />
            <CardTitle>Add Expense with AI</CardTitle>
          </div>
          <CardDescription>
            Describe your expense in natural language. Our AI will help structure it for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='input_text'>Describe the expense</Label>
              <Textarea
                id='input_text'
                {...register('input_text')}
                placeholder="e.g., 'I paid $45 for dinner at Pizza Palace for John, Sarah, and me. We split it evenly.'"
                disabled={isSubmitting}
                rows={3}
                className='resize-none'
              />
              {errors.input_text && (
                <p className='text-sm text-red-600'>{errors.input_text.message}</p>
              )}
              {inputText && (
                <p className='text-xs text-gray-500'>{inputText.length}/1000 characters</p>
              )}
            </div>

            <div className='flex gap-3'>
              <Button
                type='submit'
                disabled={isSubmitting || !inputText?.trim()}
                className='flex-1'
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Sparkles className='w-4 h-4 mr-2' />
                    Parse Expense
                  </>
                )}
              </Button>
              {onCancel && (
                <Button type='button' variant='outline' onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Parsing Error with Fallback */}
      {showFallback && (
        <Card className='border-amber-200 bg-amber-50'>
          <CardHeader>
            <div className='flex items-center space-x-2'>
              <AlertTriangle className='w-5 h-5 text-amber-600' />
              <CardTitle className='text-amber-800'>AI Parsing Failed</CardTitle>
            </div>
            <CardDescription className='text-amber-700'>
              The AI couldn&apos;t parse your expense. You can try again or switch to manual entry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex gap-3'>
              <Button onClick={handleRetry} variant='outline' size='sm'>
                <RefreshCw className='w-4 h-4 mr-2' />
                Try Again
              </Button>
              <Button onClick={() => setShowFallback(false)} variant='outline' size='sm'>
                Switch to Manual Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clarifying Questions */}
      {clarifyingQuestions.length > 0 && (
        <Card className='border-blue-200 bg-blue-50'>
          <CardHeader>
            <CardTitle className='text-blue-800'>Need Clarification</CardTitle>
            <CardDescription className='text-blue-700'>
              The AI needs more information to parse your expense accurately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className='space-y-2'>
              {clarifyingQuestions.map((question, index) => (
                <li key={index} className='text-sm text-blue-800'>
                  • {question}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => {
                setClarifyingQuestions([])
                setShowFallback(false)
              }}
              className='mt-4'
              size='sm'
            >
              Update Description
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Parsed Expenses */}
      {parsedExpenses.map((expense, index) => (
        <Card key={index} className='border-green-200'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <CheckCircle className='w-5 h-5 text-green-600' />
                <CardTitle className='text-green-800'>Parsed Expense</CardTitle>
              </div>
              <Badge
                variant={expense.llm_confidence_score >= 0.8 ? 'default' : 'secondary'}
                className='text-xs'
              >
                {Math.round(expense.llm_confidence_score * 100)}% confident
              </Badge>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='font-medium'>{expense.description}</p>
                <p className='text-2xl font-bold text-green-600'>
                  ${expense.total_amount.toFixed(2)}
                </p>
                <p className='text-sm text-gray-500'>{expense.date_of_expense || 'Today'}</p>
              </div>
              <div className='space-y-2'>
                <div>
                  <p className='text-sm font-medium'>Paid by:</p>
                  {expense.payers.map((payer, i) => (
                    <p key={i} className='text-sm'>
                      {payer.placeholder_name} - ${payer.amount.toFixed(2)}
                    </p>
                  ))}
                </div>
                <div>
                  <p className='text-sm font-medium'>Split among:</p>
                  {expense.participants.map((participant, i) => (
                    <p key={i} className='text-sm'>
                      {participant.placeholder_name} - ${participant.amount.toFixed(2)}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {expense.llm_assumptions.length > 0 && (
              <div className='bg-gray-50 p-3 rounded'>
                <p className='text-sm font-medium mb-2'>AI Assumptions:</p>
                <ul className='text-xs text-gray-600 space-y-1'>
                  {expense.llm_assumptions.map((assumption, i) => (
                    <li key={i}>• {assumption}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className='flex gap-3 pt-2'>
              <Button
                onClick={() => handleSaveExpense(expense)}
                disabled={saveExpenseMutation.isPending}
                className='flex-1'
              >
                {saveExpenseMutation.isPending ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Saving...
                  </>
                ) : (
                  'Save Expense'
                )}
              </Button>
              <Button
                variant='outline'
                onClick={() => setParsedExpenses([])}
                disabled={saveExpenseMutation.isPending}
              >
                Edit
              </Button>
            </div>

            {saveExpenseMutation.error && (
              <div className='p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded'>
                Failed to save expense: {saveExpenseMutation.error.message}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
