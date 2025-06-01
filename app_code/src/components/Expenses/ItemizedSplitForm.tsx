'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Users, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'
import Decimal from 'decimal.js'
import type { GroupMemberWithProfile } from '@/types/database'

interface ItemizedItem {
  id: string
  description: string
  amount: number
  participants: Array<{
    user_id?: string
    placeholder_name?: string
    amount: number
  }>
}

interface ItemizedSplitFormProps {
  groupMembers: GroupMemberWithProfile[]
  totalAmount: number
  currency: string
  onItemsChange: (items: ItemizedItem[]) => void
  onValidationChange: (isValid: boolean) => void
}

export function ItemizedSplitForm({
  groupMembers,
  totalAmount,
  currency,
  onItemsChange,
  onValidationChange,
}: ItemizedSplitFormProps) {
  const [items, setItems] = useState<ItemizedItem[]>([])

  const getMemberOptions = () => {
    return groupMembers.map((member) => ({
      id: member.user_id || `placeholder-${member.id}`,
      name: member.profiles?.name || member.placeholder_name || 'Unknown',
      isPlaceholder: member.is_placeholder,
    }))
  }

  const getMemberName = (userId?: string, placeholderName?: string) => {
    if (placeholderName) return placeholderName
    if (userId) {
      const member = groupMembers.find((m) => m.user_id === userId)
      return member?.profiles?.name || member?.profiles?.email || 'Unknown User'
    }
    return 'Unknown'
  }

  // Add new item
  const addItem = () => {
    const newItem: ItemizedItem = {
      id: `item-${Date.now()}`,
      description: '',
      amount: 0,
      participants: [],
    }
    setItems([...items, newItem])
  }

  // Remove item
  const removeItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId))
  }

  // Update item description
  const updateItemDescription = (itemId: string, description: string) => {
    setItems(items.map((item) => (item.id === itemId ? { ...item, description } : item)))
  }

  // Update item amount
  const updateItemAmount = (itemId: string, amount: number) => {
    setItems(items.map((item) => (item.id === itemId ? { ...item, amount } : item)))
  }

  // Add participant to item
  const addParticipantToItem = (itemId: string, memberId: string) => {
    const selectedMember = groupMembers.find((m) => m.user_id === memberId || m.id === memberId)
    if (!selectedMember) return

    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const newParticipant = {
            user_id: selectedMember.user_id || undefined,
            placeholder_name: selectedMember.placeholder_name || undefined,
            amount: 0,
          }
          return {
            ...item,
            participants: [...item.participants, newParticipant],
          }
        }
        return item
      })
    )
  }

  // Remove participant from item
  const removeParticipantFromItem = (itemId: string, participantIndex: number) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            participants: item.participants.filter((_, index) => index !== participantIndex),
          }
        }
        return item
      })
    )
  }

  // Update participant amount
  const updateParticipantAmount = (itemId: string, participantIndex: number, amount: number) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            participants: item.participants.map((participant, index) =>
              index === participantIndex ? { ...participant, amount } : participant
            ),
          }
        }
        return item
      })
    )
  }

  // Split item equally among participants
  const splitItemEqually = (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item || item.participants.length === 0 || item.amount <= 0) return

    const equalAmount = new Decimal(item.amount).div(item.participants.length)
    const roundedAmount = equalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

    setItems(
      items.map((i) => {
        if (i.id === itemId) {
          return {
            ...i,
            participants: i.participants.map((participant) => ({
              ...participant,
              amount: roundedAmount.toNumber(),
            })),
          }
        }
        return i
      })
    )
  }

  // Add all members as participants to an item
  const addAllMembersToItem = (itemId: string) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            participants: groupMembers.map((member) => ({
              user_id: member.user_id || undefined,
              placeholder_name: member.placeholder_name || undefined,
              amount: 0,
            })),
          }
        }
        return item
      })
    )
  }

  // Calculate totals and validation
  const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0)
  const participantsTotal = items.reduce(
    (sum, item) =>
      sum + item.participants.reduce((itemSum, participant) => itemSum + participant.amount, 0),
    0
  )

  const isAmountValid = Math.abs(itemsTotal - totalAmount) < 0.01
  const isParticipantsValid = Math.abs(participantsTotal - itemsTotal) < 0.01
  const areAllItemsValid = items.every(
    (item) =>
      item.description.trim() !== '' &&
      item.amount > 0 &&
      item.participants.length > 0 &&
      Math.abs(item.participants.reduce((sum, p) => sum + p.amount, 0) - item.amount) < 0.01
  )

  const isValid = items.length > 0 && isAmountValid && isParticipantsValid && areAllItemsValid

  // Update parent component
  useEffect(() => {
    onItemsChange(items)
    onValidationChange(isValid)
  }, [items, isValid, onItemsChange, onValidationChange])

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-medium flex items-center gap-2'>
          <Calculator className='w-5 h-5' />
          Itemized Breakdown
        </h3>
        <Button type='button' onClick={addItem} variant='outline' size='sm'>
          <Plus className='w-4 h-4 mr-2' />
          Add Item
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className='p-4'>
          <div className='grid grid-cols-3 gap-4 text-center'>
            <div>
              <p className='text-sm text-gray-600'>Total Amount</p>
              <p className='font-semibold'>{formatCurrency(totalAmount, currency)}</p>
            </div>
            <div>
              <p className='text-sm text-gray-600'>Items Total</p>
              <p className={cn('font-semibold', isAmountValid ? 'text-green-600' : 'text-red-600')}>
                {formatCurrency(itemsTotal, currency)}
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-600'>Remaining</p>
              <p
                className={cn(
                  'font-semibold',
                  Math.abs(totalAmount - itemsTotal) < 0.01 ? 'text-green-600' : 'text-orange-600'
                )}
              >
                {formatCurrency(totalAmount - itemsTotal, currency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Alerts */}
      {!isAmountValid && totalAmount > 0 && (
        <Alert variant='destructive'>
          <AlertDescription>
            Items total ({formatCurrency(itemsTotal, currency)}) doesn&apos;t match expense total (
            {formatCurrency(totalAmount, currency)})
          </AlertDescription>
        </Alert>
      )}

      {!isParticipantsValid && itemsTotal > 0 && (
        <Alert variant='destructive'>
          <AlertDescription>
            Participants total ({formatCurrency(participantsTotal, currency)}) doesn&apos;t match
            items total ({formatCurrency(itemsTotal, currency)})
          </AlertDescription>
        </Alert>
      )}

      {/* Items */}
      <div className='space-y-4'>
        {items.length === 0 ? (
          <div className='text-center py-8 text-gray-500'>
            <Calculator className='w-12 h-12 mx-auto mb-4 text-gray-300' />
            <p>No items added yet. Click &quot;Add Item&quot; to get started.</p>
          </div>
        ) : (
          items.map((item, itemIndex) => (
            <Card key={item.id}>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-base'>Item {itemIndex + 1}</CardTitle>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => removeItem(item.id)}
                    className='text-red-600 hover:text-red-700'
                  >
                    <Trash2 className='w-4 h-4' />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {/* Item Details */}
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItemDescription(item.id, e.target.value)}
                        placeholder='What is this item?'
                      />
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type='number'
                        step='0.01'
                        min='0'
                        value={item.amount || ''}
                        onChange={(e) => updateItemAmount(item.id, parseFloat(e.target.value) || 0)}
                        placeholder='0.00'
                      />
                    </div>
                  </div>

                  {/* Participants */}
                  <div>
                    <div className='flex items-center justify-between mb-3'>
                      <Label>Split Between</Label>
                      <div className='flex gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => addAllMembersToItem(item.id)}
                        >
                          <Users className='w-4 h-4 mr-1' />
                          Add All
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => splitItemEqually(item.id)}
                          disabled={item.participants.length === 0 || item.amount <= 0}
                        >
                          <Calculator className='w-4 h-4 mr-1' />
                          Split Equally
                        </Button>
                      </div>
                    </div>

                    <div className='space-y-2'>
                      {item.participants.map((participant, participantIndex) => (
                        <div
                          key={participantIndex}
                          className='flex items-center gap-3 p-3 border rounded-lg'
                        >
                          <div className='flex-1'>
                            <span className='font-medium'>
                              {getMemberName(participant.user_id, participant.placeholder_name)}
                            </span>
                            {participant.placeholder_name && (
                              <Badge variant='secondary' className='ml-2 text-xs'>
                                Placeholder
                              </Badge>
                            )}
                          </div>
                          <div className='w-32'>
                            <Input
                              type='number'
                              step='0.01'
                              min='0'
                              value={participant.amount || ''}
                              onChange={(e) =>
                                updateParticipantAmount(
                                  item.id,
                                  participantIndex,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder='0.00'
                            />
                          </div>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => removeParticipantFromItem(item.id, participantIndex)}
                          >
                            <Trash2 className='w-4 h-4' />
                          </Button>
                        </div>
                      ))}

                      {/* Add Participant */}
                      <div className='flex items-center gap-3'>
                        <Select onValueChange={(value) => addParticipantToItem(item.id, value)}>
                          <SelectTrigger className='flex-1'>
                            <SelectValue placeholder='Add participant...' />
                          </SelectTrigger>
                          <SelectContent>
                            {getMemberOptions()
                              .filter(
                                (member) =>
                                  !item.participants.some(
                                    (p) =>
                                      p.user_id === member.id || p.placeholder_name === member.name
                                  )
                              )
                              .map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name} {member.isPlaceholder && ' (Placeholder)'}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Item Validation */}
                    {item.amount > 0 && item.participants.length > 0 && (
                      <div className='mt-3 p-2 bg-gray-50 rounded text-sm'>
                        <div className='flex justify-between'>
                          <span>Item total:</span>
                          <span className='font-medium'>
                            {formatCurrency(item.amount, currency)}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Participants total:</span>
                          <span
                            className={cn(
                              'font-medium',
                              Math.abs(
                                item.participants.reduce((sum, p) => sum + p.amount, 0) -
                                  item.amount
                              ) < 0.01
                                ? 'text-green-600'
                                : 'text-red-600'
                            )}
                          >
                            {formatCurrency(
                              item.participants.reduce((sum, p) => sum + p.amount, 0),
                              currency
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
