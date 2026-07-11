import { useState } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row, Pill, Dot, ProgressBar } from '../components/ui';
import { BarChart } from '../components/charts';
import { useTheme, type, space } from '../theme/theme';
import { money, moneyCompact, monthLabel } from '../lib/format';
import { useData } from '../lib/DataProvider';
import {
  recentMonthKeys,
  totalIncome,
  totalSpending,
  txnsInRange,
  spendingByCategory,
  spendingByCategoryRange,
  accountName,
} from '../lib/calc';

const RANGES = [
  { key: 3, label: '3 mo' },
  { key: 6, label: '6 mo' },
  { key: 12, label: '12 mo' },
  { key: 24, label: '24 mo' },
];

function ymd(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`;
}

export default function Trends() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data } = useData();
  const { width } = useWindowDimensions();
  const chartW = Math.min(width, 640) - space.lg * 2 - space.lg * 2;

  const [months, setMonths] = useState(6);
  const [chartCat, setChartCat] = useState<string | null>(null);

  const keys = recentMonthKeys(months);
  const incomeSeries = keys.map((k) => totalIncome(data, k));
  const spendSeries = keys.map((k) => totalSpending(data, k));
  const labels = keys.map((k) => monthLabel(k));

  const now = new Date();
  const start = ymd(new Date(now.getFullYear(), now.getMonth() - (months - 1), 1));
  const end = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 1));

  // Per-account spending in range
  const rangeTxns = txnsInRange(data, start, end).filter((t) => t.amount < 0);
  const byAccount = new Map<string, number>();
  rangeTxns.forEach((t) => byAccount.set(t.accountId, (byAccount.get(t.accountId) ?? 0) + -t.amount));
  const accounts = [...byAccount.entries()]
    .map(([id, amount]) => ({ name: accountName(data, id), amount }))
    .sort((a, b) => b.amount - a.amount);
  const accountMax = Math.max(...accounts.map((a) => a.amount), 1);

  // Category spending in range
  const cats = spendingByCategoryRange(data, start, end);
  const catMax = Math.max(...cats.map((c) => c.amount), 1);

  // Month-by-month history for one selected group
  const selectedCat = chartCat && cats.some((c) => c.category === chartCat) ? chartCat : cats[0]?.category ?? null;
  const catSeries = selectedCat
    ? keys.map((k) => spendingByCategory(data, k).find((c) => c.category === selectedCat)?.amount ?? 0)
    : [];
  const catTotal = catSeries.reduce((s, v) => s + v, 0);

  return (
    <Screen title="Trends" subtitle="Income, spending & accounts over time" onBack={() => router.back()}>
      <Row style={{ gap: 8 }}>
        {RANGES.map((r) => (
          <Pill key={r.key} label={r.label} active={r.key === months} onPress={() => setMonths(r.key)} />
        ))}
      </Row>

      {/* Income vs Spending */}
      <SectionTitle>Income vs Spending</SectionTitle>
      <Card>
        <Row style={{ gap: 16, marginBottom: 8 }}>
          <Row style={{ gap: 6 }}>
            <Dot color={palette.positive} />
            <Text style={{ color: palette.textMuted, fontSize: type.small }}>Income</Text>
          </Row>
          <Row style={{ gap: 6 }}>
            <Dot color={palette.negative} />
            <Text style={{ color: palette.textMuted, fontSize: type.small }}>Spending</Text>
          </Row>
        </Row>
        <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginBottom: 4 }}>Income</Text>
        <BarChart data={incomeSeries} labels={labels} width={chartW} height={120} color={palette.positive} />
        <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 8, marginBottom: 4 }}>Spending</Text>
        <BarChart data={spendSeries} labels={labels} width={chartW} height={120} color={palette.negative} />
      </Card>

      {/* Net saved per month */}
      <Card style={{ padding: 0 }}>
        {keys.map((k, i) => {
          const saved = incomeSeries[i] - spendSeries[i];
          return (
            <Row
              key={k}
              style={{
                justifyContent: 'space-between',
                paddingHorizontal: space.lg,
                paddingVertical: space.md,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: palette.border,
              }}
            >
              <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '600' }}>{monthLabel(k)}</Text>
              <Row style={{ gap: 12 }}>
                <Text style={{ color: palette.textMuted, fontSize: type.small }}>+{moneyCompact(incomeSeries[i])}</Text>
                <Text style={{ color: palette.textMuted, fontSize: type.small }}>-{moneyCompact(spendSeries[i])}</Text>
                <Text
                  style={{ color: saved >= 0 ? palette.positive : palette.negative, fontSize: type.small, fontWeight: '700', minWidth: 60, textAlign: 'right' }}
                >
                  {money(saved, { sign: true })}
                </Text>
              </Row>
            </Row>
          );
        })}
      </Card>

      {/* Per-account spending */}
      <SectionTitle>Spending by Account</SectionTitle>
      {accounts.length === 0 ? (
        <Card>
          <Text style={{ color: palette.textMuted, fontSize: type.small }}>No spending in this range.</Text>
        </Card>
      ) : (
        <Card style={{ gap: space.md }}>
          {accounts.map((a) => (
            <View key={a.name}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600' }} numberOfLines={1}>
                  {a.name}
                </Text>
                <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '700' }}>{money(a.amount)}</Text>
              </Row>
              <ProgressBar pct={(a.amount / accountMax) * 100} />
            </View>
          ))}
        </Card>
      )}

      {/* One group, month to month */}
      <SectionTitle>Group Month to Month</SectionTitle>
      {selectedCat ? (
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.md }}>
            {cats.slice(0, 10).map((c) => (
              <Pill
                key={c.category}
                label={c.category}
                active={c.category === selectedCat}
                onPress={() => setChartCat(c.category)}
              />
            ))}
          </View>
          <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>
              {selectedCat} · last {months} months
            </Text>
            <Text style={{ color: palette.text, fontSize: type.tiny, fontWeight: '700' }}>
              {money(catTotal)} total · {money(catTotal / Math.max(keys.length, 1))}/mo avg
            </Text>
          </Row>
          <BarChart data={catSeries} labels={labels} width={chartW} height={130} color={palette.primary} />
        </Card>
      ) : (
        <Card>
          <Text style={{ color: palette.textMuted, fontSize: type.small }}>No spending in this range.</Text>
        </Card>
      )}

      {/* Category over range */}
      <SectionTitle>Spending by Group</SectionTitle>
      {cats.length === 0 ? (
        <Card>
          <Text style={{ color: palette.textMuted, fontSize: type.small }}>No spending in this range.</Text>
        </Card>
      ) : (
        <Card style={{ gap: space.md }}>
          {cats.map((c, i) => (
            <View key={c.category}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <Row style={{ gap: 8 }}>
                  <Dot color={palette.chart[i % palette.chart.length]} />
                  <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600' }}>{c.category}</Text>
                </Row>
                <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '700' }}>{money(c.amount)}</Text>
              </Row>
              <ProgressBar pct={(c.amount / catMax) * 100} color={palette.chart[i % palette.chart.length]} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
