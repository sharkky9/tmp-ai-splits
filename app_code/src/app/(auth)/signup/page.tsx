'use client'

import { useState } from 'react'
import { SignUpForm, SignUpFormValues } from '@/components/Auth/SignUpForm'
import { supabase } from '@/lib/supabaseClient'

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSignUp = async (values: SignUpFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name, // Custom data, ensure your Supabase setup handles this (e.g., via a trigger or profile table)
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // Optionally, redirect the user or show a success message.
      // For now, let's assume Supabase sends a confirmation email.
      alert('Sign-up successful! Please check your email to confirm.')
      // router.push('/some-success-page') // Or redirect to login
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-screen py-2'>
      <div className='w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md'>
        <h1 className='text-2xl font-bold text-center'>Create your account</h1>
        <SignUpForm onSubmit={handleSignUp} isLoading={isLoading} />
        {error && <p className='mt-4 text-sm text-center text-red-600'>{error}</p>}
        {/* TODO: Add link to login page */}
        <p className='mt-4 text-sm text-center'>
          Already have an account?{' '}
          {/* <Link href='/login' className='font-medium text-indigo-600 hover:text-indigo-500'>
            Log in
          </Link> */}
          {/* Placeholder for login link */}
        </p>
      </div>
    </div>
  )
}
