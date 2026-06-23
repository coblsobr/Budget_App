import { Category } from './types';

/**
 * SimpleFIN transactions don't carry a category, only a description/payee. We do a
 * lightweight keyword match to bucket them. This is intentionally simple and easy to
 * extend — later we can add user overrides ("always file 'Costco' under Groceries").
 */

const RULES: { category: Category; keywords: string[] }[] = [
  { category: 'Income', keywords: ['payroll', 'direct dep', 'deposit', 'salary', 'paycheck', 'venmo cashout'] },
  { category: 'Housing', keywords: ['mortgage', 'rent', 'hoa', 'escrow', 'property tax'] },
  { category: 'Groceries', keywords: ['grocery', 'costco', 'kroger', 'safeway', 'aldi', 'trader joe', 'whole foods', 'publix', 'wegmans', 'meijer', 'food lion', 'sprouts'] },
  { category: 'Dining', keywords: ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'chipotle', 'doordash', 'uber eats', 'grubhub', 'pizza', 'taco', 'diner', 'bar ', 'grill'] },
  { category: 'Transportation', keywords: ['shell', 'chevron', 'exxon', 'bp ', 'gas', 'fuel', 'uber', 'lyft', 'parking', 'toll', 'auto', 'honda', 'toyota', 'dmv', 'tire'] },
  { category: 'Utilities', keywords: ['power', 'electric', 'water', 'gas co', 'comcast', 'xfinity', 'at&t', 'verizon', 'tmobile', 't-mobile', 'internet', 'utility', 'sewer', 'trash'] },
  { category: 'Subscriptions', keywords: ['netflix', 'spotify', 'hulu', 'disney', 'youtube', 'icloud', 'apple.com/bill', 'prime', 'chatgpt', 'openai', 'patreon', 'subscription'] },
  { category: 'Shopping', keywords: ['amazon', 'target', 'walmart', 'best buy', 'home depot', 'lowe', 'nike', 'etsy', 'ebay', 'ikea', 'macy'] },
  { category: 'Health', keywords: ['pharmacy', 'cvs', 'walgreens', 'doctor', 'dental', 'dentist', 'medical', 'clinic', 'hospital', 'gnc', 'gym', 'fitness'] },
  { category: 'Entertainment', keywords: ['amc', 'cinema', 'theatre', 'theater', 'steam', 'playstation', 'xbox', 'nintendo', 'concert', 'ticket', 'bowling'] },
  { category: 'Travel', keywords: ['airline', 'delta', 'united', 'american air', 'southwest', 'marriott', 'hilton', 'airbnb', 'hotel', 'expedia', 'rental car'] },
  { category: 'Kids', keywords: ['daycare', 'school', 'toys', 'children', 'kids', 'babysit'] },
];

export function categorize(description: string, amount: number): Category {
  const text = (description || '').toLowerCase();
  if (amount > 0) {
    // Positive amounts are treated as income unless clearly a refund-style merchant.
    const incomeRule = RULES.find((r) => r.category === 'Income');
    if (incomeRule && incomeRule.keywords.some((k) => text.includes(k))) return 'Income';
    return 'Income';
  }
  for (const rule of RULES) {
    if (rule.category === 'Income') continue;
    if (rule.keywords.some((k) => text.includes(k))) return rule.category;
  }
  return 'Misc';
}
