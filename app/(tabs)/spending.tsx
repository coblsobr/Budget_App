import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row, Pill, Dot, ProgressBar } from '../../components/ui';
import { DonutChart, BarChart } from '../../components/charts';
import { ChevronRight } from '../../components/icons';
import { useTheme, type, radius, space } from '../../theme/theme';
import { money, dateLabel } from '../../lib/format';
import { useData } from '../../lib/DataProvider';
import { detectRecurring, recurringMonthlyTotal } from '../../lib/recurring';
import {
  periodsFor,
  spendingByCategoryRange,
  totalSpendingRange,
  txnsInRange,
  sortTxns,
  PeriodMode,
  TxnSort,
} from '../../lib/calc';

const MODES: { key: PeriodMode; label: string; count: number }[] = [
  { key: 'week', label: 'Week', count: 8 },
  { key: 'month', label: 'Month', count: 6 },
  { key: 'year', label: 'Year', count: 3 },
];

const SORTS: { key: TxnSort; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'amountHigh', label: '$ High→Low' },
  { key: 'amountLow', label: '$ Low→High' },
  { key: 'category', label: 'Group' },
];

export default function Spending() {
  const { palette } = useTheme();
  const { data } = useData();
  const router = useRouter();

  const [mode, setMode] = useState<PeriodMode>('month');
  const [periodKey, setPeriodKey] = useState<string | null>(null);
  const [sort, setSort] = useState<TxnSort>('date');

  const modeDef = MODES.find((m) => m.key === mode)!;
  const periods = useMemo(() => periodsFor(mode, modeDef.count), [mode, modeDef.count]);
  const period = periods.find((p) => p.key === periodKey) ?? periods[periods.length - 1];

  const byCat = spendingByCategoryRange(data, period.start, period.end);
  const total = totalSpendingRange(data, period.start, period.end);
  const txns = sortTxns(
    txnsInRange(data, period.start, period.end).filter((t) => t.amount < 0),
    sort
  );

  const segments = byCat.map((c, i) => ({ value: c.amount, color: palette.chart[i % palette.chart.length] }));

  const { width } = useWindowDimensions();
  const chartW = Math.min(width, 640) - space.lg * 2 - space.lg * 2;

  // ── vs previous period ─────────────────────────────────────────────────────
  const periodIdx = periods.findIndex((p) => p.key === period.key);
  const prevPeriod = periodIdx > 0 ? periods[periodIdx - 1] : null;
  const prevTotal = prevPeriod ? totalSpendingRange(data, prevPeriod.start, prevPeriod.end) : 0;
  const delta = total - prevTotal;

  // Categories that moved the most vs the previous period
  const movers = useMemo(() => {
    if (!prevPeriod) return [];
    const prevByCat = new Map(spendingByCategoryRange(data, prevPeriod.start, prevPeriod.end).map((c) => [c.category, c.amount]));
    const names = new Set([...byCat.map((c) => c.category), ...prevByCat.keys()]);
    return [...names]
      .map((name) => {
        const now = byCat.find((c) => c.category === name)?.amount ?? 0;
        const before = prevByCat.get(name) ?? 0;
        return { name, now, before, diff: now - before };
      })
      .filter((m) => Math.abs(m.diff) >= 1)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 5);
  }, [data, byCat, prevPeriod]);

  // ── spending over the period (daily bars; monthly bars in Year view) ──────
  const { series, seriesLabels } = useMemo(() => {
    const out: number[] = [];
    const lab: string[] = [];
    const spend = txnsInRange(data, period.start, period.end).filter((t) => t.amount < 0);
    if (mode === 'year') {
      const year = period.start.slice(0, 4);
      const byMonth = new Map<string, number>();
      spend.forEach((t) => byMonth.set(t.date.slice(0, 7), (byMonth.get(t.date.slice(0, 7)) ?? 0) + -t.amount));
      const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
      for (let m = 1; m <= 12; m++) {
        const key = `${year}-${m < 10 ? '0' : ''}${m}`;
        out.push(byMonth.get(key) ?? 0);
        lab.push(monthNames[m - 1]);
      }
    } else {
      const byDay = new Map<string, number>();
      spend.forEach((t) => byDay.set(t.date, (byDay.get(t.date) ?? 0) + -t.amount));
      const cur = new Date(period.start);
      const end = new Date(period.end);
      let i = 0;
      while (cur < end) {
        const m = cur.getMonth() + 1;
        const day = cur.getDate();
        const key = `${cur.getFullYear()}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`;
        out.push(byDay.get(key) ?? 0);
        if (mode === 'week') lab.push('SMTWTFS'[cur.getDay()]);
        else lab.push(day === 1 || day % 5 === 0 ? String(day) : '');
        cur.setDate(cur.getDate() + 1);
        i++;
      }
    }
    return { series: out, seriesLabels: lab };
  }, [data, period, mode]);

  // ── top merchants in the period ────────────────────────────────────────────
  const merchants = useMemo(() => {
    const byMerchant = new Map<string, number>();
    txns.forEach((t) => byMerchant.set(t.merchant, (byMerchant.get(t.merchant) ?? 0) + -t.amount));
    return [...byMerchant.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [txns]);
  const merchantMax = Math.max(...merchants.map((m) => m.amount), 1);

  const recurring = detectRecurring(data);
  const recurringTop = recurring.slice(0, 4);

  const changeMode = (m: PeriodMode) => {
    setMode(m);
    setPeriodKey(null); // snap back to the most recent period
  };

  return (
    <Screen title="Spending" subtitle="Cards + bank accounts">
      {/* Week / Month / Year */}
      <Row style={{ gap: 8 }}>
        {MODES.map((m) => (
          <Pill key={m.key} label={m.label} active={m.key === mode} onPress={() => changeMode(m.key)} />
        ))}
      </Row>

      {/* Period picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {periods.map((p) => (
          <Pill key={p.key} label={p.label} active={p.key === period.key} onPress={() => setPeriodKey(p.key)} />
        ))}
      </ScrollView>

      {/* Donut + breakdown */}
      <Card
        onPress={() =>
          router.push({ pathname: '/breakdown/spending', params: { start: period.start, end: period.end, label: period.label } })
        }
      >
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <DonutChart
            segments={segments.length ? segments : [{ value: 1, color: palette.surfaceAlt }]}
            centerValue={money(total)}
            centerLabel="spent"
            size={150}
          />
          <View style={{ flex: 1, marginLeft: space.lg, gap: 8 }}>
            {byCat.length === 0 ? (
              <Text style={{ color: palette.textMuted, fontSize: type.small }}>No spending in this period.</Text>
            ) : (
              byCat.slice(0, 6).map((c, i) => (
                <Row key={c.category} style={{ justifyContent: 'space-between' }}>
                  <Row style={{ gap: 8, flex: 1 }}>
                    <Dot color={palette.chart[i % palette.chart.length]} />
                    <Text style={{ color: palette.textMuted, fontSize: type.small }} numberOfLines={1}>
                      {c.category}
                    </Text>
                  </Row>
                  <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600' }}>{money(c.amount)}</Text>
                </Row>
              ))
            )}
          </View>
        </Row>
        <Text style={{ color: palette.primary, fontSize: type.tiny, fontWeight: '600', marginTop: 10 }}>
          Tap for full breakdown by group ›
        </Text>
      </Card>

      {/* vs previous period */}
      {prevPeriod ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>
              vs {prevPeriod.label}
            </Text>
            <Text
              style={{
                color: delta <= 0 ? palette.positive : palette.negative,
                fontSize: type.heading,
                fontWeight: '800',
              }}
            >
              {delta <= 0 ? '▼' : '▲'} {money(Math.abs(delta))}
            </Text>
          </Row>
          <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 2 }}>
            {money(total)} this period · {money(prevTotal)} last {mode}
          </Text>
          {movers.length > 0 ? (
            <View style={{ marginTop: space.md, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: space.sm }}>
              {movers.map((m) => (
                <Row key={m.name} style={{ justifyContent: 'space-between', paddingVertical: 5 }}>
                  <Text style={{ color: palette.textMuted, fontSize: type.small, flex: 1 }} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text
                    style={{
                      color: m.diff <= 0 ? palette.positive : palette.negative,
                      fontSize: type.small,
                      fontWeight: '700',
                    }}
                  >
                    {m.diff <= 0 ? '▼' : '▲'} {money(Math.abs(m.diff))}
                  </Text>
                </Row>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* Spending over the period */}
      <SectionTitle>{mode === 'year' ? 'By Month' : 'Day by Day'}</SectionTitle>
      <Card>
        <BarChart data={series} labels={seriesLabels} width={chartW} height={130} color={palette.negative} />
      </Card>

      {/* Top merchants */}
      {merchants.length > 0 ? (
        <>
          <SectionTitle>Top Merchants</SectionTitle>
          <Card style={{ gap: space.md }}>
            {merchants.map((m) => (
              <View key={m.name}>
                <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600', flex: 1, paddingRight: 10 }} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '700' }}>{money(m.amount)}</Text>
                </Row>
                <ProgressBar pct={(m.amount / merchantMax) * 100} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {/* Trends & Insights */}
      <Card onPress={() => router.push('/trends')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>Trends & Insights</Text>
            <Text style={{ color: palette.textMuted, fontSize: type.small, marginTop: 2 }}>
              Month-to-month by group, income vs spending, by account
            </Text>
          </View>
          <ChevronRight color={palette.textMuted} />
        </Row>
      </Card>

      {/* Recurring */}
      {recurring.length > 0 ? (
        <>
          <SectionTitle
            right={
              <Text
                style={{ color: palette.primary, fontSize: type.small, fontWeight: '600' }}
                onPress={() => router.push('/recurring')}
              >
                See all ({recurring.length})
              </Text>
            }
          >
            Recurring
          </SectionTitle>
          <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: -4 }}>
            ~{money(recurringMonthlyTotal(recurring))}/mo across {recurring.length} repeating charges
          </Text>
          <Card style={{ padding: 0 }}>
            {recurringTop.map((r, i) => (
              <Pressable
                key={`${r.merchant}-${i}`}
                onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: r.latestId } })}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: space.lg,
                    paddingVertical: space.md,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: palette.border,
                  },
                  pressed && { backgroundColor: palette.surfaceAlt },
                ]}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '600' }} numberOfLines={1}>
                      {r.merchant}
                    </Text>
                    <Text style={{ color: palette.primary, fontSize: type.tiny, fontWeight: '700', marginTop: 3 }}>
                      {r.cadence}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>{money(r.typicalAmount)}</Text>
                    <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>{money(r.monthlyEquivalent)}/mo</Text>
                  </View>
                </Row>
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      {/* Transactions */}
      <SectionTitle right={<Text style={{ color: palette.textMuted, fontSize: type.tiny }}>{txns.length} items</Text>}>
        Transactions
      </SectionTitle>

      {/* Sort */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {SORTS.map((s) => (
          <Pill key={s.key} label={s.label} active={s.key === sort} onPress={() => setSort(s.key)} />
        ))}
      </ScrollView>

      <Card style={{ padding: 0 }}>
        {txns.length === 0 ? (
          <Text style={{ color: palette.textMuted, fontSize: type.small, padding: space.lg }}>
            Nothing here for this period.
          </Text>
        ) : (
          txns.map((t, i) => (
            <Pressable
              key={t.id}
              onPress={() => router.push(`/transaction/${t.id}`)}
              style={({ pressed }) => [
                {
                  paddingHorizontal: space.lg,
                  paddingVertical: space.md,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: palette.border,
                },
                pressed && { backgroundColor: palette.surfaceAlt },
              ]}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '600' }} numberOfLines={1}>
                    {t.merchant}
                  </Text>
                  <Row style={{ gap: 6, marginTop: 3 }}>
                    <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>{dateLabel(t.date)}</Text>
                    <View
                      style={{
                        paddingHorizontal: 7,
                        paddingVertical: 1,
                        borderRadius: radius.pill,
                        backgroundColor: palette.surfaceAlt,
                      }}
                    >
                      <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>{t.category}</Text>
                    </View>
                  </Row>
                </View>
                <Row style={{ gap: 4 }}>
                  <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>{money(t.amount)}</Text>
                  <ChevronRight color={palette.textMuted} size={18} />
                </Row>
              </Row>
            </Pressable>
          ))
        )}
      </Card>
    </Screen>
  );
}
