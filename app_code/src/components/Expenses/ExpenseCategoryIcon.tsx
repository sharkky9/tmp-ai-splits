'use client'

import React from 'react'
import {
  Utensils,
  Car,
  Home,
  ShoppingCart,
  Gamepad2,
  Heart,
  Briefcase,
  DollarSign,
  HelpCircle,
} from 'lucide-react'

interface ExpenseCategoryIconProps {
  category?: string
  size?: number
  className?: string
}

/**
 * Component to display an icon based on expense category
 */
export function ExpenseCategoryIcon({
  category,
  size = 16,
  className = '',
}: ExpenseCategoryIconProps) {
  const getIcon = (category?: string) => {
    if (!category) return <HelpCircle size={size} className={className} />

    const lowercaseCategory = category.toLowerCase()

    if (
      lowercaseCategory.includes('food') ||
      lowercaseCategory.includes('restaurant') ||
      lowercaseCategory.includes('dinner') ||
      lowercaseCategory.includes('lunch')
    ) {
      return <Utensils size={size} className={className} />
    }

    if (
      lowercaseCategory.includes('transport') ||
      lowercaseCategory.includes('uber') ||
      lowercaseCategory.includes('gas') ||
      lowercaseCategory.includes('car')
    ) {
      return <Car size={size} className={className} />
    }

    if (
      lowercaseCategory.includes('accommodation') ||
      lowercaseCategory.includes('hotel') ||
      lowercaseCategory.includes('rent')
    ) {
      return <Home size={size} className={className} />
    }

    if (
      lowercaseCategory.includes('shopping') ||
      lowercaseCategory.includes('groceries') ||
      lowercaseCategory.includes('store')
    ) {
      return <ShoppingCart size={size} className={className} />
    }

    if (
      lowercaseCategory.includes('entertainment') ||
      lowercaseCategory.includes('movie') ||
      lowercaseCategory.includes('game')
    ) {
      return <Gamepad2 size={size} className={className} />
    }

    if (
      lowercaseCategory.includes('health') ||
      lowercaseCategory.includes('medical') ||
      lowercaseCategory.includes('doctor')
    ) {
      return <Heart size={size} className={className} />
    }

    if (
      lowercaseCategory.includes('business') ||
      lowercaseCategory.includes('work') ||
      lowercaseCategory.includes('office')
    ) {
      return <Briefcase size={size} className={className} />
    }

    // Default icon for unknown categories
    return <DollarSign size={size} className={className} />
  }

  return getIcon(category)
}
