// Simple verification tests for Task 1.6 utilities
import { CurrencyUtils } from '../currencyUtils'
import { DateUtils } from '../dateUtils'
import Decimal from 'decimal.js'

describe('Utility Tests', () => {
  describe('CurrencyUtils', () => {
    it('should create money and format it correctly', () => {
      const money = CurrencyUtils.createMoney(100.5, 'USD')
      expect(CurrencyUtils.format(money)).toBe('$100.50') // Assuming default USD formatting
    })

    it('should add two money amounts', () => {
      const money1 = CurrencyUtils.createMoney(100.5, 'USD')
      const money2 = CurrencyUtils.createMoney(25.25, 'USD')
      const sum = CurrencyUtils.add(money1, money2)
      expect(CurrencyUtils.format(sum)).toBe('$125.75')
    })

    it('should subtract two money amounts', () => {
      const money1 = CurrencyUtils.createMoney(100.5, 'USD')
      const money2 = CurrencyUtils.createMoney(25.25, 'USD')
      const difference = CurrencyUtils.subtract(money1, money2)
      expect(CurrencyUtils.format(difference)).toBe('$75.25')
    })

    it('should multiply a money amount by a number', () => {
      const money = CurrencyUtils.createMoney(10.5, 'USD')
      const product = CurrencyUtils.multiply(money, 3)
      expect(CurrencyUtils.format(product)).toBe('$31.50')
    })

    it('should divide a money amount by a number', () => {
      const money = CurrencyUtils.createMoney(30.6, 'USD')
      const quotient = CurrencyUtils.divide(money, 3)
      expect(CurrencyUtils.format(quotient)).toBe('$10.20')
    })

    it('should split money evenly into N parts', () => {
      const money = CurrencyUtils.createMoney(100, 'USD')
      const parts = 3
      const splits = CurrencyUtils.splitEvenly(money, parts)
      expect(splits.length).toBe(parts)
      // 100 / 3 = 33.333... results in [33.34, 33.33, 33.33]
      expect(CurrencyUtils.format(splits[0])).toBe('$33.34')
      expect(CurrencyUtils.format(splits[1])).toBe('$33.33')
      expect(CurrencyUtils.format(splits[2])).toBe('$33.33')
      const totalSplitAmount = splits.reduce(
        (acc, s) => CurrencyUtils.add(acc, s),
        CurrencyUtils.createMoney(0, 'USD')
      )
      expect(CurrencyUtils.equals(totalSplitAmount, money)).toBe(true)
    })

    it('should handle complex splits correctly', () => {
      const money = CurrencyUtils.createMoney(0.05, 'USD')
      const splits = CurrencyUtils.splitEvenly(money, 2)

      // For 0.05 / 2, with correct modulo logic, splits[0] is $0.03 and splits[1] is $0.02
      expect(CurrencyUtils.format(splits[0])).toBe('$0.03')
      expect(CurrencyUtils.format(splits[1])).toBe('$0.02')

      // Verify the sum equals the original amount
      const totalSplitAmount = splits.reduce(
        (acc, s) => CurrencyUtils.add(acc, s),
        CurrencyUtils.createMoney(0, 'USD')
      )
      expect(CurrencyUtils.equals(totalSplitAmount, money)).toBe(true)
    })
  })

  describe('DateUtils', () => {
    it('should format a date for display', () => {
      const date = new Date(2023, 11, 25) // Dec 25, 2023
      expect(DateUtils.format(date, 'DISPLAY_DATE')).toBe('Dec 25, 2023')
    })

    it('should format a date and time for display', () => {
      const date = new Date(2023, 11, 25, 14, 30) // Dec 25, 2023, 2:30 PM
      // This will depend on the locale of the test runner, so we check for parts
      const formatted = DateUtils.format(date, 'DISPLAY_DATETIME')
      expect(formatted).toContain('Dec 25, 2023')
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/) // e.g., 2:30 PM
    })

    it('should format distance to now correctly', () => {
      const date = new Date()
      date.setHours(date.getHours() - 2)
      expect(DateUtils.formatDistanceToNow(date)).toBe('about 2 hours ago')
    })

    it('should validate a valid date string', () => {
      expect(DateUtils.isValid('2023-12-25')).toBe(true)
    })

    it('should invalidate an invalid date string', () => {
      expect(DateUtils.isValid('not-a-date')).toBe(false)
    })
  })
})
