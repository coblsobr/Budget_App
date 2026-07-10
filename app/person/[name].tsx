import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, Row, ProgressBar } from '../../components/ui';
import { ChevronRight } from '../../components/icons';
import { useTheme, type, space } from '../../theme/theme';
import { money, dateLabel, monthLabelLong } from '../../lib/format';
import { useData } from '../../lib/DataProvider';
import { personBudgetFor, personSpend, txnsForPersonMonth, thisMonth } from '../../lib/calc';

export default function PersonBudget() {
  const { palette } = useTheme();
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const person = String(name);
  const { data } = useData();

  const ym = thisMonth();
  const pb = personBudgetFor(data, person);
  const limit = pb?.limit ?? 0;
  const spent = personSpend(data, person, ym);
  const remaining = limit - spent;
  const over = remaining < 0;
  const txns = txnsForPersonMonth(data, person, ym);

  return (
    <Screen title={`${person}’s Budget`} subtitle={monthLabelLong(ym)} onBack={() => router.back()}>
      <Card style={{ backgroundColor: palette.primarySoft, borderColor: palette.primary }}>
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>This month</Text>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
          <Text style={{ color: palette.text, fontSize: type.title, fontWeight: '800' }}>
            {money(spent)} <Text style={{ color: palette.textMuted, fontSize: type.body }}>/ {money(limit)}</Text>
          </Text>
          <Text style={{ color: over ? palette.negative : palette.positive, fontWeight: '700' }}>
            {money(Math.abs(remaining))} {over ? 'over' : 'left'}
          </Text>
        </Row>
        <View style={{ marginTop: 10 }}>
          <ProgressBar pct={limit > 0 ? (spent / limit) * 100 : 0} />
        </View>
        <Text
          style={{ color: palette.primary, fontSize: type.tiny, fontWeight: '600', marginTop: 8 }}
          onPress={() => router.push('/people')}
        >
          Edit which cards & categories count ›
        </Text>
      </Card>

      <Card style={{ padding: 0 }}>
        {txns.length === 0 ? (
          <Text style={{ color: palette.textMuted, fontSize: type.small, padding: space.lg }}>
            Nothing counts toward {person} yet. Open the ⋮ menu on {person} to pick cards and categories.
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
                  <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 2 }}>
                    {dateLabel(t.date)} · {t.category}
                  </Text>
                </View>
                <Row style={{ gap: 4 }}>
                  <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>{money(t.amount)}</Text>
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
