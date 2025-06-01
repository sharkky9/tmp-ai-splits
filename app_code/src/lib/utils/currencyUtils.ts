import { Decimal } from 'decimal.js'

// Configure Decimal for financial precision
Decimal.config({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9e15,
  toExpPos: 9e15,
  maxE: 9e15,
  minE: -9e15,
  modulo: Decimal.ROUND_DOWN,
  crypto: false,
})

export interface Money {
  amount: Decimal
  currency: string
}

export class CurrencyUtils {
  /**
   * Create a Money object from a number or string
   */
  static createMoney(amount: number | string, currency: string = 'USD'): Money {
    return {
      amount: new Decimal(amount),
      currency: currency.toUpperCase(),
    }
  }

  /**
   * Add two money amounts (must be same currency)
   */
  static add(money1: Money, money2: Money): Money {
    if (money1.currency !== money2.currency) {
      throw new Error(`Cannot add different currencies: ${money1.currency} and ${money2.currency}`)
    }
    return {
      amount: money1.amount.add(money2.amount),
      currency: money1.currency,
    }
  }

  /**
   * Subtract two money amounts (must be same currency)
   */
  static subtract(money1: Money, money2: Money): Money {
    if (money1.currency !== money2.currency) {
      throw new Error(
        `Cannot subtract different currencies: ${money1.currency} and ${money2.currency}`
      )
    }
    return {
      amount: money1.amount.sub(money2.amount),
      currency: money1.currency,
    }
  }

  /**
   * Multiply money by a number
   */
  static multiply(money: Money, multiplier: number | string): Money {
    return {
      amount: money.amount.mul(new Decimal(multiplier)),
      currency: money.currency,
    }
  }

  /**
   * Divide money by a number
   */
  static divide(money: Money, divisor: number | string): Money {
    if (new Decimal(divisor).equals(0)) {
      throw new Error('Cannot divide by zero')
    }
    return {
      amount: money.amount.div(new Decimal(divisor)),
      currency: money.currency,
    }
  }

  /**
   * Split money evenly among a number of people
   * This method aims to distribute the amount as evenly as possible,
   * distributing any remaining cents to the first few people.
   */
  static splitEvenly(money: Money, numberOfPeople: number): Money[] {
    if (numberOfPeople <= 0) {
      throw new Error('Number of people must be greater than 0')
    }

    // For negative amounts, split the absolute value and negate the results.
    // This simplifies remainder distribution logic to only consider positive cases first.
    if (money.amount.isNegative()) {
      const positiveMoney = CurrencyUtils.abs(money)
      const positiveSplits = CurrencyUtils.splitEvenly(positiveMoney, numberOfPeople)
      return positiveSplits.map((m) => CurrencyUtils.multiply(m, -1))
    }

    const totalCents = money.amount.mul(100).toDecimalPlaces(0) // Work with integer cents
    const baseCentsPerShare = totalCents.divToInt(numberOfPeople)
    const remainderActual = totalCents.mod(numberOfPeople).toNumber() // Get the actual remainder value once

    const results: Money[] = []
    for (let i = 0; i < numberOfPeople; i++) {
      let currentShareCents = baseCentsPerShare
      if (i < remainderActual) {
        // Distribute remainder to the first 'remainderActual' shares
        currentShareCents = currentShareCents.add(1)
      }
      results.push({
        amount: new Decimal(currentShareCents.toString()).div(100),
        currency: money.currency,
      })
    }
    return results
  }

  /**
   * Compare two money amounts
   */
  static compare(money1: Money, money2: Money): number {
    if (money1.currency !== money2.currency) {
      throw new Error(
        `Cannot compare different currencies: ${money1.currency} and ${money2.currency}`
      )
    }
    return money1.amount.comparedTo(money2.amount)
  }

  /**
   * Check if two money amounts are equal
   */
  static equals(money1: Money, money2: Money): boolean {
    return money1.currency === money2.currency && money1.amount.equals(money2.amount)
  }

  /**
   * Format money for display
   */
  static format(
    money: Money,
    options: {
      locale?: string
      showCurrency?: boolean
      minimumFractionDigits?: number
      maximumFractionDigits?: number
    } = {}
  ): string {
    const {
      locale = 'en-US',
      showCurrency = true,
      minimumFractionDigits = 2,
      maximumFractionDigits = 2,
    } = options

    const numberFormatter = new Intl.NumberFormat(locale, {
      style: showCurrency ? 'currency' : 'decimal',
      currency: showCurrency ? money.currency : undefined,
      minimumFractionDigits,
      maximumFractionDigits,
    })

    return numberFormatter.format(money.amount.toNumber())
  }

  /**
   * Convert Money to a plain number (use carefully for display only)
   */
  static toNumber(money: Money): number {
    return money.amount.toNumber()
  }

  /**
   * Convert Money to a string representation
   */
  static toString(money: Money): string {
    return money.amount.toString()
  }

  /**
   * Create zero money for a given currency
   */
  static zero(currency: string = 'USD'): Money {
    return {
      amount: new Decimal(0),
      currency: currency.toUpperCase(),
    }
  }

  /**
   * Check if money amount is zero
   */
  static isZero(money: Money): boolean {
    return money.amount.isZero()
  }

  /**
   * Check if money amount is positive
   */
  static isPositive(money: Money): boolean {
    return money.amount.isPositive()
  }

  /**
   * Check if money amount is negative
   */
  static isNegative(money: Money): boolean {
    return money.amount.isNegative()
  }

  /**
   * Get absolute value of money
   */
  static abs(money: Money): Money {
    return {
      amount: money.amount.abs(),
      currency: money.currency,
    }
  }
}
