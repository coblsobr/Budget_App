import { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row, ProgressBar } from '../../components/ui';
import { ChevronRight } from '../../components/icons';
import { useTheme, type, radius, space, Palette } from '../../theme/theme';
import { money } from '../../lib/format';
import { useData } from '../../lib/DataProvider';
import { parseHistoryCsv } from '../../lib/importHistory';
import { parseTransactionCsv, transactionsToCsv, oldestDate } from '../../lib/importTxns';
import { dateLabel } from '../../lib/format';

const ACCENT_SWATCHES = ['#4f8cff', '#a78bfa', '#34d399', '#f472b6', '#fb923c', '#22d3ee', '#facc15', '#f43f5e'];
const POSITIVE_SWATCHES = ['#33d6a6', '#4ade80', '#22c55e', '#10b981'];
const NEGATIVE_SWATCHES = ['#ff6b6b', '#fb7185', '#f43f5e', '#ef4444'];

export default function Settings() {
  const { palette, presets, setPreset, setColor, resetCustom } = useTheme();
  const router = useRouter();

  return (
    <Screen title="Settings">
      <SectionTitle>Appearance</SectionTitle>

      {/* Live preview */}
      <Card style={{ backgroundColor: palette.primarySoft, borderColor: palette.primary }}>
        <Text style={{ color: palette.textMuted, fontSize: type.tiny, fontWeight: '600' }}>PREVIEW</Text>
        <Text style={{ color: palette.text, fontSize: type.title, fontWeight: '800', marginTop: 2 }}>
          {money(126840)}
        </Text>
        <Row style={{ gap: 12, marginTop: 6 }}>
          <Text style={{ color: palette.positive, fontWeight: '700' }}>+{money(2400)}</Text>
          <Text style={{ color: palette.negative, fontWeight: '700' }}>-{money(1850)}</Text>
        </Row>
        <View style={{ marginTop: 10 }}>
          <ProgressBar pct={64} />
        </View>
      </Card>

      {/* Theme presets */}
      <Text style={{ color: palette.textMuted, fontSize: type.small, marginTop: 4 }}>Theme</Text>
      <Row style={{ flexWrap: 'wrap', gap: space.md }}>
        {presets.map((p) => (
          <PresetChip key={p.name} preset={p} active={palette.name === p.name} onPress={() => setPreset(p.name)} />
        ))}
      </Row>

      {/* Accent */}
      <SwatchRow
        title="Accent color"
        swatches={ACCENT_SWATCHES}
        selected={palette.primary}
        onPick={(c) => setColor('primary', c)}
      />
      <SwatchRow
        title="Income / gains"
        swatches={POSITIVE_SWATCHES}
        selected={palette.positive}
        onPick={(c) => setColor('positive', c)}
      />
      <SwatchRow
        title="Spending / losses"
        swatches={NEGATIVE_SWATCHES}
        selected={palette.negative}
        onPick={(c) => setColor('negative', c)}
      />

      <Pressable onPress={resetCustom} style={{ paddingVertical: 10 }}>
        <Text style={{ color: palette.primary, fontSize: type.small, fontWeight: '600' }}>Reset to default theme</Text>
      </Pressable>

      {/* People */}
      <SectionTitle>People</SectionTitle>
      <Card onPress={() => router.push('/people')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>People & Personal Budgets</Text>
            <Text style={{ color: palette.textMuted, fontSize: type.small, marginTop: 2 }}>
              Allowances per person, with groups to ignore
            </Text>
          </View>
          <ChevronRight color={palette.textMuted} />
        </Row>
      </Card>

      {/* Spending groups */}
      <SectionTitle>Spending Groups</SectionTitle>
      <GroupsCard />

      {/* Ignored transactions */}
      <SectionTitle>Ignored</SectionTitle>
      <IgnoredRulesCard />

      {/* Transactions backup + import */}
      <SectionTitle>Transactions</SectionTitle>
      <BackupCard />

      {/* Import history */}
      <SectionTitle>Net Worth History</SectionTitle>
      <ImportHistoryCard />

      {/* Connections */}
      <SectionTitle>Connections</SectionTitle>
      <SimpleFinCard />

      <SectionTitle>About</SectionTitle>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: palette.textMuted, fontSize: type.small }}>Version</Text>
          <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600' }}>1.0.0 · sample data</Text>
        </Row>
      </Card>
    </Screen>
  );
}

function BackupCard() {
  const { palette } = useTheme();
  const { data, importTransactions } = useData();
  const [msg, setMsg] = useState<string | null>(null);
  const oldest = oldestDate(data.transactions);

  const download = (filename: string, content: string, mime: string) => {
    if (Platform.OS !== 'web') {
      setMsg('Export/import runs in the web version for now.');
      return;
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    download('transactions.csv', transactionsToCsv(data.transactions), 'text/csv');
    setMsg(`Exported ${data.transactions.length} transactions to CSV.`);
  };
  const exportJson = () => {
    download('transactions.json', JSON.stringify(data.transactions, null, 2), 'application/json');
    setMsg(`Exported ${data.transactions.length} transactions to JSON.`);
  };

  const importCsv = () => {
    if (Platform.OS !== 'web') {
      setMsg('Import runs in the web version for now.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const { txns, skipped } = parseTransactionCsv(await file.text());
        if (txns.length === 0) {
          setMsg('No valid rows found. Make sure the file has Date and Amount columns.');
          return;
        }
        const res = importTransactions(txns);
        setMsg(`Imported ${res.added} transaction${res.added === 1 ? '' : 's'}; skipped ${res.skipped} duplicate${res.skipped === 1 ? '' : 's'}.`);
      } catch {
        setMsg('Could not read that file. Make sure it’s a CSV.');
      }
    };
    input.click();
  };

  return (
    <Card style={{ gap: space.md }}>
      <Text style={{ color: palette.textMuted, fontSize: type.small, lineHeight: 19 }}>
        {data.transactions.length} transactions stored
        {oldest ? `, oldest ${dateLabel(oldest)} (${oldest.slice(0, 4)})` : ''}. Back them up, or import a CSV from Rocket
        Money / your bank (duplicates are skipped automatically).
      </Text>
      <Row style={{ gap: space.md }}>
        <Button label="Export CSV" onPress={exportCsv} primary />
        <Button label="Export JSON" onPress={exportJson} />
      </Row>
      <Button label="Import CSV" onPress={importCsv} />
      {msg ? <Text style={{ color: palette.text, fontSize: type.small }}>{msg}</Text> : null}
    </Card>
  );
}

function ImportHistoryCard() {
  const { palette } = useTheme();
  const { importSnapshots, data } = useData();
  const [msg, setMsg] = useState<string | null>(null);
  const count = data.snapshots?.length ?? 0;

  const onPick = () => {
    if (Platform.OS !== 'web') {
      setMsg('For now, import from the web version. A file picker for Android is coming in the next build.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const { points, rows, skipped } = parseHistoryCsv(text);
        if (rows === 0) {
          setMsg('No valid rows found — make sure the Month column looks like 2026-01.');
          return;
        }
        importSnapshots(points);
        setMsg(`Imported ${rows} month${rows === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} non-data row(s)` : ''}. Check the Net Worth tab.`);
      } catch {
        setMsg('Could not read that file. Make sure it’s saved as CSV.');
      }
    };
    input.click();
  };

  return (
    <Card style={{ gap: space.md }}>
      <Text style={{ color: palette.textMuted, fontSize: type.small, lineHeight: 19 }}>
        Upload your filled-in history template (CSV) to chart real net-worth trends from your past balances.
        {count > 0 ? ` Currently loaded: ${count} month${count === 1 ? '' : 's'}.` : ''}
      </Text>
      <Row style={{ gap: space.md }}>
        <Button label="Upload CSV" onPress={onPick} primary />
      </Row>
      {msg ? <Text style={{ color: palette.text, fontSize: type.small }}>{msg}</Text> : null}
    </Card>
  );
}

function IgnoredRulesCard() {
  const { palette } = useTheme();
  const { data, removeIgnoreRule } = useData();
  const rules = data.ignoreRules ?? [];

  return (
    <Card style={{ gap: rules.length ? space.md : 0 }}>
      <Text style={{ color: palette.textMuted, fontSize: type.small }}>
        Transactions matching these are hidden from all totals. Add rules from a transaction’s detail screen.
      </Text>
      {rules.length === 0 ? null : (
        <View style={{ gap: 8 }}>
          {rules.map((r) => (
            <Row key={r.id} style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600', flex: 1, paddingRight: 10 }}>
                {r.label}
              </Text>
              <Pressable onPress={() => removeIgnoreRule(r.id)} hitSlop={8}>
                <Text style={{ color: palette.negative, fontSize: type.small, fontWeight: '600' }}>Remove</Text>
              </Pressable>
            </Row>
          ))}
        </View>
      )}
    </Card>
  );
}

function GroupsCard() {
  const { palette } = useTheme();
  const { data, addCategory, removeCategory } = useData();
  const [text, setText] = useState('');
  const ruleCount = Object.keys(data.merchantRules).length;

  const onAdd = () => {
    if (!text.trim()) return;
    addCategory(text.trim());
    setText('');
  };

  return (
    <Card style={{ gap: space.md }}>
      <Text style={{ color: palette.textMuted, fontSize: type.small }}>
        Groups you can sort and budget by. {ruleCount > 0 ? `${ruleCount} auto-rule${ruleCount === 1 ? '' : 's'} set.` : ''}
      </Text>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {data.categories.map((c) => {
          const locked = c === 'Income' || c === 'Misc';
          return (
            <View
              key={c}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingLeft: 12,
                paddingRight: locked ? 12 : 8,
                paddingVertical: 8,
                borderRadius: radius.pill,
                backgroundColor: palette.surfaceAlt,
              }}
            >
              <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600' }}>{c}</Text>
              {locked ? null : (
                <Pressable onPress={() => removeCategory(c)} hitSlop={8}>
                  <Text style={{ color: palette.textMuted, fontSize: 16, lineHeight: 16 }}>×</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </Row>
      <Row style={{ gap: 8 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a group (e.g. Pets)"
          placeholderTextColor={palette.textMuted}
          style={{
            flex: 1,
            backgroundColor: palette.surfaceAlt,
            borderRadius: radius.md,
            color: palette.text,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: type.small,
          }}
        />
        <Pressable
          onPress={onAdd}
          style={{ paddingHorizontal: 16, justifyContent: 'center', backgroundColor: palette.primary, borderRadius: radius.md }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: type.small }}>Add</Text>
        </Pressable>
      </Row>
    </Card>
  );
}

function SimpleFinCard() {
  const { palette } = useTheme();
  const { isConnected, source, status, error, lastSync, connect, sync, disconnect } = useData();
  const [token, setToken] = useState('');
  const busy = status === 'connecting' || status === 'syncing';

  const statusPill = () => {
    if (busy) return { label: status === 'connecting' ? 'CONNECTING…' : 'SYNCING…', bg: palette.surfaceAlt, fg: palette.textMuted };
    if (isConnected) return { label: 'LINKED', bg: palette.primarySoft, fg: palette.positive };
    if (status === 'error') return { label: 'ERROR', bg: palette.surfaceAlt, fg: palette.negative };
    return { label: 'NOT LINKED', bg: palette.surfaceAlt, fg: palette.textMuted };
  };
  const pill = statusPill();

  const onConnect = async () => {
    if (!token.trim() || busy) return;
    await connect(token.trim());
    setToken('');
  };

  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' } as any)
    : null;

  return (
    <Card style={{ gap: space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>SimpleFIN Bridge</Text>
          <Text style={{ color: palette.textMuted, fontSize: type.small, marginTop: 2 }}>
            Link real bank, card & Fidelity accounts (read-only)
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {busy ? <ActivityIndicator size="small" color={palette.primary} /> : null}
          <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: pill.bg }}>
            <Text style={{ color: pill.fg, fontSize: type.tiny, fontWeight: '700' }}>{pill.label}</Text>
          </View>
        </View>
      </Row>

      {isConnected ? (
        <>
          {lastSyncLabel ? (
            <Text style={{ color: palette.textMuted, fontSize: type.small }}>Last synced {lastSyncLabel}</Text>
          ) : null}
          <Row style={{ gap: space.md }}>
            <Button label={busy ? 'Syncing…' : 'Sync now'} onPress={sync} disabled={busy} primary />
            <Button label="Disconnect" onPress={disconnect} disabled={busy} />
          </Row>
        </>
      ) : (
        <>
          <Text style={{ color: palette.textMuted, fontSize: type.small, lineHeight: 19 }}>
            1. Create a free account at SimpleFIN Bridge and link your institutions.{'\n'}
            2. Generate a <Text style={{ fontWeight: '700' }}>Setup Token</Text> and paste it below.
          </Text>
          <TextInput
            value={token}
            onChangeText={setToken}
            placeholder="Paste setup token"
            placeholderTextColor={palette.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            style={{
              backgroundColor: palette.surfaceAlt,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: palette.border,
              color: palette.text,
              padding: 12,
              fontSize: type.small,
              minHeight: 64,
            }}
          />
          <Row style={{ gap: space.md }}>
            <Button label={busy ? 'Connecting…' : 'Connect'} onPress={onConnect} disabled={busy || !token.trim()} primary />
            <Button label="Get a token" onPress={() => Linking.openURL('https://bridge.simplefin.org')} />
          </Row>
        </>
      )}

      {error ? (
        <Text style={{ color: palette.negative, fontSize: type.small }}>{error}</Text>
      ) : null}
      {source === 'sample' ? (
        <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>
          Showing sample data until you connect. Connecting fills every screen with your real accounts.
        </Text>
      ) : null}
    </Card>
  );
}

function Button({
  label,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: radius.md,
        backgroundColor: primary ? palette.primary : palette.surfaceAlt,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: primary ? '#fff' : palette.text, fontSize: type.small, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function PresetChip({ preset, active, onPress }: { preset: Palette; active: boolean; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: radius.md,
        borderWidth: 2,
        borderColor: active ? palette.primary : 'transparent',
        overflow: 'hidden',
        width: 96,
      }}
    >
      <View style={{ backgroundColor: preset.bg, padding: 10, gap: 6 }}>
        <Row style={{ gap: 5 }}>
          <Swatch c={preset.primary} />
          <Swatch c={preset.positive} />
          <Swatch c={preset.negative} />
        </Row>
        <Text style={{ color: preset.text, fontSize: type.small, fontWeight: '700' }}>{preset.name}</Text>
      </View>
    </Pressable>
  );
}

function Swatch({ c }: { c: string }) {
  return <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: c }} />;
}

function SwatchRow({
  title,
  swatches,
  selected,
  onPick,
}: {
  title: string;
  swatches: string[];
  selected: string;
  onPick: (c: string) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: palette.textMuted, fontSize: type.small, marginTop: 4 }}>{title}</Text>
      <Row style={{ gap: 12 }}>
        {swatches.map((c) => {
          const active = c.toLowerCase() === selected.toLowerCase();
          return (
            <Pressable
              key={c}
              onPress={() => onPick(c)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: c,
                borderWidth: 3,
                borderColor: active ? palette.text : 'transparent',
              }}
            />
          );
        })}
      </Row>
    </View>
  );
}
