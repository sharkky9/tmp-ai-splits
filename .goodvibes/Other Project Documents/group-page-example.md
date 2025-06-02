"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Plus,
  Users,
  Calendar,
  DollarSign,
  Receipt,
  Sparkles,
  ShoppingCart,
  Coffee,
  Car,
  Home,
} from "lucide-react"

interface Member {
  id: string
  name: string
  email: string
  avatar?: string
  role: "admin" | "member"
}

interface Expense {
  id: string
  description: string
  amount: number
  paidBy: string
  date: string
  category: string
  splits: { [memberId: string]: number }
}

const initialMembers: Member[] = [
  {
    id: "1",
    name: "Christopher Handel",
    email: "cully.handel@gmail.com",
    role: "admin",
  },
  {
    id: "2",
    name: "Chester Tester",
    email: "chester@example.com",
    role: "member",
  },
]

const initialExpenses: Expense[] = [
  {
    id: "1",
    description: "Dinner at Pizza Palace",
    amount: 45.0,
    paidBy: "1",
    date: "2024-06-01",
    category: "food",
    splits: { "1": 22.5, "2": 22.5 },
  },
  {
    id: "2",
    description: "Uber to Airport",
    amount: 28.5,
    paidBy: "2",
    date: "2024-05-31",
    category: "transport",
    splits: { "1": 14.25, "2": 14.25 },
  },
  {
    id: "3",
    description: "Groceries for Trip",
    amount: 67.8,
    paidBy: "1",
    date: "2024-05-30",
    category: "food",
    splits: { "1": 33.9, "2": 33.9 },
  },
]

const categoryIcons = {
  food: Coffee,
  transport: Car,
  accommodation: Home,
  entertainment: Receipt,
  other: ShoppingCart,
}

export default function ExpenseGroupPage() {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("")
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false)
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    paidBy: "",
    category: "other",
    splitType: "equal",
  })

  const [selectedMembers, setSelectedMembers] = useState<string[]>(members.map((m) => m.id))
  const [splitMethod, setSplitMethod] = useState<"equal" | "amount" | "percentage">("equal")
  const [customSplits, setCustomSplits] = useState<{ [memberId: string]: { amount?: string; percentage?: string } }>({})

  const calculateBalances = () => {
    const balances: { [memberId: string]: number } = {}

    members.forEach((member) => {
      balances[member.id] = 0
    })

    expenses.forEach((expense) => {
      // Add amount paid to payer's balance
      balances[expense.paidBy] += expense.amount

      // Subtract each person's share from their balance
      Object.entries(expense.splits).forEach(([memberId, amount]) => {
        balances[memberId] -= amount
      })
    })

    return balances
  }

  const balances = calculateBalances()

  const handleParseExpense = () => {
    // Simulate AI parsing of natural language input
    const amount = naturalLanguageInput.match(/\$?(\d+(?:\.\d{2})?)/)?.[1]
    const description =
      naturalLanguageInput.split(" for ")[1]?.split(" at ")[0] ||
      naturalLanguageInput.split("paid ")[1]?.split(" for ")[0] ||
      "Parsed expense"

    if (amount && Number.parseFloat(amount) > 0) {
      const parsedAmount = Number.parseFloat(amount)
      const equalSplit = parsedAmount / members.length
      const splits: { [memberId: string]: number } = {}

      members.forEach((member) => {
        splits[member.id] = equalSplit
      })

      const newExpense: Expense = {
        id: Date.now().toString(),
        description: description,
        amount: parsedAmount,
        paidBy: members[0].id, // Default to first member
        date: new Date().toISOString().split("T")[0],
        category: "other",
        splits,
      }

      setExpenses([newExpense, ...expenses])
      setNaturalLanguageInput("")
    }
  }

  const calculateTotalAllocated = () => {
    if (splitMethod === "equal") {
      return Number.parseFloat(newExpense.amount) || 0
    }

    if (splitMethod === "percentage") {
      return selectedMembers.reduce((total, memberId) => {
        const percentage = Number.parseFloat(customSplits[memberId]?.percentage || "0")
        return total + percentage
      }, 0)
    }

    // For amount and custom methods
    return selectedMembers.reduce((total, memberId) => {
      const amount = Number.parseFloat(customSplits[memberId]?.amount || "0")
      return total + amount
    }, 0)
  }

  const isValidSplit = () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.paidBy || selectedMembers.length === 0) {
      return false
    }

    const expenseAmount = Number.parseFloat(newExpense.amount) || 0
    const totalAllocated = calculateTotalAllocated()

    if (splitMethod === "percentage") {
      return Math.abs(totalAllocated - 100) < 0.01
    }

    return Math.abs(totalAllocated - expenseAmount) < 0.01
  }

  const handleAddManualExpense = () => {
    if (isValidSplit()) {
      const amount = Number.parseFloat(newExpense.amount)
      const splits: { [memberId: string]: number } = {}

      if (splitMethod === "equal") {
        const equalSplit = amount / selectedMembers.length
        selectedMembers.forEach((memberId) => {
          splits[memberId] = equalSplit
        })
      } else if (splitMethod === "percentage") {
        selectedMembers.forEach((memberId) => {
          const percentage = Number.parseFloat(customSplits[memberId]?.percentage || "0")
          splits[memberId] = (amount * percentage) / 100
        })
      } else {
        // amount or custom methods
        selectedMembers.forEach((memberId) => {
          splits[memberId] = Number.parseFloat(customSplits[memberId]?.amount || "0")
        })
      }

      const expense: Expense = {
        id: Date.now().toString(),
        description: newExpense.description,
        amount: amount,
        paidBy: newExpense.paidBy,
        date: new Date().toISOString().split("T")[0],
        category: newExpense.category,
        splits,
      }

      setExpenses([expense, ...expenses])
      setNewExpense({
        description: "",
        amount: "",
        paidBy: "",
        category: "other",
        splitType: "equal",
      })
      setSelectedMembers(members.map((m) => m.id))
      setSplitMethod("equal")
      setCustomSplits({})
      setShowAddExpenseModal(false)
    }
  }

  const getMemberName = (memberId: string) => {
    return members.find((m) => m.id === memberId)?.name || "Unknown"
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-800 text-white p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">SplitApp</h1>
          <div className="flex items-center gap-4">
            <span>Home</span>
            <span>Profile</span>
            <Avatar className="w-8 h-8">
              <AvatarFallback>CH</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Group Header */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Created_at Test</CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Updated about 1 hour ago
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </CardHeader>
            </Card>

            {/* Members Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <CardTitle>Members</CardTitle>
                  <Badge variant="secondary">{members.length}</Badge>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <Badge variant={member.role === "admin" ? "default" : "secondary"}>{member.role}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Add Expense Section */}
            <Card>
              <CardHeader>
                <CardTitle>Add Expense</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Use natural language to quickly add and split expenses with your group members.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <Label className="text-sm font-medium">Add Expense with AI</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Describe your expense in natural language. Our AI will help structure it for you.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-description">Describe the expense</Label>
                  <Textarea
                    id="expense-description"
                    placeholder="e.g., 'I paid $45 for dinner at Pizza Palace for John, Sarah, and me. We split it evenly.'"
                    value={naturalLanguageInput}
                    onChange={(e) => setNaturalLanguageInput(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleParseExpense} disabled={!naturalLanguageInput.trim()} className="flex-1">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Parse Expense
                  </Button>

                  <Dialog open={showAddExpenseModal} onOpenChange={setShowAddExpenseModal}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Manually
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Expense</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="manual-description">Description</Label>
                          <Input
                            id="manual-description"
                            placeholder="What was this expense for?"
                            value={newExpense.description}
                            onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="manual-amount">Amount</Label>
                            <Input
                              id="manual-amount"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={newExpense.amount}
                              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="manual-category">Category</Label>
                            <Select
                              value={newExpense.category}
                              onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="food">Food & Dining</SelectItem>
                                <SelectItem value="transport">Transportation</SelectItem>
                                <SelectItem value="accommodation">Accommodation</SelectItem>
                                <SelectItem value="entertainment">Entertainment</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="manual-paidby">Paid by</Label>
                          <Select
                            value={newExpense.paidBy}
                            onValueChange={(value) => setNewExpense({ ...newExpense, paidBy: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Who paid for this?" />
                            </SelectTrigger>
                            <SelectContent>
                              {members.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Split between</Label>
                            <div className="space-y-2">
                              {members.map((member) => (
                                <div key={member.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`member-${member.id}`}
                                    checked={selectedMembers.includes(member.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedMembers([...selectedMembers, member.id])
                                      } else {
                                        setSelectedMembers(selectedMembers.filter((id) => id !== member.id))
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <Label htmlFor={`member-${member.id}`} className="flex items-center gap-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarFallback className="text-xs">
                                        {member.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    {member.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Split method</Label>
                            <Select
                              value={splitMethod}
                              onValueChange={(value) => setSplitMethod(value as "equal" | "amount" | "percentage")}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equal">Split equally</SelectItem>
                                <SelectItem value="amount">Specific amounts</SelectItem>
                                <SelectItem value="percentage">Specific percentages</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {splitMethod !== "equal" && selectedMembers.length > 0 && (
                            <div className="space-y-3">
                              <Label>Allocation details</Label>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {selectedMembers.map((memberId) => {
                                  const member = members.find((m) => m.id === memberId)
                                  if (!member) return null

                                  return (
                                    <div key={memberId} className="flex items-center gap-3 p-2 border rounded">
                                      <Avatar className="w-8 h-8">
                                        <AvatarFallback className="text-xs">
                                          {member.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="flex-1 text-sm">{member.name}</span>

                                      {splitMethod === "amount" && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-sm">$</span>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={customSplits[memberId]?.amount || ""}
                                            onChange={(e) =>
                                              setCustomSplits({
                                                ...customSplits,
                                                [memberId]: { ...customSplits[memberId], amount: e.target.value },
                                              })
                                            }
                                            className="w-20 h-8"
                                          />
                                        </div>
                                      )}

                                      {splitMethod === "percentage" && (
                                        <div className="flex items-center gap-1">
                                          <Input
                                            type="number"
                                            step="0.1"
                                            placeholder="0"
                                            value={customSplits[memberId]?.percentage || ""}
                                            onChange={(e) =>
                                              setCustomSplits({
                                                ...customSplits,
                                                [memberId]: { ...customSplits[memberId], percentage: e.target.value },
                                              })
                                            }
                                            className="w-16 h-8"
                                          />
                                          <span className="text-sm">%</span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Split validation */}
                              <div className="text-sm p-2 bg-gray-50 rounded">
                                <div className="flex justify-between">
                                  <span>Total allocated:</span>
                                  <span
                                    className={`font-medium ${
                                      Math.abs(
                                        calculateTotalAllocated() - (Number.parseFloat(newExpense.amount) || 0),
                                      ) < 0.01
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {splitMethod === "percentage"
                                      ? `${calculateTotalAllocated()}%`
                                      : formatCurrency(calculateTotalAllocated())}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Expense amount:</span>
                                  <span className="font-medium">
                                    {splitMethod === "percentage"
                                      ? "100%"
                                      : formatCurrency(Number.parseFloat(newExpense.amount) || 0)}
                                  </span>
                                </div>
                                {Math.abs(
                                  calculateTotalAllocated() -
                                    (splitMethod === "percentage" ? 100 : Number.parseFloat(newExpense.amount) || 0),
                                ) >= 0.01 && (
                                  <p className="text-red-600 text-xs mt-1">
                                    Allocation must equal the total expense amount
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button onClick={handleAddManualExpense} className="flex-1" disabled={!isValidSplit()}>
                            Add Expense
                          </Button>
                          <Button variant="outline" onClick={() => setShowAddExpenseModal(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Expenses List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Recent Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No expenses yet. Add your first expense above!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {expenses.map((expense) => {
                      const CategoryIcon = categoryIcons[expense.category as keyof typeof categoryIcons]
                      return (
                        <div key={expense.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <CategoryIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-medium">{expense.description}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Paid by {getMemberName(expense.paidBy)} on{" "}
                                  {new Date(expense.date).toLocaleDateString()}
                                </p>
                                <div className="mt-2 space-y-1">
                                  {Object.entries(expense.splits).map(([memberId, amount]) => (
                                    <div key={memberId} className="text-sm flex justify-between">
                                      <span>{getMemberName(memberId)}'s share:</span>
                                      <span className="font-medium">{formatCurrency(amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">{formatCurrency(expense.amount)}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Group Balances */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Group Balances
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {members.map((member) => {
                  const balance = balances[member.id]
                  const isPositive = balance > 0
                  const isZero = Math.abs(balance) < 0.01

                  return (
                    <div key={member.id} className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p
                          className={`text-sm ${
                            isZero ? "text-muted-foreground" : isPositive ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isZero
                            ? "settled up"
                            : isPositive
                              ? `gets back ${formatCurrency(balance)}`
                              : `owes ${formatCurrency(Math.abs(balance))}`}
                        </p>
                      </div>
                    </div>
                  )
                })}

                <Separator />

                <div className="text-center">
                  <Button variant="outline" size="sm" className="w-full">
                    View Details →
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Expenses</span>
                  <span className="font-medium">{expenses.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <span className="font-medium">
                    {formatCurrency(expenses.reduce((sum, exp) => sum + exp.amount, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Per Person</span>
                  <span className="font-medium">
                    {formatCurrency(expenses.reduce((sum, exp) => sum + exp.amount, 0) / members.length)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
