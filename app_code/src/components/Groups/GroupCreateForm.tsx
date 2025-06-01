'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthContext } from '@/contexts/AuthContext'
import type { Group } from '@/types/database'

const groupCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(100, 'Group name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
})

type GroupCreateFormData = z.infer<typeof groupCreateSchema>

interface GroupCreateFormProps {
  onSuccess?: (group: Group) => void
  onCancel?: () => void
}

export function GroupCreateForm({ onSuccess, onCancel }: GroupCreateFormProps) {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GroupCreateFormData>({
    resolver: zodResolver(groupCreateSchema),
  })

  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupCreateFormData) => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Create the group - the trigger will automatically add creator as admin member
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: data.name,
          description: data.description || null,
          created_by: user.id,
        })
        .select()
        .single<Group>()

      if (groupError) {
        throw groupError
      }

      return groupData
    },
    onSuccess: (group) => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      reset()
      onSuccess?.(group)
    },
    onError: (error) => {
      console.error('Failed to create group:', error)
    },
  })

  const onSubmit = (data: GroupCreateFormData) => {
    createGroupMutation.mutate(data)
  }

  return (
    <Card className='w-full max-w-md'>
      <CardHeader>
        <CardTitle>Create New Group</CardTitle>
        <CardDescription>
          Create a group to start tracking shared expenses with friends or family.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='name'>Group Name</Label>
            <Input
              id='name'
              {...register('name')}
              placeholder='Enter group name'
              disabled={isSubmitting}
            />
            {errors.name && <p className='text-sm text-red-600'>{errors.name.message}</p>}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>Description (Optional)</Label>
            <Textarea
              id='description'
              {...register('description')}
              placeholder='Describe what this group is for'
              disabled={isSubmitting}
              rows={3}
            />
            {errors.description && (
              <p className='text-sm text-red-600'>{errors.description.message}</p>
            )}
          </div>

          {createGroupMutation.error && (
            <div className='p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded'>
              Failed to create group: {createGroupMutation.error.message}
            </div>
          )}

          <div className='flex gap-3 pt-4'>
            <Button type='submit' disabled={isSubmitting} className='flex-1'>
              {isSubmitting ? 'Creating...' : 'Create Group'}
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
  )
}
