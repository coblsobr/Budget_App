import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, StatTile, Row, ProgressBar, Dot } from '../../components/ui';
import { LineChart } from '../../components/charts';
import { ChevronRight, InvestIcon, CardIcon, DebtIcon } from '../../components/icons';
import { useTheme, type, space } from '../../theme/theme';
import { money, moneyCompact, monthLabel, monthLabelLong } from '../../lib/format';
import { useData } from '../../lib/DataProvider';
import {
  netWorth,
  netWorthHistory,
  totalIncome,
  totalSpending,
  thisMonth,
  budgetTotals,
  projectSavings,
  investmentsTotal,
  creditCardDebt,
  loanDebt,
  avgMonthlySavings,
} from '../../lib/calc';

export default function Dashboard() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data, source } = useData();
  const { width } = useWindowDimensions();
  const chartW = Math.min(width, 640) - space.lg * 2 - space.lg * 2;

  const ym = thisMonth();
  const income = totalIncome(data, ym);
  const spent = totalSpending(data, ym);
  const saved = income - spent;

  const history = netWorthHistory(data);
  const nwSeries = history.map((p) => p.assets - p.liabilities);
  const nwLabels = history.map((p) => monthLabel(p.month));

  const projection = projectSavings(data, 12);
  const projSeries = projection.map((p) => p.balance);
  const projLabels = projection.map((p) => p.label);
  const oneYear = projection[projection.length - 1];

  const bt = budgetTotals(data, ym);

  return (
    <Screen title="Overview" subtitle={`${monthLabelLong(ym)}${source === 'sample' ? ' · Sample data' : ''}`}>
      {/* Net worth hero */}
      <Card
        style={{ backgroundColor: palette.primarySoft, borderColor: palette.primary }}
        onPress={() => router.push('/breakdown/networth')}
      >
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>Net Worth</Text>
        <Text style={{ color: palette.text, fontSize: type.display, fontWeight: '800', marginTop: 4 }}>
          {money(netWorth(data))}
        </Text>
        <Row style={{ marginTop: 4, gap: 6 }}>
          <Dot color={palette.positive} size={8} />
          <Text style={{ color: palette.positive, fontSize: type.small, fontWeight: '600' }}>
            {money(nwSeries[nwSeries.length - 1] - nwSeries[0], { sign: true })} over 12 mo
          </Text>
        </Row>
        <View style={{ marginTop: space.md, marginHorizontal: -space.sm }}>
          <LineChart data={nwSeries} labels={nwLabels} width={chartW} height={140} color={palette.primary} />
        </View>
        <Text style={{ color: palette.primary, fontSize: type.tiny, fontWeight: '600', marginTop: 6 }}>
          Tap for monthly history ›
        </Text>
      </Card>

      {/* This month */}
      <SectionTitle>This Month</SectionTitle>
      <Row style={{ gap: space.md }}>
        <StatTile label="Income" value={moneyCompact(income)} accent={palette.positive} onPress={() => router.push('/breakdown/income')} />
        <StatTile label="Spent" value={moneyCompact(spent)} accent={palette.negative} onPress={() => router.push('/breakdown/spending')} />
        <StatTile label="Saved" value={moneyCompact(saved)} accent={saved >= 0 ? palette.positive : palette.negative} />
      </Row>

      {/* Budget summary */}
      <Card onPress={() => router.push('/budgets')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>Budget</Text>
          <ChevronRight color={palette.textMuted} />
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 6, marginBottom: 8 }}>
          <Text style={{ color: palette.textMuted, fontSize: type.small }}>
            {money(bt.spent)} of {money(bt.limit)}
          </Text>
          <Text style={{ color: bt.remaining >= 0 ? palette.positive : palette.negative, fontSize: type.small, fontWeight: '600' }}>
            {money(Math.abs(bt.remaining))} {bt.remaining >= 0 ? 'left' : 'over'}
          </Text>
        </Row>
        <ProgressBar pct={(bt.spent / bt.limit) * 100} />
      </Card>

      {/* Projected savings */}
      <SectionTitle>Projected Savings</SectionTitle>
      <Card onPress={() => router.push('/breakdown/projection')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: palette.textMuted, fontSize: type.small }}>In 12 months</Text>
            <Text style={{ color: palette.text, fontSize: type.title, fontWeight: '700' }}>
              {money(oneYear.balance)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: palette.textMuted, fontSize: type.small }}>Avg saved / mo</Text>
            <Text style={{ color: palette.positive, fontSize: type.title, fontWeight: '700' }}>
              {money(avgMonthlySavings(data))}
            </Text>
          </View>
        </Row>
        <View style={{ marginTop: space.md, marginHorizontal: -space.sm }}>
          <LineChart data={projSeries} labels={projLabels} width={chartW} height={140} color={palette.positive} />
        </View>
        <Text style={{ color: palette.primary, fontSize: type.tiny, fontWeight: '600', marginTop: 6 }}>
          Tap to see how it's calculated ›
        </Text>
      </Card>

      {/* Trends */}
      <Card onPress={() => router.push('/trends')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>Trends & Insights</Text>
            <Text style={{ color: palette.textMuted, fontSize: type.small, marginTop: 2 }}>
              Income vs spending, by account, by group
            </Text>
          </View>
          <ChevronRight color={palette.textMuted} />
        </Row>
      </Card>

      {/* Quick links */}
      <SectionTitle>Accounts</SectionTitle>
      <QuickLink
        icon={<InvestIcon color={palette.primary} size={20} />}
        label="Investments"
        value={money(investmentsTotal(data))}
        onPress={() => router.push('/investments')}
      />
      <QuickLink
        icon={<CardIcon color={palette.warning} size={20} />}
        label="Credit Cards"
        value={money(creditCardDebt(data))}
        negative
        onPress={() => router.push('/credit-cards')}
      />
      <QuickLink
        icon={<DebtIcon color={palette.negative} size={20} />}
        label="Debts & Loans"
        value={money(loanDebt(data))}
        negative
        onPress={() => router.push('/debts')}
      />
    </Screen>
  );
}

function QuickLink({
  icon,
  label,
  value,
  negative,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  negative?: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Card onPress={onPress} style={{ paddingVertical: space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: space.md }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: palette.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </View>
          <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '600' }}>{label}</Text>
        </Row>
        <Row style={{ gap: 6 }}>
          <Text
            style={{
              color: negative ? palette.negative : palette.text,
              fontSize: type.body,
              fontWeight: '700',
            }}
          >
            {negative ? `-${value}` : value}
          </Text>
          <ChevronRight color={palette.textMuted} />
        </Row>
      </Row>
    </Card>
  );
}
