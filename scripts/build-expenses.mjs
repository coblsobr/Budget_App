// Parses "Priorities - AllExpenses.csv" (Rocket Money export) into the app's
// transactions and writes lib/importedTxns.generated.ts.
//
// Rocket Money convention: Amount is POSITIVE for spending, NEGATIVE for money in
// (payments/refunds/income). The app uses the opposite (negative = spending), so we
// flip the sign. Credit-card-payment / transfer rows are dropped so they don't
// double-count against real spending.
//
// Run: node scripts/build-expenses.mjs   (also runs in CI before each publish)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSV = join(root, 'Priorities - AllExpenses.csv');
const OUT = join(root, 'lib', 'importedTxns.generated.ts');

function splitLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

const pad = (n) => (String(n).length < 2 ? `0${n}` : `${n}`);
function toIso(s) {
  const v = (s || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) { let [, mm, dd, yy] = m; if (yy.length === 2) yy = `20${yy}`; return `${yy}-${pad(mm)}-${pad(dd)}`; }
  return null;
}
function num(s) {
  const c = (s || '').replace(/[$,\s]/g, '');
  const n = parseFloat(c);
  return Number.isFinite(n) ? n : NaN;
}

const CAT = {
  'dining & drinks': 'Dining', restaurants: 'Dining', 'coffee shops': 'Dining', 'fast food': 'Dining',
  groceries: 'Groceries',
  shopping: 'Shopping', clothing: 'Shopping', 'furniture & housewares': 'Shopping', 'home & garden': 'Shopping', 'home improvement': 'Shopping',
  'auto & transport': 'Transportation', gas: 'Transportation', 'gas & fuel': 'Transportation', parking: 'Transportation', 'public transit': 'Transportation', 'auto payment': 'Transportation', 'auto insurance': 'Transportation',
  'bills & utilities': 'Utilities', utilities: 'Utilities', 'internet & cable': 'Utilities', phone: 'Utilities',
  'travel & vacation': 'Travel', travel: 'Travel',
  'entertainment & recreation': 'Entertainment', entertainment: 'Entertainment',
  medical: 'Health', 'health & wellness': 'Health', fitness: 'Health', 'medical & healthcare': 'Health',
  subscriptions: 'Subscriptions', 'software & tech': 'Subscriptions',
  paychecks: 'Income', income: 'Income', interest: 'Income', 'business income': 'Income',
  kids: 'Kids', children: 'Kids', 'child care': 'Kids', 'child activities': 'Kids',
};

function mapCategory(raw) {
  const key = (raw || '').trim().toLowerCase();
  if (CAT[key]) return CAT[key];
  // Title-case the original so nothing is lost.
  return (raw || 'Misc').trim().replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()) || 'Misc';
}

function slug(s) {
  return `acct-${(s || 'imported').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

if (!existsSync(CSV)) {
  console.error(`No CSV at ${CSV} — writing empty file.`);
  writeFileSync(OUT, `import { Txn } from './types';\n\nexport const IMPORTED_TXNS: Txn[] = [];\n`);
  process.exit(0);
}

const lines = readFileSync(CSV, 'utf8').split(/\r?\n/).filter((l) => l.trim().length);
const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
const ix = (name) => headers.indexOf(name);
const cDate = ix('date') >= 0 ? ix('date') : 0;
const cAcctName = ix('account name');
const cAcctNum = ix('account number');
const cInst = ix('institution name');
const cName = ix('name');
const cCustom = ix('custom name');
const cAmount = ix('amount');
const cCategory = ix('category');

const txns = [];
let dropped = 0;
for (let i = 1; i < lines.length; i++) {
  const c = splitLine(lines[i]);
  const date = toIso(c[cDate]);
  const rawAmt = num(c[cAmount]);
  if (!date || Number.isNaN(rawAmt)) { dropped++; continue; }
  const rawCat = c[cCategory] ?? '';
  const name = (c[cCustom] || c[cName] || 'Transaction').trim();
  // Drop card payments / transfers so they don't double-count.
  if (/payment|transfer/i.test(rawCat) || /automatic payment|online payment|payment - thank|autopay|e-payment/i.test(name)) {
    dropped++;
    continue;
  }
  const amount = -rawAmt; // flip Rocket Money sign to app convention
  const acctLabel = [c[cInst], c[cAcctName], c[cAcctNum]].filter(Boolean).join(' ');
  txns.push({
    id: `rm-${date}-${Math.round(Math.abs(amount) * 100)}-${i}`,
    date,
    merchant: name,
    amount: Math.round(amount * 100) / 100,
    category: mapCategory(rawCat),
    accountId: slug(acctLabel),
  });
}

txns.sort((a, b) => (a.date < b.date ? 1 : -1));

const banner = `// AUTO-GENERATED from "Priorities - AllExpenses.csv" by scripts/build-expenses.mjs.\n// Do not edit by hand — replace the CSV and re-run the script (or let CI do it on push).\n`;
writeFileSync(OUT, `${banner}\nimport { Txn } from './types';\n\nexport const IMPORTED_TXNS: Txn[] = ${JSON.stringify(txns, null, 2)};\n`);
console.log(`Wrote ${txns.length} transactions (${dropped} payment/transfer rows dropped) to ${OUT}`);
