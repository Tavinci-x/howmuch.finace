import Papa from 'papaparse'
import { v4 as uuidv4 } from 'uuid'
import type { Account, Category, ImportBatch, MerchantRule, Transaction } from '@/types'
import { categorizeTransaction } from '@/lib/csv-categorize'
import { createFingerprint, FINGERPRINT_VERSION, normalizeMerchant } from '@/lib/transactions'

type Column = 'transactionDate'|'postedDate'|'amount'|'debit'|'credit'|'description'|'payer'|'reference'|'externalId'|'currency'|'transactionKind'|'message'
type Mapping = Partial<Record<Column, number>>

export interface ImportPreview {
  source: 'S-Pankki'|'American Express'|'Generic statement'
  fileHash: string
  transactions: Transaction[]
  rejected: { row: number; reason: string }[]
  statement?: StatementDetails
}

export interface StatementDetails {
  currency: string
  statementDate?: string
  periodStart?: string
  periodEnd?: string
  dueDate?: string
  openingBalanceMinor?: number
  paymentsCreditsMinor?: number
  newChargesMinor?: number
  closingBalanceMinor?: number
  amountDueMinor?: number
  spendingLimitMinor?: number
  transactionChargeTotalMinor: number
  reconciliationDifferenceMinor?: number
  reconciled: boolean
}

const aliases: Record<Column,string[]> = {
  transactionDate:['date','transaction date','transactiondate','maksupäivä','tapahtumapäivä','transaktionsdag'],
  postedDate:['posting date','posted date','booking date','kirjauspäivä','bokföringsdag'],
  amount:['amount','summa','belopp','määrä','value'],
  debit:['debit','debet','withdrawal','outflow','otto'],
  credit:['credit','kredit','deposit','inflow','pano'],
  description:['description','merchant','payee','recipient','note','memo','selite','saajan nimi','mottagare'],
  payer:['payer','sender','maksaja','betalare'],
  reference:['reference','reference number','viite','referens'],
  externalId:['transaction id','transactionid','event id','tapahtumatunnus','arkistointitunnus','id'],
  currency:['currency','valuutta','valuta'],
  transactionKind:['transaction type','type of transaction','tapahtumalaji','transaktionstyp'],
  message:['message','viesti','meddelande'],
}

const normalizeHeader=(value:string)=>value.normalize('NFKC').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ')
function mapHeaders(headers:string[]):Mapping { const mapping:Mapping={}; headers.forEach((header,index)=>{const normalized=normalizeHeader(header);(Object.keys(aliases) as Column[]).forEach(field=>{if(mapping[field]===undefined&&aliases[field].includes(normalized))mapping[field]=index})});return mapping }

function strictDate(value:string):string|null {
  const input=value.trim(); let y:number,m:number,d:number
  if(/^\d{5}(?:\.\d+)?$/.test(input)){const serial=Number(input);const excelDate=new Date(Date.UTC(1899,11,30)+Math.floor(serial)*86_400_000);return Number.isNaN(excelDate.valueOf())?null:excelDate.toISOString().slice(0,10)}
  let match=input.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if(match){y=+match[1];m=+match[2];d=+match[3]}else{match=input.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);if(!match)return null;d=+match[1];m=+match[2];y=+match[3]}
  const date=new Date(Date.UTC(y,m-1,d)); if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return null
  return `${y.toString().padStart(4,'0')}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`
}

function parseMinor(value:string,decimals=2):number|null { let input=value.trim().replace(/[€$£\s\u00a0]/g,'');if(!input)return null;const negative=/^-/.test(input)||/^\(.*\)$/.test(input)||input.endsWith('-');input=input.replace(/[()+-]/g,'');const comma=input.lastIndexOf(','),dot=input.lastIndexOf('.');if(comma>dot)input=input.replace(/\./g,'').replace(',','.');else input=input.replace(/,/g,'');const amount=Number(input);if(!Number.isFinite(amount))return null;return Math.round(amount*(10**decimals))*(negative?-1:1) }

function parseShortDate(value:string):string|undefined {const match=value.match(/(\d{2})\.(\d{2})\.(\d{2})(?!\d)/);if(!match)return;return `20${match[3]}-${match[2]}-${match[1]}`}
function parseFinnishPeriod(value:string):{start?:string;end?:string}{const months:Record<string,number>={tammikuuta:1,helmikuuta:2,maaliskuuta:3,huhtikuuta:4,toukokuuta:5,kesäkuuta:6,heinäkuuta:7,elokuuta:8,syyskuuta:9,lokakuuta:10,marraskuuta:11,joulukuuta:12};const matches:{day:number;month:number;year:number}[]=[];const expression=/(\d{1,2})\.\s*([A-Za-zÀ-ž]+)\s*(\d{4})/g;let match:RegExpExecArray|null;while((match=expression.exec(value))!==null){const month=months[match[2].toLowerCase()];if(month)matches.push({day:Number(match[1]),month,year:Number(match[3])})}const iso=(item?:{day:number;month:number;year:number})=>item?`${item.year}-${String(item.month).padStart(2,'0')}-${String(item.day).padStart(2,'0')}`:undefined;return{start:iso(matches[0]),end:iso(matches[1])}}

async function rowsFromFile(file:File):Promise<string[][]>{
  if(/\.xlsx$/i.test(file.name)){
    const {Workbook}=await import('exceljs');const workbook=new Workbook();await workbook.xlsx.load(await file.arrayBuffer() as never);const sheet=workbook.worksheets[0];if(!sheet)return[]
    return (sheet.getSheetValues() as unknown[]).slice(1).map(value=>{const row=Array.isArray(value)?value.slice(1):[];return row.map(cellValue=>{if(cellValue instanceof Date)return cellValue.toISOString().slice(0,10);if(cellValue&&typeof cellValue==='object'){if('result' in cellValue)return String(cellValue.result??'');if('text' in cellValue)return String(cellValue.text??'');if('richText' in cellValue&&Array.isArray(cellValue.richText))return cellValue.richText.map((part:{text?:string})=>String(part.text??'')).join('')}return String(cellValue??'')})})
  }
  const text=(await file.text()).replace(/^\uFEFF/,'');const first=text.split(/\r?\n/,1)[0]||'';const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':(first.match(/\t/g)||[]).length>(first.match(/,/g)||[]).length?'\t':','
  const parsed=Papa.parse<string[]>(text,{delimiter,skipEmptyLines:'greedy'});if(parsed.errors.length)throw new Error(parsed.errors[0].message);return parsed.data
}

function detectSource(fileName:string,headers:string[]):ImportPreview['source'] {const text=`${fileName} ${headers.join(' ')}`.toUpperCase();if(/AMEX|AMERICAN EXPRESS/.test(text))return'American Express';if(/S[- ]?PANKKI|S[- ]?BANK/.test(text)||(['KIRJAUSPÄIVÄ','MAKSUPÄIVÄ','TAPAHTUMALAJI','ARKISTOINTITUNNUS'].every(header=>text.includes(header))))return'S-Pankki';return'Generic statement'}
function cell(row:string[],index?:number){return index===undefined?'':String(row[index]??'').trim()}
function applyMerchantRule(raw:string,rules:MerchantRule[]){const upper=raw.normalize('NFKC').toUpperCase().replace(/\s+/g,' ').trim();return [...rules].sort((a,b)=>b.priority-a.priority).find(rule=>rule.matchType==='exact'?upper===rule.pattern.toUpperCase():upper.includes(rule.pattern.toUpperCase()))}
function categoryNamed(categories:Category[],name:string){return categories.find(category=>category.name.toLocaleLowerCase()===name.toLocaleLowerCase())}

async function linesFromPdf(file:File):Promise<string[]>{
  const [pdfjs,workerModule]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?raw')]);const workerUrl=URL.createObjectURL(new Blob([workerModule.default],{type:'text/javascript'}));pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;const document=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;const lines:string[]=[]
  for(let pageNumber=1;pageNumber<=document.numPages;pageNumber++){const page=await document.getPage(pageNumber);const content=await page.getTextContent();const positioned=content.items.filter((item):item is typeof item & {str:string;transform:number[]}=>'str' in item&&Boolean(item.str.trim())&&'transform' in item).map(item=>({text:item.str.trim(),x:item.transform[4],y:item.transform[5]})).sort((left,right)=>Math.abs(right.y-left.y)>2?right.y-left.y:left.x-right.x);const groups:{y:number;items:{text:string;x:number}[]}[]=[];for(const item of positioned){const group=groups.find(candidate=>Math.abs(candidate.y-item.y)<=2);if(group)group.items.push(item);else groups.push({y:item.y,items:[item]})}groups.sort((left,right)=>right.y-left.y).forEach(group=>lines.push(group.items.sort((left,right)=>left.x-right.x).map(item=>item.text).join(' ').replace(/\s+/g,' ').trim()))}
  await (document as unknown as {destroy:()=>Promise<void>}).destroy();URL.revokeObjectURL(workerUrl)
  return lines
}

async function parseAmexPdf(file:File,account:Account,categories:Category[],rules:MerchantRule[],fileHash:string):Promise<ImportPreview>{
  const lines=await linesFromPdf(file);if(!lines.some(line=>/AMERICAN EXPRESS/i.test(line))||!lines.some(line=>/Ostopäivä.*Välityspäivä|Transaktionsdatum.*Processdatum/i.test(line)))throw new Error('This PDF is not a recognized American Express statement')
  const summaryLine=lines.find(line=>line.includes(' - ')&&line.includes(' + ')&&line.includes(' = '));const summaryAmounts=summaryLine?.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g)?.map(value=>parseMinor(value) as number)||[]
  const periodLine=lines.find(line=>/Laskutusjakso\/Fakturaperiod/i.test(line))||'';const period=parseFinnishPeriod(periodLine)
  const statementLabelIndex=lines.findIndex(line=>/Korttinumero\/Kortnummer.*Pvm\/Datum/i.test(line));const statementDate=statementLabelIndex>=0?parseShortDate(lines.slice(statementLabelIndex+1,statementLabelIndex+3).join(' ')):undefined
  const dueLabelIndex=lines.findIndex(line=>/Eräpäivä\/Förfallodag/i.test(line));const dueLine=dueLabelIndex>=0?lines.slice(dueLabelIndex+1,dueLabelIndex+7).find(line=>/^\d{2}\.\d{2}\.\d{2}$/.test(line.trim())):undefined;const dueDate=dueLine?parseShortDate(dueLine):undefined
  const limitLabelIndex=lines.findIndex(line=>/Yhteenveto\/Summering.*Ostoraja\/Spenderingsgräns/i.test(line));const limitText=limitLabelIndex>=0?lines.slice(limitLabelIndex+1,limitLabelIndex+3).join(' '):'';const spendingLimitMinor=parseMinor(limitText.match(/\d{1,3}(?:,\d{3})+\.\d{2}/)?.[0]||'')??undefined
  const transactions:Transaction[]=[];const rejected:ImportPreview['rejected']=[];const occurrences=new Map<string,number>()
  lines.forEach((line,rowIndex)=>{const match=line.match(/^(\d{2}\.\d{2}\.\d{2})\s+(\d{2}\.\d{2}\.\d{2})\s+(.+?)\s+(-?\s*[\d.]+,\d{2})$/);if(!match)return;const transactionDate=strictDate(match[1]);const postedDate=strictDate(match[2]);const statementMinor=parseMinor(match[4]);if(!transactionDate||!postedDate||statementMinor===null||statementMinor===0){rejected.push({row:rowIndex+1,reason:'Invalid Amex transaction row'});return}let payee=match[3].replace(/\s+/g,' ').trim();let originalAmountMinor:number|undefined;let originalCurrency:string|undefined;let exchangeRate:number|undefined;const foreign=payee.match(/^(.*?)\s+(-?[\d.,]+)\s+([A-Z]{3})$/);if(foreign){payee=foreign[1].trim();originalCurrency=foreign[3];const decimals=/^(JPY|KRW)$/.test(originalCurrency)?0:2;const statementOriginal=parseMinor(foreign[2],decimals);if(statementOriginal!==null){originalAmountMinor=-statementOriginal;exchangeRate=Math.abs(((-statementMinor)/100)/(originalAmountMinor/(10**decimals)))}}const amountMinor=-statementMinor;const upper=payee.toUpperCase();const payment=/MAKSUSUORITUS|BETALNING,? TACK/.test(upper);const fee=/JÄSENYYSMAKSU|MEDLEMSAVGIFT|SERVICE FEE/.test(upper);const learned=applyMerchantRule(payee,rules);const categorized=categorizeTransaction(payee,amountMinor,categories);const feeCategory=fee?categories.find(item=>/subscription|fee|jäsen/i.test(item.name)):undefined;const paymentCategory=payment?categoryNamed(categories,'Amex'):undefined;const categoryId=paymentCategory?.id||learned?.categoryId||feeCategory?.id||categorized.categoryId;const normalizedMerchant=payment?'American Express Payment':learned?.normalizedMerchant||normalizeMerchant(payee);const kind:Transaction['kind']=payment?'transfer':fee?'fee':amountMinor>0?'refund':'purchase';const confidence=payment||fee?1:learned?1:categorized.matched?.8:.35;const duplicateKey=[transactionDate,postedDate,amountMinor,normalizedMerchant].join('|');const occurrence=(occurrences.get(duplicateKey)||0)+1;occurrences.set(duplicateKey,occurrence);const externalTransactionId=`amex|${duplicateKey}|${occurrence}`;const now=new Date().toISOString();transactions.push({id:uuidv4(),amount:Math.abs(amountMinor)/100,amountMinor,type:kind==='refund'?'expense':amountMinor>=0?'income':'expense',categoryId,accountId:account.id,currency:'EUR',date:transactionDate,postedDate,note:normalizedMerchant,rawDescription:payee,normalizedMerchant,kind,externalTransactionId,fingerprint:createFingerprint({accountId:account.id,postedDate,amountMinor,currency:'EUR',rawDescription:payee,externalTransactionId}),fingerprintVersion:FINGERPRINT_VERSION,excludedFromAnalytics:kind==='transfer',reviewStatus:confidence>=.8?'reviewed':'needs_review',categorizationConfidence:confidence,originalAmountMinor,originalCurrency,exchangeRate,createdAt:now,updatedAt:now})})
  if(!transactions.length)throw new Error('No American Express transaction rows were found');const transactionChargeTotalMinor=-transactions.filter(item=>item.kind!=='transfer').reduce((sum,item)=>sum+(item.amountMinor||0),0);const newChargesMinor=summaryAmounts[2];const reconciliationDifferenceMinor=newChargesMinor===undefined?undefined:transactionChargeTotalMinor-newChargesMinor;const statement:StatementDetails={currency:'EUR',statementDate,periodStart:period.start,periodEnd:period.end,dueDate,openingBalanceMinor:summaryAmounts[0],paymentsCreditsMinor:summaryAmounts[1],newChargesMinor,closingBalanceMinor:summaryAmounts[3],amountDueMinor:summaryAmounts[4],spendingLimitMinor,transactionChargeTotalMinor,reconciliationDifferenceMinor,reconciled:reconciliationDifferenceMinor===0};return{source:'American Express',fileHash,transactions,rejected,statement}
}

export async function parseBankStatement(file:File,account:Account,categories:Category[],rules:MerchantRule[]):Promise<ImportPreview>{
  if(file.size>10*1024*1024)throw new Error('File is larger than 10 MB')
  if(!/\.(csv|xlsx|pdf)$/i.test(file.name))throw new Error('Choose a CSV, XLSX, or PDF statement')
  const fileHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(byte=>byte.toString(16).padStart(2,'0')).join('')
  if(/\.pdf$/i.test(file.name))return parseAmexPdf(file,account,categories,rules,fileHash)
  const rows=await rowsFromFile(file);if(rows.length<2)throw new Error('The statement has no transaction rows')
  const headers=rows[0].map(String);const mapping=mapHeaders(headers);if(mapping.transactionDate===undefined&&mapping.postedDate===undefined)throw new Error('No supported date column was found');if(mapping.amount===undefined&&mapping.debit===undefined&&mapping.credit===undefined)throw new Error('No supported amount, debit, or credit column was found');if(mapping.description===undefined)throw new Error('No supported description or merchant column was found')
  const source=detectSource(file.name,headers);const transactions:Transaction[]=[];const rejected:ImportPreview['rejected']=[]
  rows.slice(1).forEach((row,rowIndex)=>{const transactionDate=strictDate(cell(row,mapping.transactionDate??mapping.postedDate));const postedDate=strictDate(cell(row,mapping.postedDate??mapping.transactionDate));if(!transactionDate||!postedDate){rejected.push({row:rowIndex+2,reason:'Invalid date'});return}
    let amountMinor:number|null=null;if(mapping.amount!==undefined)amountMinor=parseMinor(cell(row,mapping.amount));else{const debit=parseMinor(cell(row,mapping.debit));const credit=parseMinor(cell(row,mapping.credit));if(debit!==null&&debit!==0)amountMinor=-Math.abs(debit);else if(credit!==null&&credit!==0)amountMinor=Math.abs(credit)}if(amountMinor===null||amountMinor===0){rejected.push({row:rowIndex+2,reason:'Invalid or zero amount'});return}
    const payee=cell(row,mapping.description)
    const payer=cell(row,mapping.payer)
    if(!payee&&!payer){rejected.push({row:rowIndex+2,reason:'Missing payer and recipient'});return}
    const statementKind=cell(row,mapping.transactionKind).toUpperCase()
    const message=cell(row,mapping.message).replace(/^'|'$/g,'')
    // Incoming S-Pankki rows name the account owner as recipient. The payer is
    // the useful merchant/employer name in that direction.
    const counterparty=amountMinor>0&&payer?payer:payee||payer
    const rawDescription=[counterparty,message&&message!=='-'?message:''].filter(Boolean).join(' · ')
    const externalTransactionId=cell(row,mapping.externalId)||undefined
    const currency=(cell(row,mapping.currency)||account.currency).toUpperCase()
    const learned=applyMerchantRule(counterparty,rules)
    const categorized=categorizeTransaction(`${statementKind} ${rawDescription}`,amountMinor,categories)
    let categoryId=learned?.categoryId||categorized.categoryId
    let normalizedMerchant=learned?.normalizedMerchant||normalizeMerchant(counterparty)
    let kind:Transaction['kind']=amountMinor>0?'income':'purchase'
    let excludedFromAnalytics=false
    let confidence=learned?1:categorized.matched?0.8:0.35

    const ownTransfer=statementKind.includes('OMA TILISIIRTO')
    const amexPayment=amountMinor<0&&/\bAMERICAN EXPRESS\b/i.test(counterparty)
    const amexReimbursement=amountMinor>0&&/\bAMEX\s+MAKSU\b/i.test(message)
    const salary=amountMinor>0&&(/PALKKA/.test(statementKind)||/\bPALKKA\b/i.test(message))
    const carPayment=/\bLT (?:AUTOHALLINTO|RAHOITUS)\b/i.test(counterparty)
    const investmentTransfer=/\bPAYMONADE\b/i.test(counterparty)

    if(ownTransfer){
      categoryId=categoryNamed(categories,'Transfers')?.id||categoryId
      normalizedMerchant='Own Transfer'
      kind='transfer';excludedFromAnalytics=true;confidence=1
    }else if(amexPayment){
      categoryId=categoryNamed(categories,'Amex')?.id||categoryId
      normalizedMerchant='American Express'
      kind='transfer';excludedFromAnalytics=true;confidence=1
    }else if(amexReimbursement){
      categoryId=categoryNamed(categories,'Reimbursements')?.id||categoryId
      kind='transfer';excludedFromAnalytics=true;confidence=1
    }else if(salary){
      categoryId=categoryNamed(categories,'Salary')?.id||categoryId
      kind='income';confidence=1
    }else if(carPayment){
      categoryId=categoryNamed(categories,'Car Payment')?.id||categoryId
      normalizedMerchant='LT Rahoitus'
      kind='purchase';confidence=1
    }else if(investmentTransfer){
      categoryId=categoryNamed(categories,'Investments')?.id||categoryId
      kind='transfer';excludedFromAnalytics=true;confidence=1
    }else if(/KÄTEISNOSTO|CASH WITHDRAWAL/.test(statementKind)){
      kind='withdrawal'
    }else if(/PALVELUMAKSU|SERVICE FEE/.test(statementKind)){
      kind='fee'
    }else{
      const category=categories.find(item=>item.id===categoryId)
      if(amountMinor>0&&category?.type==='expense')kind='refund'
    }

    const now=new Date().toISOString()
    transactions.push({id:uuidv4(),amount:Math.abs(amountMinor)/100,amountMinor,type:kind==='refund'?'expense':amountMinor>=0?'income':'expense',categoryId,accountId:account.id,currency,date:transactionDate,postedDate,note:normalizedMerchant,rawDescription,normalizedMerchant,kind,externalTransactionId,fingerprint:createFingerprint({accountId:account.id,postedDate,amountMinor,currency,rawDescription,externalTransactionId}),fingerprintVersion:FINGERPRINT_VERSION,excludedFromAnalytics,reviewStatus:confidence>=0.8?'reviewed':'needs_review',categorizationConfidence:confidence,createdAt:now,updatedAt:now})
  });return{source,fileHash,transactions,rejected}
}

export function createImportBatch(preview:ImportPreview,accountId:string,fileName:string,importedCount:number,duplicateCount:number):ImportBatch{const statement=preview.statement;return{id:uuidv4(),accountId,source:preview.source,fileName,fileHash:preview.fileHash,rowCount:preview.transactions.length+preview.rejected.length,importedCount,duplicateCount,rejectedCount:preview.rejected.length,importedAt:new Date().toISOString(),statementCurrency:statement?.currency,statementDate:statement?.statementDate,periodStart:statement?.periodStart,periodEnd:statement?.periodEnd,dueDate:statement?.dueDate,openingBalanceMinor:statement?.openingBalanceMinor,paymentsCreditsMinor:statement?.paymentsCreditsMinor,newChargesMinor:statement?.newChargesMinor,closingBalanceMinor:statement?.closingBalanceMinor,amountDueMinor:statement?.amountDueMinor,spendingLimitMinor:statement?.spendingLimitMinor,reconciliationDifferenceMinor:statement?.reconciliationDifferenceMinor,reconciled:statement?.reconciled}}
