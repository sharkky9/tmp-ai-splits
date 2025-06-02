/**
 * Basic client-side NLP parsing utilities for expense text
 */

/**
 * Extract amount from text using regex patterns
 */
export function extractAmount(text: string): number | null {
  // TODO: Implement amount extraction from text
  // Look for patterns like "$50", "50 dollars", "$50.25", etc.
  throw new Error('Not implemented')
}

/**
 * Extract description from text, removing amount and other entities
 */
export function extractDescription(text: string): string {
  // TODO: Implement description extraction
  // Remove amount, dates, and other entities to get clean description
  throw new Error('Not implemented')
}

/**
 * Extract date from text
 */
export function extractDate(text: string): Date | null {
  // TODO: Implement date extraction from text
  // Look for patterns like "yesterday", "last friday", "2024-01-15", etc.
  throw new Error('Not implemented')
}

/**
 * Extract potential category from text
 */
export function extractCategory(text: string): string | null {
  // TODO: Implement category extraction
  // Look for keywords that suggest categories like "dinner", "uber", "groceries", etc.
  throw new Error('Not implemented')
}

/**
 * Extract mentioned people/participants from text
 */
export function extractParticipants(text: string, knownMembers: string[]): string[] {
  // TODO: Implement participant extraction
  // Look for names or pronouns that match known group members
  throw new Error('Not implemented')
}

/**
 * Parse expense text and return structured data
 */
export function parseExpenseText(
  text: string,
  context?: {
    groupMembers?: string[]
    defaultCurrency?: string
  }
): {
  amount?: number
  description?: string
  date?: Date
  category?: string
  participants?: string[]
  confidence: number // 0-1 confidence score
} {
  // TODO: Implement comprehensive text parsing
  // Combine all extraction functions to parse complete expense
  throw new Error('Not implemented')
}
