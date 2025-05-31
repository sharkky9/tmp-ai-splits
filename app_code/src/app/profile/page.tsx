'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { User } from '@supabase/supabase-js'

// Define the schema for the profile form (only name is editable for now)
const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
})

export type ProfileFormValues = z.infer<typeof profileFormSchema>

interface ProfileData {
  name: string
  email: string
}

export default function ProfilePage() {
  const { user, session, isLoading: authIsLoading } = useAuthContext()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
    },
  })

  const fetchProfile = useCallback(async (currentUser: User) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', currentUser.id)
        .single()

      if (fetchError) throw fetchError
      if (data) {
        setProfile(data)
        form.reset({ name: data.name }) // Populate form with fetched name
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile.')
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }, [form]) // Added form to dependency array for form.reset

  useEffect(() => {
    if (user) {
      fetchProfile(user)
    } else if (!authIsLoading) {
      // Not logged in and auth is not loading, so stop loading profile
      setLoading(false)
    }
  }, [user, authIsLoading, fetchProfile])

  const handleUpdateProfile = async (values: ProfileFormValues) => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ name: values.name, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) throw updateError
      // Re-fetch profile to show updated data (or update state directly)
      await fetchProfile(user)
      alert('Profile updated successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.')
      console.error('Error updating profile:', err)
    } finally {
      setLoading(false)
    }
  }

  if (authIsLoading || (loading && user)) {
    return <p>Loading profile...</p>
  }

  if (!user) {
    return <p>Please log in to view your profile.</p> // Or redirect to login
  }

  if (error && !profile) {
    return <p>Error loading profile: {error}</p>
  }

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>Your Profile</h1>
      {profile && (
        <div className='mb-6'>
          <p><span className='font-semibold'>Email:</span> {profile.email}</p>
          {/* Display current name from profile state, form will handle editing */}
          <p><span className='font-semibold'>Current Name:</span> {profile.name}</p> 
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleUpdateProfile)} className='space-y-6 max-w-md'>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Update Name</FormLabel>
                <FormControl>
                  <Input placeholder='New name' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type='submit' disabled={loading || authIsLoading}>
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
          {error && <p className='mt-2 text-sm text-red-600'>{error}</p>}
        </form>
      </Form>
    </div>
  )
} 