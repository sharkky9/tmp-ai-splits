import {
  format,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  differenceInDays,
  isAfter,
  isBefore,
  isSameDay,
  isToday,
  isYesterday,
  isTomorrow,
  isThisWeek,
  isThisMonth,
  isThisYear,
  formatDistanceToNow,
  formatRelative,
} from 'date-fns'

export class DateUtils {
  /**
   * Standard date formats used throughout the application
   */
  static readonly FORMATS = {
    DISPLAY_DATE: 'MMM dd, yyyy',
    DISPLAY_DATE_SHORT: 'MMM dd',
    DISPLAY_DATETIME: 'MMM dd, yyyy hh:mm a',
    INPUT_DATE: 'yyyy-MM-dd',
    INPUT_DATETIME: "yyyy-MM-dd'T'HH:mm",
    API_DATETIME: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
    MONTH_YEAR: 'MMM yyyy',
    FULL_DATE: 'EEEE, MMMM dd, yyyy',
  } as const

  /**
   * Format a date using predefined formats
   */
  static format(
    date: Date | string,
    formatKey: keyof typeof DateUtils.FORMATS = 'DISPLAY_DATE'
  ): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided')
    }
    return format(dateObj, DateUtils.FORMATS[formatKey])
  }

  /**
   * Format a date with a custom format string
   */
  static formatCustom(date: Date | string, formatString: string): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided')
    }
    return format(dateObj, formatString)
  }

  /**
   * Parse an ISO string to a Date object
   */
  static parseISO(dateString: string): Date {
    const date = parseISO(dateString)
    if (!isValid(date)) {
      throw new Error(`Invalid date string: ${dateString}`)
    }
    return date
  }

  /**
   * Check if a date string or Date object is valid
   */
  static isValid(date: Date | string): boolean {
    if (typeof date === 'string') {
      const parsed = parseISO(date)
      return isValid(parsed)
    }
    return isValid(date)
  }

  /**
   * Get the start of day (00:00:00) for a given date
   */
  static startOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return startOfDay(dateObj)
  }

  /**
   * Get the end of day (23:59:59.999) for a given date
   */
  static endOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return endOfDay(dateObj)
  }

  /**
   * Add days to a date
   */
  static addDays(date: Date | string, amount: number): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return addDays(dateObj, amount)
  }

  /**
   * Subtract days from a date
   */
  static subtractDays(date: Date | string, amount: number): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return subDays(dateObj, amount)
  }

  /**
   * Get the difference in days between two dates
   */
  static differenceInDays(dateLeft: Date | string, dateRight: Date | string): number {
    const leftObj = typeof dateLeft === 'string' ? parseISO(dateLeft) : dateLeft
    const rightObj = typeof dateRight === 'string' ? parseISO(dateRight) : dateRight
    return differenceInDays(leftObj, rightObj)
  }

  /**
   * Check if first date is after second date
   */
  static isAfter(date: Date | string, dateToCompare: Date | string): boolean {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const compareObj = typeof dateToCompare === 'string' ? parseISO(dateToCompare) : dateToCompare
    return isAfter(dateObj, compareObj)
  }

  /**
   * Check if first date is before second date
   */
  static isBefore(date: Date | string, dateToCompare: Date | string): boolean {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const compareObj = typeof dateToCompare === 'string' ? parseISO(dateToCompare) : dateToCompare
    return isBefore(dateObj, compareObj)
  }

  /**
   * Check if two dates are the same day
   */
  static isSameDay(dateLeft: Date | string, dateRight: Date | string): boolean {
    const leftObj = typeof dateLeft === 'string' ? parseISO(dateLeft) : dateLeft
    const rightObj = typeof dateRight === 'string' ? parseISO(dateRight) : dateRight
    return isSameDay(leftObj, rightObj)
  }

  /**
   * Check if date is today
   */
  static isToday(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isToday(dateObj)
  }

  /**
   * Check if date is yesterday
   */
  static isYesterday(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isYesterday(dateObj)
  }

  /**
   * Check if date is tomorrow
   */
  static isTomorrow(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isTomorrow(dateObj)
  }

  /**
   * Check if date is in this week
   */
  static isThisWeek(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isThisWeek(dateObj)
  }

  /**
   * Check if date is in this month
   */
  static isThisMonth(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isThisMonth(dateObj)
  }

  /**
   * Check if date is in this year
   */
  static isThisYear(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isThisYear(dateObj)
  }

  /**
   * Format distance to now (e.g., "3 hours ago", "in 2 days")
   */
  static formatDistanceToNow(date: Date | string, options: { addSuffix?: boolean } = {}): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(dateObj, { addSuffix: true, ...options })
  }

  /**
   * Format relative time (e.g., "yesterday at 3:00 PM", "tomorrow at 9:00 AM")
   */
  static formatRelative(date: Date | string, baseDate?: Date): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const base = baseDate || new Date()
    return formatRelative(dateObj, base)
  }

  /**
   * Get current date as ISO string
   */
  static nowISO(): string {
    return new Date().toISOString()
  }

  /**
   * Get current date
   */
  static now(): Date {
    return new Date()
  }

  /**
   * Convert date to ISO string for API/database storage
   */
  static toISOString(date: Date | string): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided')
    }
    return dateObj.toISOString()
  }

  /**
   * Get a human-readable description of a date for expense contexts
   */
  static getExpenseDateDescription(date: Date | string): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date

    if (DateUtils.isToday(dateObj)) {
      return 'Today'
    }

    if (DateUtils.isYesterday(dateObj)) {
      return 'Yesterday'
    }

    if (DateUtils.isTomorrow(dateObj)) {
      return 'Tomorrow'
    }

    if (DateUtils.isThisWeek(dateObj)) {
      return DateUtils.formatCustom(dateObj, 'EEEE') // Day of week
    }

    if (DateUtils.isThisYear(dateObj)) {
      return DateUtils.format(dateObj, 'DISPLAY_DATE_SHORT')
    }

    return DateUtils.format(dateObj, 'DISPLAY_DATE')
  }

  /**
   * Create a date range for filtering (useful for expense date ranges)
   */
  static createDateRange(
    startDate: Date | string,
    endDate: Date | string
  ): {
    start: Date
    end: Date
  } {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate

    return {
      start: DateUtils.startOfDay(start),
      end: DateUtils.endOfDay(end),
    }
  }
}

/**
 * Format a date for display in the UI
 * @param date - Date object, ISO string, or timestamp
 * @param formatString - Format string (default: 'PPP' for long date)
 * @returns Formatted date string
 */
export function formatDateForDisplay(
  date: Date | string | number,
  formatString: string = 'PPP'
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date)
    if (!isValid(dateObj)) {
      return 'Invalid date'
    }
    return format(dateObj, formatString)
  } catch {
    return 'Invalid date'
  }
}

/**
 * Format a date and time for display
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted date and time string
 */
export function formatDateTimeForDisplay(date: Date | string | number): string {
  return formatDateForDisplay(date, 'PPP p')
}

/**
 * Format distance to now (relative time)
 * @param date - Date object, ISO string, or timestamp
 * @returns Relative time string (e.g., "2 hours ago")
 */
export function formatDistanceToNowSafe(date: Date | string | number): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date)
    if (!isValid(dateObj)) {
      return 'Invalid date'
    }
    return formatDistanceToNow(dateObj, { addSuffix: true })
  } catch {
    return 'Invalid date'
  }
}

/**
 * Validate if a date string is valid
 * @param dateString - Date string to validate
 * @returns true if valid, false otherwise
 */
export function isValidDateString(dateString: string): boolean {
  try {
    const date = parseISO(dateString)
    return isValid(date)
  } catch {
    return false
  }
}

/**
 * Parse a date string to a Date object
 * @param dateString - ISO date string
 * @returns Date object or null if invalid
 */
export function parseDate(dateString: string): Date | null {
  try {
    const date = parseISO(dateString)
    return isValid(date) ? date : null
  } catch {
    return null
  }
}

/**
 * Format a date for API submission (ISO date format)
 * @param date - Date object
 * @returns ISO date string (YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date): string {
  return format(startOfDay(date), 'yyyy-MM-dd')
}

/**
 * Get today's date as ISO string
 * @returns Today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return formatDateForAPI(new Date())
}

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns true if the date is today
 */
export function isTodaySimple(date: Date | string): boolean {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const today = startOfDay(new Date())
    const checkDate = startOfDay(dateObj)
    return checkDate.getTime() === today.getTime()
  } catch {
    return false
  }
}

/**
 * Create a date range validator
 * @param minDate - Minimum allowed date
 * @param maxDate - Maximum allowed date
 * @returns Validation function
 */
export function createDateRangeValidator(minDate?: Date, maxDate?: Date) {
  return (date: Date): boolean => {
    if (!isValid(date)) return false
    if (minDate && date < minDate) return false
    if (maxDate && date > maxDate) return false
    return true
  }
}

/**
 * Get the relative time from now (e.g., "2 hours ago", "in 3 days")
 */
export const getRelativeTime = (date: Date | string): string => {
  try {
    const targetDate = typeof date === 'string' ? new Date(date) : date
    return formatDistanceToNow(targetDate, { addSuffix: true })
  } catch {
    return 'Unknown time'
  }
}

/**
 * Check if a date string is valid
 */
export const isValidDate = (dateString: string): boolean => {
  try {
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  } catch {
    return false
  }
}
