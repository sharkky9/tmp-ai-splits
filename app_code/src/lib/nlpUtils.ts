/**
 * Basic NLP utilities for parsing expense information from natural language text
 */

export interface ParsedExpenseData {
  description: string
  amount: number | null
  currency: string
  possiblePeople: string[]
  possibleCategories: string[]
  possibleDates: string[]
  confidence: number
}

// Common expense categories
const EXPENSE_CATEGORIES = [
  'food',
  'dinner',
  'lunch',
  'breakfast',
  'coffee',
  'drinks',
  'transport',
  'taxi',
  'uber',
  'gas',
  'parking',
  'entertainment',
  'movie',
  'concert',
  'show',
  'shopping',
  'groceries',
  'supplies',
  'accommodation',
  'hotel',
  'airbnb',
  'utilities',
  'bills',
  'rent',
  'insurance',
  'healthcare',
  'doctor',
  'pharmacy',
  'education',
  'books',
  'course',
]

// Common currency symbols and patterns
const CURRENCY_PATTERNS = [
  { symbol: '$', currency: 'USD', regex: /\$(\d+(?:\.\d{2})?)/g },
  { symbol: '€', currency: 'EUR', regex: /€(\d+(?:\.\d{2})?)/g },
  { symbol: '£', currency: 'GBP', regex: /£(\d+(?:\.\d{2})?)/g },
  { symbol: '¥', currency: 'JPY', regex: /¥(\d+)/g },
]

// Date patterns
const DATE_PATTERNS = [
  /(?:yesterday|today|tomorrow)/gi,
  /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
  /\d{1,2}\/\d{1,2}\/\d{2,4}/g,
  /\d{1,2}-\d{1,2}-\d{2,4}/g,
  /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/gi,
]

/**
 * Extract monetary amounts from text
 */
export function extractAmounts(text: string): { amount: number; currency: string }[] {
  const amounts: { amount: number; currency: string }[] = []

  // Try currency-specific patterns first
  for (const pattern of CURRENCY_PATTERNS) {
    const matches = [...text.matchAll(pattern.regex)]
    for (const match of matches) {
      const amount = parseFloat(match[1])
      if (!isNaN(amount) && amount > 0) {
        amounts.push({ amount, currency: pattern.currency })
      }
    }
  }

  // Fallback to generic number patterns if no currency symbols found
  if (amounts.length === 0) {
    const numberPattern = /\b(\d+(?:\.\d{2})?)\b/g
    const matches = [...text.matchAll(numberPattern)]
    for (const match of matches) {
      const amount = parseFloat(match[1])
      if (!isNaN(amount) && amount > 5) {
        // Assume amounts over $5 to avoid false positives
        amounts.push({ amount, currency: 'USD' })
      }
    }
  }

  return amounts
}

/**
 * Extract possible person names from text
 */
export function extractPeople(text: string): string[] {
  const people: string[] = []

  // Common patterns for people mentions
  const peoplePatterns = [
    /\b(?:with|for|and|including)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    /\b([A-Z][a-z]+)\s+(?:and|,|&)/g,
    /\b(?:me|myself|I)\b/gi,
  ]

  for (const pattern of peoplePatterns) {
    const matches = [...text.matchAll(pattern)]
    for (const match of matches) {
      if (match[1] && match[1].length > 1) {
        const name = match[1].trim()
        if (!people.includes(name) && !EXPENSE_CATEGORIES.includes(name.toLowerCase())) {
          people.push(name)
        }
      }
    }
  }

  // Handle "me", "I", "myself" references
  if (/\b(?:me|myself|I)\b/i.test(text)) {
    people.push('me')
  }

  return [...new Set(people)] // Remove duplicates
}

/**
 * Extract possible categories from text
 */
export function extractCategories(text: string): string[] {
  const categories: string[] = []
  const lowerText = text.toLowerCase()

  for (const category of EXPENSE_CATEGORIES) {
    if (lowerText.includes(category)) {
      categories.push(category)
    }
  }

  return [...new Set(categories)]
}

/**
 * Extract possible dates from text
 */
export function extractDates(text: string): string[] {
  const dates: string[] = []

  for (const pattern of DATE_PATTERNS) {
    const matches = [...text.matchAll(pattern)]
    for (const match of matches) {
      dates.push(match[0])
    }
  }

  return [...new Set(dates)]
}

/**
 * Extract description by removing extracted entities
 */
export function extractDescription(
  text: string,
  amounts: { amount: number; currency: string }[],
  people: string[],
  categories: string[]
): string {
  let description = text

  // Remove currency amounts
  for (const pattern of CURRENCY_PATTERNS) {
    description = description.replace(pattern.regex, '')
  }

  // Remove people references more carefully
  for (const person of people) {
    if (person !== 'me') {
      // Create a more specific pattern that handles word boundaries
      const personPattern = new RegExp(`\\b${person}\\b`, 'gi')
      description = description.replace(personPattern, '')
    }
  }

  // Remove "me" references but keep context
  description = description.replace(/\b(?:and\s+)?me\b/gi, '')
  description = description.replace(/\b(?:with\s+)?me\b/gi, '')

  // Remove common connecting words that don't add to description
  description = description.replace(
    /\b(?:with|for|and|including|split|evenly|equally|paid|pay)\b/gi,
    ''
  )

  // Clean up extra spaces and punctuation
  description = description
    .replace(/\s+/g, ' ')
    .replace(/[,\s]+$/, '')
    .replace(/^[,\s]+/, '')
    .trim()

  // If description is too short or empty, try to use detected categories
  if (description.length < 3 && categories.length > 0) {
    description = categories[0]
  }

  // Fallback description
  if (description.length < 3) {
    description = 'Expense'
  }

  return description
}

/**
 * Calculate confidence score based on what was successfully extracted
 */
export function calculateConfidence(
  amounts: { amount: number; currency: string }[],
  description: string,
  people: string[]
): number {
  let confidence = 0

  // Amount extraction (most important)
  if (amounts.length > 0) {
    confidence += 0.4
    if (amounts.length === 1) confidence += 0.1 // Bonus for single clear amount
  }

  // Description quality
  if (description.length > 3 && description !== 'Expense') {
    confidence += 0.3
  }

  // People extraction
  if (people.length > 0) {
    confidence += 0.2
    if (people.length <= 5) confidence += 0.1 // Bonus for reasonable number of people
  }

  return Math.min(confidence, 1.0)
}

/**
 * Main parsing function that combines all extraction methods
 */
export function parseExpenseText(text: string): ParsedExpenseData {
  if (!text || text.trim().length < 3) {
    return {
      description: '',
      amount: null,
      currency: 'USD',
      possiblePeople: [],
      possibleCategories: [],
      possibleDates: [],
      confidence: 0,
    }
  }

  const amounts = extractAmounts(text)
  const people = extractPeople(text)
  const categories = extractCategories(text)
  const dates = extractDates(text)
  const description = extractDescription(text, amounts, people, categories)
  const confidence = calculateConfidence(amounts, description, people)

  return {
    description,
    amount: amounts.length > 0 ? amounts[0].amount : null,
    currency: amounts.length > 0 ? amounts[0].currency : 'USD',
    possiblePeople: people,
    possibleCategories: categories,
    possibleDates: dates,
    confidence,
  }
}

/**
 * Format parsed data for expense creation
 */
export function formatForExpenseCreation(
  parsedData: ParsedExpenseData,
  currentUserName: string,
  allGroupMembers: Array<{ id: string; name: string }>
): {
  description: string
  total_amount: number | null
  currency: string
  participants: string[] // member IDs
  payer_id: string | null
} {
  // Map detected people to actual group members
  const participantIds: string[] = []
  let payerId: string | null = null

  // Find current user
  const currentUser = allGroupMembers.find(
    (member) => member.name.toLowerCase() === currentUserName.toLowerCase()
  )

  if (currentUser) {
    payerId = currentUser.id
    if (parsedData.possiblePeople.includes('me')) {
      participantIds.push(currentUser.id)
    }
  }

  // Match detected names to group members
  for (const personName of parsedData.possiblePeople) {
    if (personName === 'me') continue // Already handled above

    const member = allGroupMembers.find(
      (member) =>
        member.name.toLowerCase().includes(personName.toLowerCase()) ||
        personName.toLowerCase().includes(member.name.toLowerCase())
    )

    if (member && !participantIds.includes(member.id)) {
      participantIds.push(member.id)
    }
  }

  // If no participants detected, include all group members for equal split
  if (participantIds.length === 0) {
    participantIds.push(...allGroupMembers.map((member) => member.id))
  }

  return {
    description: parsedData.description,
    total_amount: parsedData.amount,
    currency: parsedData.currency,
    participants: participantIds,
    payer_id: payerId,
  }
}
