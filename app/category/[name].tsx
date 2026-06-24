import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, Row, ProgressBar } from '../../components/ui';
import { ChevronRight } from '../../components/icons';
import { useTheme, type, radius, space } from '../../theme/theme';
import { money, dateLabel, monthLabelLong } from '../../lib/format';
import { useData } from '../../lib/DataProvider';
import { txnsForMonth, thisMonth } from '../../lib/calc';

export default function CategoryDetail() {
  const { palette } = useTheme();
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const category = String(name);
  const { data } = useData();

  const ym = thisMonth();
  const txns = txnsForMonth(data, ym)
    .filter((t) => t.amount < 0 && t.category === category)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const spent = txns.reduce((s, t) => s + -t.amount, 0);
  const budget = data.budgets.find((b) => b.category === category);
  const limit = budget?.limit ?? 0;
  const remaining = limit - spent;
  const over = remaining < 0;

  return (
    <Screen title={category} subtitle={monthLabelLong(ym)} onBack={() => router.back()}>
      <Card style={{ backgroundColor: palette.primarySoft, borderColor: palette.primary }}>
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>Spent this month</Text>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
          <Text style={{ color: palette.text, fontSize: type.title, fontWeight: '800' }}>
            {money(spent)}
            {limit > 0 ? <Text style={{ color: palette.textMuted, fontSize: type.body }}> / {money(limit)}</Text> : null}
          </Text>
          {limit > 0 ? (
            <Text style={{ color: over ? palette.negative : palette.positive, fontWeight: '700' }}>
              {money(Math.abs(remaining))} {over ? 'over' : 'left'}
            </Text>
          ) : null}
        </Row>
        {limit > 0 ? (
          <View style={{ marginTop: 10 }}>
            <ProgressBar pct={(spent / limit) * 100} />
          </View>
        ) : null}
      </Card>

      <Text style={{ color: palette.textMuted, fontSize: type.tiny, paddingHorizontal: 4 }}>
        {txns.length} transaction{txns.length === 1 ? '' : 's'} · tap one for details
      </Text>

      <Card style={{ padding: 0 }}>
        {txns.length === 0 ? (
          <Text style={{ color: palette.textMuted, fontSize: type.small, padding: space.lg }}>
            No transactions in {category} this month.
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
                  <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 3 }}>{dateLabel(t.date)}</Text>
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
