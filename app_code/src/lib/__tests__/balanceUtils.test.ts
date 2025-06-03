import {
  calculateGroupBalances,
  formatBalance,
  sortBalancesByAmount,
  GroupMember,
  Expense,
  ExpenseSplit,
  GroupMemberBalance,
} from '../balanceUtils'

describe('balanceUtils', () => {
  // Test data setup
  const mockGroupMembers: GroupMember[] = [
    {
      id: 'member-1',
      user_id: 'user-1',
      placeholder_name: null,
      is_placeholder: false,
      profiles: { name: 'Alice Smith' },
    },
    {
      id: 'member-2',
      user_id: 'user-2',
      placeholder_name: null,
      is_placeholder: false,
      profiles: { name: 'Bob Johnson' },
    },
    {
      id: 'member-3',
      user_id: null,
      placeholder_name: 'Charlie Wilson',
      is_placeholder: true,
      profiles: null,
    },
  ]

  const mockExpenses: Expense[] = [
    {
      id: 'expense-1',
      total_amount: 30.0,
      payer_id: 'member-1', // Alice paid $30
      status: 'confirmed',
    },
    {
      id: 'expense-2',
      total_amount: 60.0,
      payer_id: 'member-2', // Bob paid $60
      status: 'confirmed',
    },
    {
      id: 'expense-3',
      total_amount: 45.0,
      payer_id: 'member-1', // Alice paid $45
      status: 'pending_confirmation', // This should be excluded
    },
  ]

  const mockExpenseSplits: ExpenseSplit[] = [
    // Expense 1 ($30) split equally among Alice, Bob, Charlie ($10 each)
    { expense_id: 'expense-1', member_id: 'member-1', amount: 10.0 },
    { expense_id: 'expense-1', member_id: 'member-2', amount: 10.0 },
    { expense_id: 'expense-1', member_id: 'member-3', amount: 10.0 },

    // Expense 2 ($60) split: Alice $20, Bob $30, Charlie $10
    { expense_id: 'expense-2', member_id: 'member-1', amount: 20.0 },
    { expense_id: 'expense-2', member_id: 'member-2', amount: 30.0 },
    { expense_id: 'expense-2', member_id: 'member-3', amount: 10.0 },

    // Expense 3 splits (should be excluded since expense is not confirmed)
    { expense_id: 'expense-3', member_id: 'member-1', amount: 15.0 },
    { expense_id: 'expense-3', member_id: 'member-2', amount: 15.0 },
    { expense_id: 'expense-3', member_id: 'member-3', amount: 15.0 },
  ]

  describe('calculateGroupBalances', () => {
    it('should calculate balances correctly for basic scenario', () => {
      const balances = calculateGroupBalances(mockGroupMembers, mockExpenses, mockExpenseSplits)

      expect(balances).toHaveLength(3)

      // Alice: paid $30, owes $30 ($10 + $20) → net balance = $0
      const aliceBalance = balances.find((b) => b.member_id === 'member-1')
      expect(aliceBalance).toBeDefined()
      expect(aliceBalance!.total_paid).toBe(30.0)
      expect(aliceBalance!.total_share).toBe(30.0)
      expect(aliceBalance!.net_balance).toBe(0.0)
      expect(aliceBalance!.name).toBe('Alice Smith')
      expect(aliceBalance!.is_placeholder).toBe(false)

      // Bob: paid $60, owes $40 ($10 + $30) → net balance = $20 (is owed $20)
      const bobBalance = balances.find((b) => b.member_id === 'member-2')
      expect(bobBalance).toBeDefined()
      expect(bobBalance!.total_paid).toBe(60.0)
      expect(bobBalance!.total_share).toBe(40.0)
      expect(bobBalance!.net_balance).toBe(20.0)
      expect(bobBalance!.name).toBe('Bob Johnson')
      expect(bobBalance!.is_placeholder).toBe(false)

      // Charlie: paid $0, owes $20 ($10 + $10) → net balance = -$20 (owes $20)
      const charlieBalance = balances.find((b) => b.member_id === 'member-3')
      expect(charlieBalance).toBeDefined()
      expect(charlieBalance!.total_paid).toBe(0.0)
      expect(charlieBalance!.total_share).toBe(20.0)
      expect(charlieBalance!.net_balance).toBe(-20.0)
      expect(charlieBalance!.name).toBe('Charlie Wilson')
      expect(charlieBalance!.is_placeholder).toBe(true)
    })

    it('should handle payer is not participant scenario', () => {
      const specialExpenses: Expense[] = [
        {
          id: 'expense-special',
          total_amount: 50.0,
          payer_id: 'member-1', // Alice paid
          status: 'confirmed',
        },
      ]

      const specialSplits: ExpenseSplit[] = [
        // Alice paid $50 but only Bob and Charlie share it ($25 each)
        { expense_id: 'expense-special', member_id: 'member-2', amount: 25.0 },
        { expense_id: 'expense-special', member_id: 'member-3', amount: 25.0 },
      ]

      const balances = calculateGroupBalances(mockGroupMembers, specialExpenses, specialSplits)

      // Alice: paid $50, owes $0 → net balance = $50 (is owed $50)
      const aliceBalance = balances.find((b) => b.member_id === 'member-1')
      expect(aliceBalance!.total_paid).toBe(50.0)
      expect(aliceBalance!.total_share).toBe(0.0)
      expect(aliceBalance!.net_balance).toBe(50.0)

      // Bob: paid $0, owes $25 → net balance = -$25 (owes $25)
      const bobBalance = balances.find((b) => b.member_id === 'member-2')
      expect(bobBalance!.total_paid).toBe(0.0)
      expect(bobBalance!.total_share).toBe(25.0)
      expect(bobBalance!.net_balance).toBe(-25.0)

      // Charlie: paid $0, owes $25 → net balance = -$25 (owes $25)
      const charlieBalance = balances.find((b) => b.member_id === 'member-3')
      expect(charlieBalance!.total_paid).toBe(0.0)
      expect(charlieBalance!.total_share).toBe(25.0)
      expect(charlieBalance!.net_balance).toBe(-25.0)
    })

    it('should handle multiple expenses complex scenario', () => {
      const complexExpenses: Expense[] = [
        { id: 'exp-1', total_amount: 90.0, payer_id: 'member-1', status: 'confirmed' },
        { id: 'exp-2', total_amount: 60.0, payer_id: 'member-2', status: 'confirmed' },
        { id: 'exp-3', total_amount: 30.0, payer_id: 'member-3', status: 'confirmed' },
      ]

      const complexSplits: ExpenseSplit[] = [
        // Expense 1: Alice paid $90, split equally ($30 each)
        { expense_id: 'exp-1', member_id: 'member-1', amount: 30.0 },
        { expense_id: 'exp-1', member_id: 'member-2', amount: 30.0 },
        { expense_id: 'exp-1', member_id: 'member-3', amount: 30.0 },

        // Expense 2: Bob paid $60, Alice owes $40, Bob owes $20
        { expense_id: 'exp-2', member_id: 'member-1', amount: 40.0 },
        { expense_id: 'exp-2', member_id: 'member-2', amount: 20.0 },

        // Expense 3: Charlie paid $30, split equally between Bob and Charlie ($15 each)
        { expense_id: 'exp-3', member_id: 'member-2', amount: 15.0 },
        { expense_id: 'exp-3', member_id: 'member-3', amount: 15.0 },
      ]

      const balances = calculateGroupBalances(mockGroupMembers, complexExpenses, complexSplits)

      // Alice: paid $90, owes $70 ($30 + $40) → net balance = $20
      const aliceBalance = balances.find((b) => b.member_id === 'member-1')
      expect(aliceBalance!.total_paid).toBe(90.0)
      expect(aliceBalance!.total_share).toBe(70.0)
      expect(aliceBalance!.net_balance).toBe(20.0)

      // Bob: paid $60, owes $65 ($30 + $20 + $15) → net balance = -$5
      const bobBalance = balances.find((b) => b.member_id === 'member-2')
      expect(bobBalance!.total_paid).toBe(60.0)
      expect(bobBalance!.total_share).toBe(65.0)
      expect(bobBalance!.net_balance).toBe(-5.0)

      // Charlie: paid $30, owes $45 ($30 + $15) → net balance = -$15
      const charlieBalance = balances.find((b) => b.member_id === 'member-3')
      expect(charlieBalance!.total_paid).toBe(30.0)
      expect(charlieBalance!.total_share).toBe(45.0)
      expect(charlieBalance!.net_balance).toBe(-15.0)
    })

    it('should exclude non-confirmed expenses', () => {
      const mixedExpenses: Expense[] = [
        { id: 'confirmed-1', total_amount: 30.0, payer_id: 'member-1', status: 'confirmed' },
        {
          id: 'pending-1',
          total_amount: 60.0,
          payer_id: 'member-2',
          status: 'pending_confirmation',
        },
        { id: 'draft-1', total_amount: 90.0, payer_id: 'member-3', status: 'draft' },
      ]

      const mixedSplits: ExpenseSplit[] = [
        // Only splits for confirmed expense should be counted
        { expense_id: 'confirmed-1', member_id: 'member-1', amount: 10.0 },
        { expense_id: 'confirmed-1', member_id: 'member-2', amount: 10.0 },
        { expense_id: 'confirmed-1', member_id: 'member-3', amount: 10.0 },

        // These splits should be ignored
        { expense_id: 'pending-1', member_id: 'member-1', amount: 20.0 },
        { expense_id: 'pending-1', member_id: 'member-2', amount: 20.0 },
        { expense_id: 'pending-1', member_id: 'member-3', amount: 20.0 },

        { expense_id: 'draft-1', member_id: 'member-1', amount: 30.0 },
        { expense_id: 'draft-1', member_id: 'member-2', amount: 30.0 },
        { expense_id: 'draft-1', member_id: 'member-3', amount: 30.0 },
      ]

      const balances = calculateGroupBalances(mockGroupMembers, mixedExpenses, mixedSplits)

      // Only the confirmed expense should affect balances
      // Alice: paid $30, owes $10 → net balance = $20
      const aliceBalance = balances.find((b) => b.member_id === 'member-1')
      expect(aliceBalance!.total_paid).toBe(30.0)
      expect(aliceBalance!.total_share).toBe(10.0)
      expect(aliceBalance!.net_balance).toBe(20.0)

      // Bob: paid $0, owes $10 → net balance = -$10
      const bobBalance = balances.find((b) => b.member_id === 'member-2')
      expect(bobBalance!.total_paid).toBe(0.0)
      expect(bobBalance!.total_share).toBe(10.0)
      expect(bobBalance!.net_balance).toBe(-10.0)

      // Charlie: paid $0, owes $10 → net balance = -$10
      const charlieBalance = balances.find((b) => b.member_id === 'member-3')
      expect(charlieBalance!.total_paid).toBe(0.0)
      expect(charlieBalance!.total_share).toBe(10.0)
      expect(charlieBalance!.net_balance).toBe(-10.0)
    })

    it('should return empty array for empty group', () => {
      const balances = calculateGroupBalances([], [], [])
      expect(balances).toEqual([])
    })

    it('should handle no expenses scenario', () => {
      const balances = calculateGroupBalances(mockGroupMembers, [], [])

      expect(balances).toHaveLength(3)

      // All members should have zero balances
      balances.forEach((balance) => {
        expect(balance.total_paid).toBe(0.0)
        expect(balance.total_share).toBe(0.0)
        expect(balance.net_balance).toBe(0.0)
      })
    })

    it('should handle placeholder member correctly', () => {
      const balances = calculateGroupBalances(mockGroupMembers, mockExpenses, mockExpenseSplits)

      const placeholderBalance = balances.find((b) => b.is_placeholder === true)
      expect(placeholderBalance).toBeDefined()
      expect(placeholderBalance!.name).toBe('Charlie Wilson')
      expect(placeholderBalance!.placeholder_name).toBe('Charlie Wilson')
      expect(placeholderBalance!.user_id).toBeNull()

      const userBalance = balances.find(
        (b) => b.is_placeholder === false && b.member_id === 'member-1'
      )
      expect(userBalance).toBeDefined()
      expect(userBalance!.name).toBe('Alice Smith')
      expect(userBalance!.user_id).toBe('user-1')
    })
  })

  describe('formatBalance', () => {
    it('should format positive balances (is owed money)', () => {
      expect(formatBalance(25.5)).toBe('Gets back $25.50')
      expect(formatBalance(100.0)).toBe('Gets back $100.00')
      expect(formatBalance(0.01)).toBe('Gets back $0.01')
    })

    it('should format negative balances (owes money)', () => {
      expect(formatBalance(-25.5)).toBe('Owes $25.50')
      expect(formatBalance(-100.0)).toBe('Owes $100.00')
      expect(formatBalance(-0.01)).toBe('Owes $0.01')
    })

    it('should format zero or near-zero balances as settled', () => {
      expect(formatBalance(0.0)).toBe('Settled up')
      expect(formatBalance(0.005)).toBe('Settled up')
      expect(formatBalance(-0.005)).toBe('Settled up')
    })
  })

  describe('sortBalancesByAmount', () => {
    const testBalances: GroupMemberBalance[] = [
      {
        member_id: 'member-1',
        user_id: 'user-1',
        placeholder_name: null,
        is_placeholder: false,
        total_paid: 100,
        total_share: 80,
        net_balance: 20, // Gets back $20
        name: 'Alice',
      },
      {
        member_id: 'member-2',
        user_id: 'user-2',
        placeholder_name: null,
        is_placeholder: false,
        total_paid: 50,
        total_share: 80,
        net_balance: -30, // Owes $30
        name: 'Bob',
      },
      {
        member_id: 'member-3',
        user_id: null,
        placeholder_name: 'Charlie',
        is_placeholder: true,
        total_paid: 0,
        total_share: 10,
        net_balance: -10, // Owes $10
        name: 'Charlie',
      },
      {
        member_id: 'member-4',
        user_id: 'user-4',
        placeholder_name: null,
        is_placeholder: false,
        total_paid: 150,
        total_share: 100,
        net_balance: 50, // Gets back $50
        name: 'Diana',
      },
    ]

    it('should sort balances with positive amounts first, then by highest amount', () => {
      const sorted = sortBalancesByAmount(testBalances)

      // Expected order: Diana (+50), Alice (+20), Bob (-30), Charlie (-10)
      expect(sorted[0].name).toBe('Diana')
      expect(sorted[0].net_balance).toBe(50)

      expect(sorted[1].name).toBe('Alice')
      expect(sorted[1].net_balance).toBe(20)

      expect(sorted[2].name).toBe('Bob')
      expect(sorted[2].net_balance).toBe(-30)

      expect(sorted[3].name).toBe('Charlie')
      expect(sorted[3].net_balance).toBe(-10)
    })

    it('should not mutate the original array', () => {
      const original = [...testBalances]
      sortBalancesByAmount(testBalances)

      expect(testBalances).toEqual(original)
    })

    it('should handle empty array', () => {
      const sorted = sortBalancesByAmount([])
      expect(sorted).toEqual([])
    })
  })
})
