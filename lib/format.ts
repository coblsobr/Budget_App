// Formatting helpers. Intentionally avoids Intl / toLocaleString so output is
// identical on web and on Android's Hermes engine (whose Intl support varies).

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function groupThousands(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function money(n: number, opts: { cents?: boolean; sign?: boolean } = {}): string {
  const { cents = false, sign = false } = opts;
  const abs = Math.abs(n);
  const fixed = abs.toFixed(cents ? 2 : 0);
  const [intPart, decPart] = fixed.split('.');
  let s = `$${groupThousands(intPart)}`;
  if (decPart) s += `.${decPart}`;
  if (n < 0) return `-${s}`;
  if (sign && n > 0) return `+${s}`;
  return s;
}

/** Compact money for axes / chips: $1.2k, $284k, $1.4M */
export function moneyCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function percent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function monthLabel(ym: string): string {
  const m = Number(ym.split('-')[1]);
  return MONTHS_SHORT[m - 1] ?? '';
}

export function monthLabelLong(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

export function dateLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}`;
}

export function currentMonthKey(): string {
  const now = new Date();
  const m = now.getMonth() + 1;
  return `${now.getFullYear()}-${m < 10 ? '0' : ''}${m}`;
}
