import { buildNetWorthHistory } from './data';
import { Category, DataSet, InvestmentAccount, NetWorthPoint, Txn } from './types';
import { currentMonthKey } from './format';
import { effectivePerson, isExcluded } from './people';
import { isIgnored } from './ignore';

/**
 * All derived numbers are pure selectors over a DataSet, so they work identically
 * for the sample data and for a live SimpleFIN connection.
 */

// ─── Investments ────────────────────────────────────────────────────────────────

export function accountValue(acc: InvestmentAccount): number {
  return acc.cash + acc.holdings.reduce((s, h) => s + h.shares * h.price, 0);
}

export function accountCost(acc: InvestmentAccount): number {
  return acc.holdings.reduce((s, h) => s + h.shares * h.costBasis, 0);
}

export function investmentsTotal(d: DataSet): number {
  return d.investments.reduce((s, a) => s + accountValue(a), 0);
}

export function investmentsGain(d: DataSet): { gain: number; pct: number } {
  const value = d.investments.reduce((s, a) => s + a.holdings.reduce((x, h) => x + h.shares * h.price, 0), 0);
  const cost = d.investments.reduce((s, a) => s + accountCost(a), 0);
  return { gain: value - cost, pct: cost > 0 ? ((value - cost) / cost) * 100 : 0 };
}

// ─── Net worth ──────────────────────────────────────────────────────────────────

export function cashTotal(d: DataSet): number {
  return d.accounts.reduce((s, a) => s + a.balance, 0);
}

export function manualAssetsTotal(d: DataSet): number {
  return (d.manualAssets ?? []).reduce((s, a) => s + a.value, 0);
}

export function assetsTotal(d: DataSet): number {
  return cashTotal(d) + investmentsTotal(d) + manualAssetsTotal(d);
}

export function creditCardDebt(d: DataSet): number {
  return d.creditCards.reduce((s, c) => s + c.balance, 0);
}

export function loanDebt(d: DataSet): number {
  return d.debts.reduce((s, x) => s + x.balance, 0);
}

export function liabilitiesTotal(d: DataSet): number {
  return creditCardDebt(d) + loanDebt(d);
}

export function netWorth(d: DataSet): number {
  return assetsTotal(d) - liabilitiesTotal(d);
}

/**
 * Use real accumulated snapshots when we have at least two; otherwise synthesize a
 * trend ending at today's snapshot so the chart isn't empty on day one.
 */
export function netWorthHistory(d: DataSet): NetWorthPoint[] {
  if (d.snapshots && d.snapshots.length >= 2) return d.snapshots;
  return buildNetWorthHistory(assetsTotal(d), liabilitiesTotal(d));
}

// ─── Spending & budgets ─────────────────────────────────────────────────────────

export function txnsForMonth(d: DataSet, ym: string): Txn[] {
  return d.transactions.filter((t) => t.date.startsWith(ym) && !isIgnored(d, t));
}

export function spendingByCategory(d: DataSet, ym: string): { category: Category; amount: number }[] {
  const map = new Map<Category, number>();
  txnsForMonth(d, ym).forEach((t) => {
    if (t.amount < 0) map.set(t.category, (map.get(t.category) ?? 0) + -t.amount);
  });
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function totalSpending(d: DataSet, ym: string): number {
  return txnsForMonth(d, ym).reduce((s, t) => (t.amount < 0 ? s + -t.amount : s), 0);
}

export function totalIncome(d: DataSet, ym: string): number {
  return txnsForMonth(d, ym).reduce((s, t) => (t.amount > 0 ? s + t.amount : s), 0);
}

export type BudgetStatus = {
  category: Category;
  limit: number;
  spent: number;
  remaining: number;
  pct: number;
};

export function budgetStatus(d: DataSet, ym: string): BudgetStatus[] {
  const spend = new Map(spendingByCategory(d, ym).map((s) => [s.category, s.amount]));
  return d.budgets.map((b) => {
    const spent = spend.get(b.category) ?? 0;
    return {
      category: b.category,
      limit: b.limit,
      spent,
      remaining: b.limit - spent,
      pct: b.limit > 0 ? (spent / b.limit) * 100 : 0,
    };
  });
}

export function budgetTotals(d: DataSet, ym: string) {
  const rows = budgetStatus(d, ym);
  const limit = rows.reduce((s, r) => s + r.limit, 0);
  const spent = rows.reduce((s, r) => s + r.spent, 0);
  return { limit, spent, remaining: limit - spent };
}

// ─── Projections ────────────────────────────────────────────────────────────────

export function recentMonthKeys(months: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let back = months - 1; back >= 0; back--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - back, 1);
    keys.push(`${dt.getFullYear()}-${dt.getMonth() + 1 < 10 ? '0' : ''}${dt.getMonth() + 1}`);
  }
  return keys;
}

/** Average monthly net savings from the last `months` months that have data. */
export function avgMonthlySavings(d: DataSet, months = 6): number {
  const keys = recentMonthKeys(months).filter((k) => txnsForMonth(d, k).length > 0);
  if (keys.length === 0) return 0;
  let sum = 0;
  keys.forEach((k) => {
    sum += totalIncome(d, k) - totalSpending(d, k);
  });
  return sum / keys.length;
}

export type Projection = { month: string; label: string; balance: number; saved: number };

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function projectSavings(d: DataSet, monthsAhead = 12): Projection[] {
  const monthly = avgMonthlySavings(d);
  let balance = cashTotal(d);
  const out: Projection[] = [];
  const now = new Date();
  for (let i = 1; i <= monthsAhead; i++) {
    const dt = new Date(now.getFullYear(), now.getMonth() + i, 1);
    balance += monthly;
    out.push({
      month: `${dt.getFullYear()}-${dt.getMonth() + 1 < 10 ? '0' : ''}${dt.getMonth() + 1}`,
      label: MONTHS_SHORT[dt.getMonth()],
      balance,
      saved: monthly * i,
    });
  }
  return out;
}

export function thisMonth() {
  return currentMonthKey();
}

/** Build a net worth snapshot for the current month from a dataset. */
export function snapshotFor(d: DataSet): NetWorthPoint {
  return { month: currentMonthKey(), assets: assetsTotal(d), liabilities: liabilitiesTotal(d) };
}

// ─── Periods (week / month / year) ───────────────────────────────────────────────

export type PeriodMode = 'week' | 'month' | 'year';
export type Period = { key: string; label: string; start: string; end: string }; // [start, end)

const M_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ymd(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  return x;
}

/** Recent periods, oldest first, most recent last (so a pill row reads left→right). */
export function periodsFor(mode: PeriodMode, count: number): Period[] {
  const now = new Date();
  const out: Period[] = [];
  for (let back = count - 1; back >= 0; back--) {
    if (mode === 'month') {
      const s = new Date(now.getFullYear(), now.getMonth() - back, 1);
      const e = new Date(now.getFullYear(), now.getMonth() - back + 1, 1);
      out.push({ key: `m-${ymd(s)}`, label: `${M_SHORT[s.getMonth()]}${back >= 11 ? ` '${String(s.getFullYear()).slice(2)}` : ''}`, start: ymd(s), end: ymd(e) });
    } else if (mode === 'year') {
      const y = now.getFullYear() - back;
      out.push({ key: `y-${y}`, label: String(y), start: `${y}-01-01`, end: `${y + 1}-01-01` });
    } else {
      const s = startOfWeek(now);
      s.setDate(s.getDate() - back * 7);
      const e = new Date(s);
      e.setDate(e.getDate() + 7);
      out.push({ key: `w-${ymd(s)}`, label: `${M_SHORT[s.getMonth()]} ${s.getDate()}`, start: ymd(s), end: ymd(e) });
    }
  }
  return out;
}

export function txnsInRange(d: DataSet, start: string, end: string): Txn[] {
  return d.transactions.filter((t) => t.date >= start && t.date < end && !isIgnored(d, t));
}

export function spendingByCategoryRange(d: DataSet, start: string, end: string): { category: Category; amount: number }[] {
  const map = new Map<Category, number>();
  txnsInRange(d, start, end).forEach((t) => {
    if (t.amount < 0) map.set(t.category, (map.get(t.category) ?? 0) + -t.amount);
  });
  return [...map.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

export function totalSpendingRange(d: DataSet, start: string, end: string): number {
  return txnsInRange(d, start, end).reduce((s, t) => (t.amount < 0 ? s + -t.amount : s), 0);
}

export function totalIncomeRange(d: DataSet, start: string, end: string): number {
  return txnsInRange(d, start, end).reduce((s, t) => (t.amount > 0 ? s + t.amount : s), 0);
}

// ─── Lookups ─────────────────────────────────────────────────────────────────────

export function accountName(d: DataSet, accountId: string): string {
  const a = d.accounts.find((x) => x.id === accountId);
  if (a) return a.name;
  const c = d.creditCards.find((x) => x.id === accountId);
  if (c) return c.name;
  // Imported/Rocket Money accounts carry a slugged id like "acct-chase-credit-card-1202".
  if (/^(acct|imp-acct)-/.test(accountId)) {
    const pretty = accountId
      .replace(/^(acct|imp-acct)-/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase());
    return pretty || 'Account';
  }
  return 'Account';
}

export function findTxn(d: DataSet, id: string): Txn | undefined {
  return d.transactions.find((t) => t.id === id);
}

// ─── Personal (per-person) budgets ───────────────────────────────────────────────

/** Spending transactions this month assigned to a person (newest first). */
export function txnsForPersonMonth(d: DataSet, person: string, ym: string): Txn[] {
  return txnsForMonth(d, ym)
    .filter((t) => t.amount < 0 && effectivePerson(d, t.id, t.accountId) === person)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** How much counts toward a person's allowance (excludes opted-out txns + groups). */
export function personSpend(d: DataSet, person: string, ym: string, excludedGroups: string[]): number {
  const ex = new Set(excludedGroups);
  return txnsForPersonMonth(d, person, ym).reduce((s, t) => {
    if (isExcluded(d, t.id)) return s;
    if (ex.has(t.category)) return s;
    return s + -t.amount;
  }, 0);
}

export type PersonStatus = {
  person: string;
  limit: number;
  spent: number;
  remaining: number;
  pct: number;
  excludedGroups: string[];
};

export function personBudgetStatus(d: DataSet, ym: string): PersonStatus[] {
  const budgets = d.personBudgets ?? [];
  return budgets.map((b) => {
    const spent = personSpend(d, b.person, ym, b.excludedGroups);
    return {
      person: b.person,
      limit: b.limit,
      spent,
      remaining: b.limit - spent,
      pct: b.limit > 0 ? (spent / b.limit) * 100 : 0,
      excludedGroups: b.excludedGroups,
    };
  });
}

export function personBudgetFor(d: DataSet, person: string) {
  return (d.personBudgets ?? []).find((b) => b.person === person);
}

// ─── Sorting ─────────────────────────────────────────────────────────────────────

export type TxnSort = 'date' | 'amountHigh' | 'amountLow' | 'category';

export function sortTxns(txns: Txn[], sort: TxnSort): Txn[] {
  const copy = [...txns];
  switch (sort) {
    case 'amountHigh':
      return copy.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    case 'amountLow':
      return copy.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
    case 'category':
      return copy.sort((a, b) => a.category.localeCompare(b.category) || (a.date < b.date ? 1 : -1));
    default:
      return copy.sort((a, b) => (a.date < b.date ? 1 : -1));
  }
}
