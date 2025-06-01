import Decimal from 'decimal.js'

/**
 * Format a numeric value as currency
 * @param amount - The numeric amount to format
 * @param currency - The currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const decimal = new Decimal(amount)

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(decimal.toNumber())
  } catch (error) {
    // Fallback for invalid currency codes
    return `${currency.toUpperCase()} ${decimal.toFixed(2)}`
  }
}

/**
 * Parse a currency string to a decimal number
 * @param currencyString - The currency string to parse
 * @returns Decimal representation of the amount
 */
export function parseCurrency(currencyString: string): Decimal {
  // Remove currency symbols and whitespace, keep digits and decimal point
  const cleanAmount = currencyString.replace(/[^\d.-]/g, '')
  return new Decimal(cleanAmount || '0')
}

/**
 * Validate that an amount is a valid positive currency value
 * @param amount - The amount to validate
 * @returns true if valid, false otherwise
 */
export function isValidCurrencyAmount(amount: number | string): boolean {
  try {
    const decimal = new Decimal(amount)
    return decimal.isPositive() && decimal.isFinite()
  } catch {
    return false
  }
}

/**
 * Round currency amount to appropriate decimal places
 * @param amount - The amount to round
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Rounded decimal amount
 */
export function roundCurrency(
  amount: number | string | Decimal,
  decimalPlaces: number = 2
): Decimal {
  const decimal = amount instanceof Decimal ? amount : new Decimal(amount)
  return decimal.toDecimalPlaces(decimalPlaces)
}
