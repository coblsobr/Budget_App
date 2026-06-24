import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, Row, Dot } from '../../components/ui';
import { ChevronRight } from '../../components/icons';
import { useTheme, type, space } from '../../theme/theme';
import { money, dateLabel, monthLabelLong } from '../../lib/format';
import { useData } from '../../lib/DataProvider';
import { spendingByCategoryRange, txnsInRange, thisMonth } from '../../lib/calc';

function currentMonthRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const start = `${y}-${pad(m + 1)}-01`;
  const e = new Date(y, m + 1, 1);
  const end = `${e.getFullYear()}-${pad(e.getMonth() + 1)}-01`;
  return { start, end, label: monthLabelLong(thisMonth()) };
}

export default function SpendingBreakdown() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data } = useData();
  const params = useLocalSearchParams<{ start?: string; end?: string; label?: string }>();

  const range =
    params.start && params.end
      ? { start: String(params.start), end: String(params.end), label: params.label ? String(params.label) : '' }
      : currentMonthRange();

  const byCat = spendingByCategoryRange(data, range.start, range.end);
  const total = byCat.reduce((s, c) => s + c.amount, 0);

  return (
    <Screen title="Spending Breakdown" subtitle={range.label || undefined} onBack={() => router.back()}>
      <Card style={{ backgroundColor: palette.primarySoft, borderColor: palette.primary }}>
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>Total spent</Text>
        <Text style={{ color: palette.text, fontSize: type.title, fontWeight: '800', marginTop: 2 }}>{money(total)}</Text>
      </Card>

      {byCat.length === 0 ? (
        <Card>
          <Text style={{ color: palette.textMuted, fontSize: type.small }}>No spending in this period.</Text>
        </Card>
      ) : (
        byCat.map((c, ci) => {
          const txns = txnsInRange(data, range.start, range.end)
            .filter((t) => t.amount < 0 && t.category === c.category)
            .sort((a, b) => (a.date < b.date ? 1 : -1));
          const pct = total > 0 ? (c.amount / total) * 100 : 0;
          return (
            <Card key={c.category} style={{ padding: 0 }}>
              {/* Group header */}
              <View style={{ padding: space.lg, paddingBottom: space.md }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row style={{ gap: 10 }}>
                    <Dot color={palette.chart[ci % palette.chart.length]} size={12} />
                    <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>{c.category}</Text>
                  </Row>
                  <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>{money(c.amount)}</Text>
                </Row>
                <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 3 }}>
                  {pct.toFixed(0)}% of spending · {txns.length} transaction{txns.length === 1 ? '' : 's'}
                </Text>
              </View>
              {/* Transactions in this group */}
              {txns.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: space.lg,
                      paddingVertical: 10,
                      borderTopWidth: 1,
                      borderTopColor: palette.border,
                    },
                    pressed && { backgroundColor: palette.surfaceAlt },
                  ]}
                >
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600' }} numberOfLines={1}>
                        {t.merchant}
                      </Text>
                      <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 2 }}>{dateLabel(t.date)}</Text>
                    </View>
                    <Row style={{ gap: 4 }}>
                      <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600' }}>{money(t.amount)}</Text>
                      <ChevronRight color={palette.textMuted} size={16} />
                    </Row>
                  </Row>
                </Pressable>
              ))}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
