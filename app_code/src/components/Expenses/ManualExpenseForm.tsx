'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CalendarIcon,
  Plus,
  Trash2,
  DollarSign,
  Users,
  Save,
  X,
  Receipt,
  List,
  Calculator,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDateForAPI } from '@/lib/utils/dateUtils'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import Decimal from 'decimal.js'
import type { Expense, GroupMemberWithProfile } from '@/types/database'
import { ItemizedSplitForm } from './ItemizedSplitForm'

const manualExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  total_amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(3, 'Currency code required'),
  date_of_expense: z.date(),
  payers: z
    .array(
      z.object({
        user_id: z.string().optional(),
        placeholder_name: z.string().optional(),
        amount: z.number().positive('Amount must be positive'),
      })
    )
    .min(1, 'At least one payer is required'),
  participants: z
    .array(
      z.object({
        user_id: z.string().optional(),
        placeholder_name: z.string().optional(),
        amount: z.number().positive('Amount must be positive'),
        percentage: z.number().optional(),
      })
    )
    .min(1, 'At least one participant is required'),
  is_itemized: z.boolean(),
  items: z
    .array(
      z.object({
        id: z.string(),
        description: z.string().min(1, 'Item description is required'),
        amount: z.number().positive('Amount must be positive'),
        participants: z.array(
          z.object({
            user_id: z.string().optional(),
            placeholder_name: z.string().optional(),
            amount: z.number().positive('Amount must be positive'),
          })
        ),
      })
    )
    .optional(),
})

type ManualExpenseFormData = z.infer<typeof manualExpenseSchema>

interface ManualExpenseFormProps {
  groupId: string
  groupMembers: GroupMemberWithProfile[]
  onSubmit: (expense: Partial<Expense>) => void
  onCancel: () => void
  initialData?: Partial<Expense>
  isLoading?: boolean
}

type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares'

export function ManualExpenseForm({
  groupId,
  groupMembers,
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: ManualExpenseFormProps) {
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal')
  const [showCalendar, setShowCalendar] = useState(false)
  const [isItemizedMode, setIsItemizedMode] = useState(false)
  const [itemizedValid, setItemizedValid] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    getValues,
    reset,
  } = useForm<ManualExpenseFormData>({
    resolver: zodResolver(manualExpenseSchema),
    defaultValues: {
      description: initialData?.description || '',
      total_amount: initialData?.total_amount || 0,
      currency: initialData?.currency || 'USD',
      date_of_expense: initialData?.date_of_expense
        ? new Date(initialData.date_of_expense)
        : new Date(),
      payers: initialData?.payers || [{ user_id: '', placeholder_name: '', amount: 0 }],
      participants: initialData?.participants || [
        { user_id: '', placeholder_name: '', amount: 0, percentage: 0 },
      ],
      is_itemized: false,
      items: [],
    },
  })

  const {
    fields: payerFields,
    append: appendPayer,
    remove: removePayer,
  } = useFieldArray({
    control,
    name: 'payers',
  })

  const {
    fields: participantFields,
    append: appendParticipant,
    remove: removeParticipant,
  } = useFieldArray({
    control,
    name: 'participants',
  })

  const watchedTotalAmount = watch('total_amount')
  const watchedPayers = watch('payers')
  const watchedParticipants = watch('participants')

  const getMemberOptions = () => {
    return groupMembers.map((member) => ({
      id: member.user_id || `placeholder-${member.id}`,
      name: member.profiles?.name || member.placeholder_name || 'Unknown',
      isPlaceholder: member.is_placeholder,
    }))
  }

  // Calculate totals for validation
  const payersTotal = watchedPayers?.reduce((sum, payer) => sum + (payer.amount || 0), 0) || 0
  const participantsTotal =
    watchedParticipants?.reduce((sum, participant) => sum + (participant.amount || 0), 0) || 0

  // Auto-calculate equal splits
  const handleEqualSplit = useCallback(() => {
    if (participantFields.length === 0 || !watchedTotalAmount) return

    const equalAmount = new Decimal(watchedTotalAmount).div(participantFields.length)
    const roundedAmount = equalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

    participantFields.forEach((_, index) => {
      setValue(`participants.${index}.amount`, roundedAmount.toNumber())
      setValue(
        `participants.${index}.percentage`,
        new Decimal(100).div(participantFields.length).toDecimalPlaces(1).toNumber()
      )
    })
  }, [participantFields, watchedTotalAmount, setValue])

  // Auto-calculate from percentages
  const handlePercentageSplit = () => {
    if (!watchedTotalAmount) return

    participantFields.forEach((_, index) => {
      const percentage = getValues(`participants.${index}.percentage`)
      if (percentage) {
        const amount = new Decimal(watchedTotalAmount).mul(percentage).div(100)
        setValue(`participants.${index}.amount`, amount.toDecimalPlaces(2).toNumber())
      }
    })
  }

  // Auto-split for payers (set first payer to full amount)
  const handlePayerAutoFill = () => {
    if (payerFields.length > 0 && watchedTotalAmount) {
      setValue(`payers.0.amount`, watchedTotalAmount)
      // Clear other payers
      for (let i = 1; i < payerFields.length; i++) {
        setValue(`payers.${i}.amount`, 0)
      }
    }
  }

  // Toggle itemized mode
  const handleItemizedToggle = (checked: boolean) => {
    setIsItemizedMode(checked)
    setValue('is_itemized', checked)
    if (!checked) {
      setValue('items', [])
    }
  }

  const onFormSubmit = (data: ManualExpenseFormData) => {
    const expense: Partial<Expense> = {
      group_id: groupId,
      description: data.description,
      total_amount: data.total_amount,
      currency: data.currency,
      date_of_expense: formatDateForAPI(data.date_of_expense),
      payers: data.payers,
      participants: data.participants,
      items: data.is_itemized ? data.items : undefined,
      status: 'confirmed' as const,
      created_by: '', // Will be set by the parent component
    }
    onSubmit(expense)
  }

  const addPayer = () => {
    appendPayer({ user_id: '', placeholder_name: '', amount: 0 })
  }

  const addParticipant = () => {
    appendParticipant({ user_id: '', placeholder_name: '', amount: 0, percentage: 0 })
  }

  const handleAddAllMembers = () => {
    // Clear existing participants
    reset({
      ...getValues(),
      participants: groupMembers.map((member) => ({
        user_id: member.user_id || undefined,
        placeholder_name: member.placeholder_name || undefined,
        amount: 0,
        percentage: 0,
      })),
    })
  }

  useEffect(() => {
    if (splitMethod === 'equal' && participantFields.length > 0 && watchedTotalAmount > 0) {
      handleEqualSplit()
    }
  }, [splitMethod, participantFields.length, watchedTotalAmount, handleEqualSplit])

  return (
    <Card className='w-full max-w-4xl mx-auto'>
      <CardHeader>
        <CardTitle className='text-xl font-semibold flex items-center gap-2'>
          <Receipt className='w-5 h-5' />
          {initialData ? 'Edit Expense' : 'Add Expense Manually'}
        </CardTitle>
        <p className='text-sm text-gray-600'>
          {initialData
            ? 'Update expense details and split allocation.'
            : 'Create a new expense with detailed split information.'}
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className='space-y-6'>
          {/* Basic Information */}
          <div className='space-y-4'>
            <div>
              <Label htmlFor='description'>Description *</Label>
              <Textarea
                id='description'
                {...register('description')}
                placeholder="What was this expense for? (e.g., 'Groceries for the weekend')"
                rows={2}
              />
              {errors.description && (
                <p className='text-sm text-red-600 mt-1'>{errors.description.message}</p>
              )}
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='total_amount'>Total Amount *</Label>
                <div className='relative'>
                  <DollarSign className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                  <Input
                    id='total_amount'
                    type='number'
                    step='0.01'
                    min='0'
                    className='pl-9'
                    {...register('total_amount', { valueAsNumber: true })}
                    placeholder='0.00'
                  />
                </div>
                {errors.total_amount && (
                  <p className='text-sm text-red-600 mt-1'>{errors.total_amount.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor='currency'>Currency</Label>
                <Select
                  value={watch('currency')}
                  onValueChange={(value) => setValue('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select currency' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='USD'>USD ($)</SelectItem>
                    <SelectItem value='EUR'>EUR (€)</SelectItem>
                    <SelectItem value='GBP'>GBP (£)</SelectItem>
                    <SelectItem value='CAD'>CAD (C$)</SelectItem>
                    <SelectItem value='AUD'>AUD (A$)</SelectItem>
                    <SelectItem value='JPY'>JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.currency && (
                  <p className='text-sm text-red-600 mt-1'>{errors.currency.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Date of Expense</Label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !watch('date_of_expense') && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className='mr-2 h-4 w-4' />
                    {watch('date_of_expense') ? (
                      format(watch('date_of_expense'), 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-auto p-0'>
                  <div className='p-4'>
                    <input
                      type='date'
                      value={
                        watch('date_of_expense')
                          ? format(watch('date_of_expense'), 'yyyy-MM-dd')
                          : ''
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          setValue('date_of_expense', new Date(e.target.value))
                          setShowCalendar(false)
                        }
                      }}
                      className='w-full p-2 border rounded'
                    />
                  </div>
                </PopoverContent>
              </Popover>
              {errors.date_of_expense && (
                <p className='text-sm text-red-600 mt-1'>{errors.date_of_expense.message}</p>
              )}
            </div>

            {/* Itemized Mode Toggle */}
            <div className='flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200'>
              <Switch
                id='itemized-mode'
                checked={isItemizedMode}
                onCheckedChange={handleItemizedToggle}
              />
              <Label htmlFor='itemized-mode' className='flex items-center gap-2 cursor-pointer'>
                <List className='w-4 h-4' />
                Enable itemized expenses (split by individual items)
              </Label>
            </div>
          </div>

          {/* Itemized Mode */}
          {isItemizedMode ? (
            <div className='space-y-4'>
              <Separator />
              <ItemizedSplitForm
                groupMembers={groupMembers}
                totalAmount={watchedTotalAmount || 0}
                currency={watch('currency')}
                onItemsChange={(items) => setValue('items', items)}
                onValidationChange={setItemizedValid}
              />
            </div>
          ) : (
            <>
              <Separator />

              {/* Simple Mode - Payers Section */}
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-lg font-medium flex items-center gap-2'>
                    <DollarSign className='w-5 h-5' />
                    Who Paid?
                  </h3>
                  <div className='flex gap-2'>
                    <Button type='button' variant='outline' size='sm' onClick={handlePayerAutoFill}>
                      <Calculator className='w-4 h-4 mr-2' />
                      Auto-fill
                    </Button>
                    <Button type='button' variant='outline' size='sm' onClick={addPayer}>
                      <Plus className='w-4 h-4 mr-2' />
                      Add Payer
                    </Button>
                  </div>
                </div>

                <div className='space-y-3'>
                  {payerFields.map((field, index) => (
                    <div key={field.id} className='flex items-center gap-3 p-3 border rounded-lg'>
                      <div className='flex-1'>
                        <Select
                          value={watch(`payers.${index}.user_id`) || ''}
                          onValueChange={(value) => {
                            const selectedMember = groupMembers.find(
                              (m) => m.user_id === value || m.id === value
                            )
                            if (selectedMember) {
                              setValue(
                                `payers.${index}.user_id`,
                                selectedMember.user_id || undefined
                              )
                              setValue(
                                `payers.${index}.placeholder_name`,
                                selectedMember.placeholder_name || undefined
                              )
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder='Select member' />
                          </SelectTrigger>
                          <SelectContent>
                            {getMemberOptions().map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}{' '}
                                {member.isPlaceholder && (
                                  <Badge variant='secondary' className='ml-2'>
                                    Placeholder
                                  </Badge>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='w-32'>
                        <Input
                          type='number'
                          step='0.01'
                          min='0'
                          placeholder='Amount'
                          {...register(`payers.${index}.amount`, { valueAsNumber: true })}
                        />
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => removePayer(index)}
                        disabled={payerFields.length <= 1}
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </div>
                  ))}
                </div>

                {Math.abs(payersTotal - watchedTotalAmount) > 0.01 && (
                  <div className='p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
                    <p className='text-sm text-yellow-800'>
                      Warning: Payers total ({formatCurrency(payersTotal, watch('currency'))})
                      doesn&apos;t match expense total (
                      {formatCurrency(watchedTotalAmount, watch('currency'))})
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Participants Section */}
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-lg font-medium flex items-center gap-2'>
                    <Users className='w-5 h-5' />
                    Who Owes?
                  </h3>
                  <div className='flex gap-2'>
                    <Select
                      value={splitMethod}
                      onValueChange={(value: SplitMethod) => setSplitMethod(value)}
                    >
                      <SelectTrigger className='w-32'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='equal'>Equal</SelectItem>
                        <SelectItem value='exact'>Exact</SelectItem>
                        <SelectItem value='percentage'>Percentage</SelectItem>
                        <SelectItem value='shares'>Shares</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type='button' variant='outline' size='sm' onClick={handleAddAllMembers}>
                      Add All
                    </Button>
                    <Button type='button' variant='outline' size='sm' onClick={addParticipant}>
                      <Plus className='w-4 h-4 mr-2' />
                      Add Person
                    </Button>
                  </div>
                </div>

                {splitMethod === 'equal' && (
                  <Button type='button' variant='outline' size='sm' onClick={handleEqualSplit}>
                    <Calculator className='w-4 h-4 mr-2' />
                    Calculate Equal Split
                  </Button>
                )}

                {splitMethod === 'percentage' && (
                  <Button type='button' variant='outline' size='sm' onClick={handlePercentageSplit}>
                    <Calculator className='w-4 h-4 mr-2' />
                    Calculate from Percentages
                  </Button>
                )}

                <div className='space-y-3'>
                  {participantFields.map((field, index) => (
                    <div key={field.id} className='flex items-center gap-3 p-3 border rounded-lg'>
                      <div className='flex-1'>
                        <Select
                          value={watch(`participants.${index}.user_id`) || ''}
                          onValueChange={(value) => {
                            const selectedMember = groupMembers.find(
                              (m) => m.user_id === value || m.id === value
                            )
                            if (selectedMember) {
                              setValue(
                                `participants.${index}.user_id`,
                                selectedMember.user_id || undefined
                              )
                              setValue(
                                `participants.${index}.placeholder_name`,
                                selectedMember.placeholder_name || undefined
                              )
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder='Select member' />
                          </SelectTrigger>
                          <SelectContent>
                            {getMemberOptions().map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}{' '}
                                {member.isPlaceholder && (
                                  <Badge variant='secondary' className='ml-2'>
                                    Placeholder
                                  </Badge>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {splitMethod === 'percentage' && (
                        <div className='w-24'>
                          <Input
                            type='number'
                            step='0.1'
                            min='0'
                            max='100'
                            placeholder='%'
                            {...register(`participants.${index}.percentage`, {
                              valueAsNumber: true,
                            })}
                          />
                        </div>
                      )}

                      <div className='w-32'>
                        <Input
                          type='number'
                          step='0.01'
                          min='0'
                          placeholder='Amount'
                          {...register(`participants.${index}.amount`, { valueAsNumber: true })}
                        />
                      </div>

                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => removeParticipant(index)}
                        disabled={participantFields.length <= 1}
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </div>
                  ))}
                </div>

                {Math.abs(participantsTotal - watchedTotalAmount) > 0.01 && (
                  <div className='p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
                    <p className='text-sm text-yellow-800'>
                      Warning: Participants total (
                      {formatCurrency(participantsTotal, watch('currency'))}) doesn&apos;t match
                      expense total ({formatCurrency(watchedTotalAmount, watch('currency'))})
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className='flex flex-col sm:flex-row gap-3'>
            <Button
              type='submit'
              disabled={isLoading || isSubmitting || (isItemizedMode && !itemizedValid)}
              className='flex-1 bg-green-600 hover:bg-green-700 text-white'
            >
              <Save className='w-4 h-4 mr-2' />
              {initialData ? 'Update Expense' : 'Create Expense'}
            </Button>

            <Button
              type='button'
              onClick={onCancel}
              disabled={isLoading || isSubmitting}
              variant='outline'
              className='flex-1'
            >
              <X className='w-4 h-4 mr-2' />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
