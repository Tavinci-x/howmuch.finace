# howmuch.finance

A minimalist, local-first personal ledger with accurate statement imports. The original monochrome, receipt-style interface is preserved.

## Features

- **Accounts**: Keep S-Pankki, American Express, and manual entries separate, with an optional reconciled balance per account.
- **Statement import**: Preview S-Pankki CSV, Amex billing PDF, and generic CSV/XLSX files; reject malformed rows and detect account-scoped duplicates before an atomic import.
- **Accurate ledger values**: Store signed integer minor units so refunds reduce expenses and floating-point rounding cannot distort totals.
- **Review workflow**: Low-confidence fallback categories are marked for review; category corrections create reusable merchant rules.
- **Reports**: Exclude transfers and explicitly excluded entries, net refunds against spending, and compare equal elapsed periods.
- **Local first**: IndexedDB remains the primary store. Optional Supabase sync merges records without deleting cloud data merely because a device has an incomplete cache.

## Tech Stack

- Next.js 14
- Tailwind CSS
- Dexie.js (IndexedDB wrapper)
- ExcelJS and Papa Parse
- Recharts
- Lucide React

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Statement columns

The importer recognizes common English, Finnish, and Swedish headers for transaction/posted date, amount or debit/credit, description, reference, transaction ID, and currency. Choose the destination account before importing. Exact institution-specific mappings should be verified with redacted exports from each bank because export formats can vary by country and account type.

## Optional Supabase sync

The app works without environment variables. To enable authentication and cloud sync, configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then apply [`supabase-tables.sql`](./supabase-tables.sql) to the project database before signing in.
