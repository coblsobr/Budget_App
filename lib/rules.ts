import { MerchantRules, Txn } from './types';

/** Normalize a merchant name to a stable rule key. */
export function merchantKey(merchant: string): string {
  return (merchant || '').trim().toLowerCase();
}

/**
 * Apply merchant rules to a list of transactions, overriding the category whenever
 * a transaction's merchant matches a rule. Income is left alone (positive amounts).
 */
export function applyRules(txns: Txn[], rules: MerchantRules): Txn[] {
  if (!rules || Object.keys(rules).length === 0) return txns;
  return txns.map((t) => {
    if (t.amount > 0) return t;
    const rule = rules[merchantKey(t.merchant)];
    return rule ? { ...t, category: rule } : t;
  });
}
