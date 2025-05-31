'use client'

import React from 'react'
import Link from 'next/link'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button' // Assuming you have a Button component

export function Navbar() {
  const { user, signOut, isLoading } = useAuthContext()

  const handleLogout = async () => {
    try {
      await signOut()
      // Router will redirect or page will re-render based on AuthProvider state
    } catch (error) {
      console.error('Error logging out:', error)
      // Handle logout error, maybe show a notification
    }
  }

  return (
    <nav className='bg-gray-800 text-white p-4'>
      <div className='container mx-auto flex justify-between items-center'>
        <Link href='/' className='text-xl font-bold'>
          SplitApp
        </Link>
        <div className='space-x-4'>
          <Link href='/' className='hover:text-gray-300'>Home</Link>
          {/* Add other common links here, e.g., About, Features */}

          {isLoading ? (
            <span>Loading...</span>
          ) : user ? (
            <>
              <Link href='/profile' className='hover:text-gray-300'>
                Profile
              </Link>
              <Button onClick={handleLogout} variant='outline' size='sm' className='text-white border-white hover:bg-gray-700'>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href='/login' className='hover:text-gray-300'>
                Login
              </Link>
              <Link href='/signup' className='hover:text-gray-300'>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
} 