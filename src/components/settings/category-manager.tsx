"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { v4 as uuidv4 } from "uuid"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { getIcon, availableIcons } from "@/lib/icons"
import type { Category } from "@/types"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#f43f5e', '#6b7280',
]

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().min(1),
  color: z.string().min(1),
  type: z.enum(["income", "expense", "both"]),
})

type FormData = z.infer<typeof formSchema>

export function CategoryManager() {
  const { toast } = useToast()
  const categories = useLiveQuery(() => db.categories.toArray())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", icon: "MoreHorizontal", color: COLORS[0], type: "expense" },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: "", icon: "MoreHorizontal", color: COLORS[0], type: "expense" })
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    form.reset({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type as "income" | "expense" | "both" })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    if (editing) {
      await db.categories.update(editing.id, { ...data, isDefault: editing.isDefault })
      toast({ title: "Category updated" })
    } else {
      await db.categories.add({ id: uuidv4(), ...data, isDefault: false })
      toast({ title: "Category created" })
    }
    setDialogOpen(false)
  }

  async function handleDelete(cat: Category) {
    if (cat.isDefault) {
      toast({ title: "Cannot delete default categories", variant: "destructive" })
      return
    }
    await db.categories.delete(cat.id)
    toast({ title: "Category deleted" })
  }

  const expenseCategories = categories?.filter(c => c.type === 'expense' || c.type === 'both') || []
  const incomeCategories = categories?.filter(c => c.type === 'income' || c.type === 'both') || []

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categories</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Expense Categories</h4>
            <div className="space-y-1">
              {expenseCategories.map((cat) => {
                const Icon = getIcon(cat.icon)
                return (
                  <div key={cat.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent/50">
                    <Icon className="h-4 w-4" style={{ color: cat.color }} />
                    <span className="text-sm flex-1">{cat.name}</span>
                    {cat.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {!cat.isDefault && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(cat)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Income Categories</h4>
            <div className="space-y-1">
              {incomeCategories.map((cat) => {
                const Icon = getIcon(cat.icon)
                return (
                  <div key={cat.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent/50">
                    <Icon className="h-4 w-4" style={{ color: cat.color }} />
                    <span className="text-sm flex-1">{cat.name}</span>
                    {cat.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {!cat.isDefault && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(cat)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableIcons.map((icon) => {
                          const IconComp = getIcon(icon)
                          return (
                            <SelectItem key={icon} value={icon}>
                              <div className="flex items-center gap-2">
                                <IconComp className="h-4 w-4" />
                                {icon}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            "h-7 w-7 rounded-full border-2 transition-all",
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
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editing ? "Update" : "Create"}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
