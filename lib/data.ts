import {
  BankAccount,
  Budget,
  Category,
  CreditCard,
  DataSet,
  Debt,
  InvestmentAccount,
  NetWorthPoint,
  Txn,
} from './types';
import { DEFAULT_CATEGORIES } from './categories';

/**
 * DUMMY DATA
 * ----------
 * Everything here is made up so the app is fully clickable before any real accounts
 * are linked. When SimpleFIN is wired in, this module gets replaced by a data layer
 * that fetches/normalizes real data into the SAME types — screens won't change.
 */

export const accounts: BankAccount[] = [
  { id: 'chk1', name: 'Everyday Checking', institution: 'Chase', kind: 'checking', balance: 6240.18, owner: 'Joint' },
  { id: 'sav1', name: 'Emergency Fund', institution: 'Ally', kind: 'savings', balance: 18450.0, owner: 'Joint' },
  { id: 'sav2', name: 'House Down Payment', institution: 'Ally', kind: 'savings', balance: 9300.0, owner: 'Joint' },
  { id: 'chk2', name: 'Personal Checking', institution: 'Chase', kind: 'checking', balance: 1875.42, owner: 'Cody' },
];

export const creditCards: CreditCard[] = [
  { id: 'cc1', name: 'Sapphire Preferred', institution: 'Chase', balance: 1840.55, limit: 12000, apr: 22.49, dueDay: 14, owner: 'Cody' },
  { id: 'cc2', name: 'Amex Blue Cash', institution: 'American Express', balance: 624.1, limit: 8000, apr: 19.99, dueDay: 2, owner: 'Joint' },
  { id: 'cc3', name: 'Costco Visa', institution: 'Citi', balance: 312.74, limit: 6000, apr: 20.24, dueDay: 22, owner: 'Wife' },
];

export const debts: Debt[] = [
  { id: 'd1', name: 'Home Mortgage', kind: 'mortgage', balance: 284500, originalBalance: 320000, apr: 6.125, minPayment: 2150 },
  { id: 'd2', name: 'Honda Pilot Loan', kind: 'auto', balance: 18900, originalBalance: 34000, apr: 5.4, minPayment: 545 },
  { id: 'd3', name: 'Student Loan', kind: 'student', balance: 11250, originalBalance: 28000, apr: 4.5, minPayment: 290 },
];

export const investments: InvestmentAccount[] = [
  {
    id: 'inv1',
    name: '401(k)',
    institution: 'Fidelity',
    kind: '401k',
    owner: 'Cody',
    cash: 1200,
    holdings: [
      { ticker: 'FXAIX', name: 'Fidelity 500 Index', shares: 210.4, price: 188.32, costBasis: 142.1 },
      { ticker: 'FSPSX', name: 'Intl Index', shares: 95.2, price: 52.18, costBasis: 44.6 },
      { ticker: 'FXNAX', name: 'US Bond Index', shares: 140.0, price: 10.42, costBasis: 11.1 },
    ],
  },
  {
    id: 'inv2',
    name: 'Roth IRA',
    institution: 'Fidelity',
    kind: 'roth_ira',
    owner: 'Cody',
    cash: 350,
    holdings: [
      { ticker: 'VTI', name: 'Total US Market', shares: 48.0, price: 278.9, costBasis: 198.4 },
      { ticker: 'VXUS', name: 'Total Intl', shares: 60.0, price: 64.2, costBasis: 55.0 },
    ],
  },
  {
    id: 'inv3',
    name: 'Brokerage',
    institution: 'Fidelity',
    kind: 'brokerage',
    owner: 'Joint',
    cash: 820,
    holdings: [
      { ticker: 'AAPL', name: 'Apple', shares: 22, price: 232.5, costBasis: 150.2 },
      { ticker: 'MSFT', name: 'Microsoft', shares: 14, price: 441.2, costBasis: 305.0 },
      { ticker: 'NVDA', name: 'NVIDIA', shares: 30, price: 128.4, costBasis: 60.5 },
    ],
  },
];

export const budgets: Budget[] = [
  { category: 'Housing', limit: 2400 },
  { category: 'Groceries', limit: 900 },
  { category: 'Dining', limit: 450 },
  { category: 'Transportation', limit: 500 },
  { category: 'Utilities', limit: 380 },
  { category: 'Shopping', limit: 400 },
  { category: 'Health', limit: 250 },
  { category: 'Entertainment', limit: 200 },
  { category: 'Subscriptions', limit: 120 },
  { category: 'Kids', limit: 350 },
];

export const monthlyIncome = 9800; // combined take-home

// ─── Generated transactions (last 6 months) ─────────────────────────────────────

const MERCHANTS: Record<Category, string[]> = {
  Income: ['Payroll — Cody', 'Payroll — Wife'],
  Housing: ['Mortgage Payment'],
  Groceries: ['Costco', 'Kroger', 'Trader Joe’s', 'Whole Foods', 'Aldi'],
  Dining: ['Chipotle', 'Local Diner', 'Olive Garden', 'DoorDash', 'Starbucks'],
  Transportation: ['Shell', 'Chevron', 'Honda Finance', 'Uber', 'AutoZone'],
  Utilities: ['City Power', 'Water Dept', 'Comcast', 'AT&T Wireless', 'Gas Co'],
  Shopping: ['Amazon', 'Target', 'Home Depot', 'Best Buy', 'Nike'],
  Health: ['CVS Pharmacy', 'Dental Care', 'Dr. Office', 'GNC'],
  Entertainment: ['AMC Theatres', 'Steam', 'Concert Tickets', 'Bowling'],
  Subscriptions: ['Netflix', 'Spotify', 'iCloud', 'YouTube Premium', 'ChatGPT'],
  Travel: ['Delta Airlines', 'Marriott', 'Airbnb'],
  Kids: ['Daycare', 'Children’s Place', 'Toys R Us', 'School Lunch'],
  Misc: ['Venmo', 'ATM Withdrawal', 'Misc Purchase'],
};

// Rough monthly spend targets per category to make budgets land realistically.
const MONTHLY_TARGET: Partial<Record<Category, number>> = {
  Housing: 2150,
  Groceries: 870,
  Dining: 410,
  Transportation: 540,
  Utilities: 360,
  Shopping: 430,
  Health: 180,
  Entertainment: 160,
  Subscriptions: 96,
  Kids: 330,
};

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function generateTransactions(): Txn[] {
  const rnd = seededRandom(42);
  const txns: Txn[] = [];
  const now = new Date();
  let counter = 0;

  for (let back = 5; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-based
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const ym = `${year}-${pad(month + 1)}`;

    // Income twice a month
    txns.push({ id: `inc-${ym}-1`, date: `${ym}-01`, merchant: 'Payroll — Cody', amount: 3100, category: 'Income', accountId: 'chk1' });
    txns.push({ id: `inc-${ym}-2`, date: `${ym}-15`, merchant: 'Payroll — Wife', amount: 1800, category: 'Income', accountId: 'chk1' });
    txns.push({ id: `inc-${ym}-3`, date: `${ym}-16`, merchant: 'Payroll — Cody', amount: 3100, category: 'Income', accountId: 'chk1' });
    txns.push({ id: `inc-${ym}-4`, date: `${ym}-28`, merchant: 'Payroll — Wife', amount: 1800, category: 'Income', accountId: 'chk1' });

    (Object.keys(MONTHLY_TARGET) as Category[]).forEach((cat) => {
      const target = MONTHLY_TARGET[cat]!;
      if (cat === 'Housing') {
        txns.push({ id: `t${counter++}`, date: `${ym}-03`, merchant: 'Mortgage Payment', amount: -target, category: 'Housing', accountId: 'chk1' });
        return;
      }
      // spread the target across a handful of transactions with some noise
      const count = 3 + Math.floor(rnd() * 4);
      let remaining = target * (0.85 + rnd() * 0.3); // +-15% monthly variance
      for (let i = 0; i < count; i++) {
        const share = i === count - 1 ? remaining : remaining * (0.2 + rnd() * 0.4);
        remaining -= share;
        const merchants = MERCHANTS[cat];
        const merchant = merchants[Math.floor(rnd() * merchants.length)];
        const day = 1 + Math.floor(rnd() * daysInMonth);
        const acct = rnd() > 0.5 ? 'cc1' : rnd() > 0.5 ? 'cc2' : 'chk1';
        txns.push({
          id: `t${counter++}`,
          date: `${ym}-${pad(day)}`,
          merchant,
          amount: -Math.round(share * 100) / 100,
          category: cat,
          accountId: acct,
        });
        if (remaining <= 1) break;
      }
    });
  }

  return txns.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const transactions: Txn[] = generateTransactions();

// The complete sample dataset, in the same shape a live SimpleFIN sync produces.
export const sampleDataSet: DataSet = {
  accounts,
  creditCards,
  investments,
  debts,
  transactions,
  budgets,
  categories: DEFAULT_CATEGORIES,
  merchantRules: {},
  people: ['You', 'Wife', 'Shared'],
  personBudgets: [
    { person: 'You', limit: 300, excludedGroups: ['Housing', 'Utilities', 'Transportation'] },
    { person: 'Wife', limit: 300, excludedGroups: ['Housing', 'Utilities', 'Transportation'] },
  ],
  txnPerson: {},
  excludedTxns: {},
};

// Net worth history derived to trend upward toward today's snapshot.
export function buildNetWorthHistory(currentAssets: number, currentLiabilities: number): NetWorthPoint[] {
  const points: NetWorthPoint[] = [];
  const now = new Date();
  for (let back = 11; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const t = (11 - back) / 11; // 0..1
    // assets grow, liabilities shrink, with mild wobble
    const wobble = Math.sin(back) * 1500;
    points.push({
      month: ym,
      assets: Math.round(currentAssets * (0.86 + 0.14 * t) + wobble),
      liabilities: Math.round(currentLiabilities * (1.08 - 0.08 * t)),
    });
  }
  return points;
}
