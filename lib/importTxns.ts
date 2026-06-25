import { Txn } from './types';

/**
 * Parse a transactions CSV (Rocket Money, Mint, or a bank export) into Txn[].
 * Auto-detects common column names. Amount sign: uses a debit/credit type column
 * when present; otherwise keeps an explicit minus sign; otherwise assumes spending.
 */

function splitLine(line: string): string[] {
  const out: string[] = [];
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

const pad = (n: string | number) => (String(n).length < 2 ? `0${n}` : `${n}`);

function toIso(s: string): string | null {
  const v = (s || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    let [, mm, dd, yy] = m;
    if (yy.length === 2) yy = `20${yy}`;
    return `${yy}-${pad(mm)}-${pad(dd)}`;
  }
  return null;
}

function num(s: string): number {
  const cleaned = (s || '').replace(/[$,\s]/g, '').replace(/[()]/g, (m) => (m === '(' ? '-' : ''));
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function findCol(headers: string[], candidates: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const c of candidates) {
    const i = lower.indexOf(c);
    if (i >= 0) return i;
  }
  // partial contains
  for (let i = 0; i < lower.length; i++) {
    if (candidates.some((c) => lower[i].includes(c))) return i;
  }
  return -1;
}

function slug(s: string): string {
  return `imp-acct-${(s || 'imported').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

export type ParseResult = { txns: Txn[]; skipped: number; columns: string[] };

export function parseTransactionCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { txns: [], skipped: 0, columns: [] };

  const headers = splitLine(lines[0]);
  const cDate = findCol(headers, ['date', 'transaction date', 'posted date', 'original date']);
  const cAmount = findCol(headers, ['amount', 'debit', 'value']);
  const cName = findCol(headers, ['name', 'description', 'merchant', 'payee', 'custom name']);
  const cCategory = findCol(headers, ['category']);
  const cAccount = findCol(headers, ['account name', 'account', 'institution name']);
  const cType = findCol(headers, ['transaction type', 'type', 'debit/credit']);

  const txns: Txn[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const date = toIso(cells[cDate] ?? '');
    let amount = cAmount >= 0 ? num(cells[cAmount]) : NaN;
    if (!date || Number.isNaN(amount)) {
      skipped++;
      continue;
    }
    // Determine sign.
    const typeVal = cType >= 0 ? (cells[cType] ?? '').toLowerCase() : '';
    if (typeVal) {
      if (/credit|income|deposit|refund/.test(typeVal)) amount = Math.abs(amount);
      else if (/debit|expense|withdrawal|payment|purchase/.test(typeVal)) amount = -Math.abs(amount);
    } else if (amount > 0) {
      // No type column and a positive number — treat as spending by convention.
      amount = -amount;
    }
    const merchant = (cName >= 0 ? cells[cName] : '') || 'Imported transaction';
    const category = (cCategory >= 0 ? cells[cCategory] : '') || (amount > 0 ? 'Income' : 'Misc');
    const accountId = cAccount >= 0 && cells[cAccount] ? slug(cells[cAccount]) : 'imp-acct';

    txns.push({
      id: `imp-${date}-${Math.round(Math.abs(amount) * 100)}-${i}`,
      date,
      merchant,
      amount,
      category,
      accountId,
    });
  }

  return { txns, skipped, columns: headers };
}

// ─── Export ──────────────────────────────────────────────────────────────────

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsToCsv(txns: Txn[]): string {
  const header = 'Date,Merchant,Amount,Category,Account';
  const rows = txns
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((t) => [t.date, t.merchant, t.amount.toFixed(2), t.category, t.accountId].map(csvCell).join(','));
  return [header, ...rows].join('\n');
}

export function oldestDate(txns: Txn[]): string | null {
  if (txns.length === 0) return null;
  return txns.reduce((min, t) => (t.date < min ? t.date : min), txns[0].date);
}
