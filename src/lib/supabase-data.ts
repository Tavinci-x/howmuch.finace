import { createClient } from '@/lib/supabase'
import type { Transaction, Category, Budget, Goal, AppSettings } from '@/types'

// ─── Field Mapping (camelCase ↔ snake_case) ────────────────────────

function txToRow(t: Transaction, userId: string) {
    return {
        id: t.id,
        user_id: userId,
        amount: t.amount,
        type: t.type,
        category_id: t.categoryId,
        currency: t.currency,
        date: t.date,
        note: t.note,
        created_at: t.createdAt,
    }
}

function rowToTx(row: Record<string, unknown>): Transaction {
    return {
        id: row.id as string,
        amount: Number(row.amount),
        type: row.type as Transaction['type'],
        categoryId: row.category_id as string,
        currency: row.currency as string,
        date: row.date as string,
        note: row.note as string,
        createdAt: row.created_at as string,
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

// ─── Fetch (download from Supabase) ────────────────────────────────

export async function fetchCloudTransactions(userId: string): Promise<Transaction[]> {
    const supabase = createClient()
    const { data } = await supabase.from('transactions').select('*').eq('user_id', userId)
    return (data || []).map(rowToTx)
}

export async function fetchCloudCategories(userId: string): Promise<Category[]> {
    const supabase = createClient()
    const { data } = await supabase.from('categories').select('*').eq('user_id', userId)
    return (data || []).map(rowToCat)
}

export async function fetchCloudBudgets(userId: string): Promise<Budget[]> {
    const supabase = createClient()
    const { data } = await supabase.from('budgets').select('*').eq('user_id', userId)
    return (data || []).map(rowToBudget)
}

export async function fetchCloudGoals(userId: string): Promise<Goal[]> {
    const supabase = createClient()
    const { data } = await supabase.from('goals').select('*').eq('user_id', userId)
    return (data || []).map(rowToGoal)
}

export async function fetchCloudSettings(userId: string): Promise<AppSettings[]> {
    const supabase = createClient()
    const { data } = await supabase.from('settings').select('*').eq('user_id', userId)
    return (data || []).map(rowToSetting)
}

// ─── Upload (push to Supabase) ─────────────────────────────────────

export async function uploadTransactions(userId: string, items: Transaction[]) {
    if (items.length === 0) return
    const supabase = createClient()
    const rows = items.map(t => txToRow(t, userId))
    await supabase.from('transactions').upsert(rows, { onConflict: 'id' })
}

export async function uploadCategories(userId: string, items: Category[]) {
    if (items.length === 0) return
    const supabase = createClient()
    const rows = items.map(c => catToRow(c, userId))
    await supabase.from('categories').upsert(rows, { onConflict: 'id' })
}

export async function uploadBudgets(userId: string, items: Budget[]) {
    if (items.length === 0) return
    const supabase = createClient()
    const rows = items.map(b => budgetToRow(b, userId))
    await supabase.from('budgets').upsert(rows, { onConflict: 'id' })
}

export async function uploadGoals(userId: string, items: Goal[]) {
    if (items.length === 0) return
    const supabase = createClient()
    const rows = items.map(g => goalToRow(g, userId))
    await supabase.from('goals').upsert(rows, { onConflict: 'id' })
}

export async function uploadSettings(userId: string, items: AppSettings[]) {
    if (items.length === 0) return
    const supabase = createClient()
    const rows = items.map(s => settingToRow(s, userId))
    await supabase.from('settings').upsert(rows, { onConflict: 'id' })
}

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

// ─── Check if user has cloud data ──────────────────────────────────

export async function hasCloudData(userId: string): Promise<boolean> {
    const supabase = createClient()
    const { count } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
    return (count ?? 0) > 0
}
