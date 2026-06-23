import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row, Pill, Dot } from '../../components/ui';
import { DonutChart } from '../../components/charts';
import { ChevronRight } from '../../components/icons';
import { useTheme, type, radius, space } from '../../theme/theme';
import { money, dateLabel } from '../../lib/format';
import { useData } from '../../lib/DataProvider';
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
      <Card>
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
      </Card>

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
