export type AccountKind = 'checking' | 'savings' | 'cash';

export type BankAccount = {
  id: string;
  name: string;
  institution: string;
  kind: AccountKind;
  balance: number;
  owner: 'Cody' | 'Wife' | 'Joint';
};

export type CreditCard = {
  id: string;
  name: string;
  institution: string;
  balance: number; // current statement balance owed (positive = owed)
  limit: number;
  apr: number; // annual %
  dueDay: number; // day of month
  owner: 'Cody' | 'Wife' | 'Joint';
};

export type Debt = {
  id: string;
  name: string;
  kind: 'mortgage' | 'auto' | 'student' | 'personal';
  balance: number;
  originalBalance: number;
  apr: number;
  minPayment: number;
};

export type Holding = {
  ticker: string;
  name: string;
  shares: number;
  price: number;
  costBasis: number; // per share
};

export type InvestmentAccount = {
  id: string;
  name: string;
  institution: string;
  kind: '401k' | 'roth_ira' | 'brokerage' | 'hsa';
  owner: 'Cody' | 'Wife' | 'Joint';
  holdings: Holding[];
  cash: number;
};

// Categories ("groups") are user-editable, so this is just a string. The starter
// set lives in lib/categories.ts; users can add their own.
export type Category = string;

export type Txn = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  merchant: string;
  amount: number; // negative = spending, positive = income
  category: Category;
  accountId: string;
};

export type Budget = {
  category: Category;
  limit: number; // monthly
};

export type NetWorthPoint = {
  month: string; // yyyy-mm
  assets: number;
  liabilities: number;
};

/**
 * The full set of data the app renders. The sample data and a live SimpleFIN
 * connection both produce a DataSet in this exact shape, so screens never care
 * where the numbers came from.
 */
/** merchant (lowercased) -> category. Applied on top of raw categorization. */
export type MerchantRules = Record<string, string>;

export type DataSet = {
  accounts: BankAccount[];
  creditCards: CreditCard[];
  investments: InvestmentAccount[];
  debts: Debt[];
  transactions: Txn[];
  budgets: Budget[];
  /** The full list of spending groups the user can assign / budget against. */
  categories: string[];
  /** Auto-categorization rules: a merchant always maps to a group. */
  merchantRules: MerchantRules;
  /** Real month-by-month net worth, accumulated from sync snapshots when available. */
  snapshots?: NetWorthPoint[];
};

export type DataSource = 'sample' | 'simplefin';

export type SyncStatus = 'idle' | 'connecting' | 'syncing' | 'error';
