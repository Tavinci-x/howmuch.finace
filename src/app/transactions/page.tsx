"use client"

import { useState } from "react"
import { CsvImport } from "@/components/transactions/csv-import"
import { TransactionList } from "@/components/transactions/transaction-list"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

export default function TransactionsPage(){const[importOpen,setImportOpen]=useState(false);return <div className="space-y-6"><div className="flex items-end justify-between"><div><h1 className="text-xl font-bold mono">Transactions</h1><p className="mt-1 text-sm text-muted-foreground mono">Search, review, and correct your ledger</p></div><Button onClick={()=>setImportOpen(true)}><Upload className="mr-2 h-4 w-4"/>Import</Button></div><TransactionList/><CsvImport open={importOpen} onOpenChange={setImportOpen}/></div>}
