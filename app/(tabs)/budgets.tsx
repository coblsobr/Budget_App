import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Row, ProgressBar } from '../../components/ui';
import { BudgetIcon, PeopleIcon, ChevronRight } from '../../components/icons';
import { useTheme, type, radius, space } from '../../theme/theme';
import { money, monthLabelLong } from '../../lib/format';
import { budgetStatus, personBudgetStatus, thisMonth } from '../../lib/calc';
import { useData } from '../../lib/DataProvider';

export default function Budgets() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data } = useData();
  const ym = thisMonth();
  const rows = budgetStatus(data, ym);
  const people = personBudgetStatus(data, ym);

  const totalLimit = rows.reduce((s, r) => s + r.limit, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const totalRemaining = totalLimit - totalSpent;

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
          <ProgressBar pct={totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0} />
        </View>
      </Card>

      <BigButton
        icon={<BudgetIcon color={palette.primary} size={26} />}
        title="Categories"
        subtitle={`${rows.length} groups · tap to open`}
        onPress={() => router.push('/budget-categories')}
      />
      <BigButton
        icon={<PeopleIcon color={palette.positive} size={26} />}
        title="Individual"
        subtitle={people.length > 0 ? `${people.length} people` : 'Set up per-person budgets'}
        onPress={() => router.push('/people')}
      />
    </Screen>
  );
}

function BigButton({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Card onPress={onPress} style={{ paddingVertical: space.xl }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: space.lg, alignItems: 'center', flex: 1 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radius.md,
              backgroundColor: palette.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: type.title, fontWeight: '800' }}>{title}</Text>
            <Text style={{ color: palette.textMuted, fontSize: type.small, marginTop: 2 }}>{subtitle}</Text>
          </View>
        </Row>
        <ChevronRight color={palette.textMuted} />
      </Row>
    </Card>
  );
}
