'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Assuming you'll add this Shadcn component
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useState } from 'react';

const groupFormSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters').max(50, 'Group name must be at most 50 characters'),
  description: z.string().max(200, 'Description must be at most 200 characters').optional(),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

export function GroupCreateForm() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  async function onSubmit(values: GroupFormValues) {
    if (!user) {
      setError('You must be logged in to create a group.');
      router.push('/login');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('groups')
        .insert([{ 
          name: values.name, 
          description: values.description,
          created_by: user.id // 'created_by' should reference the user's profile id
        }])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (data) {
        // Optionally, create a GroupMember entry for the creator
        const { error: memberError } = await supabase
          .from('group_members')
          .insert([{
            group_id: data.id,
            user_id: user.id, // This should be the profile ID
            role: 'admin' // or 'owner'
          }]);
        
        if (memberError) {
          // Handle potential error where group is created but member entry fails
          // May require cleanup or just a warning. For now, log it.
          console.error('Error creating group member entry:', memberError);
          setError('Group created, but failed to add you as a member. Please contact support.');
        } else {
          router.push(`/groups/${data.id}`); // Redirect to the new group's page
        }
      }
    } catch (e: any) {
      console.error('Error creating group:', e);
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group Name</FormLabel>
              <FormControl>
                <Input placeholder="My Awesome Group" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="A brief description of the group's purpose."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating Group...' : 'Create Group'}
        </Button>
      </form>
    </Form>
  );
} 