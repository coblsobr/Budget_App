# Budget App

A personal budgeting + net worth app for you and your wife. One codebase runs on
**PC (web)** and **Android** (sideloaded APK). No Apple developer account needed.

Right now it runs entirely on **made-up sample data** so you can click through every
screen. Linking real accounts via **SimpleFIN** comes next — it will fill these same
screens with your real data without changing the UI.

## What's in here

Bottom tabs:

- **Home** — net worth, this month's income/spending/saved, budget status, 12-month
  savings projection, and shortcuts to Investments / Credit Cards / Debts.
- **Budgets** — per-category limits with progress bars; tap − / + to adjust a limit.
- **Spending** — month picker, category donut, category breakdown, transaction list.
- **Net Worth** — assets vs. liabilities, 12-month trend, full breakdown.
- **Settings** — live theme customization (presets + custom accent / gain / loss colors).

Detail screens (off Home and Net Worth): **Investments** (Fidelity-style holdings),
**Credit Cards** (balances, utilization, APR, due dates), **Debts** (mortgage / auto /
student with payoff progress).

## Run it

From inside the `budget-app` folder:

```bash
npm install
npx expo install expo-secure-store @react-native-async-storage/async-storage
npx expo start
```

The second command adds the two storage packages the SimpleFIN integration needs, at
versions matched to this Expo SDK. (They're only required on Android — the web build
runs without them.)

Then:

- Press **w** to open the **PC web app** in your browser.
- Press **a** to open on an **Android emulator**, or scan the QR code with **Expo Go**
  on your Android phone for instant testing.

To make the sideloadable Android APK later: `npx expo run:android` (or an EAS build).

## Where things live

- `lib/data.ts` — all the dummy data (accounts, cards, investments, debts, transactions).
  This is the one file SimpleFIN will eventually replace.
- `lib/calc.ts` — derived numbers (net worth, spending by category, projections).
- `lib/format.ts` — money / date formatting.
- `theme/theme.tsx` — color palettes + the live theming system.
- `components/` — shared UI (`ui.tsx`), charts (`charts.tsx`), icons (`icons.tsx`).
- `app/` — screens (file-based routing via expo-router).

## Connecting real accounts (SimpleFIN)

SimpleFIN is a **read-only** way to pull bank, card, and Fidelity data — it can't move
money. To connect:

1. Make a free account at https://bridge.simplefin.org and link your institutions.
2. Generate a **Setup Token**.
3. In the app: **Settings → SimpleFIN Bridge → paste token → Connect.**

The app exchanges that one-time token for a permanent access URL, stored securely
(Keychain/Keystore on Android, localStorage on web). After that, **Sync now** refreshes,
and every screen shows your real data instead of the sample set. **Disconnect** wipes the
credential (your budgets and saved net-worth history are kept).

How the integration is wired:

- `lib/simplefin.ts` — protocol client (claim token, fetch accounts, Basic-auth handling).
- `lib/normalize.ts` — maps SimpleFIN accounts/holdings/transactions into the app's types
  and classifies each account (checking / savings / credit / investment / loan).
- `lib/categorize.ts` — keyword rules that bucket transactions (SimpleFIN has no categories).
- `lib/storage.ts` — secure + regular persistence.
- `lib/DataProvider.tsx` — the data layer the whole app reads from; flips between sample
  and live data and accumulates real net-worth snapshots on each sync.

## Notes / next steps (good things to tweak)

- Budgets now **persist**; theme choice is still in-memory (resets on reload) — easy to
  persist next.
- SimpleFIN gives current balances but **not** credit limits, APRs, or loan history, so
  those fields are blank for real accounts until you set them in-app. Adding editable
  fields for limit/APR/payoff is a natural follow-up.
- Transaction categorization is keyword-based — expect some to land in "Misc" until we add
  per-merchant overrides.
- Real net-worth history builds up one snapshot per month as you sync (until then the chart
  shows a synthesized trend).
