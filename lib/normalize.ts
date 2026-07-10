import { SFAccount, SFAccountsResponse } from './simplefin';
import {
  BankAccount,
  Budget,
  CreditCard,
  DataSet,
  Debt,
  Holding,
  InvestmentAccount,
  Txn,
} from './types';
import { categorize } from './categorize';
import { DEFAULT_CATEGORIES } from './categories';
import { MerchantRules } from './types';

const num = (s?: string) => {
  const n = parseFloat(s ?? '');
  return Number.isFinite(n) ? n : 0;
};

function isoDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`;
}

type Kind = 'checking' | 'savings' | 'credit' | 'investment' | 'loan';

function classify(acc: SFAccount): Kind {
  if (acc.holdings && acc.holdings.length > 0) return 'investment';
  const name = `${acc.org?.name ?? ''} ${acc.name ?? ''}`.toLowerCase();
  const bal = num(acc.balance);

  if (/(mortgage|student loan|auto loan|\bloan\b)/.test(name)) return 'loan';
  // Auto-financing arms that don't say "loan" in the account name.
  if (/(honda financial|toyota financial|gm financial|ford credit|ally auto|nissan motor acceptance|hyundai motor finance|kia finance|carmax auto|capital one auto|chrysler capital|vw credit|subaru motors finance)/.test(name)) return 'loan';
  if (/(credit|card|visa|mastercard|amex|american express|discover)/.test(name)) return 'credit';
  if (/(401k|403b|ira|roth|brokerage|invest|hsa|fidelity|vanguard|schwab)/.test(name)) return 'investment';
  if (/(saving|reserve|emergency)/.test(name)) return 'savings';
  // Negative balance with no better signal usually means a card or loan.
  if (bal < 0) return 'credit';
  return 'checking';
}

function investmentKind(name: string): InvestmentAccount['kind'] {
  const n = name.toLowerCase();
  if (n.includes('401')) return '401k';
  if (n.includes('roth') || n.includes('ira')) return 'roth_ira';
  if (n.includes('hsa')) return 'hsa';
  return 'brokerage';
}

function toHolding(h: NonNullable<SFAccount['holdings']>[number]): Holding {
  const shares = num(h.shares) || 1;
  const marketValue = num(h.market_value);
  const cost = num(h.cost_basis);
  return {
    ticker: h.symbol || (h.description ? h.description.slice(0, 6).toUpperCase() : '—'),
    name: h.description || h.symbol || 'Holding',
    shares: num(h.shares),
    price: shares ? marketValue / shares : marketValue,
    costBasis: shares ? cost / shares : 0,
  };
}

/** Default budgets to use when connecting (SimpleFIN provides none). */
export const DEFAULT_BUDGETS: Budget[] = [
  { category: 'Housing', limit: 2000 },
  { category: 'Groceries', limit: 800 },
  { category: 'Dining', limit: 400 },
  { category: 'Transportation', limit: 500 },
  { category: 'Utilities', limit: 350 },
  { category: 'Shopping', limit: 400 },
  { category: 'Health', limit: 250 },
  { category: 'Entertainment', limit: 200 },
  { category: 'Subscriptions', limit: 120 },
  { category: 'Kids', limit: 300 },
];

/**
 * Convert a raw SimpleFIN /accounts response into the app's DataSet.
 * Existing user config (budgets, groups, merchant rules) is preserved.
 */
export function normalizeSimpleFin(
  res: SFAccountsResponse,
  existing?: { budgets?: Budget[]; categories?: string[]; merchantRules?: MerchantRules }
): DataSet {
  const accounts: BankAccount[] = [];
  const creditCards: CreditCard[] = [];
  const investments: InvestmentAccount[] = [];
  const debts: Debt[] = [];
  const transactions: Txn[] = [];

  for (const acc of res.accounts) {
    const kind = classify(acc);
    const bal = num(acc.balance);
    const institution = acc.org?.name || acc.org?.domain || 'Bank';

    if (kind === 'investment') {
      const holdings = (acc.holdings ?? []).map(toHolding);
      const holdingsValue = holdings.reduce((s, h) => s + h.shares * h.price, 0);
      investments.push({
        id: acc.id,
        name: acc.name,
        institution,
        kind: investmentKind(`${acc.name} ${institution}`),
        owner: 'Joint',
        holdings,
        cash: Math.max(0, bal - holdingsValue), // leftover balance treated as cash
      });
    } else if (kind === 'credit') {
      creditCards.push({
        id: acc.id,
        name: acc.name,
        institution,
        balance: Math.abs(bal), // amount owed
        limit: 0, // SimpleFIN doesn't expose a credit limit — set in-app later
        apr: 0,
        dueDay: 1,
        owner: 'Joint',
      });
    } else if (kind === 'loan') {
      const owed = Math.abs(bal);
      debts.push({
        id: acc.id,
        name: acc.name,
        kind: /mortgage/i.test(acc.name) ? 'mortgage' : /auto/i.test(acc.name) ? 'auto' : /student/i.test(acc.name) ? 'student' : 'personal',
        balance: owed,
        originalBalance: owed, // unknown history -> assume current; edit in-app later
        apr: 0,
        minPayment: 0,
      });
    } else {
      accounts.push({
        id: acc.id,
        name: acc.name,
        institution,
        kind: kind === 'savings' ? 'savings' : 'checking',
        balance: bal,
        owner: 'Joint',
      });
    }

    // Transactions (skip investment accounts — those are holdings, not spending)
    if (kind !== 'investment') {
      for (const t of acc.transactions ?? []) {
        const amount = num(t.amount);
        const desc = t.payee || t.description || t.memo || 'Transaction';
        transactions.push({
          id: t.id,
          date: isoDate(t.posted),
          merchant: desc,
          amount,
          category: categorize(desc, amount),
          accountId: acc.id,
        });
      }
    }
  }

  transactions.sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    accounts,
    creditCards,
    investments,
    debts,
    transactions,
    budgets: existing?.budgets && existing.budgets.length ? existing.budgets : DEFAULT_BUDGETS,
    categories: existing?.categories && existing.categories.length ? existing.categories : DEFAULT_CATEGORIES,
    merchantRules: existing?.merchantRules ?? {},
  };
}
