import { db } from '@/lib/db'
import {
    hasCloudData,
    fetchCloudTransactions,
    fetchCloudCategories,
    fetchCloudBudgets,
    fetchCloudGoals,
    fetchCloudSettings,
    uploadTransactions,
    uploadCategories,
    uploadBudgets,
    uploadGoals,
    uploadSettings,
    deleteRemovedItems,
} from '@/lib/supabase-data'

let syncInterval: ReturnType<typeof setInterval> | null = null
let currentUserId: string | null = null

/**
 * Initial sync on login:
 * - If local has transactions → upload to cloud (local is source of truth)
 * - If local is empty AND cloud has data → download from cloud (new device / fresh browser)
 * - If both empty → nothing to do
 */
export async function initialSync(userId: string): Promise<void> {
    currentUserId = userId

    try {
        const localTxCount = await db.transactions.count()

        if (localTxCount > 0) {
            // Local has data — push to cloud so it stays in sync
            await uploadToCloud(userId)
        } else {
            // Local is empty — check if cloud has data to restore
            const cloudExists = await hasCloudData(userId)
            if (cloudExists) {
                await downloadFromCloud(userId)
            }
        }
    } catch (error) {
        console.error('[Sync] Initial sync error:', error)
        // Non-fatal: app still works locally
    }
}

/**
 * Download all data from Supabase and populate Dexie.
 * Only replaces tables that have actual cloud data — never wipes local data
 * to replace it with nothing.
 */
async function downloadFromCloud(userId: string) {
    const [transactions, categories, budgets, goals, settings] = await Promise.all([
        fetchCloudTransactions(userId),
        fetchCloudCategories(userId),
        fetchCloudBudgets(userId),
        fetchCloudGoals(userId),
        fetchCloudSettings(userId),
    ])

    // Only replace a table if cloud actually has data for it
    if (transactions.length > 0) {
        await db.transactions.clear()
        await db.transactions.bulkAdd(transactions)
    }
    if (categories.length > 0) {
        await db.categories.clear()
        await db.categories.bulkAdd(categories)
    }
    if (budgets.length > 0) {
        await db.budgets.clear()
        await db.budgets.bulkAdd(budgets)
    }
    if (goals.length > 0) {
        await db.goals.clear()
        await db.goals.bulkAdd(goals)
    }
    if (settings.length > 0) {
        await db.settings.clear()
        await db.settings.bulkAdd(settings)
    }

    console.log('[Sync] Downloaded cloud data to local')
}

/**
 * Upload all local Dexie data to Supabase
 */
async function uploadToCloud(userId: string) {
    const [transactions, categories, budgets, goals, settings] = await Promise.all([
        db.transactions.toArray(),
        db.categories.toArray(),
        db.budgets.toArray(),
        db.goals.toArray(),
        db.settings.toArray(),
    ])

    await Promise.all([
        uploadTransactions(userId, transactions),
        uploadCategories(userId, categories),
        uploadBudgets(userId, budgets),
        uploadGoals(userId, goals),
        uploadSettings(userId, settings),
    ])

    console.log('[Sync] Uploaded local data to cloud')
}

/**
 * Background sync: push local changes to Supabase
 * Handles creates, updates, and deletes.
 */
async function backgroundSync() {
    if (!currentUserId) return

    try {
        const [transactions, categories, budgets, goals, settings] = await Promise.all([
            db.transactions.toArray(),
            db.categories.toArray(),
            db.budgets.toArray(),
            db.goals.toArray(),
            db.settings.toArray(),
        ])

        // Upsert all local data
        await Promise.all([
            uploadTransactions(currentUserId, transactions),
            uploadCategories(currentUserId, categories),
            uploadBudgets(currentUserId, budgets),
            uploadGoals(currentUserId, goals),
            uploadSettings(currentUserId, settings),
        ])

        // Handle deletes: remove items from cloud that don't exist locally
        await Promise.all([
            deleteRemovedItems(currentUserId, 'transactions', new Set(transactions.map(t => t.id))),
            deleteRemovedItems(currentUserId, 'categories', new Set(categories.map(c => c.id))),
            deleteRemovedItems(currentUserId, 'budgets', new Set(budgets.map(b => b.id))),
            deleteRemovedItems(currentUserId, 'goals', new Set(goals.map(g => g.id))),
            deleteRemovedItems(currentUserId, 'settings', new Set(settings.map(s => s.id))),
        ])
    } catch (error) {
        console.error('[Sync] Background sync error:', error)
    }
}

/**
 * Start periodic background sync (every 10 seconds)
 */
export function startBackgroundSync(userId: string) {
    currentUserId = userId
    stopBackgroundSync() // Clear any existing interval
    syncInterval = setInterval(backgroundSync, 10_000)
    console.log('[Sync] Background sync started')
}

/**
 * Stop background sync
 */
export function stopBackgroundSync() {
    if (syncInterval) {
        clearInterval(syncInterval)
        syncInterval = null
        currentUserId = null
        console.log('[Sync] Background sync stopped')
    }
}

/**
 * Force an immediate sync (e.g., before navigating away)
 */
export async function forceSyncNow() {
    await backgroundSync()
}
