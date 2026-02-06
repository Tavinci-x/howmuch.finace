"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { v4 as uuidv4 } from "uuid"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { db } from "@/lib/db"

import { useDefaultCurrency } from "@/hooks/use-settings"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/types"
import { useLiveQuery } from "dexie-react-hooks"

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
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
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().min(1, "Select a category"),
  date: z.date(),
  note: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: Transaction | null
}

export function TransactionForm({ open, onOpenChange, transaction }: TransactionFormProps) {
  const { toast } = useToast()
  const defaultCurrency = useDefaultCurrency()
  const categories = useLiveQuery(() => db.categories.toArray())
  const [type, setType] = useState<"income" | "expense">(transaction?.type || "expense")

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: transaction?.amount || 0,
      type: transaction?.type || "expense",
      categoryId: transaction?.categoryId || "",
      date: transaction ? new Date(transaction.date) : new Date(),
      note: transaction?.note || "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        amount: transaction?.amount || 0,
        type: transaction?.type || "expense",
        categoryId: transaction?.categoryId || "",
        date: transaction ? new Date(transaction.date) : new Date(),
        note: transaction?.note || "",
      })
      setType(transaction?.type || "expense")
    }
  }, [open, transaction, defaultCurrency, form])

  const filteredCategories = categories?.filter(
    (c) => c.type === type || c.type === "both"
  ) || []

  async function onSubmit(data: FormData) {
    const record: Transaction = {
      id: transaction?.id || uuidv4(),
      amount: data.amount,
      type: data.type,
      categoryId: data.categoryId,
      currency: defaultCurrency,
      date: format(data.date, "yyyy-MM-dd"),
      note: data.note || "",
      createdAt: transaction?.createdAt || new Date().toISOString(),
    }

    if (transaction) {
      await db.transactions.update(transaction.id, record)
      toast({ title: "Transaction updated" })
    } else {
      await db.transactions.add(record)
      toast({ title: "Transaction added" })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === "expense" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => {
                        field.onChange("expense")
                        setType("expense")
                        form.setValue("categoryId", "")
                      }}
                    >
                      Expense
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "income" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => {
                        field.onChange("income")
                        setType("income")
                        form.setValue("categoryId", "")
                      }}
                    >
                      Income
                    </Button>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      {filteredCategories.map((cat) => (
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

            <div className="grid grid-cols-1 gap-4">

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? format(field.value, "MMM d, yyyy")
                              : "Pick date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Add a note..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {transaction ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
