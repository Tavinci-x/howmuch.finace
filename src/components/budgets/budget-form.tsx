"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/lib/db"

import { useDefaultCurrency } from "@/hooks/use-settings"
import { getCurrentMonth } from "@/lib/utils"
import { useLiveQuery } from "dexie-react-hooks"
import type { Budget } from "@/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  categoryId: z.string().min(1, "Select a category"),
  amount: z.number().positive("Amount must be positive"),
  month: z.string().min(1),
})

type FormData = z.infer<typeof formSchema>

interface BudgetFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budget?: Budget | null
}

export function BudgetForm({ open, onOpenChange, budget }: BudgetFormProps) {
  const { toast } = useToast()
  const defaultCurrency = useDefaultCurrency()
  const categories = useLiveQuery(() =>
    db.categories.where('type').anyOf(['expense', 'both']).toArray()
  )

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: budget?.categoryId || "",
      amount: budget?.amount || 0,
      month: budget?.month || getCurrentMonth(),
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        categoryId: budget?.categoryId || "",
        amount: budget?.amount || 0,
        month: budget?.month || getCurrentMonth(),
      })
    }
  }, [open, budget, defaultCurrency, form])

  async function onSubmit(data: FormData) {
    const record: Budget = {
      id: budget?.id || uuidv4(),
      categoryId: data.categoryId,
      amount: data.amount,
      currency: defaultCurrency,
      month: data.month,
    }

    if (budget) {
      await db.budgets.update(budget.id, record)
      toast({ title: "Budget updated" })
    } else {
      // Check for duplicate
      const existing = await db.budgets
        .where({ categoryId: data.categoryId, month: data.month })
        .first()
      if (existing) {
        toast({ title: "Budget already exists for this category and month", variant: "destructive" })
        return
      }
      await db.budgets.add(record)
      toast({ title: "Budget created" })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{budget ? "Edit Budget" : "Create Budget"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4">

              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <FormControl>
                      <Input type="month" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{budget ? "Update" : "Create"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
