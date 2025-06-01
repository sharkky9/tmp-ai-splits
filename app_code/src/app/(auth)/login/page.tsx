'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm, LoginFormValues } from '@/components/Auth/LoginForm'
import { supabase } from '@/lib/supabaseClient'
// import Link from 'next/link' // For linking to sign-up page

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      // On successful login, Supabase client updates session.
      // Redirect to a protected page or dashboard.
      router.push('/') // Or any other appropriate page like '/dashboard'
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred during login.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-screen py-2'>
      <div className='w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md'>
        <h1 className='text-2xl font-bold text-center'>Log in to your account</h1>
        <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
        {error && <p className='mt-4 text-sm text-center text-red-600'>{error}</p>}
        {/* TODO: Add link to sign-up page and password reset */}
        <p className='mt-4 text-sm text-center'>
          Don&apos;t have an account?{' '}
          {/* <Link href='/signup' className='font-medium text-indigo-600 hover:text-indigo-500'>
            Sign up
          </Link> */}
          {/* Placeholder for signup link */}
        </p>
      </div>
    </div>
  )
}
