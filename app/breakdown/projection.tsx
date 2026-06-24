import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Row, SectionTitle } from '../../components/ui';
import { useTheme, type, space } from '../../theme/theme';
import { money, monthLabel } from '../../lib/format';
import { useData } from '../../lib/DataProvider';
import {
  projectSavings,
  avgMonthlySavings,
  recentMonthKeys,
  totalIncome,
  totalSpending,
  cashTotal,
} from '../../lib/calc';

export default function ProjectionBreakdown() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data } = useData();

  const monthly = avgMonthlySavings(data);
  const projection = projectSavings(data, 12);
  const startCash = cashTotal(data);

  // The months that feed the average (those with data).
  const basis = recentMonthKeys(6)
    .map((k) => ({ k, income: totalIncome(data, k), spent: totalSpending(data, k) }))
    .filter((m) => m.income > 0 || m.spent > 0);

  return (
    <Screen title="Savings Projection" subtitle="How the forecast is built" onBack={() => router.back()}>
      <Card style={{ backgroundColor: palette.primarySoft, borderColor: palette.primary }}>
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>Average saved / month</Text>
        <Text style={{ color: monthly >= 0 ? palette.positive : palette.negative, fontSize: type.title, fontWeight: '800', marginTop: 2 }}>
          {money(monthly)}
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 4 }}>
          Based on the last {basis.length} month{basis.length === 1 ? '' : 's'} of income minus spending. Starting from{' '}
          {money(startCash)} cash today.
        </Text>
      </Card>

      <SectionTitle>Recent months (the basis)</SectionTitle>
      <Card style={{ padding: 0 }}>
        {basis.length === 0 ? (
          <Text style={{ color: palette.textMuted, fontSize: type.small, padding: space.lg }}>Not enough data yet.</Text>
        ) : (
          basis.map((m, i) => {
            const saved = m.income - m.spent;
            return (
              <Row
                key={m.k}
                style={{
                  justifyContent: 'space-between',
                  paddingHorizontal: space.lg,
                  paddingVertical: space.md,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: palette.border,
                }}
              >
                <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '600' }}>{monthLabel(m.k)}</Text>
                <Row style={{ gap: 12 }}>
                  <Text style={{ color: palette.textMuted, fontSize: type.small }}>+{money(m.income)}</Text>
                  <Text style={{ color: palette.textMuted, fontSize: type.small }}>-{money(m.spent)}</Text>
                  <Text style={{ color: saved >= 0 ? palette.positive : palette.negative, fontSize: type.small, fontWeight: '700', minWidth: 64, textAlign: 'right' }}>
                    {money(saved, { sign: true })}
                  </Text>
                </Row>
              </Row>
            );
          })
        )}
      </Card>

      <SectionTitle>Projected balance</SectionTitle>
      <Card style={{ padding: 0 }}>
        {projection.map((p, i) => (
          <Row
            key={p.month}
            style={{
              justifyContent: 'space-between',
              paddingHorizontal: space.lg,
              paddingVertical: space.md,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: palette.border,
            }}
          >
            <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '600' }}>{p.label}</Text>
            <Row style={{ gap: 12, alignItems: 'baseline' }}>
              <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>+{money(p.saved)} saved</Text>
              <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>{money(p.balance)}</Text>
            </Row>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
