import { useMemo } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row, StatTile } from '../../components/ui';
import { BarChart } from '../../components/charts';
import { useTheme, type, space } from '../../theme/theme';
import { money, moneyCompact, monthLabel, dateLabel } from '../../lib/format';
import { useData } from '../../lib/DataProvider';
import { recentMonthKeys, txnsForMonth } from '../../lib/calc';
import { isIgnored } from '../../lib/ignore';

export default function MerchantDetail() {
  const { palette } = useTheme();
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const { data } = useData();
  const { width } = useWindowDimensions();
  const chartW = Math.min(width, 640) - space.lg * 2 - space.lg * 2;

  const merchant = String(name ?? '');

  // Every non-ignored transaction from this merchant, newest first.
  const txns = useMemo(
    () =>
      data.transactions
        .filter((t) => t.merchant === merchant && !isIgnored(data, t))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data, merchant]
  );

  const spendTxns = txns.filter((t) => t.amount < 0);
  const totalSpent = spendTxns.reduce((s, t) => s + -t.amount, 0);
  const avg = spendTxns.length ? totalSpent / spendTxns.length : 0;

  // Monthly spend, last 12 months
  const keys = recentMonthKeys(12);
  const monthly = keys.map((k) =>
    txnsForMonth(data, k)
      .filter((t) => t.merchant === merchant && t.amount < 0)
      .reduce((s, t) => s + -t.amount, 0)
  );
  const labels = keys.map((k) => monthLabel(k));

  return (
    <Screen title={merchant || 'Merchant'} subtitle={`${txns.length} transactions`} onBack={() => router.back()}>
      <Row style={{ gap: space.md }}>
        <StatTile label="Total spent" value={moneyCompact(totalSpent)} accent={palette.negative} />
        <StatTile label="Avg per visit" value={moneyCompact(avg)} accent={palette.primary} />
        <StatTile label="Visits" value={String(spendTxns.length)} accent={palette.text} />
      </Row>

      <SectionTitle>Last 12 Months</SectionTitle>
      <Card>
        <BarChart data={monthly} labels={labels} width={chartW} height={130} color={palette.primary} />
      </Card>

      <SectionTitle>History</SectionTitle>
      <Card style={{ padding: 0 }}>
        {txns.length === 0 ? (
          <Text style={{ color: palette.textMuted, fontSize: type.small, padding: space.lg }}>No transactions found.</Text>
        ) : (
          txns.slice(0, 50).map((t, i) => (
            <Pressable
              key={t.id}
              onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}
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
                  <Text style={{ color: palette.textMuted, fontSize: type.small }}>{dateLabel(t.date)}</Text>
                  <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 2 }}>{t.category}</Text>
                </View>
                <Text
                  style={{
                    color: t.amount > 0 ? palette.positive : palette.text,
                    fontSize: type.small,
                    fontWeight: '700',
                  }}
                >
                  {money(t.amount, { cents: true })}
                </Text>
              </Row>
            </Pressable>
          ))
        )}
        {txns.length > 50 ? (
          <Text style={{ color: palette.textMuted, fontSize: type.tiny, padding: space.md, textAlign: 'center' }}>
            Showing the 50 most recent.
          </Text>
        ) : null}
      </Card>
    </Screen>
  );
}
