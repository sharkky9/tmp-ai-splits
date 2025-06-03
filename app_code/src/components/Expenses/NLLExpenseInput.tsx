'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { useAuthContext } from '@/contexts/AuthContext'
import { useCreateExpense } from '@/hooks/useExpenses'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Sparkles,
  RefreshCw,
  Edit3,
  Zap,
  DollarSign,
  Users,
  Calendar,
  Tag,
} from 'lucide-react'
import type { Expense, GroupMemberWithProfile, CreateExpenseRequest } from '@/types/database'
import { SplitMethod } from '@/types/database'
import { parseExpenseText, formatForExpenseCreation, type ParsedExpenseData } from '@/lib/nlpUtils'
import { ManualExpenseForm } from './ManualExpenseForm'

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

// Debounce hook for performance
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Entity chip component
interface EntityChipProps {
  type: 'amount' | 'people' | 'category' | 'date'
  children: React.ReactNode
  icon?: React.ReactNode
}

function EntityChip({ type, children, icon }: EntityChipProps) {
  const getChipStyles = () => {
    switch (type) {
      case 'amount':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'people':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'category':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'date':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <Badge
      variant='outline'
      className={`${getChipStyles()} text-xs flex items-center gap-1`}
      data-testid={`${type}-chip`}
    >
      {icon && <span className='w-3 h-3'>{icon}</span>}
      {children}
    </Badge>
  )
}

// Entity chips container component
interface EntityChipsProps {
  parsedData: ParsedExpenseData
}

function EntityChips({ parsedData }: EntityChipsProps) {
  const hasEntities =
    parsedData.amount !== null ||
    parsedData.possiblePeople.length > 0 ||
    parsedData.possibleCategories.length > 0 ||
    parsedData.possibleDates.length > 0

  if (!hasEntities || parsedData.confidence < 0.2) {
    return null
  }

  return (
    <div className='mt-3 p-3 bg-gray-50 rounded-lg' data-testid='entity-chips'>
      <div className='flex flex-wrap gap-2'>
        {/* Amount chip */}
        {parsedData.amount !== null && (
          <EntityChip type='amount' icon={<DollarSign className='w-3 h-3' />}>
            {parsedData.currency === 'USD' ? '$' : parsedData.currency}
            {parsedData.amount.toFixed(2)}
          </EntityChip>
        )}

        {/* People chips */}
        {parsedData.possiblePeople.map((person, index) => (
          <EntityChip key={`person-${index}`} type='people' icon={<Users className='w-3 h-3' />}>
            {person}
          </EntityChip>
        ))}

        {/* Category chips */}
        {parsedData.possibleCategories.map((category, index) => (
          <EntityChip key={`category-${index}`} type='category' icon={<Tag className='w-3 h-3' />}>
            {category}
          </EntityChip>
        ))}

        {/* Date chips */}
        {parsedData.possibleDates.map((date, index) => (
          <EntityChip key={`date-${index}`} type='date' icon={<Calendar className='w-3 h-3' />}>
            {date}
          </EntityChip>
        ))}
      </div>

      {parsedData.confidence < 0.7 && (
        <p className='text-xs text-gray-500 mt-2'>
          💡 These are suggestions based on your text. Continue typing for better accuracy.
        </p>
      )}
    </div>
  )
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
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualFormInitialData, setManualFormInitialData] = useState<
    Partial<CreateExpenseRequest> | undefined
  >()

  const { mutate: createExpense, isPending: isCreatingExpense } = useCreateExpense()

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

  // Debounced input for real-time entity recognition
  const debouncedInputText = useDebounce(inputText || '', 300)

  // Real-time entity recognition
  const realTimeEntities = useMemo(() => {
    if (!debouncedInputText || debouncedInputText.trim().length < 3) return null

    return parseExpenseText(debouncedInputText)
  }, [debouncedInputText])

  // Real-time basic parsing for preview
  const basicParsedData = useMemo(() => {
    if (!inputText || inputText.trim().length < 3) return null

    const currentUserProfile = groupMembers.find(
      (member) => member.user_id === user?.id && !member.is_placeholder
    )
    const currentUserName = currentUserProfile?.profiles?.name || 'Current User'

    const parsed = parseExpenseText(inputText)

    if (parsed.confidence < 0.3) return null // Too low confidence for preview

    return formatForExpenseCreation(
      parsed,
      currentUserName,
      groupMembers.map((member) => ({
        id: member.id,
        name: member.is_placeholder ? member.placeholder_name! : member.profiles?.name || 'Unknown',
      }))
    )
  }, [inputText, groupMembers, user?.id])

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

  const handleQuickAdd = () => {
    if (!basicParsedData || !user) return

    const currentMember = groupMembers.find((member) => member.user_id === user.id)
    if (!currentMember) return

    // Create expense with basic parsed data
    const expenseData: CreateExpenseRequest = {
      group_id: groupId,
      description: basicParsedData.description,
      total_amount: basicParsedData.total_amount || 0,
      currency: basicParsedData.currency,
      date_of_expense: new Date().toISOString().split('T')[0],
      payer_id: basicParsedData.payer_id || currentMember.id,
      split_method: SplitMethod.EQUAL,
      participants: basicParsedData.participants.map((participantId) => {
        const member = groupMembers.find((m) => m.id === participantId)
        return {
          member_id: participantId,
          user_id: member?.user_id || undefined,
          placeholder_name: member?.placeholder_name || undefined,
        }
      }),
    }

    createExpense(expenseData, {
      onSuccess: (expense) => {
        reset()
        onSuccess?.(expense)
      },
    })
  }

  const handleFineTune = () => {
    if (!basicParsedData || !user) return

    const currentMember = groupMembers.find((member) => member.user_id === user.id)
    if (!currentMember) return

    // Prepare initial data for manual form
    const initialData: Partial<CreateExpenseRequest> = {
      description: basicParsedData.description,
      total_amount: basicParsedData.total_amount || undefined,
      payer_id: basicParsedData.payer_id || currentMember.id,
      split_method: SplitMethod.EQUAL,
      // Note: participants will be handled by the form's state
    }

    setManualFormInitialData(initialData)
    setShowManualForm(true)
  }

  const handleManualFormSuccess = (expense: any) => {
    setShowManualForm(false)
    setManualFormInitialData(undefined)
    reset()
    onSuccess?.(expense)
  }

  const handleManualFormClose = () => {
    setShowManualForm(false)
    setManualFormInitialData(undefined)
  }

  if (showManualForm) {
    // Convert GroupMemberWithProfile to GroupMember format expected by ManualExpenseForm
    const formattedGroupMembers = groupMembers.map((member) => ({
      id: member.id,
      user_id: member.user_id || undefined,
      placeholder_name: member.placeholder_name || undefined,
      is_placeholder: member.is_placeholder,
      name: member.is_placeholder
        ? member.placeholder_name || 'Unknown'
        : member.profiles?.name || 'Unknown',
    }))

    return (
      <ManualExpenseForm
        groupId={groupId}
        groupMembers={formattedGroupMembers}
        initialData={manualFormInitialData}
        onSubmit={handleManualFormSuccess}
        onClose={handleManualFormClose}
      />
    )
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
                rows={4}
                className='resize-none'
              />
              {errors.input_text && (
                <p className='text-sm text-red-600'>{errors.input_text.message}</p>
              )}
              {inputText && (
                <p className='text-xs text-gray-500'>{inputText.length}/1000 characters</p>
              )}

              {/* Real-time Entity Recognition Chips */}
              {realTimeEntities && <EntityChips parsedData={realTimeEntities} />}
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
                    Parse with AI
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

      {/* Basic Parsing Preview Card */}
      {basicParsedData && !parsedExpenses.length && !showFallback && (
        <Card className='border-blue-200 bg-blue-50'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <Zap className='w-5 h-5 text-blue-600' />
                <CardTitle className='text-blue-800'>Quick Preview</CardTitle>
              </div>
              <Badge variant='secondary' className='text-xs'>
                Basic parsing
              </Badge>
            </div>
            <CardDescription className='text-blue-700'>
              Here&apos;s what we detected from your text. You can add it quickly or fine-tune the
              details.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='font-medium text-blue-900'>{basicParsedData.description}</p>
                {basicParsedData.total_amount && (
                  <p className='text-2xl font-bold text-blue-600'>
                    ${basicParsedData.total_amount.toFixed(2)}
                  </p>
                )}
                <p className='text-sm text-blue-600'>
                  Equal split among {basicParsedData.participants.length} members
                </p>
              </div>
              <div className='space-y-2'>
                <div>
                  <p className='text-sm font-medium text-blue-800'>Participants:</p>
                  <div className='flex flex-wrap gap-1'>
                    {basicParsedData.participants.slice(0, 3).map((participantId) => {
                      const member = groupMembers.find((m) => m.id === participantId)
                      const name = member
                        ? member.is_placeholder
                          ? member.placeholder_name
                          : member.profiles?.name
                        : 'Unknown'
                      return (
                        <Badge key={participantId} variant='outline' className='text-xs'>
                          {name}
                        </Badge>
                      )
                    })}
                    {basicParsedData.participants.length > 3 && (
                      <Badge variant='outline' className='text-xs'>
                        +{basicParsedData.participants.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className='flex gap-3 pt-2'>
              <Button
                onClick={handleQuickAdd}
                disabled={isCreatingExpense || !basicParsedData.total_amount}
                className='flex-1'
                size='sm'
              >
                {isCreatingExpense ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Adding...
                  </>
                ) : (
                  <>
                    <Zap className='w-4 h-4 mr-2' />
                    Quick Add
                  </>
                )}
              </Button>
              <Button
                variant='outline'
                onClick={handleFineTune}
                disabled={isCreatingExpense}
                size='sm'
              >
                <Edit3 className='w-4 h-4 mr-2' />
                Fine-tune
              </Button>
            </div>

            {!basicParsedData.total_amount && (
              <div className='p-3 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded'>
                💡 Couldn&apos;t detect an amount. Use &quot;Fine-tune&quot; to add details
                manually.
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
              <Button onClick={handleFineTune} variant='outline' size='sm'>
                <Edit3 className='w-4 h-4 mr-2' />
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

      {/* AI Parsed Expenses */}
      {parsedExpenses.map((expense, index) => (
        <Card key={index} className='border-green-200'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <CheckCircle className='w-5 h-5 text-green-600' />
                <CardTitle className='text-green-800'>AI Parsed Expense</CardTitle>
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
