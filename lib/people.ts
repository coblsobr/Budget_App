import { BankAccount, CreditCard, DataSet } from './types';

export const DEFAULT_PEOPLE = ['You', 'Wife', 'Shared'];

/** Map an account/card owner label to a person label. */
export function ownerToPerson(owner: BankAccount['owner'] | CreditCard['owner']): string {
  if (owner === 'Cody') return 'You';
  if (owner === 'Wife') return 'Wife';
  return 'Shared';
}

export function peopleOf(d: DataSet): string[] {
  return d.people && d.people.length ? d.people : DEFAULT_PEOPLE;
}

function ownerForAccount(d: DataSet, accountId: string): BankAccount['owner'] | CreditCard['owner'] {
  const a = d.accounts.find((x) => x.id === accountId);
  if (a) return a.owner;
  const c = d.creditCards.find((x) => x.id === accountId);
  if (c) return c.owner;
  return 'Joint';
}

/** Whose transaction is this — manual override if set, else the account owner. */
export function effectivePerson(d: DataSet, txnId: string, accountId: string): string {
  const override = d.txnPerson?.[txnId];
  if (override) return override;
  return ownerToPerson(ownerForAccount(d, accountId));
}

export function isExcluded(d: DataSet, txnId: string): boolean {
  return !!d.excludedTxns?.[txnId];
}
