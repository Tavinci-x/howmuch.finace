"use client"

import { useState, useCallback, useMemo } from "react"
import Papa from "papaparse"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/lib/db"
import { useDefaultCurrency } from "@/hooks/use-settings"
import { useLiveQuery } from "dexie-react-hooks"
import type { Transaction, Category } from "@/types"
import { categorizeTransaction } from "@/lib/csv-categorize"
import { formatCurrency } from "@/lib/currencies"
import { getIcon } from "@/lib/icons"

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
import { Upload, CheckCircle2, AlertCircle } from "lucide-react"

interface CsvImportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FIELDS = ['date', 'amount', 'type', 'note', 'skip'] as const
type FieldMapping = typeof FIELDS[number]

const FIELD_LABELS: Record<FieldMapping, string> = {
  date: 'Date',
  amount: 'Amount',
  type: 'Type',
  note: 'Description / Note',
  skip: 'Skip',
}

/** Detect the delimiter used in a CSV string by checking the first line */
function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0] || ''
  const semicolons = (firstLine.match(/;/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  const tabs = (firstLine.match(/\t/g) || []).length
  if (semicolons > commas && semicolons > tabs) return ';'
  if (tabs > commas && tabs > semicolons) return '\t'
  return ','
}

/** Strip UTF-8 BOM from start of string */
function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, '')
}

/** Parse a date string in various bank CSV formats into YYYY-MM-DD */
function parseDate(dateStr: string): string | null {
  const s = dateStr.trim()
  if (!s) return null

  // YYYY-MM-DD (ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00')
    if (!isNaN(d.getTime())) return s
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (European — most common for bank CSVs)
  const dmy = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/)
  if (dmy) {
    const [, day, month, year] = dmy
    const d = parseInt(day), m = parseInt(month)
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      const date = new Date(iso + 'T00:00:00')
      if (!isNaN(date.getTime())) return iso
    }
  }

  // YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
    const d = new Date(iso + 'T00:00:00')
    if (!isNaN(d.getTime())) return iso
  }

  // Fallback: let Date constructor try (handles "Jan 15, 2024" etc.)
  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  } catch { /* ignore */ }

  return null
}

/** Parse amount string, handling European (1.234,56) and US (1,234.56) formats */
function parseAmount(amountStr: string): number | null {
  let s = amountStr.trim()
  if (!s) return null

  // Remove currency symbols, spaces, and non-numeric chars (keep digits, dots, commas, +, -)
  s = s.replace(/[^0-9.,\-+]/g, '')
  if (!s) return null

  // Detect European vs US format based on last separator position
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')

  if (lastComma > lastDot) {
    // European: 1.234,56 → remove dots (thousands sep), comma → dot (decimal)
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    // US: 1,234.56 → just remove commas
    s = s.replace(/,/g, '')
  }

  const num = parseFloat(s)
  return isNaN(num) ? null : num
}

/** Auto-detect column mapping from header names */
function autoDetectMapping(headers: string[]): Record<number, FieldMapping> {
  const autoMap: Record<number, FieldMapping> = {}
  let hasDate = false
  let hasAmount = false

  headers.forEach((h, i) => {
    const lower = h.toLowerCase().trim()

    // Date columns
    if (
      lower.includes('date') || lower === 'datum' ||
      lower.includes('kirjauspäivä') || lower.includes('maksupäivä') ||
      lower.includes('bokföringsdag') || lower.includes('transaktionsdag') ||
      lower === 'when' || lower === 'päivä' || lower === 'pvm'
    ) {
      // Only auto-map the first date column (booking date)
      if (!hasDate) {
        autoMap[i] = 'date'
        hasDate = true
      } else {
        autoMap[i] = 'skip'
      }
      return
    }

    // Amount columns
    if (
      lower.includes('amount') || lower === 'summa' || lower === 'belopp' ||
      lower.includes('value') || lower === 'sum' ||
      lower === 'debit' || lower === 'credit' ||
      lower === 'inflow' || lower === 'outflow' || lower === 'määrä'
    ) {
      if (!hasAmount) {
        autoMap[i] = 'amount'
        hasAmount = true
      } else {
        autoMap[i] = 'skip'
      }
      return
    }

    // Transaction type columns (KORTTIOSTO, PALKKA, TILISIIRTO, etc.)
    if (
      lower.includes('type') || lower.includes('direction') ||
      lower === 'tapahtumalaji' || lower === 'typ' || lower === 'laji'
    ) {
      autoMap[i] = 'type'
      return
    }

    // Description / merchant / note columns — map as note for keyword matching
    if (
      lower.includes('note') || lower.includes('desc') ||
      lower.includes('memo') || lower.includes('text') ||
      lower.includes('narration') || lower.includes('particular') ||
      lower.includes('reference') || lower.includes('merchant') ||
      lower.includes('payee') || lower.includes('mottagare') ||
      lower.includes('meddelande') || lower.includes('namn') ||
      lower === 'saajan nimi' || lower === 'viesti' ||
      lower === 'maksaja' || lower === 'selite'
    ) {
      autoMap[i] = 'note'
      return
    }

    autoMap[i] = 'skip'
  })

  return autoMap
}

interface PreviewTransaction {
  date: string
  amount: number
  rawAmount: number
  type: 'income' | 'expense'
  categoryId: string
  categoryName: string
  note: string
}

export function CsvImport({ open, onOpenChange }: CsvImportProps) {
  const { toast } = useToast()
  const defaultCurrency = useDefaultCurrency()
  const categories = useLiveQuery(() => db.categories.toArray())
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<number, FieldMapping>>({})
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload')
  const [importing, setImporting] = useState(false)

  const resetState = useCallback(() => {
    setStep('upload')
    setCsvData([])
    setHeaders([])
    setMapping({})
    setImporting(false)
  }, [])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Read file as text first to detect delimiter and strip BOM
    const reader = new FileReader()
    reader.onload = (ev) => {
      const raw = ev.target?.result as string
      const text = stripBom(raw)
      const delimiter = detectDelimiter(text)

      Papa.parse(text, {
        delimiter,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as string[][]
          if (data.length < 2) {
            toast({ title: "CSV is empty or has no data rows", variant: "destructive" })
            return
          }

          // Clean headers (trim whitespace)
          const hdrs = data[0].map(h => h.trim())
          setHeaders(hdrs)
          setCsvData(data.slice(1).filter(row => row.some(cell => cell.trim())))
          setMapping(autoDetectMapping(hdrs))
          setStep('map')
        },
        error: () => {
          toast({ title: "Failed to parse CSV", variant: "destructive" })
        },
      })
    }
    reader.onerror = () => {
      toast({ title: "Failed to read file", variant: "destructive" })
    }
    reader.readAsText(file, 'utf-8')

    // Reset file input so same file can be re-selected
    e.target.value = ''
  }, [toast])

  // Build preview transactions from CSV data + current mapping
  const previewTransactions = useMemo((): PreviewTransaction[] => {
    if (!categories || categories.length === 0) return []

    // Build column index: field name → column indices (note can have multiple columns)
    let dateColIdx: number | undefined
    let amountColIdx: number | undefined
    const typeCols: number[] = []
    const noteCols: number[] = []

    Object.entries(mapping).forEach(([idx, field]) => {
      const colIdx = parseInt(idx)
      if (field === 'date' && dateColIdx === undefined) dateColIdx = colIdx
      else if (field === 'amount' && amountColIdx === undefined) amountColIdx = colIdx
      else if (field === 'type') typeCols.push(colIdx)
      else if (field === 'note') noteCols.push(colIdx)
    })

    if (dateColIdx === undefined || amountColIdx === undefined) return []

    const catMap = new Map<string, Category>(categories.map(c => [c.id, c]))
    const results: PreviewTransaction[] = []

    for (const row of csvData) {
      const dateStr = row[dateColIdx]?.trim() || ''
      const amountStr = row[amountColIdx]?.trim() || ''

      if (!dateStr || !amountStr) continue

      const rawAmount = parseAmount(amountStr)
      if (rawAmount === null || rawAmount === 0) continue

      const parsedDate = parseDate(dateStr)
      if (!parsedDate) continue

      // Build description from ALL note columns + type columns for keyword matching
      const descParts: string[] = []
      for (const col of noteCols) {
        const val = row[col]?.trim()
        if (val && val !== '-' && val !== "'-'") descParts.push(val)
      }
      for (const col of typeCols) {
        const val = row[col]?.trim()
        if (val && val !== '-') descParts.push(val)
      }
      const description = descParts.join(' ')

      // Use the primary note column (first one) for saving as transaction note
      const primaryNote = noteCols.length > 0
        ? (row[noteCols[0]]?.trim() || '')
        : ''

      // Auto-categorize using combined description + amount sign
      const { categoryId, type } = categorizeTransaction(description, rawAmount, categories)
      const cat = catMap.get(categoryId)

      results.push({
        date: parsedDate,
        amount: Math.abs(rawAmount),
        rawAmount,
        type,
        categoryId,
        categoryName: cat?.name || 'Unknown',
        note: primaryNote,
      })
    }

    return results
  }, [csvData, mapping, categories])

  async function handleImport() {
    if (!categories || previewTransactions.length === 0) return

    setImporting(true)
    try {
      // Build a set of existing transaction fingerprints for duplicate detection
      const existing = await db.transactions.toArray()
      const existingKeys = new Set(
        existing.map(t => `${t.date}|${t.amount}|${t.type}|${t.note}`)
      )

      const newTransactions: Transaction[] = []
      let skipped = 0

      for (const pt of previewTransactions) {
        const key = `${pt.date}|${pt.amount}|${pt.type}|${pt.note}`
        if (existingKeys.has(key)) {
          skipped++
          continue
        }
        // Also add to set so within-file duplicates are caught
        existingKeys.add(key)
        newTransactions.push({
          id: uuidv4(),
          amount: pt.amount,
          type: pt.type,
          categoryId: pt.categoryId,
          currency: defaultCurrency,
          date: pt.date,
          note: pt.note,
          createdAt: new Date().toISOString(),
        })
      }

      if (newTransactions.length > 0) {
        await db.transactions.bulkAdd(newTransactions)
      }

      const msg = skipped > 0
        ? `Imported ${newTransactions.length} transactions (${skipped} duplicates skipped)`
        : `Imported ${newTransactions.length} transactions`
      toast({ title: msg })
      onOpenChange(false)
      resetState()
    } catch {
      toast({ title: "Failed to import transactions", variant: "destructive" })
    } finally {
      setImporting(false)
    }
  }

  // Category summary for preview
  const categorySummary = useMemo(() => {
    const counts = new Map<string, { name: string; count: number; total: number; type: 'income' | 'expense' }>()
    for (const t of previewTransactions) {
      const existing = counts.get(t.categoryId)
      if (existing) {
        existing.count++
        existing.total += t.amount
      } else {
        counts.set(t.categoryId, { name: t.categoryName, count: 1, total: t.amount, type: t.type })
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.total - a.total)
  }, [previewTransactions])

  const hasRequiredFields = useMemo(() => {
    const mappedFields = new Set(Object.values(mapping))
    return mappedFields.has('date') && mappedFields.has('amount')
  }, [mapping])

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o)
      if (!o) resetState()
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="mono">
            {step === 'upload' && 'Import Bank Statement'}
            {step === 'map' && 'Map Columns'}
            {step === 'preview' && 'Review & Import'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center gap-4 py-10 border-2 border-dashed">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Upload your bank CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports semicolon and comma delimited files
              </p>
            </div>
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

        {/* Step 2: Map columns */}
        {step === 'map' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map your CSV columns. <strong>Date</strong> and <strong>Amount</strong> are required.
              Map merchant/description columns to <strong>Description</strong> for better categorization.
            </p>

            <div className="space-y-2">
              {headers.map((header, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm mono w-36 truncate" title={header}>{header}</span>
                  <Select
                    value={mapping[i] || 'skip'}
                    onValueChange={(val) => setMapping(prev => ({ ...prev, [i]: val as FieldMapping }))}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELDS.map(f => (
                        <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Show sample value from first row */}
                  <span className="text-xs text-muted-foreground truncate flex-1" title={csvData[0]?.[i] || ''}>
                    {csvData[0]?.[i]?.trim() || '—'}
                  </span>
                </div>
              ))}
            </div>

            {!hasRequiredFields && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                Please map at least a Date and Amount column
              </p>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={() => setStep('preview')} disabled={!hasRequiredFields}>
                Preview categorization
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview categorized transactions */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="border p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground uppercase tracking-wide">Total</span>
                <span className="mono font-medium">{previewTransactions.length} transactions</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground uppercase tracking-wide">Income</span>
                <span className="mono text-green-600 dark:text-green-400">
                  +{formatCurrency(
                    previewTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
                    defaultCurrency
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground uppercase tracking-wide">Expenses</span>
                <span className="mono text-red-600 dark:text-red-400">
                  -{formatCurrency(
                    previewTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
                    defaultCurrency
                  )}
                </span>
              </div>
            </div>

            {/* Category breakdown */}
            <div>
              <h4 className="text-sm font-medium mb-2 uppercase tracking-wide text-muted-foreground">
                Categories detected
              </h4>
              <div className="border divide-y">
                {categorySummary.map((cat) => {
                  const category = categories?.find(c => c.name === cat.name)
                  const Icon = getIcon(category?.icon || 'MoreHorizontal')
                  return (
                    <div key={cat.name} className="flex items-center justify-between p-2.5">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: category?.color || '#6b7280' }} />
                        <span className="text-sm">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">({cat.count})</span>
                      </div>
                      <span className={`mono text-sm ${cat.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {cat.type === 'income' ? '+' : '-'}{formatCurrency(cat.total, defaultCurrency)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Transaction list preview */}
            <div>
              <h4 className="text-sm font-medium mb-2 uppercase tracking-wide text-muted-foreground">
                Transactions (first 20)
              </h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewTransactions.slice(0, 20).map((t, i) => {
                      const category = categories?.find(c => c.id === t.categoryId)
                      const Icon = getIcon(category?.icon || 'MoreHorizontal')
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-xs mono whitespace-nowrap">{t.date}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{t.note || '—'}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5" style={{ color: category?.color || '#6b7280' }} />
                              <span>{t.categoryName}</span>
                            </div>
                          </TableCell>
                          <TableCell className={`text-xs mono text-right whitespace-nowrap ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, defaultCurrency)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {previewTransactions.length > 20 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  ...and {previewTransactions.length - 20} more
                </p>
              )}
            </div>

            {previewTransactions.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No valid transactions found. Go back and check your column mapping.</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
              <Button
                onClick={handleImport}
                disabled={previewTransactions.length === 0 || importing}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {importing ? 'Importing...' : `Import ${previewTransactions.length} transactions`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
