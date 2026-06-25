import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Row } from '../../components/ui';
import { ChevronRight } from '../../components/icons';
import { useTheme, type, space } from '../../theme/theme';
import { money, dateLabel, monthLabelLong } from '../../lib/format';
import { useData } from '../../lib/DataProvider';
import { txnsForMonth, totalIncome, thisMonth } from '../../lib/calc';

export default function IncomeBreakdown() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data } = useData();

  const ym = thisMonth();
  const total = totalIncome(data, ym);
  const txns = txnsForMonth(data, ym)
    .filter((t) => t.amount > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <Screen title="Income" subtitle={monthLabelLong(ym)} onBack={() => router.back()}>
      <Card style={{ backgroundColor: palette.primarySoft, borderColor: palette.primary }}>
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>Income this month</Text>
        <Text style={{ color: palette.positive, fontSize: type.title, fontWeight: '800', marginTop: 2 }}>{money(total)}</Text>
      </Card>

      <Card style={{ padding: 0 }}>
        {txns.length === 0 ? (
          <Text style={{ color: palette.textMuted, fontSize: type.small, padding: space.lg }}>
            No income recorded this month.
          </Text>
        ) : (
          txns.map((t, i) => (
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
                  <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '600' }} numberOfLines={1}>
                    {t.merchant}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 2 }}>{dateLabel(t.date)}</Text>
                </View>
                <Row style={{ gap: 4 }}>
                  <Text style={{ color: palette.positive, fontSize: type.body, fontWeight: '700' }}>
                    {money(t.amount, { sign: true })}
                  </Text>
                  <ChevronRight color={palette.textMuted} size={16} />
                </Row>
              </Row>
            </Pressable>
          ))
        )}
      </Card>
    </Screen>
  );
}
