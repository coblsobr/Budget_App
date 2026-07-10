import { AccountClass, AccountClassOverrides, BankAccount, CreditCard, DataSet, Debt, InvestmentAccount } from './types';

// ─── Account reclassification ─────────────────────────────────────────────────
//
// SimpleFIN doesn't say what an account IS, so we guess from its name — and
// sometimes guess wrong (e.g. "Honda Financial" has a negative balance and no
// "loan" in the name, so it lands in credit cards). These user overrides move an
// account into the right bucket, converting the record shape as needed. Applied
// every time the dataset is composed, so it survives syncs.

type AnyAccount = {
  id: string;
  name: string;
  institution: string;
  owner: 'Cody' | 'Wife' | 'Joint';
  balance: number; // positive magnitude
  apr: number;
};

export function classOf(d: DataSet, id: string): AccountClass | null {
  if (d.accounts.some((a) => a.id === id)) return 'cash';
  if (d.creditCards.some((c) => c.id === id)) return 'credit';
  if (d.debts.some((x) => x.id === id)) return 'loan';
  if (d.investments.some((i) => i.id === id)) return 'investment';
  return null;
}

function extract(d: DataSet, id: string): { info: AnyAccount; from: AccountClass } | null {
  const a = d.accounts.find((x) => x.id === id);
  if (a) return { from: 'cash', info: { id, name: a.name, institution: a.institution, owner: a.owner, balance: Math.abs(a.balance), apr: 0 } };
  const c = d.creditCards.find((x) => x.id === id);
  if (c) return { from: 'credit', info: { id, name: c.name, institution: c.institution, owner: c.owner, balance: Math.abs(c.balance), apr: c.apr } };
  const dd = d.debts.find((x) => x.id === id);
  if (dd) return { from: 'loan', info: { id, name: dd.name, institution: '', owner: 'Joint', balance: Math.abs(dd.balance), apr: dd.apr } };
  const inv = d.investments.find((x) => x.id === id);
  if (inv) {
    const value = inv.cash + inv.holdings.reduce((s, h) => s + h.shares * h.price, 0);
    return { from: 'investment', info: { id, name: inv.name, institution: inv.institution, owner: inv.owner, balance: value, apr: 0 } };
  }
  return null;
}

/** Guess the loan flavor from the account name (shows the right label on Debts). */
export function guessDebtKind(name: string): Debt['kind'] {
  const n = name.toLowerCase();
  if (/(mortgage|home)/.test(n)) return 'mortgage';
  if (/(student|sallie|navient|mohela)/.test(n)) return 'student';
  if (/(auto|car|honda|toyota|ford|gm |chevr|nissan|hyundai|kia|subaru|vehicle)/.test(n)) return 'auto';
  return 'personal';
}

export function applyAccountClasses(d: DataSet, overrides: AccountClassOverrides): DataSet {
  const ids = Object.keys(overrides);
  if (ids.length === 0) return d;

  let accounts: BankAccount[] = d.accounts;
  let creditCards: CreditCard[] = d.creditCards;
  let debts: Debt[] = d.debts;
  let investments: InvestmentAccount[] = d.investments;
  const scratch: DataSet = { ...d };

  for (const id of ids) {
    const target = overrides[id];
    scratch.accounts = accounts;
    scratch.creditCards = creditCards;
    scratch.debts = debts;
    scratch.investments = investments;

    const current = classOf(scratch, id);
    if (!current || current === target) continue;
    const pulled = extract(scratch, id);
    if (!pulled) continue;
    const { info } = pulled;

    // Remove from its current bucket
    accounts = accounts.filter((x) => x.id !== id);
    creditCards = creditCards.filter((x) => x.id !== id);
    debts = debts.filter((x) => x.id !== id);
    investments = investments.filter((x) => x.id !== id);

    // Insert into the target bucket with a sensible shape
    if (target === 'cash') {
      accounts = [...accounts, { id, name: info.name, institution: info.institution || 'Bank', kind: 'checking', balance: info.balance, owner: info.owner }];
    } else if (target === 'credit') {
      creditCards = [...creditCards, { id, name: info.name, institution: info.institution || 'Bank', balance: info.balance, limit: 0, apr: info.apr, dueDay: 0, owner: info.owner }];
    } else if (target === 'loan') {
      debts = [...debts, { id, name: info.name, kind: guessDebtKind(info.name), balance: info.balance, originalBalance: info.balance, apr: info.apr, minPayment: 0 }];
    } else if (target === 'investment') {
      investments = [...investments, { id, name: info.name, institution: info.institution || 'Bank', kind: 'brokerage', owner: info.owner, holdings: [], cash: info.balance }];
    }
  }

  return { ...d, accounts, creditCards, debts, investments };
}
