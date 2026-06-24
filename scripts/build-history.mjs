// Parses "Priorities - Finances.csv" (months across the top) into the app's
// net-worth history and writes lib/history.generated.ts.
//
// Net worth per month uses your own "Total Worth" row. Liabilities = "Debts I owe"
// + "All Credit Cards"; assets = net worth + liabilities (so the split stays
// consistent with your bottom line).
//
// Run: node scripts/build-history.mjs
// (Also runs automatically in CI on a monthly schedule.)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSV = join(root, 'Priorities - Finances.csv');
const OUT = join(root, 'lib', 'history.generated.ts');

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (ch === ',' && !q) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function monthKey(label) {
  if (!label) return null;
  const parts = label.split('-');
  if (parts.length < 2) return null;
  const m = MONTHS[parts[0].slice(0, 3).toLowerCase()];
  const yr = parseInt(parts[1], 10);
  if (!m || Number.isNaN(yr)) return null;
  const year = yr < 100 ? 2000 + yr : yr;
  return `${year}-${String(m).padStart(2, '0')}`;
}

function num(s) {
  if (s == null) return 0;
  const cleaned = s.replace(/[$,\s]/g, '');
  if (cleaned === '' || cleaned === '-') return 0;
  const v = parseFloat(cleaned);
  return Number.isFinite(v) ? v : 0;
}

function buildSnapshots(text) {
  const rows = text.split(/\r?\n/).filter((l) => l.trim().length).map(splitCsvLine);
  const header = rows[0];
  const find = (name) => rows.find((r) => r[0].trim().toLowerCase() === name.toLowerCase());
  const total = find('Total Worth');
  const debts = find('Debts I owe');
  const cards = find('All Credit Cards');
  if (!total) throw new Error('Could not find a "Total Worth" row in the CSV.');

  const seen = new Map();
  for (let c = 1; c < header.length; c++) {
    const ym = monthKey(header[c]);
    if (!ym) continue;
    const cell = total[c];
    if (cell == null || cell.trim() === '') continue; // skip months with no data
    const li = num(debts?.[c]) + num(cards?.[c]);
    const net = num(cell);
    seen.set(ym, { month: ym, assets: net + li, liabilities: li });
  }
  return [...seen.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

if (!existsSync(CSV)) {
  console.error(`No CSV found at ${CSV} — skipping history generation.`);
  process.exit(0);
}

const snapshots = buildSnapshots(readFileSync(CSV, 'utf8'));
const banner = `// AUTO-GENERATED from "Priorities - Finances.csv" by scripts/build-history.mjs.\n// Do not edit by hand — update the CSV and re-run the script (or let CI do it monthly).\n`;
const body = `import { NetWorthPoint } from './types';\n\nexport const PRIORITIES_HISTORY: NetWorthPoint[] = ${JSON.stringify(snapshots, null, 2)};\n`;
writeFileSync(OUT, banner + '\n' + body);
console.log(`Wrote ${snapshots.length} months to ${OUT}`);
