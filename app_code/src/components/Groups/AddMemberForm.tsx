'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { GroupMember } from '@/types/database'

const memberSchema = z
  .object({
    email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
    placeholder_name: z.string().min(1, 'Name is required').optional().or(z.literal('')),
  })
  .refine((data) => data.email || data.placeholder_name, {
    message: 'Either email or name is required',
    path: ['email'],
  })

type MemberFormData = z.infer<typeof memberSchema>

interface AddMemberFormProps {
  groupId: string
  onSuccess?: (member: GroupMember) => void
  onCancel?: () => void
}

export function AddMemberForm({ groupId, onSuccess, onCancel }: AddMemberFormProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'placeholder'>('email')
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
  })

  const addMemberMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      const isPlaceholder = activeTab === 'placeholder'

      // Check for duplicates
      if (!isPlaceholder && data.email) {
        // Check if user with this email already exists in the group
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', data.email)
          .single()

        if (existingUser) {
          const { data: existingMember } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', existingUser.id)
            .single()

          if (existingMember) {
            throw new Error('This user is already a member of the group')
          }
        }
      }

      if (isPlaceholder && data.placeholder_name) {
        // Check if placeholder with this name already exists
        const { data: existingPlaceholder } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('placeholder_name', data.placeholder_name)
          .single()

        if (existingPlaceholder) {
          throw new Error('A member with this name already exists in the group')
        }
      }

      // Add the member
      const memberData = isPlaceholder
        ? {
            group_id: groupId,
            placeholder_name: data.placeholder_name,
            email: data.email || null,
            is_placeholder: true,
            role: 'member',
          }
        : {
            group_id: groupId,
            email: data.email,
            is_placeholder: true, // Will be false when user signs up
            role: 'member',
          }

      const { data: newMember, error } = await supabase
        .from('group_members')
        .insert(memberData)
        .select()
        .single<GroupMember>()

      if (error) throw error
      return newMember
    },
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] })
      reset()
      onSuccess?.(member)
    },
    onError: (error) => {
      console.error('Failed to add member:', error)
    },
  })

  const onSubmit = (data: MemberFormData) => {
    addMemberMutation.mutate(data)
  }

  // Clear form when switching tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value as 'email' | 'placeholder')
    reset()
  }

  return (
    <Card className='w-full max-w-md'>
      <CardHeader>
        <CardTitle>Add Member</CardTitle>
        <CardDescription>
          Add a new member to the group by email or as a placeholder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='email'>By Email</TabsTrigger>
            <TabsTrigger value='placeholder'>By Name</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4 mt-4'>
            <TabsContent value='email' className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email Address</Label>
                <Input
                  id='email'
                  type='email'
                  {...register('email')}
                  placeholder="Enter member's email"
                  disabled={isSubmitting}
                />
                {errors.email && <p className='text-sm text-red-600'>{errors.email.message}</p>}
              </div>
              <p className='text-sm text-gray-500'>
                The person will be invited to join the group when they sign up.
              </p>
            </TabsContent>

            <TabsContent value='placeholder' className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='placeholder_name'>Name</Label>
                <Input
                  id='placeholder_name'
                  {...register('placeholder_name')}
                  placeholder="Enter member's name"
                  disabled={isSubmitting}
                />
                {errors.placeholder_name && (
                  <p className='text-sm text-red-600'>{errors.placeholder_name.message}</p>
                )}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='placeholder_email'>Email (Optional)</Label>
                <Input
                  id='placeholder_email'
                  type='email'
                  {...register('email')}
                  placeholder='Enter email for future invitation'
                  disabled={isSubmitting}
                />
              </div>
              <p className='text-sm text-gray-500'>
                Add someone who doesn&apos;t have an account yet. You can track their expenses and
                they can join later.
              </p>
            </TabsContent>

            {addMemberMutation.error && (
              <div className='p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded'>
                Failed to add member: {addMemberMutation.error.message}
              </div>
            )}

            <div className='flex gap-3 pt-4'>
              <Button type='submit' disabled={isSubmitting} className='flex-1'>
                {isSubmitting ? 'Adding...' : 'Add Member'}
              </Button>
              {onCancel && (
                <Button type='button' variant='outline' onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  )
}
