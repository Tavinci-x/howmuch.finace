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
  'Groceries': [
    'grocery', 'groceries', 'supermarket', 'market',
    'walmart', 'costco', 'kroger', 'aldi', 'lidl', 'trader joe',
    'whole foods', 'safeway', 'target', 'ica', 'coop', 'willys',
    'hemköp', 'netto', 'rema', 'kiwi', 'meny', 'spar',
    'bakery', 'deli', 'butcher',
    'alepa', 'k-market', 'k-citymarket', 'k-supermarket', 's-market',
    'prisma', 'valio aimo', 'migros', 'supermercados unide',
  ],
  'Restaurants & Cafés': [
    'restaurant', 'food', 'dining', 'cafe', 'coffee',
    'uber eats', 'ubereats', 'doordash', 'grubhub', 'deliveroo', 'just eat',
    'mcdonalds', 'mcdonald', 'mcdhelsinki', 'burger king', 'hesburger',
    'starbucks', 'subway', 'pizza', 'fizza', 'chipotle', 'taco bell',
    'kfc', 'wendy', 'domino', 'panera', 'wolt', 'foodora',
    'espresso house', 'kaffet', 'toastery',
    'kontti grilli', 'marski by scandic fnb', 'pikkulintu', 'ravintola',
    'ymo gida', 'bi coffee',
  ],
  'Car Payment': ['lt autohallinto', 'lt rahoitus'],
  'Transport': [
    'uber', 'lyft', 'bolt', 'taxi', 'cab', 'fuel', 'gas station',
    'petrol', 'diesel', 'shell', 'bp ', 'esso', 'statoil', 'circle k',
    'parking', 'toll', 'transit', 'metro', 'bus ', 'train', 'railway',
    'airline', 'flight', 'car wash', 'car rental', 'hertz', 'avis',
    'ruter', 'flixbus', 'public transport',
    // Finnish transport
    'hsl', 'vr', 'neste', 'abc', 'easypark', 'aimo park',
    'huili', 'paku', 'bolt', 'motonet', 'bc motors', 'lampugnano park',
    'oz btm otomotiv',
  ],
  'Utilities': [
    'electric', 'electricity', 'water', 'sewage', 'gas bill',
    'heating', 'waste', 'garbage', 'trash', 'utility', 'utilities',
    'fortum', 'vantaan energia', 'vantaan energy',
  ],
  'Phone & Internet': [
    'internet', 'broadband', 'fiber', 'wifi', 'phone bill',
    'verizon', 'comcast', 'at&t', 'att ', 't-mobile', 'tmobile',
    'telia', 'telenor', 'tre ', 'tele2', 'vodafone',
    'elisa', 'dna oyj',
  ],
  'Insurance': ['insurance', 'vakuutus', 'vahinkovakuutus', 'pohjola vakuutus'],
  'Gambling': ['paf', 'casino', 'betting', 'sportsbook'],
  'Travel': ['norwegian', 'airline', 'flight', 'hotel', 'hostel'],
  'Taxes & Government': ['verohallinto', 'tullin asiointipalvel', 'customs fee'],
  'Entertainment': [
    'netflix', 'spotify', 'hulu', 'disney', 'hbo', 'amazon prime',
    'youtube', 'twitch', 'cinema', 'movie', 'theater', 'theatre',
    'concert', 'gaming', 'steam', 'playstation', 'xbox', 'nintendo',
    'epic games', 'riot', 'blizzard', 'ea ', 'activision',
    'museum', 'zoo', 'amusement', 'bowling', 'arcade', 'ticket',
    'viaplay', 'crunchyroll', 'apple tv',
    // Finnish entertainment and leisure
    'teatteri', 'metsahallitus eraluvat', 'narikka.com', 'liiku ry',
  ],
  'Shopping': [
    'amazon', 'ebay', 'etsy', 'ikea', 'zara', 'h&m', 'hm ',
    'uniqlo', 'nike', 'adidas', 'asos', 'shein', 'wish',
    'best buy', 'apple store', 'electronics', 'clothing', 'fashion',
    'furniture', 'home depot', 'lowes', 'nordstrom', 'macys',
    'clas ohlson', 'jysk', 'elgiganten', 'mediamarkt', 'webhallen',
    'mall', 'outlet', 'store', 'shop',
    // Finnish shopping
    'puuilo', 'vinted', 'temu', 'power jarvenpaa', 'tokmanni',
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

interface CategorizeResult {
  categoryId: string
  type: 'income' | 'expense'
  matched: boolean
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
  const descLower = normalizeForMatching(description)

  // Build a lookup map: category name -> category id
  const catByName = new Map<string, Category>(
    categories.map(c => [c.name, c])
  )

  const type = amount >= 0 ? 'income' : 'expense'

  // Category matching never changes cash-flow direction. This keeps refunds,
  // reversals, and chargebacks from becoming expenses again.
  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const cat = catByName.get(categoryName)
    if (!cat) continue

    for (const keyword of keywords) {
      if (keywordMatches(descLower, keyword)) {
        return {
          categoryId: cat.id,
          type,
          matched: true,
        }
      }
    }
  }

  // No keyword match — use amount sign
  const isIncome = amount >= 0

  // Fallback category remains reviewable because no keyword matched.
  const fallback = isIncome
    ? catByName.get('Other Income') || catByName.get('Salary')
    : catByName.get('Other') || categories.find(c => c.type === 'expense')

  return {
    categoryId: fallback?.id || '',
    type: isIncome ? 'income' : 'expense',
    matched: false,
  }
}

const prefixBrands = new Set(['alepa', 'lidl', 'mcdhelsinki', 'motonet', 'namecheap', 'hesburger'])

function normalizeForMatching(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function keywordMatches(normalizedDescription: string, keyword: string): boolean {
  const normalizedKeyword = normalizeForMatching(keyword)
  if (!normalizedKeyword) return false
  const paddedDescription = ` ${normalizedDescription} `
  if (paddedDescription.includes(` ${normalizedKeyword} `)) return true
  if (normalizedKeyword.includes(' ')) return false
  return prefixBrands.has(normalizedKeyword)
    && normalizedDescription.split(' ').some(token => token.startsWith(normalizedKeyword))
}
