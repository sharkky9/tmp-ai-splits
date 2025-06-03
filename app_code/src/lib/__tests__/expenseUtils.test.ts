import {
  calculateEqualSplit,
  validateAmountSplits,
  validatePercentageSplits,
  calculateMemberBalances,
  simplifyDebts,
  formatCurrency,
  generateSplitRationale,
} from '../expenseUtils'
import { MemberBalance, SimplifiedDebt } from '../../types/database'

describe('expenseUtils', () => {
  describe('calculateEqualSplit', () => {
    it('should calculate equal split for whole dollar amounts', () => {
      const result = calculateEqualSplit(30, 3)
      expect(result).toBe(10)
    })

    it('should handle split with remainder by rounding to nearest cent', () => {
      const result = calculateEqualSplit(10, 3)
      expect(result).toBe(3.33)
    })

    it('should handle zero amount', () => {
      const result = calculateEqualSplit(0, 3)
      expect(result).toBe(0)
    })

    it('should throw error for zero members', () => {
      expect(() => calculateEqualSplit(30, 0)).toThrow()
    })

    it('should throw error for negative amount', () => {
      expect(() => calculateEqualSplit(-10, 3)).toThrow()
    })

    it('should throw error for negative members', () => {
      expect(() => calculateEqualSplit(30, -2)).toThrow()
    })
  })

  describe('validateAmountSplits', () => {
    it('should return true when amounts sum to total', () => {
      const result = validateAmountSplits(30, [10, 15, 5])
      expect(result).toBe(true)
    })

    it('should return false when amounts exceed total', () => {
      const result = validateAmountSplits(30, [10, 15, 10])
      expect(result).toBe(false)
    })

    it('should return false when amounts are less than total', () => {
      const result = validateAmountSplits(30, [10, 5, 5])
      expect(result).toBe(false)
    })

    it('should handle floating point precision', () => {
      const result = validateAmountSplits(10, [3.33, 3.33, 3.34])
      expect(result).toBe(true)
    })

    it('should return false for negative amounts', () => {
      const result = validateAmountSplits(30, [10, -5, 25])
      expect(result).toBe(false)
    })

    it('should return true for empty array with zero total', () => {
      const result = validateAmountSplits(0, [])
      expect(result).toBe(true)
    })

    it('should return false for empty array with non-zero total', () => {
      const result = validateAmountSplits(30, [])
      expect(result).toBe(false)
    })
  })

  describe('validatePercentageSplits', () => {
    it('should return true when percentages sum to 100', () => {
      const result = validatePercentageSplits([50, 30, 20])
      expect(result).toBe(true)
    })

    it('should return false when percentages exceed 100', () => {
      const result = validatePercentageSplits([50, 40, 30])
      expect(result).toBe(false)
    })

    it('should return false when percentages are less than 100', () => {
      const result = validatePercentageSplits([50, 30, 10])
      expect(result).toBe(false)
    })

    it('should handle floating point precision', () => {
      const result = validatePercentageSplits([33.33, 33.33, 33.34])
      expect(result).toBe(true)
    })

    it('should return false for negative percentages', () => {
      const result = validatePercentageSplits([50, -10, 60])
      expect(result).toBe(false)
    })

    it('should return false for percentages over 100', () => {
      const result = validatePercentageSplits([150])
      expect(result).toBe(false)
    })

    it('should return true for empty array', () => {
      const result = validatePercentageSplits([])
      expect(result).toBe(true)
    })
  })

  describe('calculateMemberBalances', () => {
    const mockExpenses = [
      {
        id: '1',
        group_id: 'group1',
        description: 'Dinner',
        total_amount: 30,
        currency: 'USD',
        date_of_expense: '2024-01-01',
        payers: [{ user_id: 'user1', amount: 30 }],
        participants: [
          { user_id: 'user1', amount: 10 },
          { user_id: 'user2', amount: 10 },
          { user_id: 'user3', amount: 10 },
        ],
        status: 'confirmed' as const,
        created_by: 'user1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]

    const mockMembers = [
      { id: 'member1', user_id: 'user1', name: 'Alice' },
      { id: 'member2', user_id: 'user2', name: 'Bob' },
      { id: 'member3', user_id: 'user3', name: 'Charlie' },
    ]

    it('should calculate correct balances for simple expense', () => {
      const result = calculateMemberBalances(mockExpenses, mockMembers)

      expect(result).toHaveLength(3)
      expect(result.find((b) => b.user_id === 'user1')?.net_balance).toBe(20) // Paid 30, owes 10
      expect(result.find((b) => b.user_id === 'user2')?.net_balance).toBe(-10) // Paid 0, owes 10
      expect(result.find((b) => b.user_id === 'user3')?.net_balance).toBe(-10) // Paid 0, owes 10
    })

    it('should handle multiple expenses', () => {
      const multipleExpenses = [
        ...mockExpenses,
        {
          id: '2',
          group_id: 'group1',
          description: 'Lunch',
          total_amount: 20,
          currency: 'USD',
          date_of_expense: '2024-01-02',
          payers: [{ user_id: 'user2', amount: 20 }],
          participants: [
            { user_id: 'user1', amount: 10 },
            { user_id: 'user2', amount: 10 },
          ],
          status: 'confirmed' as const,
          created_by: 'user2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]

      const result = calculateMemberBalances(multipleExpenses, mockMembers)

      expect(result.find((b) => b.user_id === 'user1')?.net_balance).toBe(10) // Net: (30-10) + (0-10) = 10
      expect(result.find((b) => b.user_id === 'user2')?.net_balance).toBe(0) // Net: (0-10) + (20-10) = 0
    })

    it('should handle placeholder members', () => {
      const mockExpensesWithPlaceholder = [
        {
          id: '1',
          group_id: 'group1',
          description: 'Dinner',
          total_amount: 30,
          currency: 'USD',
          date_of_expense: '2024-01-01',
          payers: [{ user_id: 'user1', amount: 30 }],
          participants: [
            { user_id: 'user1', amount: 10 },
            { user_id: 'placeholder1', amount: 20 }, // Placeholder member
          ],
          status: 'confirmed' as const,
          created_by: 'user1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockMembersWithPlaceholder = [
        { id: 'member1', user_id: 'user1', name: 'Alice' },
        { id: 'placeholder1', name: 'Bob (Guest)' }, // No user_id for placeholder
      ]

      const result = calculateMemberBalances(
        mockExpensesWithPlaceholder,
        mockMembersWithPlaceholder
      )

      expect(result).toHaveLength(2)
      expect(result.find((b) => b.user_id === 'user1')?.net_balance).toBe(20) // Paid 30, owes 10
      expect(result.find((b) => b.member_id === 'placeholder1')?.net_balance).toBe(-20) // Paid 0, owes 20
      expect(result.find((b) => b.member_id === 'placeholder1')?.user_id).toBeUndefined()
    })

    it('should handle empty expenses array', () => {
      const result = calculateMemberBalances([], mockMembers)
      expect(result).toHaveLength(3)
      expect(result.every((b) => b.net_balance === 0)).toBe(true)
    })
  })

  describe('simplifyDebts', () => {
    const mockBalances: MemberBalance[] = [
      {
        member_id: 'member1',
        user_id: 'user1',
        name: 'Alice',
        total_paid: 30,
        total_owed: 10,
        net_balance: 20,
      },
      {
        member_id: 'member2',
        user_id: 'user2',
        name: 'Bob',
        total_paid: 0,
        total_owed: 10,
        net_balance: -10,
      },
      {
        member_id: 'member3',
        user_id: 'user3',
        name: 'Charlie',
        total_paid: 0,
        total_owed: 10,
        net_balance: -10,
      },
    ]

    it('should return simplified debt transactions', () => {
      const result = simplifyDebts(mockBalances)

      expect(result).toHaveLength(2)
      expect(result.find((d) => d.from_name === 'Bob')?.amount).toBe(10)
      expect(result.find((d) => d.from_name === 'Charlie')?.amount).toBe(10)
      expect(result.every((d) => d.to_name === 'Alice')).toBe(true)
    })

    it('should handle circular debts efficiently', () => {
      const circularBalances: MemberBalance[] = [
        { member_id: 'm1', name: 'A', net_balance: 10, total_paid: 0, total_owed: 0 },
        { member_id: 'm2', name: 'B', net_balance: -5, total_paid: 0, total_owed: 0 },
        { member_id: 'm3', name: 'C', net_balance: -5, total_paid: 0, total_owed: 0 },
      ]

      const result = simplifyDebts(circularBalances)
      expect(result.length).toBeLessThanOrEqual(2) // Should be optimized
    })

    it('should handle already settled balances', () => {
      const settledBalances: MemberBalance[] = [
        { member_id: 'm1', name: 'A', net_balance: 0, total_paid: 10, total_owed: 10 },
        { member_id: 'm2', name: 'B', net_balance: 0, total_paid: 10, total_owed: 10 },
      ]

      const result = simplifyDebts(settledBalances)
      expect(result).toHaveLength(0)
    })

    it('should return minimum number of transactions', () => {
      // Complex scenario with multiple creditors and debtors
      const complexBalances: MemberBalance[] = [
        { member_id: 'm1', name: 'Alice', net_balance: 15, total_paid: 50, total_owed: 35 },
        { member_id: 'm2', name: 'Bob', net_balance: 5, total_paid: 25, total_owed: 20 },
        { member_id: 'm3', name: 'Charlie', net_balance: -10, total_paid: 10, total_owed: 20 },
        { member_id: 'm4', name: 'David', net_balance: -10, total_paid: 5, total_owed: 15 },
      ]

      const result = simplifyDebts(complexBalances)

      // Should optimize to minimize transactions
      // Alice gets 15, Bob gets 5 (total 20 owed)
      // Charlie owes 10, David owes 10 (total 20 owed)
      // Optimal solution: 2-3 transactions max
      expect(result.length).toBeLessThanOrEqual(3)

      // Verify totals balance out
      const totalPaid = result.reduce((sum, debt) => sum + debt.amount, 0)
      const expectedTotal = complexBalances
        .filter((b) => b.net_balance > 0)
        .reduce((sum, b) => sum + b.net_balance, 0)

      expect(Math.abs(totalPaid - expectedTotal)).toBeLessThan(0.01)
    })
  })

  describe('formatCurrency', () => {
    it('should format USD currency correctly', () => {
      const result = formatCurrency(10.5, 'USD')
      expect(result).toBe('$10.50')
    })

    it('should handle zero amount', () => {
      const result = formatCurrency(0, 'USD')
      expect(result).toBe('$0.00')
    })

    it('should handle large amounts', () => {
      const result = formatCurrency(1234.56, 'USD')
      expect(result).toBe('$1,234.56')
    })

    it('should round to 2 decimal places', () => {
      const result = formatCurrency(10.999, 'USD')
      expect(result).toBe('$11.00')
    })

    it('should handle negative amounts', () => {
      const result = formatCurrency(-25.75, 'USD')
      expect(result).toBe('-$25.75')
    })

    it('should default to USD if no currency provided', () => {
      const result = formatCurrency(10.5)
      expect(result).toBe('$10.50')
    })
  })

  describe('generateSplitRationale', () => {
    it('should generate rationale for equal splits', () => {
      const participants = [
        { user_id: 'user1', amount: 10 },
        { user_id: 'user2', amount: 10 },
        { user_id: 'user3', amount: 10 },
      ]

      const result = generateSplitRationale(participants, 30, 'USD')

      expect(result).toHaveLength(3)
      expect(result[0].rationale).toBe('Split equally among 3 people')
      expect(result[1].rationale).toBe('Split equally among 3 people')
      expect(result[2].rationale).toBe('Split equally among 3 people')
    })

    it('should generate rationale for percentage splits', () => {
      const participants = [
        { user_id: 'user1', amount: 12, percentage: 40 },
        { user_id: 'user2', amount: 18, percentage: 60 },
      ]

      const result = generateSplitRationale(participants, 30, 'USD')

      expect(result).toHaveLength(2)
      expect(result[0].rationale).toBe('40% of $30.00 total')
      expect(result[1].rationale).toBe('60% of $30.00 total')
    })

    it('should generate rationale for custom amount splits', () => {
      const participants = [
        { user_id: 'user1', amount: 15 },
        { user_id: 'user2', amount: 15 },
      ]

      const result = generateSplitRationale(participants, 30, 'USD')

      expect(result).toHaveLength(2)
      expect(result[0].rationale).toBe('Split equally among 2 people')
      expect(result[1].rationale).toBe('Split equally among 2 people')
    })

    it('should generate rationale for unequal custom amounts', () => {
      const participants = [
        { user_id: 'user1', amount: 20 },
        { user_id: 'user2', amount: 10 },
      ]

      const result = generateSplitRationale(participants, 30, 'USD')

      expect(result).toHaveLength(2)
      expect(result[0].rationale).toBe('Custom amount (66.7% of total)')
      expect(result[1].rationale).toBe('Custom amount (33.3% of total)')
    })

    it('should handle placeholder names', () => {
      const participants = [
        { user_id: 'user1', amount: 15 },
        { placeholder_name: 'Guest User', amount: 15 },
      ]

      const result = generateSplitRationale(participants, 30, 'USD')

      expect(result).toHaveLength(2)
      expect(result[0].participantKey).toBe('user1')
      expect(result[0].name).toBe('user1')
      expect(result[1].participantKey).toBe('Guest User')
      expect(result[1].name).toBe('Guest User')
    })

    it('should handle single participant', () => {
      const participants = [{ user_id: 'user1', amount: 30 }]

      const result = generateSplitRationale(participants, 30, 'USD')

      expect(result).toHaveLength(1)
      expect(result[0].rationale).toBe('Split equally among 1 person')
    })

    it('should handle empty participants array', () => {
      const result = generateSplitRationale([], 30, 'USD')

      expect(result).toHaveLength(0)
    })

    it('should handle null participants', () => {
      const result = generateSplitRationale(null as any, 30, 'USD')

      expect(result).toHaveLength(0)
    })

    it('should use correct currency formatting', () => {
      const participants = [
        { user_id: 'user1', amount: 500, percentage: 50 },
        { user_id: 'user2', amount: 500, percentage: 50 },
      ]

      const result = generateSplitRationale(participants, 1000, 'USD')

      expect(result[0].rationale).toBe('50% of $1,000.00 total')
      expect(result[1].rationale).toBe('50% of $1,000.00 total')
    })

    it('should handle floating point precision in equal split detection', () => {
      const participants = [
        { user_id: 'user1', amount: 33.33 },
        { user_id: 'user2', amount: 33.33 },
        { user_id: 'user3', amount: 33.34 },
      ]

      const result = generateSplitRationale(participants, 100, 'USD')

      expect(result).toHaveLength(3)
      // Should recognize this as equal split despite floating point differences
      expect(result[0].rationale).toBe('Split equally among 3 people')
      expect(result[1].rationale).toBe('Split equally among 3 people')
      expect(result[2].rationale).toBe('Split equally among 3 people')
    })
  })
})
