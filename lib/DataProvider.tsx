import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Budget, DataSet, DataSource, MerchantRules, SyncStatus } from './types';
import { sampleDataSet } from './data';
import { snapshotFor } from './calc';
import { claimAccessUrl, fetchAccounts, defaultStartDate } from './simplefin';
import { normalizeSimpleFin } from './normalize';
import { applyRules, merchantKey } from './rules';
import { DEFAULT_CATEGORIES } from './categories';
import {
  saveAccessUrl,
  loadAccessUrl,
  clearConnection,
  saveDataset,
  loadDataset,
  loadBudgets,
  saveBudgets,
  loadCategories,
  saveCategories,
  loadMerchantRules,
  saveMerchantRules,
  loadSnapshots,
  recordSnapshot,
  saveLastSync,
  loadLastSync,
} from './storage';

type DataContextValue = {
  data: DataSet;
  source: DataSource;
  isConnected: boolean;
  status: SyncStatus;
  error: string | null;
  lastSync: string | null;
  connect: (setupToken: string) => Promise<void>;
  sync: () => Promise<void>;
  disconnect: () => Promise<void>;
  setBudgets: (budgets: Budget[]) => void;
  addCategory: (name: string) => void;
  removeCategory: (name: string) => void;
  setMerchantRule: (merchant: string, category: string) => void;
  clearMerchantRule: (merchant: string) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

type Config = {
  budgets?: Budget[];
  categories?: string[];
  merchantRules?: MerchantRules;
  snapshots?: DataSet['snapshots'];
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DataSet>(sampleDataSet);
  const [source, setSource] = useState<DataSource>('sample');
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // The raw (pre-rule) transactions, so we can re-apply / revert merchant rules.
  const rawTxnsRef = useRef(sampleDataSet.transactions);

  // Build the displayed dataset from a raw "base" + the user's config, applying
  // merchant rules to the transactions. Stores the raw txns for later re-derivation.
  function compose(base: DataSet, cfg: Config): DataSet {
    const rules = cfg.merchantRules ?? base.merchantRules ?? {};
    rawTxnsRef.current = base.transactions;
    return {
      ...base,
      budgets: cfg.budgets ?? base.budgets,
      categories: cfg.categories ?? base.categories,
      merchantRules: rules,
      snapshots: cfg.snapshots ?? base.snapshots,
      transactions: applyRules(base.transactions, rules),
    };
  }

  async function loadConfig(): Promise<Config> {
    const [budgets, categories, merchantRules] = await Promise.all([
      loadBudgets(),
      loadCategories(),
      loadMerchantRules(),
    ]);
    return {
      budgets: budgets ?? undefined,
      categories: categories ?? undefined,
      merchantRules: merchantRules ?? undefined,
    };
  }

  // Core sync routine. Caches the RAW dataset (rules applied only for display).
  async function runSync(accessUrl: string, cfg: Config) {
    setStatus('syncing');
    setError(null);
    try {
      const res = await fetchAccounts(accessUrl, { startDate: defaultStartDate() });
      const normalized = normalizeSimpleFin(res, cfg);
      const snaps = await recordSnapshot(snapshotFor(normalized));
      const base: DataSet = { ...normalized, snapshots: snaps };
      await saveDataset(base);
      setData(compose(base, {}));
      const iso = new Date().toISOString();
      await saveLastSync(iso);
      setLastSync(iso);
      setError(res.errors.length ? res.errors.join(' · ') : null);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Sync failed.');
    }
  }

  // On launch: restore connection + cached data, then refresh in the background.
  useEffect(() => {
    (async () => {
      const cfg = await loadConfig();
      const snaps = await loadSnapshots();
      const accessUrl = await loadAccessUrl();

      if (accessUrl) {
        setSource('simplefin');
        const cached = await loadDataset();
        const ls = await loadLastSync();
        if (ls) setLastSync(ls);
        if (cached) {
          setData(compose(cached, { ...cfg, snapshots: snaps.length ? snaps : cached.snapshots }));
        }
        runSync(accessUrl, cfg);
      } else {
        setData(compose(sampleDataSet, cfg));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: DataContextValue = {
    data,
    source,
    isConnected: source === 'simplefin',
    status,
    error,
    lastSync,
    connect: async (setupToken: string) => {
      setStatus('connecting');
      setError(null);
      try {
        const accessUrl = await claimAccessUrl(setupToken.trim());
        await saveAccessUrl(accessUrl);
        setSource('simplefin');
        await runSync(accessUrl, await loadConfig());
      } catch (e: any) {
        setStatus('error');
        setError(e?.message ?? 'Could not connect.');
      }
    },
    sync: async () => {
      const accessUrl = await loadAccessUrl();
      if (!accessUrl) {
        setError('Not connected.');
        return;
      }
      await runSync(accessUrl, await loadConfig());
    },
    disconnect: async () => {
      await clearConnection();
      setSource('sample');
      setLastSync(null);
      setError(null);
      setStatus('idle');
      setData(compose(sampleDataSet, await loadConfig()));
    },
    setBudgets: (budgets: Budget[]) => {
      setData((prev) => ({ ...prev, budgets }));
      saveBudgets(budgets);
    },
    addCategory: (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      setData((prev) => {
        if (prev.categories.some((c) => c.toLowerCase() === clean.toLowerCase())) return prev;
        const categories = [...prev.categories, clean];
        saveCategories(categories);
        return { ...prev, categories };
      });
    },
    removeCategory: (name: string) => {
      setData((prev) => {
        const categories = prev.categories.filter((c) => c !== name);
        saveCategories(categories);
        return { ...prev, categories };
      });
    },
    setMerchantRule: (merchant: string, category: string) => {
      setData((prev) => {
        const rules: MerchantRules = { ...prev.merchantRules, [merchantKey(merchant)]: category };
        saveMerchantRules(rules);
        let categories = prev.categories;
        if (!categories.some((c) => c.toLowerCase() === category.toLowerCase())) {
          categories = [...categories, category];
          saveCategories(categories);
        }
        return { ...prev, merchantRules: rules, categories, transactions: applyRules(rawTxnsRef.current, rules) };
      });
    },
    clearMerchantRule: (merchant: string) => {
      setData((prev) => {
        const rules: MerchantRules = { ...prev.merchantRules };
        delete rules[merchantKey(merchant)];
        saveMerchantRules(rules);
        return { ...prev, merchantRules: rules, transactions: applyRules(rawTxnsRef.current, rules) };
      });
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
