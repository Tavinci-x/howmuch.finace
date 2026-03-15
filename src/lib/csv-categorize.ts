import type { Category } from '@/types'

/**
 * Keyword-to-category mapping for auto-categorizing bank CSV transactions.
 * Keys are category names (matching the app's default categories).
 * Values are arrays of lowercase keywords to match against transaction descriptions.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Expense categories
  'Housing': [
    'rent', 'mortgage', 'property', 'landlord', 'lease', 'hoa',
    'real estate', 'apartment', 'housing',
    // Finnish housing companies & rental providers
    'vuokra', 'asunto oy', 'as oy', 'kiinteistö oy', 'kiinteistö',
    'sato', 'kojamo', 'lumo', 'avara', 'vvo',
    'realia', 'newsec',
    // Personal landlord (user-specific)
    'sirkka liisa', 'sirkka-liisa', 'sirkkalisa',
  ],
  'Food & Dining': [
    'grocery', 'groceries', 'restaurant', 'food', 'dining', 'cafe', 'coffee',
    'uber eats', 'ubereats', 'doordash', 'grubhub', 'deliveroo', 'just eat',
    'mcdonalds', 'mcdonald', 'burger king', 'starbucks', 'subway', 'pizza',
    'chipotle', 'taco bell', 'kfc', 'wendy', 'domino', 'panera',
    'walmart', 'costco', 'kroger', 'aldi', 'lidl', 'trader joe',
    'whole foods', 'safeway', 'target', 'ica', 'coop', 'willys',
    'hemköp', 'netto', 'rema', 'kiwi', 'meny', 'spar',
    'bakery', 'deli', 'butcher', 'supermarket', 'market',
    // Finnish grocery chains & food
    'alepa', 'k-market', 'k-citymarket', 'k-supermarket', 's-market',
    'prisma', 'valio aimo', 'wolt', 'foodora',
    'espresso house', 'kaffet', 'toastery',
  ],
  'Transport': [
    'uber', 'lyft', 'bolt', 'taxi', 'cab', 'fuel', 'gas station',
    'petrol', 'diesel', 'shell', 'bp ', 'esso', 'statoil', 'circle k',
    'parking', 'toll', 'transit', 'metro', 'bus ', 'train', 'railway',
    'airline', 'flight', 'car wash', 'car rental', 'hertz', 'avis',
    'sl ', 'ruter', 'sj ', 'vy ', 'flixbus', 'public transport',
    // Finnish transport
    'hsl', 'vr ', 'neste', 'abc ', 'easypark', 'norwegian',
    'huili', 'paku',
  ],
  'Utilities': [
    'electric', 'electricity', 'power', 'water', 'sewage', 'gas bill',
    'internet', 'broadband', 'fiber', 'wifi', 'phone bill', 'mobile',
    'verizon', 'comcast', 'at&t', 'att ', 't-mobile', 'tmobile',
    'telia', 'telenor', 'tre ', 'tele2', 'vodafone',
    'heating', 'waste', 'garbage', 'trash', 'utility', 'utilities',
    // Finnish utilities & telecom
    'elisa', 'dna oyj', 'fortum', 'vantaan energia', 'posti',
  ],
  'Entertainment': [
    'netflix', 'spotify', 'hulu', 'disney', 'hbo', 'amazon prime',
    'youtube', 'twitch', 'cinema', 'movie', 'theater', 'theatre',
    'concert', 'gaming', 'steam', 'playstation', 'xbox', 'nintendo',
    'epic games', 'riot', 'blizzard', 'ea ', 'activision',
    'museum', 'zoo', 'amusement', 'bowling', 'arcade', 'ticket',
    'viaplay', 'crunchyroll', 'apple tv',
    // Finnish entertainment
    'teatteri', 'paf',
  ],
  'Shopping': [
    'amazon', 'ebay', 'etsy', 'ikea', 'zara', 'h&m', 'hm ',
    'uniqlo', 'nike', 'adidas', 'asos', 'shein', 'wish',
    'best buy', 'apple store', 'electronics', 'clothing', 'fashion',
    'furniture', 'home depot', 'lowes', 'nordstrom', 'macys',
    'clas ohlson', 'jysk', 'elgiganten', 'mediamarkt', 'webhallen',
    'mall', 'outlet', 'store', 'shop',
    // Finnish shopping
    'motonet', 'puuilo', 'vinted', 'temu', 'power ', 'marski',
    'narikka',
  ],
  'Health': [
    'pharmacy', 'apotek', 'cvs', 'walgreens', 'doctor', 'dr ',
    'hospital', 'clinic', 'medical', 'dental', 'dentist', 'optician',
    'therapy', 'therapist', 'gym', 'fitness', 'crossfit', 'yoga',
    'vitamin', 'supplement', 'health', 'wellness',
    // Finnish health
    'fitness24seven', 'hyvinvointialue',
  ],
  'Education': [
    'tuition', 'university', 'college', 'school', 'academy',
    'udemy', 'coursera', 'skillshare', 'masterclass', 'linkedin learning',
    'books', 'textbook', 'library', 'course', 'training', 'workshop',
    'education', 'student', 'lecture',
  ],
  'Subscriptions': [
    'subscription', 'recurring', 'membership', 'annual fee', 'monthly fee',
    'apple.com/bill', 'google storage', 'google one', 'icloud', 'dropbox',
    'microsoft 365', 'office 365', 'adobe', 'creative cloud',
    'notion', 'slack', 'zoom', 'figma', 'github', 'openai', 'chatgpt',
    'patreon', 'substack', 'medium',
    // Domain / hosting
    'name-cheap', 'namecheap', 'kamatera',
  ],

  // Income categories
  'Salary': [
    'salary', 'payroll', 'wages', 'wage', 'direct deposit', 'pay check',
    'paycheck', 'employer', 'lön', 'monthly pay',
    // Finnish
    'palkka',
  ],
  'Freelance': [
    'freelance', 'invoice', 'consulting', 'contract', 'gig',
    'client payment', 'project payment',
  ],
  'Gifts': [
    'gift', 'birthday', 'present', 'donation', 'received from',
  ],
  'Investments': [
    'dividend', 'interest', 'investment', 'capital gain', 'stock',
    'crypto', 'bond', 'mutual fund', 'etf', 'return on', 'yield',
    'trading', 'brokerage',
  ],
}

// Income category names — used to determine transaction type
const INCOME_CATEGORIES = new Set(['Salary', 'Freelance', 'Gifts', 'Investments', 'Other Income'])

interface CategorizeResult {
  categoryId: string
  type: 'income' | 'expense'
}

/**
 * Auto-categorize a transaction based on its description and amount.
 *
 * Logic:
 * 1. Match description keywords against known categories
 * 2. If a match is found, use that category and its type (income/expense)
 * 3. If no keyword match, use the amount sign: negative = expense, positive = income
 * 4. Fallback to "Other" (expense) or "Other Income" (income)
 */
export function categorizeTransaction(
  description: string,
  amount: number,
  categories: Category[],
): CategorizeResult {
  const descLower = description.toLowerCase()

  // Build a lookup map: category name -> category id
  const catByName = new Map<string, Category>(
    categories.map(c => [c.name, c])
  )

  // Try keyword matching
  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const cat = catByName.get(categoryName)
    if (!cat) continue

    for (const keyword of keywords) {
      if (descLower.includes(keyword)) {
        return {
          categoryId: cat.id,
          type: INCOME_CATEGORIES.has(categoryName) ? 'income' : 'expense',
        }
      }
    }
  }

  // No keyword match — use amount sign
  const isIncome = amount > 0

  // Fallback category — salary is the most common income type
  const fallback = isIncome
    ? catByName.get('Salary') || catByName.get('Other Income')
    : catByName.get('Other') || categories.find(c => c.type === 'expense')

  return {
    categoryId: fallback?.id || '',
    type: isIncome ? 'income' : 'expense',
  }
}
