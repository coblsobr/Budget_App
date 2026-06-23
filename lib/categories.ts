/** Starter spending groups. Users can add their own; these just seed the list. */
export const DEFAULT_CATEGORIES: string[] = [
  'Income',
  'Housing',
  'Groceries',
  'Dining',
  'Transportation',
  'Utilities',
  'Shopping',
  'Health',
  'Entertainment',
  'Subscriptions',
  'Travel',
  'Kids',
  'Misc',
];

/** Groups that should never be offered as a spending bucket in pickers. */
export const NON_SPENDING = new Set(['Income']);

export function spendingCategories(all: string[]): string[] {
  return all.filter((c) => !NON_SPENDING.has(c));
}
