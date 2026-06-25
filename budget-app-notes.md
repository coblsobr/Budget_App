# Budget App – Pending Work & Feature Requests

## 1. Fix: Ignored Transactions Should Be Global

**Status:** Needs verification / likely needs fix.

When a transaction is marked as "ignored," it should be excluded from **all** calculations across **all tabs** — spending, income, net worth, graphs, etc. Currently it may only be ignored in the tab where the action was taken.

- Audit the ignored transaction logic to confirm it's applied at the data layer (not per-tab)
- Make sure every tab/view filters out ignored transactions before computing totals or rendering charts

---

## 2. Feature: Manually Add Assets

Allow the user to manually add assets that aren't tied to a financial account import (e.g., car, house, investment property).

- Add an "Assets" section or form where the user can enter:
  - Asset name (e.g., "2021 Honda Civic", "Primary Residence")
  - Current estimated value
  - Asset type/category (vehicle, real estate, other)
  - Optional: purchase date, purchase price
- These assets should factor into net worth calculations
- User should be able to edit or delete them at any time

---

## 3. Feature: Full Transaction History Backup

Most financial institutions only expose the last 90 days of transactions via their API/feeds. We need a way to preserve data long-term.

- Transactions already imported should be persisted locally (database/file) and never purged
- Add an export option so the user can back up their full transaction history (e.g., CSV or JSON download)
- Consider a backup reminder or indicator showing the date of the oldest stored transaction

---

## 4. Feature: Import Transactions from CSV (e.g., Rocket Money)

Allow the user to upload a CSV file of transactions exported from a service like Rocket Money (or any bank).

- Build a CSV import flow with field mapping (date, amount, name/description, category, account)
- **Duplicate detection:** Before inserting, check each incoming transaction against existing records by comparing:
  - Date
  - Amount
  - Name/description
- If a match is found, skip the import for that row (or flag it for user review)
- Show a summary after import: X added, Y duplicates skipped

---

## 5. Feature: Expanded Graphs & Data Visualization

Add rich charts and historical views across accounts and categories.

- **Per-account spending over time** — e.g., a line or bar chart for each credit card or bank account
- **Category breakdowns** — pie/donut or bar chart showing spending by category over a selected period
- **Credit card spending combined view** — all credit cards aggregated on one chart
- **Bank account balance history** — running balance over time per account
- **Income vs. spending** — side-by-side comparison over weeks/months
- Allow filtering by date range (last 30 / 90 / 365 days, or custom)
- All graphs should respect the ignored-transaction filter (see item 1)

---

## 6. Feature: Budgets Section – Expand/Collapse & Per-Person Budgets

### Expand/Collapse All Budgets

- Add an **"Expand All" / "Collapse All"** toggle button at the top of the Budgets section
- Each individual budget category should also have its own expand/collapse chevron
- Collapsed state shows just the budget name, amount, and a progress bar
- Expanded state shows the transaction-level breakdown within that budget

### Per-Person Budgets

- Add a separate section (below or alongside the main budgets) for **individual people**
- Each person gets their own budget with:
  - Person's name
  - Budget amount / period (monthly, weekly, etc.)
  - Spending tracked against their transactions
- Useful for households where multiple people have separate spending allowances
- Should support adding, editing, and deleting people and their budgets
- Consider a summary view showing all people side-by-side (name, budget, spent, remaining)

---

## Notes

- Items 3 and 4 are related — the import feature is the primary way to backfill history beyond the 90-day window
- All new data (manual assets, imported transactions) should be included in net worth and graph calculations
- Prioritize item 1 (ignored transactions) as a bug fix before building new features
