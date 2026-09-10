import type { Transaction } from '@/types'

export const FINGERPRINT_VERSION = 2

export function signedMinor(transaction: Transaction): number {
  if (Number.isInteger(transaction.amountMinor)) return transaction.amountMinor as number
  return Math.round(transaction.amount * 100) * (transaction.type === 'income' ? 1 : -1)
}

export function majorAmount(transaction: Transaction): number {
  return Math.abs(signedMinor(transaction)) / 100
}

export function isIncluded(transaction: Transaction): boolean {
  return !transaction.deletedAt && !transaction.excludedFromAnalytics && transaction.kind !== 'transfer'
}

export function normalizeMerchant(value: string): string {
  const cleaned = value
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .replace(/\b(?:OYJ?|AB|HELSINKI|FINLAND|SUOMI|SWE|FI)\b/gi, ' ')
    .replace(/[\s*#-]+$/g, '')
    .trim()
  return cleaned.toLowerCase().replace(/(^|\s)([a-z\u00c0-\u024f])/g, (_, lead, letter) => lead + letter.toUpperCase()) || 'Unknown merchant'
}

export function createFingerprint(input: { accountId: string; postedDate: string; amountMinor: number; currency: string; rawDescription: string; externalTransactionId?: string }): string {
  const source = input.externalTransactionId
    ? `external|${input.accountId}|${input.externalTransactionId}`
    : [input.accountId, input.postedDate, input.amountMinor, input.currency.toUpperCase(), input.rawDescription.normalize('NFKC').toUpperCase().replace(/\s+/g, ' ').trim()].join('|')
  let hash = 2166136261
  for (let index = 0; index < source.length; index++) { hash ^= source.charCodeAt(index); hash = Math.imul(hash, 16777619) }
  return `v${FINGERPRINT_VERSION}-${(hash >>> 0).toString(16).padStart(8, '0')}`
}
