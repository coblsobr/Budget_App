import { NetWorthPoint } from './types';

/**
 * Parse a net-worth history CSV into snapshots.
 *
 * Expected columns (header row, case-insensitive, order-flexible):
 *   Month, Cash & Bank, Investments, Credit Card Debt, Loans & Debt
 *
 * - Month must look like YYYY-MM (e.g. 2026-01).
 * - Dollar values may include $ and commas; blanks count as 0.
 * - Assets   = Cash & Bank + Investments
 * - Liabilities = Credit Card Debt + Loans & Debt
 *
 * Rows that don't start with a YYYY-MM month are skipped (so header/notes/examples
 * are ignored automatically).
 */

function splitCsvLine(line: string): string[] {
  // Minimal CSV: handles quoted cells with commas.
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

const numCell = (s: string | undefined): number => {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const MONTH_RE = /^\d{4}-\d{2}$/;

function findCol(headers: string[], ...names: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (const name of names) {
    const idx = lower.indexOf(name.toLowerCase());
    if (idx >= 0) return idx;
  }
  return -1;
}

export type ImportResult = { points: NetWorthPoint[]; rows: number; skipped: number };

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function monthKeyFromLabel(label: string): string | null {
  // Handles "Jan-19", "March-21", "2026-01"
  if (MONTH_RE.test(label.trim())) return label.trim();
  const parts = label.split('-');
  if (parts.length < 2) return null;
  const m = MONTH_NAMES[parts[0].slice(0, 3).toLowerCase()];
  const yr = parseInt(parts[1], 10);
  if (!m || Number.isNaN(yr)) return null;
  const year = yr < 100 ? 2000 + yr : yr;
  return `${year}-${m < 10 ? '0' : ''}${m}`;
}

/** "Priorities - Finances" style: months across the top, metrics down the side. */
function parseTransposed(rows: string[][]): ImportResult {
  const header = rows[0];
  const find = (name: string) => rows.find((r) => r[0].trim().toLowerCase() === name.toLowerCase());
  const total = find('total worth');
  const debts = find('debts i owe');
  const cards = find('all credit cards');
  if (!total) return { points: [], rows: 0, skipped: 0 };

  const seen = new Map<string, NetWorthPoint>();
  let skipped = 0;
  for (let c = 1; c < header.length; c++) {
    const ym = monthKeyFromLabel(header[c] ?? '');
    const cell = total[c];
    if (!ym || cell == null || cell.trim() === '') {
      skipped++;
      continue;
    }
    const li = numCell(debts?.[c]) + numCell(cards?.[c]);
    const net = numCell(cell);
    seen.set(ym, { month: ym, assets: net + li, liabilities: li });
  }
  const points = [...seen.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
  return { points, rows: points.length, skipped };
}

export function parseHistoryCsv(text: string): ImportResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { points: [], rows: 0, skipped: 0 };

  // Detect the transposed "Total Worth" layout and handle it.
  const allRows = lines.map(splitCsvLine);
  if (allRows.some((r) => r[0]?.trim().toLowerCase() === 'total worth')) {
    return parseTransposed(allRows);
  }

  // Locate the header row (first row that contains "month").
  let headerIdx = lines.findIndex((l) => l.toLowerCase().includes('month'));
  if (headerIdx < 0) headerIdx = 0;
  const headers = splitCsvLine(lines[headerIdx]);

  const cMonth = findCol(headers, 'month');
  const cCash = findCol(headers, 'cash & bank', 'cash', 'bank', 'cash and bank');
  const cInv = findCol(headers, 'investments', 'investment');
  const cCC = findCol(headers, 'credit card debt', 'credit cards', 'credit card', 'cards');
  const cLoan = findCol(headers, 'loans & debt', 'loans', 'debt', 'loans and debt');

  const points: NetWorthPoint[] = [];
  let skipped = 0;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const month = (cells[cMonth] ?? cells[0] ?? '').trim();
    if (!MONTH_RE.test(month)) {
      skipped++;
      continue;
    }
    const cash = numCell(cells[cCash]);
    const inv = numCell(cells[cInv]);
    const cc = numCell(cells[cCC]);
    const loan = numCell(cells[cLoan]);
    points.push({ month, assets: cash + inv, liabilities: cc + loan });
  }

  // Sort ascending and de-dupe by month (last wins).
  const byMonth = new Map<string, NetWorthPoint>();
  points.forEach((p) => byMonth.set(p.month, p));
  const merged = [...byMonth.values()].sort((a, b) => (a.month < b.month ? -1 : 1));

  return { points: merged, rows: merged.length, skipped };
}
