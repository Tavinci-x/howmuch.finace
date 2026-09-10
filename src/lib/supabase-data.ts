import { createClient } from '@/lib/supabase'
import type { Transaction, Category, Budget, Goal, AppSettings, Account, ImportBatch, MerchantRule } from '@/types'

// ─── Field Mapping (camelCase ↔ snake_case) ────────────────────────

function txToRow(t: Transaction, userId: string) {
    return {
        id: t.id,
        user_id: userId,
        amount: t.amount,
        amount_minor: t.amountMinor,
        type: t.type,
        category_id: t.categoryId,
        account_id: t.accountId,
        import_id: t.importId,
        currency: t.currency,
        date: t.date,
        posted_date: t.postedDate,
        note: t.note,
        raw_description: t.rawDescription,
        normalized_merchant: t.normalizedMerchant,
        kind: t.kind,
        external_transaction_id: t.externalTransactionId,
        fingerprint: t.fingerprint,
        fingerprint_version: t.fingerprintVersion,
        excluded_from_analytics: t.excludedFromAnalytics,
        review_status: t.reviewStatus,
        categorization_confidence: t.categorizationConfidence,
        original_amount_minor: t.originalAmountMinor,
        original_currency: t.originalCurrency,
        exchange_rate: t.exchangeRate,
        created_at: t.createdAt,
        updated_at: t.updatedAt || t.createdAt,
        deleted_at: t.deletedAt,
    }
}

function rowToTx(row: Record<string, unknown>): Transaction {
    return {
        id: row.id as string,
        amount: Number(row.amount),
        amountMinor: row.amount_minor == null ? undefined : Number(row.amount_minor),
        type: row.type as Transaction['type'],
        categoryId: row.category_id as string,
        accountId: row.account_id as string | undefined,
        importId: row.import_id as string | undefined,
        currency: row.currency as string,
        date: row.date as string,
        postedDate: row.posted_date as string | undefined,
        note: row.note as string,
        rawDescription: row.raw_description as string | undefined,
        normalizedMerchant: row.normalized_merchant as string | undefined,
        kind: row.kind as Transaction['kind'],
        externalTransactionId: row.external_transaction_id as string | undefined,
        fingerprint: row.fingerprint as string | undefined,
        fingerprintVersion: row.fingerprint_version == null ? undefined : Number(row.fingerprint_version),
        excludedFromAnalytics: Boolean(row.excluded_from_analytics),
        reviewStatus: row.review_status as Transaction['reviewStatus'],
        categorizationConfidence: row.categorization_confidence == null ? undefined : Number(row.categorization_confidence),
        originalAmountMinor: row.original_amount_minor == null ? undefined : Number(row.original_amount_minor),
        originalCurrency: row.original_currency as string | undefined,
        exchangeRate: row.exchange_rate == null ? undefined : Number(row.exchange_rate),
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string | undefined,
        deletedAt: row.deleted_at as string | undefined,
    }
}

function catToRow(c: Category, userId: string) {
    return {
        id: c.id,
        user_id: userId,
        name: c.name,
        icon: c.icon,
        color: c.color,
        type: c.type,
        is_default: c.isDefault,
    }
}

function rowToCat(row: Record<string, unknown>): Category {
    return {
        id: row.id as string,
        name: row.name as string,
        icon: row.icon as string,
        color: row.color as string,
        type: row.type as Category['type'],
        isDefault: row.is_default as boolean,
    }
}

function budgetToRow(b: Budget, userId: string) {
    return {
        id: b.id,
        user_id: userId,
        category_id: b.categoryId,
        amount: b.amount,
        currency: b.currency,
        month: b.month,
    }
}

function rowToBudget(row: Record<string, unknown>): Budget {
    return {
        id: row.id as string,
        categoryId: row.category_id as string,
        amount: Number(row.amount),
        currency: row.currency as string,
        month: row.month as string,
    }
}

function goalToRow(g: Goal, userId: string) {
    return {
        id: g.id,
        user_id: userId,
        name: g.name,
        target_amount: g.targetAmount,
        current_amount: g.currentAmount,
        currency: g.currency,
        deadline: g.deadline,
        color: g.color,
    }
}

function rowToGoal(row: Record<string, unknown>): Goal {
    return {
        id: row.id as string,
        name: row.name as string,
        targetAmount: Number(row.target_amount),
        currentAmount: Number(row.current_amount),
        currency: row.currency as string,
        deadline: row.deadline as string,
        color: row.color as string,
    }
}

function settingToRow(s: AppSettings, userId: string) {
    return {
        id: s.id,
        user_id: userId,
        key: s.key,
        value: s.value,
    }
}

function rowToSetting(row: Record<string, unknown>): AppSettings {
    return {
        id: row.id as string,
        key: row.key as string,
        value: row.value as string,
    }
}

function accountToRow(account:Account,userId:string){return{id:account.id,user_id:userId,name:account.name,institution:account.institution,type:account.type,currency:account.currency,current_balance_minor:account.currentBalanceMinor,balance_as_of:account.balanceAsOf,last_import_date:account.lastImportDate,created_at:account.createdAt,updated_at:account.updatedAt}}
function rowToAccount(row:Record<string,unknown>):Account{return{id:String(row.id),name:String(row.name),institution:String(row.institution),type:row.type as Account['type'],currency:String(row.currency),currentBalanceMinor:row.current_balance_minor==null?undefined:Number(row.current_balance_minor),balanceAsOf:row.balance_as_of as string|undefined,lastImportDate:row.last_import_date as string|undefined,createdAt:String(row.created_at),updatedAt:String(row.updated_at)}}
function importToRow(item:ImportBatch,userId:string){return{id:item.id,user_id:userId,account_id:item.accountId,source:item.source,file_name:item.fileName,file_hash:item.fileHash,row_count:item.rowCount,imported_count:item.importedCount,duplicate_count:item.duplicateCount,rejected_count:item.rejectedCount,imported_at:item.importedAt,statement_currency:item.statementCurrency,statement_date:item.statementDate,period_start:item.periodStart,period_end:item.periodEnd,due_date:item.dueDate,opening_balance_minor:item.openingBalanceMinor,payments_credits_minor:item.paymentsCreditsMinor,new_charges_minor:item.newChargesMinor,closing_balance_minor:item.closingBalanceMinor,amount_due_minor:item.amountDueMinor,spending_limit_minor:item.spendingLimitMinor,reconciliation_difference_minor:item.reconciliationDifferenceMinor,reconciled:item.reconciled}}
function rowToImport(row:Record<string,unknown>):ImportBatch{return{id:String(row.id),accountId:String(row.account_id),source:String(row.source),fileName:String(row.file_name),fileHash:String(row.file_hash),rowCount:Number(row.row_count),importedCount:Number(row.imported_count),duplicateCount:Number(row.duplicate_count),rejectedCount:Number(row.rejected_count),importedAt:String(row.imported_at),statementCurrency:row.statement_currency as string|undefined,statementDate:row.statement_date as string|undefined,periodStart:row.period_start as string|undefined,periodEnd:row.period_end as string|undefined,dueDate:row.due_date as string|undefined,openingBalanceMinor:row.opening_balance_minor==null?undefined:Number(row.opening_balance_minor),paymentsCreditsMinor:row.payments_credits_minor==null?undefined:Number(row.payments_credits_minor),newChargesMinor:row.new_charges_minor==null?undefined:Number(row.new_charges_minor),closingBalanceMinor:row.closing_balance_minor==null?undefined:Number(row.closing_balance_minor),amountDueMinor:row.amount_due_minor==null?undefined:Number(row.amount_due_minor),spendingLimitMinor:row.spending_limit_minor==null?undefined:Number(row.spending_limit_minor),reconciliationDifferenceMinor:row.reconciliation_difference_minor==null?undefined:Number(row.reconciliation_difference_minor),reconciled:row.reconciled==null?undefined:Boolean(row.reconciled)}}
function ruleToRow(rule:MerchantRule,userId:string){return{id:rule.id,user_id:userId,pattern:rule.pattern,normalized_merchant:rule.normalizedMerchant,category_id:rule.categoryId,match_type:rule.matchType,priority:rule.priority,learned:rule.learned,created_at:rule.createdAt,updated_at:rule.updatedAt}}
function rowToRule(row:Record<string,unknown>):MerchantRule{return{id:String(row.id),pattern:String(row.pattern),normalizedMerchant:String(row.normalized_merchant),categoryId:String(row.category_id),matchType:row.match_type as MerchantRule['matchType'],priority:Number(row.priority),learned:Boolean(row.learned),createdAt:String(row.created_at),updatedAt:String(row.updated_at)}}

// ─── Fetch (download from Supabase) ────────────────────────────────

export async function fetchCloudTransactions(userId: string): Promise<Transaction[]> {
    const supabase = createClient()
    const { data, error } = await supabase.from('transactions').select('*').eq('user_id', userId)
    if (error) throw error
    return (data || []).map(rowToTx)
}

export async function fetchCloudCategories(userId: string): Promise<Category[]> {
    const supabase = createClient()
    const { data, error } = await supabase.from('categories').select('*').eq('user_id', userId)
    if (error) throw error
    return (data || []).map(rowToCat)
}

export async function fetchCloudBudgets(userId: string): Promise<Budget[]> {
    const supabase = createClient()
    const { data, error } = await supabase.from('budgets').select('*').eq('user_id', userId)
    if (error) throw error
    return (data || []).map(rowToBudget)
}

export async function fetchCloudGoals(userId: string): Promise<Goal[]> {
    const supabase = createClient()
    const { data, error } = await supabase.from('goals').select('*').eq('user_id', userId)
    if (error) throw error
    return (data || []).map(rowToGoal)
}

export async function fetchCloudSettings(userId: string): Promise<AppSettings[]> {
    const supabase = createClient()
    const { data, error } = await supabase.from('settings').select('*').eq('user_id', userId)
    if (error) throw error
    return (data || []).map(rowToSetting)
}

export async function fetchCloudAccounts(userId:string):Promise<Account[]>{const{data,error}=await createClient().from('accounts').select('*').eq('user_id',userId);if(error)throw error;return(data||[]).map(rowToAccount)}
export async function fetchCloudImports(userId:string):Promise<ImportBatch[]>{const{data,error}=await createClient().from('imports').select('*').eq('user_id',userId);if(error)throw error;return(data||[]).map(rowToImport)}
export async function fetchCloudMerchantRules(userId:string):Promise<MerchantRule[]>{const{data,error}=await createClient().from('merchant_rules').select('*').eq('user_id',userId);if(error)throw error;return(data||[]).map(rowToRule)}

// ─── Upload (push to Supabase) ─────────────────────────────────────

export async function uploadTransactions(userId: string, items: Transaction[]) {
    if (items.length === 0) return
    const supabase = createClient()
    const rows = items.map(t => txToRow(t, userId))
    const { error } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' })
    if (error) throw error
}

export async function uploadCategories(userId: string, items: Category[]) {
    if (items.length === 0) return
    const supabase = createClient()
    const rows = items.map(c => catToRow(c, userId))
    const { error } = await supabase.from('categories').upsert(rows, { onConflict: 'id' })
    if (error) throw error
}

export async function uploadBudgets(userId: string, items: Budget[]) {
    if (items.length === 0) return
    const supabase = createClient()
    const rows = items.map(b => budgetToRow(b, userId))
    const { error } = await supabase.from('budgets').upsert(rows, { onConflict: 'id' })
    if (error) throw error
}

export async function uploadGoals(userId: string, items: Goal[]) {
    if (items.length === 0) return
    const supabase = createClient()
    const rows = items.map(g => goalToRow(g, userId))
    const { error } = await supabase.from('goals').upsert(rows, { onConflict: 'id' })
    if (error) throw error
}

export async function uploadSettings(userId: string, items: AppSettings[]) {
    if (items.length === 0) return
    const supabase = createClient()
    const rows = items.map(s => settingToRow(s, userId))
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'id' })
    if (error) throw error
}

export async function uploadAccounts(userId:string,items:Account[]){if(!items.length)return;const{error}=await createClient().from('accounts').upsert(items.map(item=>accountToRow(item,userId)),{onConflict:'id'});if(error)throw error}
export async function uploadImports(userId:string,items:ImportBatch[]){if(!items.length)return;const{error}=await createClient().from('imports').upsert(items.map(item=>importToRow(item,userId)),{onConflict:'id'});if(error)throw error}
export async function uploadMerchantRules(userId:string,items:MerchantRule[]){if(!items.length)return;const{error}=await createClient().from('merchant_rules').upsert(items.map(item=>ruleToRow(item,userId)),{onConflict:'id'});if(error)throw error}

// ─── Delete (remove from Supabase what's not local) ────────────────

export async function deleteRemovedItems(
    userId: string,
    tableName: string,
    localIds: Set<string>
) {
    const supabase = createClient()
    const { data } = await supabase.from(tableName).select('id').eq('user_id', userId)
    const cloudIds = (data || []).map((r: { id: string }) => r.id)
    const toDelete = cloudIds.filter(id => !localIds.has(id))
    if (toDelete.length > 0) {
        await supabase.from(tableName).delete().in('id', toDelete)
    }
}

// ─── Clear all cloud data for a user ────────────────────────────────

export async function clearAllCloudData(userId: string) {
    const supabase = createClient()
    await Promise.all([
        supabase.from('transactions').delete().eq('user_id', userId),
        supabase.from('categories').delete().eq('user_id', userId),
        supabase.from('budgets').delete().eq('user_id', userId),
        supabase.from('goals').delete().eq('user_id', userId),
        supabase.from('settings').delete().eq('user_id', userId),
        supabase.from('accounts').delete().eq('user_id', userId),
        supabase.from('imports').delete().eq('user_id', userId),
        supabase.from('merchant_rules').delete().eq('user_id', userId),
    ])
}

// ─── Check if user has cloud data ──────────────────────────────────

export async function hasCloudData(userId: string): Promise<boolean> {
    const supabase = createClient()
    const { count } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
    return (count ?? 0) > 0
}
