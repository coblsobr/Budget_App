import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row } from '../components/ui';
import { useTheme, type, space } from '../theme/theme';
import { money } from '../lib/format';
import { useData } from '../lib/DataProvider';
import { AccountClass } from '../lib/types';
import { accountValue } from '../lib/calc';

const CLASS_LABEL: Record<AccountClass, string> = {
  cash: 'Cash',
  credit: 'Credit Card',
  loan: 'Loan',
  investment: 'Investment',
};
const CLASSES: AccountClass[] = ['cash', 'credit', 'loan', 'investment'];

type Entry = { id: string; name: string; sub: string; value: number; cls: AccountClass };

export default function AccountTypes() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data, setAccountClass } = useData();

  const entries: Entry[] = [
    ...data.accounts.map((a) => ({ id: a.id, name: a.name, sub: a.institution, value: a.balance, cls: 'cash' as AccountClass })),
    ...data.creditCards.map((c) => ({ id: c.id, name: c.name, sub: c.institution, value: -c.balance, cls: 'credit' as AccountClass })),
    ...data.debts.map((d) => ({ id: d.id, name: d.name, sub: 'Loan', value: -d.balance, cls: 'loan' as AccountClass })),
    ...data.investments.map((i) => ({ id: i.id, name: i.name, sub: i.institution, value: accountValue(i), cls: 'investment' as AccountClass })),
  ];

  return (
    <Screen
      title="Account Types"
      subtitle="Tap the correct type if an account was detected wrong"
      onBack={() => router.back()}
    >
      {entries.map((e) => (
        <Card key={e.id} style={{ paddingVertical: space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }} numberOfLines={1}>
                {e.name}
              </Text>
              <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 2 }} numberOfLines={1}>
                {e.sub}
              </Text>
            </View>
            <Text
              style={{
                color: e.value < 0 ? palette.negative : palette.text,
                fontSize: type.small,
                fontWeight: '700',
                flexShrink: 0,
              }}
            >
              {money(e.value)}
            </Text>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space.md }}>
            {CLASSES.map((c) => {
              const active = e.cls === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setAccountClass(e.id, c)}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: active ? palette.primary : palette.surfaceAlt,
                      borderWidth: 1,
                      borderColor: active ? palette.primary : palette.border,
                    },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={{ color: active ? '#fff' : palette.textMuted, fontSize: type.tiny, fontWeight: '700' }}>
                    {CLASS_LABEL[c]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
