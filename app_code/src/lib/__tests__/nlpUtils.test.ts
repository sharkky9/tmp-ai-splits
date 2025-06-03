import {
  extractAmounts,
  extractPeople,
  extractCategories,
  extractDates,
  extractDescription,
  calculateConfidence,
  parseExpenseText,
  formatForExpenseCreation,
} from '../nlpUtils'

describe('nlpUtils', () => {
  describe('extractAmounts', () => {
    it('should extract amounts with currency symbols', () => {
      expect(extractAmounts('I paid $50 for dinner')).toEqual([{ amount: 50, currency: 'USD' }])
      expect(extractAmounts('Cost was €45.50')).toEqual([{ amount: 45.5, currency: 'EUR' }])
      expect(extractAmounts('£25.99 for groceries')).toEqual([{ amount: 25.99, currency: 'GBP' }])
    })

    it('should extract multiple amounts', () => {
      const result = extractAmounts('I paid $30 and John paid $20')
      expect(result).toHaveLength(2)
      expect(result).toContainEqual({ amount: 30, currency: 'USD' })
      expect(result).toContainEqual({ amount: 20, currency: 'USD' })
    })

    it('should fallback to number detection without currency', () => {
      const result = extractAmounts('dinner cost 25.50 total')
      expect(result).toEqual([{ amount: 25.5, currency: 'USD' }])
    })

    it('should ignore small numbers to avoid false positives', () => {
      const result = extractAmounts('we were 3 people and paid 25.50')
      expect(result).toEqual([{ amount: 25.5, currency: 'USD' }])
    })

    it('should return empty array for text without amounts', () => {
      expect(extractAmounts('just a regular dinner')).toEqual([])
    })
  })

  describe('extractPeople', () => {
    it('should extract people from common patterns', () => {
      expect(extractPeople('dinner with John and Sarah')).toContain('John')
      expect(extractPeople('for Alice, Bob and me')).toEqual(['Alice', 'Bob', 'me'])
      expect(extractPeople('including Mike')).toContain('Mike')
    })

    it('should handle "me" references', () => {
      expect(extractPeople('I paid for dinner')).toContain('me')
      expect(extractPeople('myself and John')).toContain('me')
    })

    it('should avoid category words as people', () => {
      const result = extractPeople('dinner with John')
      expect(result).toContain('John')
      expect(result).not.toContain('dinner')
    })

    it('should remove duplicates', () => {
      const result = extractPeople('John and John paid for dinner')
      expect(result.filter((p) => p === 'John')).toHaveLength(1)
    })
  })

  describe('extractCategories', () => {
    it('should extract expense categories', () => {
      expect(extractCategories('dinner at restaurant')).toContain('dinner')
      expect(extractCategories('uber ride home')).toContain('uber')
      expect(extractCategories('groceries and coffee')).toEqual(
        expect.arrayContaining(['groceries', 'coffee'])
      )
    })

    it('should be case insensitive', () => {
      expect(extractCategories('DINNER at Restaurant')).toContain('dinner')
    })

    it('should return empty for text without categories', () => {
      expect(extractCategories('some random expense')).toEqual([])
    })
  })

  describe('extractDates', () => {
    it('should extract relative dates', () => {
      expect(extractDates('yesterday we had dinner')).toContain('yesterday')
      expect(extractDates('today I paid for lunch')).toContain('today')
    })

    it('should extract day names', () => {
      expect(extractDates('last friday dinner')).toContain('friday')
    })

    it('should extract formatted dates', () => {
      expect(extractDates('on 12/25/2023 we paid')).toContain('12/25/2023')
      expect(extractDates('December 15 dinner')).toContain('December 15')
    })
  })

  describe('extractDescription', () => {
    it('should remove amounts and people to clean description', () => {
      const amounts = [{ amount: 50, currency: 'USD' }]
      const people = ['John', 'me']
      const categories = ['dinner']

      const result = extractDescription(
        '$50 for dinner with John and me',
        amounts,
        people,
        categories
      )

      expect(result).toBe('dinner')
    })

    it('should use category as fallback for short descriptions', () => {
      const result = extractDescription('$50', [{ amount: 50, currency: 'USD' }], [], ['food'])

      expect(result).toBe('food')
    })

    it('should provide fallback description', () => {
      const result = extractDescription('$50', [{ amount: 50, currency: 'USD' }], [], [])

      expect(result).toBe('Expense')
    })
  })

  describe('calculateConfidence', () => {
    it('should give high confidence for complete extraction', () => {
      const amounts = [{ amount: 50, currency: 'USD' }]
      const description = 'Pizza dinner'
      const people = ['John', 'me']

      const confidence = calculateConfidence(amounts, description, people)
      expect(confidence).toBeGreaterThan(0.8)
    })

    it('should give low confidence for incomplete extraction', () => {
      const confidence = calculateConfidence([], 'Ex', [])
      expect(confidence).toBeLessThan(0.4)
    })

    it('should never exceed 1.0', () => {
      const confidence = calculateConfidence(
        [{ amount: 50, currency: 'USD' }],
        'Very detailed expense description',
        ['John', 'Sarah', 'Mike']
      )
      expect(confidence).toBeLessThanOrEqual(1.0)
    })
  })

  describe('parseExpenseText', () => {
    it('should parse complete expense text', () => {
      const result = parseExpenseText('$50 for pizza dinner with John and Sarah')

      expect(result.amount).toBe(50)
      expect(result.currency).toBe('USD')
      expect(result.description).toContain('pizza')
      expect(result.possiblePeople).toContain('John')
      expect(result.possiblePeople).toContain('Sarah')
      expect(result.possibleCategories).toContain('dinner')
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should handle partial information gracefully', () => {
      const result = parseExpenseText('dinner with friends')

      expect(result.amount).toBeNull()
      expect(result.description).toContain('dinner')
      expect(result.possibleCategories).toContain('dinner')
      expect(result.confidence).toBeLessThan(0.7)
    })

    it('should return empty data for empty/short text', () => {
      const result = parseExpenseText('')

      expect(result.amount).toBeNull()
      expect(result.description).toBe('')
      expect(result.confidence).toBe(0)
    })
  })

  describe('formatForExpenseCreation', () => {
    const mockGroupMembers = [
      { id: 'user-1', name: 'Alice Smith' },
      { id: 'user-2', name: 'John Doe' },
      { id: 'user-3', name: 'Sarah Wilson' },
    ]

    it('should map people to group members', () => {
      const parsedData = {
        description: 'Pizza dinner',
        amount: 50,
        currency: 'USD',
        possiblePeople: ['John', 'Sarah', 'me'],
        possibleCategories: ['dinner'],
        possibleDates: [],
        confidence: 0.8,
      }

      const result = formatForExpenseCreation(parsedData, 'Alice Smith', mockGroupMembers)

      expect(result.description).toBe('Pizza dinner')
      expect(result.total_amount).toBe(50)
      expect(result.currency).toBe('USD')
      expect(result.payer_id).toBe('user-1') // Alice Smith
      expect(result.participants).toContain('user-1') // Alice (me)
      expect(result.participants).toContain('user-2') // John
      expect(result.participants).toContain('user-3') // Sarah
    })

    it('should include all members when no specific people detected', () => {
      const parsedData = {
        description: 'Expense',
        amount: 30,
        currency: 'USD',
        possiblePeople: [],
        possibleCategories: [],
        possibleDates: [],
        confidence: 0.4,
      }

      const result = formatForExpenseCreation(parsedData, 'Alice Smith', mockGroupMembers)

      expect(result.participants).toHaveLength(3)
      expect(result.participants).toEqual(['user-1', 'user-2', 'user-3'])
    })

    it('should handle partial name matches', () => {
      const parsedData = {
        description: 'Lunch',
        amount: 25,
        currency: 'USD',
        possiblePeople: ['Alice', 'John'],
        possibleCategories: [],
        possibleDates: [],
        confidence: 0.7,
      }

      const result = formatForExpenseCreation(parsedData, 'Alice Smith', mockGroupMembers)

      expect(result.participants).toContain('user-1') // Alice Smith
      expect(result.participants).toContain('user-2') // John Doe
    })
  })

  describe('integration tests', () => {
    it('should handle complex expense scenarios', () => {
      const scenarios = [
        {
          input: '$75.50 for dinner at Pizza Palace with John, Sarah and me yesterday',
          expectedAmount: 75.5,
          expectedPeople: ['John', 'Sarah', 'me'],
          expectedCategories: ['dinner'],
        },
        {
          input: 'I paid 45 euros for uber ride home with Mike',
          expectedAmount: null, // No euro symbol, but 45 should be detected
          expectedPeople: ['me', 'Mike'],
          expectedCategories: ['uber'],
        },
        {
          input: 'coffee and breakfast for 25.99 this morning',
          expectedAmount: 25.99,
          expectedPeople: [],
          expectedCategories: ['coffee', 'breakfast'],
        },
      ]

      scenarios.forEach((scenario) => {
        const result = parseExpenseText(scenario.input)

        if (scenario.expectedAmount !== null) {
          expect(result.amount).toBe(scenario.expectedAmount)
        }

        scenario.expectedPeople.forEach((person) => {
          expect(result.possiblePeople).toContain(person)
        })

        scenario.expectedCategories.forEach((category) => {
          expect(result.possibleCategories).toContain(category)
        })

        expect(result.confidence).toBeGreaterThan(0)
      })
    })
  })
})
