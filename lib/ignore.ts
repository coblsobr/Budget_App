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

/** Is this transaction ignored by any rule? Excludes it from all totals. */
export function isIgnored(d: DataSet, t: Txn): boolean {
  const rules = d.ignoreRules;
  if (!rules || rules.length === 0) return false;
  return rules.some((r) => matchesIgnore(t, r));
}

let counter = 0;
export function newRuleId(): string {
  counter += 1;
  return `ig-${Date.now()}-${counter}`;
}
