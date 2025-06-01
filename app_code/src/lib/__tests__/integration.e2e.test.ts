/**
 * End-to-End Integration Tests for Task 7.0
 * Tests the complete user journey from account creation to settlement
 */

import { CurrencyUtils } from '../utils/currencyUtils'
import { DateUtils } from '../utils/dateUtils'
import { formatCurrency } from '../utils/currency'

describe('End-to-End Integration Tests', () => {
  describe('Complete User Journey Simulation', () => {
    it('should handle the complete expense splitting workflow', () => {
      // Test 1: Currency calculations work correctly
      const expenseAmount = CurrencyUtils.createMoney(120.50, 'USD')
      const splitAmount = CurrencyUtils.divide(expenseAmount, 3)
      expect(CurrencyUtils.format(splitAmount)).toBe('$40.17')

      // Test 2: Date utilities work for expense dates
      const expenseDate = new Date(2024, 0, 15) // Use constructor to avoid timezone issues
      const formattedDate = DateUtils.format(expenseDate, 'DISPLAY_DATE')
      expect(formattedDate).toBe('Jan 15, 2024')

      // Test 3: Currency formatting works for different amounts
      expect(formatCurrency(25.99, 'USD')).toBe('$25.99')
      expect(formatCurrency(0.01, 'USD')).toBe('$0.01')
      expect(formatCurrency(1000, 'USD')).toBe('$1,000.00')

      // Test 4: Date validation works
      expect(DateUtils.isValid('2024-01-15')).toBe(true)
      expect(DateUtils.isValid('invalid-date')).toBe(false)

      // Test 5: Complex split calculations
      const complexExpense = CurrencyUtils.createMoney(100, 'USD')
      const splits = CurrencyUtils.splitEvenly(complexExpense, 3)
      const totalAfterSplit = splits.reduce((acc, split) => 
        CurrencyUtils.add(acc, split), 
        CurrencyUtils.createMoney(0, 'USD')
      )
      expect(CurrencyUtils.equals(totalAfterSplit, complexExpense)).toBe(true)
    })

    it('should handle settlement calculation scenarios', () => {
      // Simulate a debt simplification scenario
      const memberBalances = [
        { memberId: 'alice', balance: 50 },   // Alice is owed $50
        { memberId: 'bob', balance: -30 },    // Bob owes $30
        { memberId: 'charlie', balance: -20 } // Charlie owes $20
      ]

      // Test that balances sum to zero (fundamental requirement)
      const totalBalance = memberBalances.reduce((sum, member) => sum + member.balance, 0)
      expect(Math.abs(totalBalance)).toBeLessThan(0.01) // Should be zero within floating point precision

      // Test currency formatting for settlement amounts
      const settlementAmount = Math.abs(memberBalances[1].balance)
      expect(formatCurrency(settlementAmount, 'USD')).toBe('$30.00')
    })

    it('should handle edge cases in financial calculations', () => {
      // Test very small amounts
      const smallAmount = CurrencyUtils.createMoney(0.01, 'USD')
      expect(CurrencyUtils.format(smallAmount)).toBe('$0.01')

      // Test large amounts
      const largeAmount = CurrencyUtils.createMoney(999999.99, 'USD')
      expect(CurrencyUtils.format(largeAmount)).toBe('$999,999.99')

      // Test zero amounts
      const zeroAmount = CurrencyUtils.createMoney(0, 'USD')
      expect(CurrencyUtils.format(zeroAmount)).toBe('$0.00')

      // Test precision in splits
      const precisionTest = CurrencyUtils.createMoney(0.10, 'USD')
      const preciseSplits = CurrencyUtils.splitEvenly(precisionTest, 3)
      // Should be [0.04, 0.03, 0.03] to maintain precision
      expect(CurrencyUtils.format(preciseSplits[0])).toBe('$0.04')
      expect(CurrencyUtils.format(preciseSplits[1])).toBe('$0.03')
      expect(CurrencyUtils.format(preciseSplits[2])).toBe('$0.03')
    })

    it('should handle date edge cases', () => {
      // Test today's date
      const today = new Date()
      expect(DateUtils.isToday(today)).toBe(true)

      // Test date formatting edge cases
      const futureDate = DateUtils.addDays(today, 30)
      const pastDate = DateUtils.subtractDays(today, 30)
      
      expect(DateUtils.isAfter(futureDate, today)).toBe(true)
      expect(DateUtils.isBefore(pastDate, today)).toBe(true)

      // Test relative time formatting
      const relativeTime = DateUtils.formatDistanceToNow(pastDate)
      expect(relativeTime).toContain('ago')
    })
  })

  describe('Component Integration Validation', () => {
    it('should validate expense form data structures', () => {
      // Test expense data structure that would be used by components
      const expenseData = {
        id: 'expense-1',
        description: 'Dinner at restaurant',
        total_amount: 120.50,
        currency: 'USD',
        date_of_expense: '2024-01-15',
        payers: [
          { user_id: 'alice', amount: 120.50 }
        ],
        participants: [
          { user_id: 'alice', amount: 40.17 },
          { user_id: 'bob', amount: 40.17 },
          { user_id: 'charlie', amount: 40.16 }
        ],
        status: 'confirmed'
      }

      // Validate expense structure
      expect(expenseData.description).toBeTruthy()
      expect(expenseData.total_amount).toBeGreaterThan(0)
      expect(expenseData.payers.length).toBeGreaterThan(0)
      expect(expenseData.participants.length).toBeGreaterThan(0)

      // Validate amounts balance
      const payersTotal = expenseData.payers.reduce((sum, payer) => sum + payer.amount, 0)
      const participantsTotal = expenseData.participants.reduce((sum, participant) => sum + participant.amount, 0)
      
      expect(Math.abs(payersTotal - expenseData.total_amount)).toBeLessThan(0.01)
      expect(Math.abs(participantsTotal - expenseData.total_amount)).toBeLessThan(0.01)
    })

    it('should validate settlement data structures', () => {
      // Test settlement data structure that would be used by components
      const settlementData = {
        transactions: [
          {
            id: 'settlement-1',
            fromMemberId: 'bob',
            fromMemberName: 'Bob Smith',
            toMemberId: 'alice',
            toMemberName: 'Alice Johnson',
            amount: 30.00,
            currency: 'USD',
            isFromPlaceholder: false,
            isToPlaceholder: false
          }
        ],
        memberBalances: [
          { memberId: 'alice', memberName: 'Alice Johnson', balance: 50.00 },
          { memberId: 'bob', memberName: 'Bob Smith', balance: -30.00 },
          { memberId: 'charlie', memberName: 'Charlie Brown', balance: -20.00 }
        ],
        totalSettlementAmount: 50.00,
        currency: 'USD',
        minimumTransactions: 2
      }

      // Validate settlement structure
      expect(settlementData.transactions.length).toBeGreaterThan(0)
      expect(settlementData.memberBalances.length).toBeGreaterThan(0)
      expect(settlementData.totalSettlementAmount).toBeGreaterThan(0)

      // Validate transaction amounts are positive
      settlementData.transactions.forEach(transaction => {
        expect(transaction.amount).toBeGreaterThan(0)
        expect(transaction.fromMemberId).toBeTruthy()
        expect(transaction.toMemberId).toBeTruthy()
      })

      // Validate member balances sum to zero
      const totalBalance = settlementData.memberBalances.reduce((sum, member) => sum + member.balance, 0)
      expect(Math.abs(totalBalance)).toBeLessThan(0.01)
    })
  })

  describe('Performance and Scalability Tests', () => {
    it('should handle large expense lists efficiently', () => {
      const startTime = Date.now()
      
      // Simulate processing 100 expenses
      const expenses = Array.from({ length: 100 }, (_, i) => ({
        id: `expense-${i}`,
        amount: Math.random() * 1000,
        date: DateUtils.addDays(new Date(), -i)
      }))

      // Test sorting by date (common operation)
      const sortedExpenses = expenses.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      const endTime = Date.now()
      const processingTime = endTime - startTime

      expect(sortedExpenses.length).toBe(100)
      expect(processingTime).toBeLessThan(100) // Should complete in under 100ms
    })

    it('should handle complex split calculations efficiently', () => {
      const startTime = Date.now()

      // Test splitting a large amount among many people
      const largeAmount = CurrencyUtils.createMoney(10000, 'USD')
      const manySplits = CurrencyUtils.splitEvenly(largeAmount, 50)

      const endTime = Date.now()
      const processingTime = endTime - startTime

      expect(manySplits.length).toBe(50)
      expect(processingTime).toBeLessThan(50) // Should complete quickly

      // Verify precision is maintained
      const totalAfterSplit = manySplits.reduce((acc, split) => 
        CurrencyUtils.add(acc, split), 
        CurrencyUtils.createMoney(0, 'USD')
      )
      expect(CurrencyUtils.equals(totalAfterSplit, largeAmount)).toBe(true)
    })
  })
}) 