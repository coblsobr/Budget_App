import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Budget,
  DataSet,
  DataSource,
  IgnoreRule,
  ManualAsset,
  MerchantRules,
  NetWorthPoint,
  PersonBudget,
  SyncStatus,
  Txn,
} from './types';
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
  loadPeople,
  savePeople,
  loadPersonBudgets,
  savePersonBudgets,
  loadTxnPerson,
  saveTxnPerson,
  loadExcludedTxns,
  saveExcludedTxns,
  loadIgnoreRules,
  saveIgnoreRules,
  loadManualAssets,
  saveManualAssets,
  loadImportedTxns,
  saveImportedTxns,
  loadSnapshots,
  saveSnapshots,
  recordSnapshot,
  saveLastSync,
  loadLastSync,
} from './storage';
import { DEFAULT_PEOPLE } from './people';

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
  importSnapshots: (points: NetWorthPoint[]) => void;
  addPerson: (name: string) => void;
  removePerson: (name: string) => void;
  setPersonBudget: (person: string, limit: number, excludedGroups: string[]) => void;
  setTxnPerson: (txnId: string, person: string) => void;
  setTxnExcluded: (txnId: string, excluded: boolean) => void;
  addIgnoreRule: (rule: IgnoreRule) => void;
  removeIgnoreRule: (id: string) => void;
  addManualAsset: (asset: ManualAsset) => void;
  updateManualAsset: (asset: ManualAsset) => void;
  removeManualAsset: (id: string) => void;
  /** Merge imported transactions (deduped). Returns counts. */
  importTransactions: (txns: Txn[]) => { added: number; skipped: number };
};

const DataContext = createContext<DataContextValue | null>(null);

type Config = {
  budgets?: Budget[];
  categories?: string[];
  merchantRules?: MerchantRules;
  people?: string[];
  personBudgets?: PersonBudget[];
  txnPerson?: Record<string, string>;
  excludedTxns?: Record<string, boolean>;
  ignoreRules?: IgnoreRule[];
  manualAssets?: ManualAsset[];
  importedTxns?: Txn[];
  snapshots?: DataSet['snapshots'];
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DataSet>(sampleDataSet);
  const [source, setSource] = useState<DataSource>('sample');
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // The raw (pre-rule) combined transactions, so we can re-apply merchant rules.
  const rawTxnsRef = useRef<Txn[]>(sampleDataSet.transactions);
  const baseTxnsRef = useRef<Txn[]>(sampleDataSet.transactions); // source (sample/synced) only
  const importedRef = useRef<Txn[]>([]); // user-imported via CSV

  // Build the displayed dataset from a raw "base" + the user's config, applying
  // merchant rules to the transactions. Stores the raw txns for later re-derivation.
  function compose(base: DataSet, cfg: Config): DataSet {
    const rules = cfg.merchantRules ?? base.merchantRules ?? {};
    baseTxnsRef.current = base.transactions;
    if (cfg.importedTxns) importedRef.current = cfg.importedTxns;
    const combined = [...base.transactions, ...importedRef.current];
    rawTxnsRef.current = combined;
    return {
      ...base,
      budgets: cfg.budgets ?? base.budgets,
      categories: cfg.categories ?? base.categories,
      merchantRules: rules,
      people: cfg.people ?? base.people ?? DEFAULT_PEOPLE,
      personBudgets: cfg.personBudgets ?? base.personBudgets ?? [],
      txnPerson: cfg.txnPerson ?? base.txnPerson ?? {},
      excludedTxns: cfg.excludedTxns ?? base.excludedTxns ?? {},
      ignoreRules: cfg.ignoreRules ?? base.ignoreRules ?? [],
      manualAssets: cfg.manualAssets ?? base.manualAssets ?? [],
      snapshots: cfg.snapshots ?? base.snapshots,
      transactions: applyRules(combined, rules),
    };
  }

  async function loadConfig(): Promise<Config> {
    const [budgets, categories, merchantRules, people, personBudgets, txnPerson, excludedTxns, ignoreRules, manualAssets, importedTxns] = await Promise.all([
      loadBudgets(),
      loadCategories(),
      loadMerchantRules(),
      loadPeople(),
      loadPersonBudgets(),
      loadTxnPerson(),
      loadExcludedTxns(),
      loadIgnoreRules(),
      loadManualAssets(),
      loadImportedTxns(),
    ]);
    return {
      budgets: budgets ?? undefined,
      categories: categories ?? undefined,
      merchantRules: merchantRules ?? undefined,
      people: people ?? undefined,
      personBudgets: personBudgets ?? undefined,
      txnPerson: txnPerson ?? undefined,
      excludedTxns: excludedTxns ?? undefined,
      ignoreRules: ignoreRules ?? undefined,
      manualAssets: manualAssets ?? undefined,
      importedTxns: importedTxns ?? undefined,
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
    importSnapshots: (points: NetWorthPoint[]) => {
      setData((prev) => ({ ...prev, snapshots: points }));
      saveSnapshots(points);
    },
    addPerson: (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      setData((prev) => {
        const people = prev.people ?? DEFAULT_PEOPLE;
        if (people.some((p) => p.toLowerCase() === clean.toLowerCase())) return prev;
        const next = [...people, clean];
        savePeople(next);
        return { ...prev, people: next };
      });
    },
    removePerson: (name: string) => {
      setData((prev) => {
        const people = (prev.people ?? DEFAULT_PEOPLE).filter((p) => p !== name);
        savePeople(people);
        const personBudgets = (prev.personBudgets ?? []).filter((b) => b.person !== name);
        savePersonBudgets(personBudgets);
        return { ...prev, people, personBudgets };
      });
    },
    setPersonBudget: (person: string, limit: number, excludedGroups: string[]) => {
      setData((prev) => {
        const existing = prev.personBudgets ?? [];
        const entry: PersonBudget = { person, limit, excludedGroups };
        const idx = existing.findIndex((b) => b.person === person);
        const personBudgets = idx >= 0 ? existing.map((b, i) => (i === idx ? entry : b)) : [...existing, entry];
        savePersonBudgets(personBudgets);
        return { ...prev, personBudgets };
      });
    },
    setTxnPerson: (txnId: string, person: string) => {
      setData((prev) => {
        const map = { ...(prev.txnPerson ?? {}), [txnId]: person };
        saveTxnPerson(map);
        return { ...prev, txnPerson: map };
      });
    },
    setTxnExcluded: (txnId: string, excluded: boolean) => {
      setData((prev) => {
        const map = { ...(prev.excludedTxns ?? {}) };
        if (excluded) map[txnId] = true;
        else delete map[txnId];
        saveExcludedTxns(map);
        return { ...prev, excludedTxns: map };
      });
    },
    addIgnoreRule: (rule: IgnoreRule) => {
      setData((prev) => {
        const ignoreRules = [...(prev.ignoreRules ?? []), rule];
        saveIgnoreRules(ignoreRules);
        return { ...prev, ignoreRules };
      });
    },
    removeIgnoreRule: (id: string) => {
      setData((prev) => {
        const ignoreRules = (prev.ignoreRules ?? []).filter((r) => r.id !== id);
        saveIgnoreRules(ignoreRules);
        return { ...prev, ignoreRules };
      });
    },
    addManualAsset: (asset: ManualAsset) => {
      setData((prev) => {
        const manualAssets = [...(prev.manualAssets ?? []), asset];
        saveManualAssets(manualAssets);
        return { ...prev, manualAssets };
      });
    },
    updateManualAsset: (asset: ManualAsset) => {
      setData((prev) => {
        const manualAssets = (prev.manualAssets ?? []).map((a) => (a.id === asset.id ? asset : a));
        saveManualAssets(manualAssets);
        return { ...prev, manualAssets };
      });
    },
    removeManualAsset: (id: string) => {
      setData((prev) => {
        const manualAssets = (prev.manualAssets ?? []).filter((a) => a.id !== id);
        saveManualAssets(manualAssets);
        return { ...prev, manualAssets };
      });
    },
    importTransactions: (txns: Txn[]) => {
      const existing = data.transactions;
      const isDup = (t: Txn) =>
        existing.some(
          (e) =>
            e.date === t.date &&
            Math.abs(e.amount - t.amount) < 0.005 &&
            e.merchant.trim().toLowerCase() === t.merchant.trim().toLowerCase()
        );
      const toAdd = txns.filter((t) => !isDup(t));
      const skipped = txns.length - toAdd.length;
      const newImported = [...importedRef.current, ...toAdd];
      importedRef.current = newImported;
      saveImportedTxns(newImported);
      const combined = [...baseTxnsRef.current, ...newImported];
      rawTxnsRef.current = combined;
      setData((prev) => ({ ...prev, transactions: applyRules(combined, prev.merchantRules) }));
      return { added: toAdd.length, skipped };
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
