import { DataSet, Txn } from './types';
import { isIgnored } from './ignore';
import { merchantKey } from './rules';

export type Cadence = 'Weekly' | 'Biweekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Irregular';

export type Recurring = {
  merchant: string;
  category: string;
  typicalAmount: number; // average charge
  cadence: Cadence;
  count: number;
  lastDate: string;
  monthlyEquivalent: number; // normalized cost per month
  latestId: string;
};

function daysBetween(a: string, b: string): number {
  return Math.abs((Date.parse(b) - Date.parse(a)) / 86400000);
}

function cadenceFor(gap: number): Cadence {
  if (gap <= 10) return 'Weekly';
  if (gap <= 20) return 'Biweekly';
  if (gap <= 45) return 'Monthly';
  if (gap <= 135) return 'Quarterly';
  if (gap <= 400) return 'Yearly';
  return 'Irregular';
}

const PER_MONTH: Record<Cadence, number> = {
  Weekly: 4.345,
  Biweekly: 2.172,
  Monthly: 1,
  Quarterly: 1 / 3,
  Yearly: 1 / 12,
  Irregular: 1,
};

/**
 * Find charges that repeat on a regular cadence (subscriptions, bills, regular shops).
 * A merchant qualifies if it has 3+ spending charges whose date gaps are reasonably
 * consistent. Amount can vary (e.g. groceries) — we show the average.
 */
export function detectRecurring(d: DataSet): Recurring[] {
  const groups = new Map<string, Txn[]>();
  d.transactions.forEach((t) => {
    if (t.amount >= 0) return;
    if (isIgnored(d, t)) return;
    const k = merchantKey(t.merchant);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(t);
  });

  const out: Recurring[] = [];
  groups.forEach((list) => {
    if (list.length < 3) return;
    const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : 1));
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    const sortedGaps = [...gaps].sort((a, b) => a - b);
    const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)] || 30;
    const consistent = gaps.filter((g) => g >= medianGap * 0.4 && g <= medianGap * 1.8).length >= Math.ceil(gaps.length * 0.6);
    const cad = cadenceFor(medianGap);
    if (cad === 'Irregular' || !consistent) return;

    const amounts = sorted.map((t) => Math.abs(t.amount));
    const typical = amounts.reduce((s, x) => s + x, 0) / amounts.length;
    const latest = sorted[sorted.length - 1];
    out.push({
      merchant: latest.merchant,
      category: latest.category,
      typicalAmount: typical,
      cadence: cad,
      count: sorted.length,
      lastDate: latest.date,
      monthlyEquivalent: typical * PER_MONTH[cad],
      latestId: latest.id,
    });
  });

  return out.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
}

export function recurringMonthlyTotal(items: Recurring[]): number {
  return items.reduce((s, r) => s + r.monthlyEquivalent, 0);
}
