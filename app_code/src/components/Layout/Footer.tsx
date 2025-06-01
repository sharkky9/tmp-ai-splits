'use client'

import React from 'react'

export function Footer() {
  return (
    <footer className='bg-gray-100 text-gray-600 p-4 mt-auto'>
      <div className='container mx-auto text-center'>
        <p>&copy; {new Date().getFullYear()} SplitApp. All rights reserved.</p>
        {/* Add other footer links or information here */}
      </div>
    </footer>
  )
}
