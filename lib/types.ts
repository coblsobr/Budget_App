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

/**
 * A rule that excludes matching transactions from all spending/income/budget math
 * (e.g. credit-card payments, transfers between your own accounts). A transaction
 * matches when ALL specified fields match; at least one field must be set.
 */
export type IgnoreRule = {
  id: string;
  label: string; // human-readable summary
  merchant?: string; // case-insensitive substring match on the merchant/description
  accountId?: string; // limit to one account
  amount?: number; // match this absolute dollar amount (for repeated transfers)
};

/**
 * A spending allowance for one person. Nothing counts by default; the person only
 * accrues spending from card+category pairs they've explicitly opted in via `included`
 * (accountId -> the categories on that card that count toward this person).
 */
export type PersonBudget = {
  person: string;
  limit: number; // monthly
  included?: Record<string, string[]>; // accountId -> included categories
  excludedGroups?: string[]; // legacy (unused by new model, kept for old data)
};

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
  /** People who can own spending (e.g. You, Wife, Shared). */
  people?: string[];
  /** Per-person monthly allowances. */
  personBudgets?: PersonBudget[];
  /** Per-transaction person override (txnId -> person). Defaults to account owner. */
  txnPerson?: Record<string, string>;
  /** Transactions manually removed from personal budgets (txnId -> true). */
  excludedTxns?: Record<string, boolean>;
  /** Rules that hide matching transactions from all totals (payments/transfers). */
  ignoreRules?: IgnoreRule[];
  /** Manually-entered assets (car, house, etc.) that count toward net worth. */
  manualAssets?: ManualAsset[];
  /** Real month-by-month net worth, accumulated from sync snapshots when available. */
  snapshots?: NetWorthPoint[];
};

/** A manually-entered asset not tied to a linked account (car, house, etc.). */
export type ManualAsset = {
  id: string;
  name: string;
  value: number;
  kind: 'vehicle' | 'real_estate' | 'investment' | 'cash' | 'other';
  purchaseDate?: string;
  purchasePrice?: number;
};

export type DataSource = 'sample' | 'simplefin';

export type SyncStatus = 'idle' | 'connecting' | 'syncing' | 'error';
