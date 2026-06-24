import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row, ProgressBar } from '../../components/ui';
import { ChevronRight } from '../../components/icons';
import { useTheme, type, radius, space } from '../../theme/theme';
import { money, monthLabelLong } from '../../lib/format';
import { budgetStatus, personBudgetStatus, thisMonth } from '../../lib/calc';
import { useData } from '../../lib/DataProvider';

export default function Budgets() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data, setBudgets } = useData();
  const ym = thisMonth();
  const rows = budgetStatus(data, ym);
  const people = personBudgetStatus(data, ym);

  const totalLimit = rows.reduce((s, r) => s + r.limit, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const totalRemaining = totalLimit - totalSpent;

  // Adjusting a limit writes through the data provider, which persists it.
  const adjust = (cat: string, delta: number) =>
    setBudgets(
      data.budgets.map((b) => (b.category === cat ? { ...b, limit: Math.max(0, b.limit + delta) } : b))
    );

  return (
    <Screen title="Budgets" subtitle={monthLabelLong(ym)}>
      <Card style={{ backgroundColor: palette.primarySoft, borderColor: palette.primary }}>
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>Total Budget</Text>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
          <Text style={{ color: palette.text, fontSize: type.title, fontWeight: '800' }}>
            {money(totalSpent)} <Text style={{ color: palette.textMuted, fontSize: type.body }}>/ {money(totalLimit)}</Text>
          </Text>
          <Text style={{ color: totalRemaining >= 0 ? palette.positive : palette.negative, fontWeight: '700' }}>
            {money(Math.abs(totalRemaining))} {totalRemaining >= 0 ? 'left' : 'over'}
          </Text>
        </Row>
        <View style={{ marginTop: 10 }}>
          <ProgressBar pct={(totalSpent / totalLimit) * 100} />
        </View>
      </Card>

      {people.length > 0 ? (
        <>
          <SectionTitle right={<Text style={{ color: palette.primary, fontSize: type.small, fontWeight: '600' }} onPress={() => router.push('/people')}>Manage</Text>}>
            People
          </SectionTitle>
          {people.map((p) => {
            const over = p.remaining < 0;
            return (
              <Card key={p.person} onPress={() => router.push({ pathname: '/person/[name]', params: { name: p.person } })} style={{ paddingVertical: space.md }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>{p.person}</Text>
                  <Row style={{ gap: 4 }}>
                    <Text style={{ color: over ? palette.negative : palette.textMuted, fontSize: type.small, fontWeight: '600' }}>
                      {money(p.spent)} / {money(p.limit)}
                    </Text>
                    <ChevronRight color={palette.textMuted} size={18} />
                  </Row>
                </Row>
                <View style={{ marginTop: 10 }}>
                  <ProgressBar pct={p.pct} />
                </View>
              </Card>
            );
          })}
        </>
      ) : null}

      <SectionTitle>Categories</SectionTitle>
      <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: -4 }}>
        Tap − / + to adjust a category's monthly limit.
      </Text>

      {rows.map((r) => {
        const over = r.remaining < 0;
        return (
          <Card key={r.category} style={{ paddingVertical: space.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>{r.category}</Text>
              <Text
                style={{
                  color: over ? palette.negative : palette.textMuted,
                  fontSize: type.small,
                  fontWeight: '600',
                }}
              >
                {money(r.spent)} of {money(r.limit)}
              </Text>
            </Row>
            <View style={{ marginVertical: 10 }}>
              <ProgressBar pct={r.pct} />
            </View>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: over ? palette.negative : palette.positive, fontSize: type.small, fontWeight: '600' }}>
                {money(Math.abs(r.remaining))} {over ? 'over' : 'left'}
              </Text>
              <Row style={{ gap: 8 }}>
                <Stepper label="−" onPress={() => adjust(r.category, -25)} />
                <Stepper label="+" onPress={() => adjust(r.category, 25)} />
              </Row>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 34,
        height: 34,
        borderRadius: radius.sm,
        backgroundColor: palette.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: palette.primary, fontSize: 20, fontWeight: '700', lineHeight: 22 }}>{label}</Text>
    </Pressable>
  );
}
