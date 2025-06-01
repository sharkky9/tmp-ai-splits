'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Send, ArrowLeft, Loader2, HelpCircle, MessageSquare } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent } from '@/components/ui/card'

interface ClarificationQuestion {
  id: string
  question: string
  type: 'multiple_choice' | 'text_input' | 'confirmation'
  options?: string[]
  context?: string
}

interface ClarifyingQuestionDialogProps {
  isOpen: boolean
  onClose: () => void
  questions: ClarificationQuestion[]
  originalInput: string
  onSubmitAnswers: (answers: Record<string, string>) => void
  onFallbackToManual: () => void
  isLoading?: boolean
}

const answerSchema = z.record(z.string().min(1, 'Answer is required'))

export function ClarifyingQuestionDialog({
  isOpen,
  onClose,
  questions,
  originalInput,
  onSubmitAnswers,
  onFallbackToManual,
  isLoading = false,
}: ClarifyingQuestionDialogProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useForm<Record<string, string>>({
    resolver: zodResolver(answerSchema),
    defaultValues: answers,
  })

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const currentAnswer = watch(currentQuestion?.id || '')

  const handleNext = () => {
    if (currentAnswer) {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: currentAnswer }))

      if (isLastQuestion) {
        // Submit all answers
        const finalAnswers = { ...answers, [currentQuestion.id]: currentAnswer }
        onSubmitAnswers(finalAnswers)
      } else {
        setCurrentQuestionIndex((prev) => prev + 1)
      }
    }
  }

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  const handleMultipleChoiceSelect = (value: string) => {
    setValue(currentQuestion.id, value)
  }

  const handleClose = () => {
    setCurrentQuestionIndex(0)
    setAnswers({})
    onClose()
  }

  if (!currentQuestion) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <HelpCircle className='w-5 h-5 text-blue-600' />
            Need More Information
          </DialogTitle>
          <DialogDescription>
            The AI needs clarification about your expense. Please answer the following questions to
            help parse it accurately.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Progress indicator */}
          <div className='flex items-center justify-between text-sm text-gray-600'>
            <span>
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <div className='flex space-x-1'>
              {questions.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index <= currentQuestionIndex ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Original input context */}
          <Card>
            <CardContent className='p-4'>
              <h4 className='font-medium text-sm text-gray-700 mb-2 flex items-center'>
                <MessageSquare className='w-4 h-4 mr-2' />
                Your Original Input
              </h4>
              <p className='text-sm bg-gray-50 p-3 rounded border'>{originalInput}</p>
            </CardContent>
          </Card>

          {/* Current question */}
          <div className='space-y-4'>
            <div>
              <h3 className='font-medium text-lg mb-2'>{currentQuestion.question}</h3>
              {currentQuestion.context && (
                <p className='text-sm text-gray-600 mb-4'>{currentQuestion.context}</p>
              )}
            </div>

            {/* Question input based on type */}
            <div className='space-y-3'>
              {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                <RadioGroup
                  value={currentAnswer || ''}
                  onValueChange={handleMultipleChoiceSelect}
                  className='space-y-2'
                >
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className='flex items-center space-x-2'>
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className='flex-1 cursor-pointer'>
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.type === 'text_input' && (
                <div>
                  <Textarea
                    {...register(currentQuestion.id)}
                    placeholder='Type your answer here...'
                    rows={3}
                    className='w-full'
                  />
                  {errors[currentQuestion.id] && (
                    <p className='text-sm text-red-600 mt-1'>
                      {errors[currentQuestion.id]?.message}
                    </p>
                  )}
                </div>
              )}

              {currentQuestion.type === 'confirmation' && (
                <RadioGroup
                  value={currentAnswer || ''}
                  onValueChange={handleMultipleChoiceSelect}
                  className='space-y-2'
                >
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='yes' id='confirm-yes' />
                    <Label htmlFor='confirm-yes' className='cursor-pointer'>
                      Yes, that&apos;s correct
                    </Label>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='no' id='confirm-no' />
                    <Label htmlFor='confirm-no' className='cursor-pointer'>
                      No, that&apos;s not right
                    </Label>
                  </div>
                </RadioGroup>
              )}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className='flex flex-col sm:flex-row gap-3 pt-4 border-t'>
            <div className='flex gap-2 flex-1'>
              {currentQuestionIndex > 0 && (
                <Button type='button' variant='outline' onClick={handleBack} disabled={isLoading}>
                  <ArrowLeft className='w-4 h-4 mr-2' />
                  Back
                </Button>
              )}

              <Button
                onClick={handleNext}
                disabled={!currentAnswer || isLoading}
                className='flex-1'
              >
                {isLoading && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
                {isLastQuestion ? (
                  <>
                    <Send className='w-4 h-4 mr-2' />
                    Submit Answers
                  </>
                ) : (
                  'Next Question'
                )}
              </Button>
            </div>

            <Button
              variant='outline'
              onClick={onFallbackToManual}
              disabled={isLoading}
              className='text-gray-600'
            >
              Switch to Manual Entry
            </Button>
          </div>

          {/* Help text */}
          <div className='text-xs text-gray-500 bg-gray-50 p-3 rounded'>
            <p>
              💡 <strong>Tip:</strong> The more specific your answers, the better the AI can
              understand and categorize your expense.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
