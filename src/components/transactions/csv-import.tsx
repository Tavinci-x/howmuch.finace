"use client"

import { useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { CheckCircle2, FileSpreadsheet, ShieldCheck, Upload } from "lucide-react"
import { db } from "@/lib/db"
import { createImportBatch, parseBankStatement, type ImportPreview } from "@/lib/bank-import"
import { forceSyncNow } from "@/lib/sync"
import { formatCurrency } from "@/lib/currencies"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface CsvImportProps { open:boolean; onOpenChange:(open:boolean)=>void }
type Result={source:string;found:number;added:number;updated:number;duplicates:number;rejected:number;categorized:number}

export function CsvImport({open,onOpenChange}:CsvImportProps){
  const {toast}=useToast()
  const inputRef=useRef<HTMLInputElement>(null)
  const accounts=useLiveQuery(()=>db.accounts.toArray())||[]
  const categories=useLiveQuery(()=>db.categories.toArray())||[]
  const rules=useLiveQuery(()=>db.merchantRules.toArray())||[]
  const [accountId,setAccountId]=useState('s-pankki-checking')
  const [preview,setPreview]=useState<ImportPreview|null>(null)
  const [file,setFile]=useState<File|null>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [result,setResult]=useState<Result|null>(null)
  const account=accounts.find(item=>item.id===accountId)||accounts[0]

  function reset(){setPreview(null);setFile(null);setBusy(false);setError('');setResult(null)}

  async function chooseFile(selected?:File){
    if(!selected||!account)return
    setBusy(true);setError('');setFile(selected)
    try{setPreview(await parseBankStatement(selected,account,categories,rules))}
    catch(value){setError(value instanceof Error?value.message:'This statement could not be read')}
    finally{setBusy(false)}
  }

  async function commit(){
    if(!preview||!file||!account)return
    setBusy(true)
    try{
      const existing=await db.transactions.where('accountId').equals(account.id).toArray()
      const existingByFingerprint=new Map(existing.filter(tx=>tx.fingerprint).map(tx=>[tx.fingerprint as string,tx]))
      const fingerprints=new Set(existingByFingerprint.keys())
      const fresh=preview.transactions.filter(tx=>{if(!tx.fingerprint||fingerprints.has(tx.fingerprint))return false;fingerprints.add(tx.fingerprint);return true})
      const duplicateCount=preview.transactions.length-fresh.length
      // Re-importing a statement refreshes auto-categorized duplicates with the
      // newest rules, while preserving anything the user manually reviewed.
      const refreshed=preview.transactions.flatMap(tx=>{
        if(!tx.fingerprint)return[]
        const current=existingByFingerprint.get(tx.fingerprint)
        if(!current||((current.categorizationConfidence??0)>=1&&tx.normalizedMerchant!=='Own Transfer'))return[]
        return [{...current,categoryId:tx.categoryId,normalizedMerchant:tx.normalizedMerchant,note:tx.note,rawDescription:tx.rawDescription,kind:tx.kind,type:tx.type,excludedFromAnalytics:tx.excludedFromAnalytics,reviewStatus:tx.reviewStatus,categorizationConfidence:tx.categorizationConfidence,updatedAt:new Date().toISOString()}]
      })
      const batch=createImportBatch(preview,account.id,file.name,fresh.length,duplicateCount)
      const prepared=fresh.map(tx=>({...tx,importId:batch.id}))
      const statementBalance=preview.statement?.closingBalanceMinor
      const balanceUpdate=account.type==='credit_card'&&statementBalance!==undefined?{currentBalanceMinor:-statementBalance,balanceAsOf:preview.statement?.statementDate||preview.statement?.periodEnd}:{}
      await db.transaction('rw',db.transactions,db.imports,db.accounts,async()=>{
        if(prepared.length)await db.transactions.bulkAdd(prepared)
        if(refreshed.length)await db.transactions.bulkPut(refreshed)
        await db.imports.add(batch)
        await db.accounts.update(account.id,{...balanceUpdate,lastImportDate:new Date().toISOString(),updatedAt:new Date().toISOString()})
      })
      await forceSyncNow().catch(()=>{})
      setResult({source:preview.source,found:preview.transactions.length+preview.rejected.length,added:fresh.length,updated:refreshed.length,duplicates:duplicateCount,rejected:preview.rejected.length,categorized:preview.transactions.filter(tx=>tx.categorizationConfidence&&tx.categorizationConfidence>=.8).length})
      toast({title:`Imported ${fresh.length} new and refreshed ${refreshed.length}`})
    }catch{setError('Nothing was changed. Check the file and try again.')}
    finally{setBusy(false)}
  }

  return <Dialog open={open} onOpenChange={value=>{onOpenChange(value);if(!value)reset()}}>
    <DialogContent className="sm:max-w-[680px] max-h-[84vh] overflow-y-auto">
      <DialogHeader><DialogTitle className="mono">Import statement</DialogTitle></DialogHeader>
      {!preview&&!result&&<div className="space-y-4">
        <div><label className="text-xs uppercase tracking-wide text-muted-foreground">Account</label><Select value={accountId} onValueChange={setAccountId}><SelectTrigger className="mt-1"><SelectValue/></SelectTrigger><SelectContent>{accounts.map(item=><SelectItem key={item.id} value={item.id}>{item.name} · {item.institution}</SelectItem>)}</SelectContent></Select></div>
        <button type="button" onClick={()=>inputRef.current?.click()} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();void chooseFile(event.dataTransfer.files[0])}} className="w-full border-2 border-dashed py-12 px-5 text-center hover:bg-muted/50 transition-colors"><Upload className="mx-auto h-9 w-9 text-muted-foreground"/><span className="mt-4 block text-sm font-medium">Drop a CSV, XLSX, or PDF statement</span><span className="mt-1 block text-xs text-muted-foreground">S-Pankki CSV and American Express billing PDFs are recognized</span><input ref={inputRef} type="file" accept=".csv,.xlsx,.pdf" className="hidden" onChange={event=>{void chooseFile(event.target.files?.[0]);event.target.value=''}}/></button>
        <div className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0"/><p>Files are parsed locally. Exact duplicates are checked within the selected account before anything is saved.</p></div>
        {busy&&<p className="text-sm mono text-center">Reading statement…</p>}
        {error&&<ErrorMessage message={error}/>}
      </div>}
      {preview&&!result&&<div className="space-y-4">
        <div className="border p-4 flex items-center gap-3"><FileSpreadsheet className="h-7 w-7"/><div><p className="font-medium">Detected: {preview.source}</p><p className="text-xs text-muted-foreground mt-1">{file?.name} · {account?.name}</p></div></div>
        {preview.statement&&<div className="border p-4 space-y-3"><div className="flex items-center justify-between"><p className="text-xs uppercase tracking-wide text-muted-foreground">Statement summary</p><span className={`text-xs mono ${preview.statement.reconciled?'text-green-600':'text-amber-600'}`}>{preview.statement.reconciled?'✓ Reconciled':'Needs reconciliation'}</span></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><StatementStat label="Period" value={`${preview.statement.periodStart||'—'} – ${preview.statement.periodEnd||'—'}`}/><StatementStat label="Due date" value={preview.statement.dueDate||'—'}/><StatementStat label="New charges" value={preview.statement.newChargesMinor===undefined?'—':formatCurrency(preview.statement.newChargesMinor/100,preview.statement.currency)}/><StatementStat label="Amount due" value={preview.statement.amountDueMinor===undefined?'—':formatCurrency(preview.statement.amountDueMinor/100,preview.statement.currency)}/></div></div>}
        <div className="grid grid-cols-3 border divide-x"><Stat label="Valid" value={preview.transactions.length}/><Stat label="Needs review" value={preview.transactions.filter(tx=>tx.reviewStatus==='needs_review').length}/><Stat label="Rejected" value={preview.rejected.length}/></div>
        <p className="text-xs text-muted-foreground">“Needs review” means no reliable merchant rule was found. Import them safely, then open Transactions and use the Needs review filter to confirm or correct them.</p>
        <div className="border divide-y max-h-72 overflow-y-auto">{[...preview.transactions].sort((a,b)=>Number(a.reviewStatus!=='needs_review')-Number(b.reviewStatus!=='needs_review')).slice(0,30).map(tx=><div key={tx.id} className="flex justify-between gap-4 p-3 text-sm"><div className="min-w-0"><p className="truncate">{tx.normalizedMerchant}</p><p className="text-xs text-muted-foreground">{tx.postedDate} · {categories.find(c=>c.id===tx.categoryId)?.name||'Other'}{tx.reviewStatus==='needs_review'?' · Needs review':''}{tx.originalCurrency?` · ${tx.originalCurrency}`:''}</p></div><p className={`mono shrink-0 ${tx.amountMinor&&tx.amountMinor>0?'text-green-600 dark:text-green-400':'text-red-600 dark:text-red-400'}`}>{tx.amountMinor&&tx.amountMinor>0?'+':'−'}{formatCurrency(Math.abs(tx.amountMinor||0)/100,tx.currency)}</p></div>)}</div>
        {preview.rejected.length>0&&<p className="text-xs text-muted-foreground">{preview.rejected.length} malformed row{preview.rejected.length===1?' was':'s were'} excluded. No partial or invalid values will be imported.</p>}
        <div className="flex justify-between"><Button variant="outline" onClick={()=>setPreview(null)}>Choose another file</Button><Button onClick={()=>void commit()} disabled={busy||preview.transactions.length===0}>{busy?'Importing…':`Import ${preview.transactions.length}`}</Button></div>
        {error&&<ErrorMessage message={error}/>}
      </div>}
      {result&&<div className="space-y-5"><div className="border p-5 flex items-center gap-4"><CheckCircle2 className="h-9 w-9 text-green-600"/><div><p className="font-medium">Import complete</p><p className="text-xs text-muted-foreground mt-1">Detected: {result.source}</p></div></div><div className="grid grid-cols-2 sm:grid-cols-6 border divide-x"><Stat label="Found" value={result.found}/><Stat label="New" value={result.added}/><Stat label="Refreshed" value={result.updated}/><Stat label="Duplicates" value={result.duplicates}/><Stat label="Categorized" value={result.categorized}/><Stat label="Rejected" value={result.rejected}/></div><Button className="w-full" onClick={()=>onOpenChange(false)}>Done</Button></div>}
    </DialogContent>
  </Dialog>
}

function Stat({label,value}:{label:string;value:number}){return <div className="p-3 text-center"><p className="mono text-xl">{value}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p></div>}
function StatementStat({label,value}:{label:string;value:string}){return <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-xs mono">{value}</p></div>}
function ErrorMessage({message}:{message:string}){return <p className="border border-destructive/40 p-3 text-sm text-destructive">{message}</p>}
