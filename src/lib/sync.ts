import { db } from '@/lib/db'
import {
  fetchCloudTransactions, fetchCloudCategories, fetchCloudBudgets, fetchCloudGoals, fetchCloudSettings,
  uploadTransactions, uploadCategories, uploadBudgets, uploadGoals, uploadSettings,
  fetchCloudAccounts, fetchCloudImports, fetchCloudMerchantRules, uploadAccounts, uploadImports, uploadMerchantRules,
} from '@/lib/supabase-data'
import type { Transaction } from '@/types'

let syncInterval:ReturnType<typeof setInterval>|null=null
let currentUserId:string|null=null

function newest(left:Transaction,right:Transaction){const leftTime=Date.parse(left.updatedAt||left.createdAt)||0;const rightTime=Date.parse(right.updatedAt||right.createdAt)||0;return rightTime>leftTime?right:left}
function mergeById<T extends {id:string}>(local:T[],cloud:T[]):T[]{const merged=new Map(local.map(item=>[item.id,item] as [string,T]));cloud.forEach(item=>{if(!merged.has(item.id))merged.set(item.id,item)});return Array.from(merged.values())}

/** Merge both stores. Neither device is allowed to erase records merely because its cache is incomplete. */
export async function initialSync(userId:string):Promise<void>{
  currentUserId=userId
  try{
    const [localTransactions,cloudTransactions,localCategories,cloudCategories,localBudgets,cloudBudgets,localGoals,cloudGoals,localSettings,cloudSettings,localAccounts,cloudAccounts,localImports,cloudImports,localRules,cloudRules]=await Promise.all([
      db.transactions.toArray(),fetchCloudTransactions(userId),db.categories.toArray(),fetchCloudCategories(userId),db.budgets.toArray(),fetchCloudBudgets(userId),db.goals.toArray(),fetchCloudGoals(userId),db.settings.toArray(),fetchCloudSettings(userId),db.accounts.toArray(),fetchCloudAccounts(userId),db.imports.toArray(),fetchCloudImports(userId),db.merchantRules.toArray(),fetchCloudMerchantRules(userId),
    ])
    const transactionMap=new Map<string,Transaction>();[...localTransactions,...cloudTransactions].forEach(item=>transactionMap.set(item.id,transactionMap.has(item.id)?newest(transactionMap.get(item.id)!,item):item));const transactions=Array.from(transactionMap.values())
    const categories=mergeById(localCategories,cloudCategories);const budgets=mergeById(localBudgets,cloudBudgets);const goals=mergeById(localGoals,cloudGoals);const settings=mergeById(localSettings,cloudSettings)
    const accounts=mergeById(localAccounts,cloudAccounts);const imports=mergeById(localImports,cloudImports);const rules=mergeById(localRules,cloudRules)
    await db.transaction('rw',[db.transactions,db.categories,db.budgets,db.goals,db.settings,db.accounts,db.imports,db.merchantRules],async()=>{await db.transactions.bulkPut(transactions);await db.categories.bulkPut(categories);await db.budgets.bulkPut(budgets);await db.goals.bulkPut(goals);await db.settings.bulkPut(settings);await db.accounts.bulkPut(accounts);await db.imports.bulkPut(imports);await db.merchantRules.bulkPut(rules)})
    await Promise.all([uploadTransactions(userId,transactions),uploadCategories(userId,categories),uploadBudgets(userId,budgets),uploadGoals(userId,goals),uploadSettings(userId,settings),uploadAccounts(userId,accounts),uploadImports(userId,imports),uploadMerchantRules(userId,rules)])
  }catch(error){console.error('[Sync] Unable to reconcile local and cloud data',error);throw error}
}

async function backgroundSync(){if(!currentUserId)return;const userId=currentUserId;try{const [transactions,categories,budgets,goals,settings,accounts,imports,rules]=await Promise.all([db.transactions.toArray(),db.categories.toArray(),db.budgets.toArray(),db.goals.toArray(),db.settings.toArray(),db.accounts.toArray(),db.imports.toArray(),db.merchantRules.toArray()]);await Promise.all([uploadTransactions(userId,transactions),uploadCategories(userId,categories),uploadBudgets(userId,budgets),uploadGoals(userId,goals),uploadSettings(userId,settings),uploadAccounts(userId,accounts),uploadImports(userId,imports),uploadMerchantRules(userId,rules)])}catch(error){console.error('[Sync] Changes remain stored locally until cloud sync recovers',error)}}

export function startBackgroundSync(userId:string){stopBackgroundSync();currentUserId=userId;syncInterval=setInterval(backgroundSync,30_000)}
export function stopBackgroundSync(){if(syncInterval)clearInterval(syncInterval);syncInterval=null;currentUserId=null}
export async function forceSyncNow(){await backgroundSync()}
