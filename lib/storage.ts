import { Platform } from 'react-native';
import { Budget, DataSet, IgnoreRule, ManualAsset, MerchantRules, NetWorthPoint, PersonBudget, Txn } from './types';

/**
 * Cross-platform persistence.
 * - The SimpleFIN access URL contains credentials, so it goes in **secure storage**
 *   (expo-secure-store / Keychain / Keystore) on device, and localStorage on web.
 * - Everything else (cached data, budgets, snapshots) is plain key/value:
 *   AsyncStorage on device, localStorage on web.
 */

const isWeb = Platform.OS === 'web';

// Lazy native modules (never imported on web).
let SecureStore: typeof import('expo-secure-store') | null = null;
let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default | null = null;
if (!isWeb) {
  SecureStore = require('expo-secure-store');
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

// ─── low-level KV ────────────────────────────────────────────────────────────────

async function secureSet(key: string, value: string) {
  if (isWeb) localStorage.setItem(key, value);
  else await SecureStore!.setItemAsync(key, value);
}
async function secureGet(key: string): Promise<string | null> {
  if (isWeb) return localStorage.getItem(key);
  return SecureStore!.getItemAsync(key);
}
async function secureDel(key: string) {
  if (isWeb) localStorage.removeItem(key);
  else await SecureStore!.deleteItemAsync(key);
}

async function kvSet(key: string, value: string) {
  if (isWeb) localStorage.setItem(key, value);
  else await AsyncStorage!.setItem(key, value);
}
async function kvGet(key: string): Promise<string | null> {
  if (isWeb) return localStorage.getItem(key);
  return AsyncStorage!.getItem(key);
}
async function kvDel(key: string) {
  if (isWeb) localStorage.removeItem(key);
  else await AsyncStorage!.removeItem(key);
}

// ─── keys ──────────────────────────────────────────────────────────────────────

const K = {
  accessUrl: 'simplefin_access_url',
  dataset: 'cached_dataset',
  budgets: 'budgets',
  categories: 'categories',
  merchantRules: 'merchant_rules',
  people: 'people',
  personBudgets: 'person_budgets',
  txnPerson: 'txn_person',
  excludedTxns: 'excluded_txns',
  ignoreRules: 'ignore_rules',
  manualAssets: 'manual_assets',
  importedTxns: 'imported_txns',
  snapshots: 'networth_snapshots',
  lastSync: 'last_sync',
} as const;

async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await kvGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── connection (sensitive) ──────────────────────────────────────────────────────

export const saveAccessUrl = (url: string) => secureSet(K.accessUrl, url);
export const loadAccessUrl = () => secureGet(K.accessUrl);
export const clearAccessUrl = () => secureDel(K.accessUrl);

// ─── cached dataset ──────────────────────────────────────────────────────────────

export async function saveDataset(data: DataSet) {
  await kvSet(K.dataset, JSON.stringify(data));
}
export async function loadDataset(): Promise<DataSet | null> {
  const raw = await kvGet(K.dataset);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DataSet;
  } catch {
    return null;
  }
}

// ─── budgets (source-agnostic, user-owned) ───────────────────────────────────────

export async function saveBudgets(budgets: Budget[]) {
  await kvSet(K.budgets, JSON.stringify(budgets));
}
export async function loadBudgets(): Promise<Budget[] | null> {
  const raw = await kvGet(K.budgets);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Budget[];
  } catch {
    return null;
  }
}

// ─── categories & merchant rules (user-owned) ────────────────────────────────────

export async function saveCategories(categories: string[]) {
  await kvSet(K.categories, JSON.stringify(categories));
}
export async function loadCategories(): Promise<string[] | null> {
  const raw = await kvGet(K.categories);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return null;
  }
}

export async function saveMerchantRules(rules: MerchantRules) {
  await kvSet(K.merchantRules, JSON.stringify(rules));
}
export async function loadMerchantRules(): Promise<MerchantRules | null> {
  const raw = await kvGet(K.merchantRules);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MerchantRules;
  } catch {
    return null;
  }
}

// ─── people & personal budgets (user-owned) ──────────────────────────────────────

export const savePeople = (people: string[]) => kvSet(K.people, JSON.stringify(people));
export const loadPeople = () => getJSON<string[]>(K.people);

export const savePersonBudgets = (b: PersonBudget[]) => kvSet(K.personBudgets, JSON.stringify(b));
export const loadPersonBudgets = () => getJSON<PersonBudget[]>(K.personBudgets);

export const saveTxnPerson = (m: Record<string, string>) => kvSet(K.txnPerson, JSON.stringify(m));
export const loadTxnPerson = () => getJSON<Record<string, string>>(K.txnPerson);

export const saveExcludedTxns = (m: Record<string, boolean>) => kvSet(K.excludedTxns, JSON.stringify(m));
export const loadExcludedTxns = () => getJSON<Record<string, boolean>>(K.excludedTxns);

export const saveIgnoreRules = (r: IgnoreRule[]) => kvSet(K.ignoreRules, JSON.stringify(r));
export const loadIgnoreRules = () => getJSON<IgnoreRule[]>(K.ignoreRules);

export const saveManualAssets = (a: ManualAsset[]) => kvSet(K.manualAssets, JSON.stringify(a));
export const loadManualAssets = () => getJSON<ManualAsset[]>(K.manualAssets);

export const saveImportedTxns = (t: Txn[]) => kvSet(K.importedTxns, JSON.stringify(t));
export const loadImportedTxns = () => getJSON<Txn[]>(K.importedTxns);

// ─── net worth snapshots (accumulate one per sync/day) ────────────────────────────

export async function saveSnapshots(points: NetWorthPoint[]) {
  await kvSet(K.snapshots, JSON.stringify(points));
}

export async function loadSnapshots(): Promise<NetWorthPoint[]> {
  const raw = await kvGet(K.snapshots);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as NetWorthPoint[];
  } catch {
    return [];
  }
}

export async function recordSnapshot(point: NetWorthPoint): Promise<NetWorthPoint[]> {
  const all = await loadSnapshots();
  const idx = all.findIndex((p) => p.month === point.month);
  if (idx >= 0) all[idx] = point; // one point per month (latest wins)
  else all.push(point);
  all.sort((a, b) => (a.month < b.month ? -1 : 1));
  await kvSet(K.snapshots, JSON.stringify(all));
  return all;
}

// ─── sync metadata ───────────────────────────────────────────────────────────────

export const saveLastSync = (iso: string) => kvSet(K.lastSync, iso);
export const loadLastSync = () => kvGet(K.lastSync);

// ─── wipe everything (disconnect) ────────────────────────────────────────────────

export async function clearConnection() {
  await clearAccessUrl();
  await kvDel(K.dataset);
  await kvDel(K.lastSync);
  // budgets + snapshots are intentionally kept so the user doesn't lose them.
}
