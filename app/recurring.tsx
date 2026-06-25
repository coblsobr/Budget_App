import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Row, Dot } from '../components/ui';
import { ChevronRight } from '../components/icons';
import { useTheme, type, space } from '../theme/theme';
import { money, dateLabel } from '../lib/format';
import { useData } from '../lib/DataProvider';
import { detectRecurring, recurringMonthlyTotal } from '../lib/recurring';

export default function Recurring() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data } = useData();

  const items = detectRecurring(data);
  const monthly = recurringMonthlyTotal(items);

  return (
    <Screen title="Recurring Charges" subtitle="Things that bill on a schedule" onBack={() => router.back()}>
      <Card style={{ backgroundColor: palette.primarySoft, borderColor: palette.primary }}>
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>Recurring per month</Text>
        <Text style={{ color: palette.text, fontSize: type.title, fontWeight: '800', marginTop: 2 }}>{money(monthly)}</Text>
        <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 4 }}>
          {items.length} recurring item{items.length === 1 ? '' : 's'} · normalized to a monthly cost
        </Text>
      </Card>

      {items.length === 0 ? (
        <Card>
          <Text style={{ color: palette.textMuted, fontSize: type.small }}>
            No recurring charges detected yet. Once there are a few repeating charges from the same place, they’ll show up
            here.
          </Text>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {items.map((r, i) => (
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
                  <Row style={{ gap: 6, marginTop: 3 }}>
                    <Text style={{ color: palette.primary, fontSize: type.tiny, fontWeight: '700' }}>{r.cadence}</Text>
                    <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>
                      · {r.category} · last {dateLabel(r.lastDate)}
                    </Text>
                  </Row>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>
                    {money(r.typicalAmount)}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>{money(r.monthlyEquivalent)}/mo</Text>
                </View>
              </Row>
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}
