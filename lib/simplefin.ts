/**
 * SimpleFIN Bridge client
 * -----------------------
 * SimpleFIN is a read-only protocol for pulling bank / card / investment data.
 * Flow:
 *   1. User creates a one-time **setup token** at https://bridge.simplefin.org
 *      (or any SimpleFIN server). It's a base64-encoded "claim" URL.
 *   2. We base64-decode it and POST (empty body) to that claim URL exactly once.
 *      The response body is a permanent **access URL** of the form
 *      https://USER:PASSWORD@server/simplefin — credentials are inline.
 *   3. We split those credentials out and GET `${base}/accounts` with an
 *      `Authorization: Basic` header. (Embedding user:pass in a fetch URL is rejected
 *      by browsers, so we never fetch the raw access URL directly.)
 *
 * Docs: https://www.simplefin.org/protocol.html
 */

export type SFOrg = { domain?: string; name?: string; url?: string; 'sfin-url'?: string };

export type SFTransaction = {
  id: string;
  posted: number; // unix seconds
  amount: string; // decimal string, negative = money out
  description?: string;
  payee?: string;
  memo?: string;
  pending?: boolean;
};

export type SFHolding = {
  id: string;
  created?: number;
  cost_basis?: string;
  description?: string;
  market_value?: string;
  purchase_price?: string;
  shares?: string;
  symbol?: string;
};

export type SFAccount = {
  org: SFOrg;
  id: string;
  name: string;
  currency?: string;
  balance: string;
  'available-balance'?: string;
  'balance-date'?: number;
  transactions?: SFTransaction[];
  holdings?: SFHolding[];
};

export type SFAccountsResponse = { errors: string[]; accounts: SFAccount[] };

// ─── base64 (works on web atob/btoa, Hermes, or pure-JS fallback) ────────────────

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64decode(input: string): string {
  const g: any = globalThis as any;
  const s = input.trim();
  if (typeof g.atob === 'function') return g.atob(s);
  if (typeof g.Buffer !== 'undefined') return g.Buffer.from(s, 'base64').toString('binary');
  let str = s.replace(/=+$/, '');
  let out = '';
  for (let bc = 0, bs = 0, buffer, i = 0; (buffer = str.charAt(i++)); ) {
    const idx = B64.indexOf(buffer);
    if (idx === -1) continue;
    bs = bc % 4 ? bs * 64 + idx : idx;
    if (bc++ % 4) out += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
  }
  return out;
}

function b64encode(input: string): string {
  const g: any = globalThis as any;
  if (typeof g.btoa === 'function') return g.btoa(input);
  if (typeof g.Buffer !== 'undefined') return g.Buffer.from(input, 'binary').toString('base64');
  let out = '';
  for (let i = 0; i < input.length; ) {
    const c1 = input.charCodeAt(i++);
    const c2 = input.charCodeAt(i++);
    const c3 = input.charCodeAt(i++);
    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (c2 >> 4);
    let e3 = ((c2 & 15) << 2) | (c3 >> 6);
    let e4 = c3 & 63;
    if (isNaN(c2)) e3 = e4 = 64;
    else if (isNaN(c3)) e4 = 64;
    out += B64.charAt(e1) + B64.charAt(e2) + (e3 === 64 ? '=' : B64.charAt(e3)) + (e4 === 64 ? '=' : B64.charAt(e4));
  }
  return out;
}

// ─── credential parsing ──────────────────────────────────────────────────────────

type Parsed = { base: string; auth: string | null };

/** Split `https://user:pass@host/path` into a clean base URL + Basic auth header value. */
function parseAccessUrl(accessUrl: string): Parsed {
  const m = accessUrl.match(/^(https?:\/\/)(?:([^@/]+)@)?(.+)$/);
  if (!m) return { base: accessUrl, auth: null };
  const [, scheme, creds, rest] = m;
  const base = `${scheme}${rest}`.replace(/\/+$/, '');
  const auth = creds ? `Basic ${b64encode(creds)}` : null;
  return { base, auth };
}

// ─── public API ──────────────────────────────────────────────────────────────────

/** Step 2: exchange a setup token for a permanent access URL. */
export async function claimAccessUrl(setupToken: string): Promise<string> {
  const claimUrl = b64decode(setupToken);
  if (!/^https?:\/\//.test(claimUrl)) {
    throw new Error('That setup token doesn’t look valid. Paste the full token from your SimpleFIN bridge.');
  }
  const res = await fetch(claimUrl, { method: 'POST' });
  if (!res.ok) {
    throw new Error(
      `Could not claim setup token (HTTP ${res.status}). Setup tokens are single-use — generate a fresh one if this was already claimed.`
    );
  }
  const accessUrl = (await res.text()).trim();
  if (!/^https?:\/\//.test(accessUrl)) {
    throw new Error('Unexpected response while claiming the setup token.');
  }
  return accessUrl;
}

export type FetchOptions = { startDate?: number; balancesOnly?: boolean };

/** Step 3: fetch accounts (balances, transactions, holdings). */
export async function fetchAccounts(accessUrl: string, opts: FetchOptions = {}): Promise<SFAccountsResponse> {
  const { base, auth } = parseAccessUrl(accessUrl);
  const params: string[] = [];
  if (opts.startDate) params.push(`start-date=${opts.startDate}`);
  if (opts.balancesOnly) params.push('balances-only=1');
  const url = `${base}/accounts${params.length ? `?${params.join('&')}` : ''}`;

  const res = await fetch(url, { headers: auth ? { Authorization: auth } : undefined });
  if (res.status === 403) {
    throw new Error('Access was rejected (HTTP 403). The connection may have been revoked — reconnect with a new setup token.');
  }
  if (!res.ok) throw new Error(`Sync failed (HTTP ${res.status}).`);

  const json = (await res.json()) as SFAccountsResponse;
  return { errors: json.errors ?? [], accounts: json.accounts ?? [] };
}

/** Default lookback window for transactions: ~6 months. */
export function defaultStartDate(): number {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return Math.floor(d.getTime() / 1000);
}
