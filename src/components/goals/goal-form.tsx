"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { v4 as uuidv4 } from "uuid"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { db } from "@/lib/db"

import { useDefaultCurrency } from "@/hooks/use-settings"
import { cn } from "@/lib/utils"
import type { Goal } from "@/types"

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

const GOAL_COLORS = [
  '#22c55e', '#3b82f6', '#a855f7', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#f97316',
]

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.number().positive("Target must be positive"),
  deadline: z.date(),
  color: z.string().min(1),
})

type FormData = z.infer<typeof formSchema>

interface GoalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal | null
}

export function GoalForm({ open, onOpenChange, goal }: GoalFormProps) {
  const { toast } = useToast()
  const defaultCurrency = useDefaultCurrency()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: goal?.name || "",
      targetAmount: goal?.targetAmount || 0,
      deadline: goal ? new Date(goal.deadline) : new Date(new Date().setMonth(new Date().getMonth() + 6)),
      color: goal?.color || GOAL_COLORS[0],
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: goal?.name || "",
        targetAmount: goal?.targetAmount || 0,
        deadline: goal ? new Date(goal.deadline) : new Date(new Date().setMonth(new Date().getMonth() + 6)),
        color: goal?.color || GOAL_COLORS[0],
      })
    }
  }, [open, goal, defaultCurrency, form])

  async function onSubmit(data: FormData) {
    const record: Goal = {
      id: goal?.id || uuidv4(),
      name: data.name,
      targetAmount: data.targetAmount,
      currentAmount: goal?.currentAmount || 0,
      currency: defaultCurrency,
      deadline: format(data.deadline, "yyyy-MM-dd"),
      color: data.color,
    }

    if (goal) {
      await db.goals.update(goal.id, record)
      toast({ title: "Goal updated" })
    } else {
      await db.goals.add(record)
      toast({ title: "Goal created" })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit Goal" : "Create Goal"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Emergency Fund" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Amount</FormLabel>
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
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline</FormLabel>
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
                            {field.value ? format(field.value, "MMM d, yyyy") : "Pick date"}
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
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex gap-2">
                    {GOAL_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-all",
                          field.value === color ? "border-foreground scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => field.onChange(color)}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{goal ? "Update" : "Create"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
