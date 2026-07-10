import { View, Text, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row, Dot, StatTile } from '../../components/ui';
import { LineChart } from '../../components/charts';
import { ChevronRight } from '../../components/icons';
import { useTheme, type, space } from '../../theme/theme';
import { money, moneyCompact, monthLabel, monthLabelLong } from '../../lib/format';
import {
  netWorth,
  netWorthHistory,
  assetsTotal,
  liabilitiesTotal,
  cashTotal,
  investmentsTotal,
  manualAssetsTotal,
  creditCardDebt,
  loanDebt,
} from '../../lib/calc';
import { useData } from '../../lib/DataProvider';

export default function NetWorth() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data } = useData();
  const { width } = useWindowDimensions();
  const chartW = Math.min(width, 640) - space.lg * 2 - space.lg * 2;

  const accounts = data.accounts;
  const history = netWorthHistory(data);
  const lastSnap = data.snapshots && data.snapshots.length ? data.snapshots[data.snapshots.length - 1] : null;
  const series = history.map((p) => p.assets - p.liabilities);
  const labels = history.map((p) => monthLabel(p.month));

  return (
    <Screen title="Net Worth">
      <Card onPress={() => router.push('/breakdown/networth')}>
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>Total Net Worth</Text>
        <Text style={{ color: palette.text, fontSize: type.display, fontWeight: '800', marginTop: 4 }}>
          {money(netWorth(data))}
        </Text>
        <View style={{ marginTop: space.md, marginHorizontal: -space.sm }}>
          <LineChart data={series} labels={labels} width={chartW} height={150} color={palette.primary} />
        </View>
        {lastSnap ? (
          <Text style={{ color: palette.textMuted, fontSize: type.small, marginTop: 6 }}>
            From your history: {money(lastSnap.assets - lastSnap.liabilities)} · {monthLabelLong(lastSnap.month)}
          </Text>
        ) : null}
        <Text style={{ color: palette.primary, fontSize: type.tiny, fontWeight: '600', marginTop: 6 }}>
          Tap for full history ›
        </Text>
      </Card>

      <Row style={{ gap: space.md }}>
        <StatTile label="Assets" value={moneyCompact(assetsTotal(data))} accent={palette.positive} />
        <StatTile label="Liabilities" value={moneyCompact(liabilitiesTotal(data))} accent={palette.negative} />
      </Row>

      {/* Assets */}
      <SectionTitle>Assets</SectionTitle>
      <LineItem label="Cash & Savings" value={money(cashTotal(data))} color={palette.positive} />
      {accounts.map((a) => (
        <SubItem key={a.id} label={`${a.name}`} sub={`${a.institution} · ${a.owner}`} value={money(a.balance)} />
      ))}
      <LineItem
        label="Investments"
        value={money(investmentsTotal(data))}
        color={palette.primary}
        onPress={() => router.push('/investments')}
      />
      <LineItem
        label="Manual Assets"
        value={money(manualAssetsTotal(data))}
        color={palette.warning}
        onPress={() => router.push('/assets')}
      />

      {/* Liabilities */}
      <SectionTitle>Liabilities</SectionTitle>
      <LineItem
        label="Credit Cards"
        value={`-${money(creditCardDebt(data))}`}
        color={palette.warning}
        onPress={() => router.push('/credit-cards')}
      />
      <LineItem
        label="Loans & Debt"
        value={`-${money(loanDebt(data))}`}
        color={palette.negative}
        onPress={() => router.push('/debts')}
      />
    </Screen>
  );
}

function LineItem({
  label,
  value,
  color,
  onPress,
}: {
  label: string;
  value: string;
  color: string;
  onPress?: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Card onPress={onPress} style={{ paddingVertical: space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: 10 }}>
          <Dot color={color} size={12} />
          <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>{label}</Text>
        </Row>
        <Row style={{ gap: 6 }}>
          <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>{value}</Text>
          {onPress ? <ChevronRight color={palette.textMuted} /> : null}
        </Row>
      </Row>
    </Card>
  );
}

function SubItem({ label, sub, value }: { label: string; sub: string; value: string }) {
  const { palette } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', paddingHorizontal: space.sm, paddingVertical: 6 }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ color: palette.textMuted, fontSize: type.small }} numberOfLines={1}>{label}</Text>
        <Text style={{ color: palette.textMuted, fontSize: type.tiny, opacity: 0.7 }} numberOfLines={1}>{sub}</Text>
      </View>
      <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600', flexShrink: 0 }}>{value}</Text>
    </Row>
  );
}
