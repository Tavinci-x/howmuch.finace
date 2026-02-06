"use client"

import { useState, useCallback } from "react"
import Papa from "papaparse"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/lib/db"
import { useDefaultCurrency } from "@/hooks/use-settings"
import { useLiveQuery } from "dexie-react-hooks"
import type { Transaction } from "@/types"

import { Button } from "@/components/ui/button"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Upload } from "lucide-react"

interface CsvImportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FIELDS = ['date', 'amount', 'type', 'category', 'note', 'skip'] as const
type FieldMapping = typeof FIELDS[number]

export function CsvImport({ open, onOpenChange }: CsvImportProps) {
  const { toast } = useToast()
  const defaultCurrency = useDefaultCurrency()
  const categories = useLiveQuery(() => db.categories.toArray())
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<number, FieldMapping>>({})
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload')

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][]
        if (data.length < 2) {
          toast({ title: "CSV is empty or has no data rows", variant: "destructive" })
          return
        }
        setHeaders(data[0])
        setCsvData(data.slice(1).filter(row => row.some(cell => cell.trim())))
        // Auto-detect mappings
        const autoMap: Record<number, FieldMapping> = {}
        data[0].forEach((h, i) => {
          const lower = h.toLowerCase().trim()
          if (lower.includes('date')) autoMap[i] = 'date'
          else if (lower.includes('amount') || lower.includes('sum')) autoMap[i] = 'amount'
          else if (lower.includes('type') || lower.includes('direction')) autoMap[i] = 'type'
          else if (lower.includes('categ')) autoMap[i] = 'category'
          else if (lower.includes('note') || lower.includes('desc') || lower.includes('memo')) autoMap[i] = 'note'
          else autoMap[i] = 'skip'
        })
        setMapping(autoMap)
        setStep('map')
      },
      error: () => {
        toast({ title: "Failed to parse CSV", variant: "destructive" })
      },
    })
  }, [toast])

  async function handleImport() {
    if (!categories) return

    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]))
    const defaultExpenseCatId = categories.find(c => c.name === 'Other' && c.type === 'expense')?.id || ''
    const defaultIncomeCatId = categories.find(c => c.name === 'Other Income')?.id || ''

    const colIndex: Record<string, number> = {}
    Object.entries(mapping).forEach(([idx, field]) => {
      if (field !== 'skip') colIndex[field] = parseInt(idx)
    })

    const transactions: Transaction[] = []

    for (const row of csvData) {
      const dateStr = colIndex.date !== undefined ? row[colIndex.date]?.trim() : ''
      const amountStr = colIndex.amount !== undefined ? row[colIndex.amount]?.trim() : ''
      const typeStr = colIndex.type !== undefined ? row[colIndex.type]?.trim().toLowerCase() : ''
      const catStr = colIndex.category !== undefined ? row[colIndex.category]?.trim().toLowerCase() : ''
      const noteStr = colIndex.note !== undefined ? row[colIndex.note]?.trim() : ''

      if (!dateStr || !amountStr) continue

      const amount = Math.abs(parseFloat(amountStr.replace(/[^0-9.\-]/g, '')))
      if (isNaN(amount) || amount === 0) continue

      // Determine type
      let type: 'income' | 'expense' = 'expense'
      if (typeStr.includes('income') || typeStr.includes('credit')) {
        type = 'income'
      } else if (parseFloat(amountStr.replace(/[^0-9.\-]/g, '')) > 0 && typeStr === '') {
        // Positive amounts with no explicit type could be income
        type = 'expense' // Default to expense; user can adjust
      }

      // Match category
      let categoryId = type === 'income' ? defaultIncomeCatId : defaultExpenseCatId
      if (catStr) {
        const matched = categoryMap.get(catStr)
        if (matched) categoryId = matched
      }

      // Parse date
      let parsedDate: string
      try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) continue
        parsedDate = d.toISOString().split('T')[0]
      } catch {
        continue
      }

      transactions.push({
        id: uuidv4(),
        amount,
        type,
        categoryId,
        currency: defaultCurrency,
        date: parsedDate,
        note: noteStr,
        createdAt: new Date().toISOString(),
      })
    }

    if (transactions.length === 0) {
      toast({ title: "No valid transactions found in CSV", variant: "destructive" })
      return
    }

    await db.transactions.bulkAdd(transactions)
    toast({ title: `Imported ${transactions.length} transactions` })
    onOpenChange(false)
    setStep('upload')
    setCsvData([])
    setHeaders([])
    setMapping({})
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o)
      if (!o) { setStep('upload'); setCsvData([]); setHeaders([]); setMapping({}) }
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center gap-4 py-10 border-2 border-dashed rounded-lg">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Upload a CSV file with your transactions</p>
            <Label htmlFor="csv-file" className="cursor-pointer">
              <Button variant="outline" asChild>
                <span>Choose File</span>
              </Button>
            </Label>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Map your CSV columns to transaction fields:</p>
            <div className="space-y-3">
              {headers.map((header, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-32 truncate">{header}</span>
                  <Select
                    value={mapping[i] || 'skip'}
                    onValueChange={(val) => setMapping(prev => ({ ...prev, [i]: val as FieldMapping }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELDS.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Preview (first 5 rows)</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => (
                        <TableHead key={i} className="text-xs">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="text-xs">{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={handleImport}>
                Import {csvData.length} rows
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
