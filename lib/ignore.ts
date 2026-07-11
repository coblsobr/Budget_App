import { DataSet, IgnoreRule, Txn } from './types';

/** Does a transaction match a single ignore rule? (All set fields must match.) */
export function matchesIgnore(t: Txn, rule: IgnoreRule): boolean {
  const hasCriterion = !!rule.merchant || !!rule.accountId || rule.amount != null;
  if (!hasCriterion) return false;
  if (rule.merchant && !t.merchant.toLowerCase().includes(rule.merchant.toLowerCase())) return false;
  if (rule.accountId && t.accountId !== rule.accountId) return false;
  if (rule.amount != null && Math.abs(Math.abs(t.amount) - rule.amount) > 0.005) return false;
  return true;
}

// ─── Auto-detected transfers & card payments ─────────────────────────────────
//
// Money moving between YOUR OWN accounts isn't spending or income, and counting
// it double-counts real purchases: a $50 dinner on a credit card is spending
// once (the charge); the later $50 card payment from checking is just moving
// money to cover it. These are detected automatically and excluded everywhere:
//
//  1. Payments INTO a credit card ("PAYMENT THANK YOU", "AUTOPAY", …)
//  2. The bank-side twin of those payments ("CHASE CRD AUTOPAY", …)
//  3. Transfers between your own bank accounts ("TRANSFER TO SAVINGS", …)
//  4. Matched pairs: equal-and-opposite amounts on two of your accounts within
//     a few days, when at least one side looks like a payment/transfer.

const PAY_RE = /(payment|pymt|autopay|auto pay|e-?pay|thank you|ach pmt|crd pmt|card pmt|bill ?pay|pmnt)/i;
const CARDISH_RE = /(card|credit|visa|mastercard|amex|american express|discover|citi|chase|capital ?one|wells|synchrony|barclay|apple ?card|paypal)/i;
const XFER_RE = /(transfer|xfer|zelle to|move money|to savings|from savings|to checking|from checking|internal|online banking)/i;

function daysBetween(a: string, b: string): number {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}

// Memoized per transactions-array (compose() creates a fresh array each time).
const autoCache = new WeakMap<Txn[], Set<string>>();

/** IDs of transactions auto-detected as internal transfers / card payments. */
export function autoIgnoredIds(d: DataSet): Set<string> {
  const key = d.transactions;
  const hit = autoCache.get(key);
  if (hit) return hit;

  const ids = new Set<string>();
  const creditIds = new Set(d.creditCards.map((c) => c.id));
  const cashIds = new Set(d.accounts.map((a) => a.id));

  // Rules 1–3: obvious from merchant text + account type
  for (const t of d.transactions) {
    if (creditIds.has(t.accountId) && t.amount > 0 && PAY_RE.test(t.merchant)) {
      ids.add(t.id); // payment received by the card
    } else if (cashIds.has(t.accountId) && t.amount < 0 && PAY_RE.test(t.merchant) && CARDISH_RE.test(t.merchant)) {
      ids.add(t.id); // bank-side card payment
    } else if (cashIds.has(t.accountId) && XFER_RE.test(t.merchant)) {
      ids.add(t.id); // transfer between own bank accounts
    }
  }

  // Rule 4: pair matching — bank money out ↔ credit money in, equal amounts,
  // within 5 days, where at least one side hints payment/transfer. Each txn
  // pairs at most once.
  const hint = (t: Txn) => PAY_RE.test(t.merchant) || XFER_RE.test(t.merchant);
  const credits = d.transactions.filter((t) => creditIds.has(t.accountId) && t.amount > 0 && !ids.has(t.id));
  const bankOut = d.transactions.filter((t) => cashIds.has(t.accountId) && t.amount < 0);
  const used = new Set<string>();
  for (const c of credits) {
    const match = bankOut.find(
      (b) =>
        !used.has(b.id) &&
        Math.abs(-b.amount - c.amount) < 0.005 &&
        daysBetween(b.date, c.date) <= 5 &&
        (hint(b) || hint(c))
    );
    if (match) {
      ids.add(c.id);
      ids.add(match.id);
      used.add(match.id);
    }
  }

  autoCache.set(key, ids);
  return ids;
}

/** Is this transaction ignored (auto-detected transfer/payment, or a user rule)? */
export function isIgnored(d: DataSet, t: Txn): boolean {
  if (autoIgnoredIds(d).has(t.id)) return true;
  const rules = d.ignoreRules;
  if (!rules || rules.length === 0) return false;
  return rules.some((r) => matchesIgnore(t, r));
}

let counter = 0;
export function newRuleId(): string {
  counter += 1;
  return `ig-${Date.now()}-${counter}`;
}
