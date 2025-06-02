'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { CreateExpenseRequest, ExpenseParticipantInput, SplitMethod } from '../../types/database'
import { useCreateExpense } from '../../hooks/useExpenses'
import { ExpenseCategoryIcon } from './ExpenseCategoryIcon'
import { formatCurrency } from '../../lib/expenseUtils'
import { Calendar, DollarSign, Users, Calculator, AlertCircle, Check, X, Plus } from 'lucide-react'

interface GroupMember {
  id: string
  user_id?: string
  placeholder_name?: string
  is_placeholder: boolean
  name: string // Display name (from profile or placeholder_name)
}

interface ManualExpenseFormProps {
  groupId: string
  groupMembers: GroupMember[]
  onClose: () => void
  onSubmit: (expense: CreateExpenseRequest) => void
  initialData?: Partial<CreateExpenseRequest>
}

interface FormData {
  description: string
  total_amount: string
  currency: string
  date_of_expense: string
  category: string
  tags: string[]
  payer_id: string
  split_method: SplitMethod
  participants: string[] // Member IDs
  custom_amounts: Record<string, string>
  custom_percentages: Record<string, string>
}

interface FormErrors {
  description?: string
  total_amount?: string
  currency?: string
  date_of_expense?: string
  payer_id?: string
  participants?: string
  custom_amounts?: string
  custom_percentages?: string
  general?: string
}

const EXPENSE_CATEGORIES = [
  'food',
  'transport',
  'accommodation',
  'entertainment',
  'groceries',
  'utilities',
  'shopping',
  'healthcare',
  'education',
  'other',
]

const DEFAULT_TAGS = [
  'dinner',
  'lunch',
  'breakfast',
  'drinks',
  'coffee',
  'gas',
  'taxi',
  'uber',
  'flight',
  'hotel',
  'groceries',
  'shopping',
  'bills',
  'rent',
  'movie',
  'concert',
  'sports',
  'party',
]

export function ManualExpenseForm({
  groupId,
  groupMembers,
  onClose,
  onSubmit,
  initialData,
}: ManualExpenseFormProps) {
  // For now, we'll use a mock implementation since the hook isn't implemented yet
  const isLoading = false
  const error = null

  // Form state
  const [formData, setFormData] = useState<FormData>({
    description: initialData?.description || '',
    total_amount: initialData?.total_amount?.toString() || '',
    currency: initialData?.currency || 'USD',
    date_of_expense: initialData?.date_of_expense || new Date().toISOString().split('T')[0],
    category: initialData?.category || '',
    tags: (initialData as any)?.tags || [],
    payer_id: (initialData as any)?.payer_id || '',
    split_method: (initialData?.split_method as SplitMethod) || 'equal',
    participants: [],
    custom_amounts: {},
    custom_percentages: {}
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [newTag, setNewTag] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)

  // Calculate equal split preview
  const equalSplitAmount = useMemo(() => {
    const amount = parseFloat(formData.total_amount)
    const participantCount = formData.participants.length

    if (isNaN(amount) || participantCount === 0) return 0

    return amount / participantCount
  }, [formData.total_amount, formData.participants.length])

  // Calculate total for custom amounts/percentages
  const customTotals = useMemo(() => {
    const amounts = Object.values(formData.custom_amounts)
      .map((val) => parseFloat(val) || 0)
      .reduce((sum, val) => sum + val, 0)

    const percentages = Object.values(formData.custom_percentages)
      .map((val) => parseFloat(val) || 0)
      .reduce((sum, val) => sum + val, 0)

    return { amounts, percentages }
  }, [formData.custom_amounts, formData.custom_percentages])

  // Update form field
  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear related errors
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  // Handle participant selection
  const toggleParticipant = (memberId: string) => {
    setFormData((prev) => {
      const isSelected = prev.participants.includes(memberId)
      const newParticipants = isSelected
        ? prev.participants.filter((id) => id !== memberId)
        : [...prev.participants, memberId]

      // Clean up custom amounts/percentages if participant removed
      const newCustomAmounts = { ...prev.custom_amounts }
      const newCustomPercentages = { ...prev.custom_percentages }

      if (isSelected) {
        delete newCustomAmounts[memberId]
        delete newCustomPercentages[memberId]
      }

      return {
        ...prev,
        participants: newParticipants,
        custom_amounts: newCustomAmounts,
        custom_percentages: newCustomPercentages,
      }
    })
  }

  // Handle custom amount/percentage change
  const updateCustomValue = (memberId: string, value: string, type: 'amount' | 'percentage') => {
    const field = type === 'amount' ? 'custom_amounts' : 'custom_percentages'
    setFormData((prev) => ({
      ...prev,
      [field]: { ...prev[field], [memberId]: value },
    }))
  }

  // Add tag
  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      updateField('tags', [...formData.tags, tag])
    }
    setNewTag('')
    setShowTagInput(false)
  }

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    updateField(
      'tags',
      formData.tags.filter((tag) => tag !== tagToRemove)
    )
  }

  // Validation
  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {}

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    const amount = parseFloat(formData.total_amount)
    if (!formData.total_amount || isNaN(amount) || amount <= 0) {
      newErrors.total_amount = 'Amount must be a positive number'
    }

    if (!formData.payer_id) {
      newErrors.payer_id = 'Payer is required'
    }

    if (formData.participants.length === 0) {
      newErrors.participants = 'At least one participant is required'
    }

    // Validate split amounts/percentages
    if (formData.split_method === 'amount' && formData.participants.length > 0) {
      const totalCustomAmount = customTotals.amounts
      const expectedAmount = parseFloat(formData.total_amount) || 0

      if (Math.abs(totalCustomAmount - expectedAmount) > 0.01) {
        newErrors.custom_amounts = `Amounts must sum to ${formatCurrency(expectedAmount)} (currently ${formatCurrency(totalCustomAmount)})`
      }
    }

    if (formData.split_method === 'percentage' && formData.participants.length > 0) {
      const totalPercentage = customTotals.percentages

      if (Math.abs(totalPercentage - 100) > 0.01) {
        newErrors.custom_percentages = `Percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`
      }
    }

    return newErrors
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    // Build participants array
    const participants: ExpenseParticipantInput[] = formData.participants.map((memberId) => {
      const member = groupMembers.find((m) => m.id === memberId)!

      const base = {
        member_id: memberId,
        user_id: member.user_id,
        placeholder_name: member.placeholder_name,
      }

      if (formData.split_method === 'amount') {
        return {
          ...base,
          split_amount: parseFloat(formData.custom_amounts[memberId]) || 0,
        }
      }

      if (formData.split_method === 'percentage') {
        return {
          ...base,
          split_percentage: parseFloat(formData.custom_percentages[memberId]) || 0,
        }
      }

      return base
    })

    const expenseRequest: CreateExpenseRequest = {
      group_id: groupId,
      description: formData.description.trim(),
      total_amount: parseFloat(formData.total_amount),
      currency: formData.currency,
      date_of_expense: formData.date_of_expense,
      category: formData.category || undefined,
      payer_id: formData.payer_id,
      split_method: formData.split_method,
      participants,
    }

    // Add tags if they exist
    if (formData.tags.length > 0) {
      ;(expenseRequest as any).tags = formData.tags
    }

    onSubmit(expenseRequest)
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-2xl font-bold text-gray-900'>Add New Expense</h2>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600'
              aria-label='Close'
            >
              <X size={24} />
            </button>
          </div>

          {error && (
            <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-md'>
              <div className='flex items-center'>
                <AlertCircle className='text-red-500 mr-2' size={16} />
                <span className='text-red-700 text-sm'>{(error as any)?.message || 'An error occurred'}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} role='form' className='space-y-6'>
            {/* Basic Details */}
            <div className='space-y-4'>
              <h3 className='text-lg font-semibold text-gray-900 border-b pb-2'>Expense Details</h3>

              {/* Description */}
              <div>
                <label
                  htmlFor='description'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  Description *
                </label>
                <input
                  id='description'
                  type='text'
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder='What was this expense for?'
                />
                {errors.description && (
                  <p className='mt-1 text-sm text-red-600'>{errors.description}</p>
                )}
              </div>

              {/* Amount and Date */}
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label htmlFor='amount' className='block text-sm font-medium text-gray-700 mb-1'>
                    Amount *
                  </label>
                  <div className='relative'>
                    <DollarSign
                      className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
                      size={16}
                    />
                    <input
                      id='amount'
                      name='total_amount'
                      type='number'
                      step='0.01'
                      min='0'
                      value={formData.total_amount}
                      onChange={(e) => updateField('total_amount', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.total_amount ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder='0.00'
                    />
                  </div>
                  {errors.total_amount && (
                    <p className='mt-1 text-sm text-red-600'>{errors.total_amount}</p>
                  )}
                </div>

                <div>
                  <label htmlFor='date' className='block text-sm font-medium text-gray-700 mb-1'>
                    Date
                  </label>
                  <div className='relative'>
                    <Calendar
                      className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
                      size={16}
                    />
                    <input
                      id='date'
                      type='date'
                      value={formData.date_of_expense}
                      onChange={(e) => updateField('date_of_expense', e.target.value)}
                      className='w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label htmlFor='category' className='block text-sm font-medium text-gray-700 mb-1'>
                  Category
                </label>
                <select
                  id='category'
                  value={formData.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value=''>Select a category</option>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Tags</label>
                <div className='flex flex-wrap gap-2 mb-2'>
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800'
                    >
                      {tag}
                      <button
                        type='button'
                        onClick={() => removeTag(tag)}
                        className='ml-1 text-blue-600 hover:text-blue-800'
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                {showTagInput ? (
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag(newTag)}
                      className='flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                      placeholder='Add a tag'
                      autoFocus
                    />
                    <button
                      type='button'
                      onClick={() => addTag(newTag)}
                      className='px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600'
                    >
                      Add
                    </button>
                    <button
                      type='button'
                      onClick={() => setShowTagInput(false)}
                      className='px-3 py-1 bg-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-400'
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className='flex flex-wrap gap-2'>
                    {DEFAULT_TAGS.filter((tag) => !formData.tags.includes(tag))
                      .slice(0, 6)
                      .map((tag) => (
                        <button
                          key={tag}
                          type='button'
                          onClick={() => addTag(tag)}
                          className='px-2 py-1 text-xs border border-gray-300 rounded-full hover:bg-gray-50'
                        >
                          {tag}
                        </button>
                      ))}
                    <button
                      type='button'
                      onClick={() => setShowTagInput(true)}
                      className='inline-flex items-center px-2 py-1 text-xs border border-dashed border-gray-300 rounded-full hover:bg-gray-50'
                    >
                      <Plus size={12} className='mr-1' />
                      Add custom
                    </button>
                  </div>
                )}
              </div>

              {/* Payer */}
              <div>
                <label htmlFor='payer' className='block text-sm font-medium text-gray-700 mb-1'>
                  Who paid? *
                </label>
                <select
                  id='payer'
                  value={formData.payer_id}
                  onChange={(e) => updateField('payer_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.payer_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value=''>Select who paid</option>
                  {groupMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                {errors.payer_id && <p className='mt-1 text-sm text-red-600'>{errors.payer_id}</p>}
              </div>
            </div>

            {/* Split Method */}
            <div className='space-y-4'>
              <h3 className='text-lg font-semibold text-gray-900 border-b pb-2'>How to split?</h3>

              <div role='radiogroup' aria-labelledby='split-method-label'>
                <span id='split-method-label' className='sr-only'>
                  Split method
                </span>

                <div className='space-y-3'>
                  <label className='flex items-center'>
                    <input
                      type='radio'
                      name='split_method'
                      value='equal'
                      checked={formData.split_method === 'equal'}
                      onChange={(e) => updateField('split_method', e.target.value as SplitMethod)}
                      className='mr-3'
                    />
                    <div className='flex items-center'>
                      <Calculator className='text-blue-500 mr-2' size={16} />
                      <span className='font-medium'>Equal split</span>
                      {formData.participants.length > 0 && formData.total_amount && (
                        <span className='ml-2 text-sm text-gray-600'>
                          ({formatCurrency(equalSplitAmount)} each)
                        </span>
                      )}
                    </div>
                  </label>

                  <label className='flex items-center'>
                    <input
                      type='radio'
                      name='split_method'
                      value='amount'
                      checked={formData.split_method === 'amount'}
                      onChange={(e) => updateField('split_method', e.target.value as SplitMethod)}
                      className='mr-3'
                    />
                    <div className='flex items-center'>
                      <DollarSign className='text-green-500 mr-2' size={16} />
                      <span className='font-medium'>Custom amounts</span>
                    </div>
                  </label>

                  <label className='flex items-center'>
                    <input
                      type='radio'
                      name='split_method'
                      value='percentage'
                      checked={formData.split_method === 'percentage'}
                      onChange={(e) => updateField('split_method', e.target.value as SplitMethod)}
                      className='mr-3'
                    />
                    <div className='flex items-center'>
                      <span className='text-purple-500 mr-2 text-sm font-bold'>%</span>
                      <span className='font-medium'>Percentages</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-gray-900'>Participants *</h3>
                {formData.participants.length > 0 && (
                  <span className='text-sm text-gray-600'>
                    {formData.participants.length} selected
                  </span>
                )}
              </div>

              {errors.participants && <p className='text-sm text-red-600'>{errors.participants}</p>}

              <div className='space-y-2 max-h-40 overflow-y-auto'>
                {groupMembers.map((member) => {
                  const isSelected = formData.participants.includes(member.id)

                  return (
                    <div key={member.id} className='border border-gray-200 rounded-lg p-3'>
                      <div className='flex items-center justify-between'>
                        <label className='flex items-center cursor-pointer flex-1'>
                          <input
                            type='checkbox'
                            checked={isSelected}
                            onChange={() => toggleParticipant(member.id)}
                            className='mr-3'
                          />
                          <div className='flex items-center'>
                            <Users className='text-gray-400 mr-2' size={16} />
                            <span className='font-medium'>{member.name}</span>
                            {member.is_placeholder && (
                              <span className='ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded'>
                                Guest
                              </span>
                            )}
                          </div>
                        </label>

                        {/* Custom amount/percentage input */}
                        {isSelected && formData.split_method === 'amount' && (
                          <div className='ml-4'>
                            <div className='relative'>
                              <DollarSign
                                className='absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400'
                                size={14}
                              />
                              <input
                                type='number'
                                step='0.01'
                                min='0'
                                value={formData.custom_amounts[member.id] || ''}
                                onChange={(e) =>
                                  updateCustomValue(member.id, e.target.value, 'amount')
                                }
                                className='w-24 pl-6 pr-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'
                                placeholder='0.00'
                                aria-label={`${member.name} amount`}
                              />
                            </div>
                          </div>
                        )}

                        {isSelected && formData.split_method === 'percentage' && (
                          <div className='ml-4'>
                            <div className='relative'>
                              <input
                                type='number'
                                step='0.1'
                                min='0'
                                max='100'
                                value={formData.custom_percentages[member.id] || ''}
                                onChange={(e) =>
                                  updateCustomValue(member.id, e.target.value, 'percentage')
                                }
                                className='w-20 pr-6 pl-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'
                                placeholder='0'
                                aria-label={`${member.name} percentage`}
                              />
                              <span className='absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm'>
                                %
                              </span>
                            </div>
                          </div>
                        )}

                        {isSelected && formData.split_method === 'equal' && (
                          <div className='ml-4 text-sm text-gray-600'>
                            {formatCurrency(equalSplitAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Split validation summary */}
              {formData.split_method === 'amount' && formData.participants.length > 0 && (
                <div className='p-3 bg-gray-50 rounded-lg'>
                  <div className='flex justify-between text-sm'>
                    <span>Total amount:</span>
                    <span className='font-medium'>
                      {formatCurrency(parseFloat(formData.total_amount) || 0)}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span>Sum of amounts:</span>
                    <span
                      className={`font-medium ${
                        Math.abs(customTotals.amounts - (parseFloat(formData.total_amount) || 0)) >
                        0.01
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(customTotals.amounts)}
                    </span>
                  </div>
                  {errors.custom_amounts && (
                    <p className='mt-1 text-sm text-red-600'>{errors.custom_amounts}</p>
                  )}
                </div>
              )}

              {formData.split_method === 'percentage' && formData.participants.length > 0 && (
                <div className='p-3 bg-gray-50 rounded-lg'>
                  <div className='flex justify-between text-sm'>
                    <span>Total percentage:</span>
                    <span
                      className={`font-medium ${
                        Math.abs(customTotals.percentages - 100) > 0.01
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {customTotals.percentages.toFixed(1)}%
                    </span>
                  </div>
                  {errors.custom_percentages && (
                    <p className='mt-1 text-sm text-red-600'>{errors.custom_percentages}</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className='flex justify-end space-x-3 pt-6 border-t'>
              <button
                type='button'
                onClick={onClose}
                className='px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500'
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={isLoading}
                className='px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isLoading ? 'Creating...' : 'Create Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
