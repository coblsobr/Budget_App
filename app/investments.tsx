import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row, StatTile, Dot } from '../components/ui';
import { useTheme, type, space } from '../theme/theme';
import { money, moneyCompact, percent } from '../lib/format';
import { useData } from '../lib/DataProvider';
import { accountValue, accountCost, investmentsTotal, investmentsGain } from '../lib/calc';

export default function Investments() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data } = useData();
  const investments = data.investments;
  const total = investmentsTotal(data);
  const { gain, pct } = investmentsGain(data);
  const gainColor = gain >= 0 ? palette.positive : palette.negative;

  return (
    <Screen title="Investments" onBack={() => router.back()}>
      <Card>
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>Total Value</Text>
        <Text style={{ color: palette.text, fontSize: type.display, fontWeight: '800', marginTop: 4 }}>
          {money(total)}
        </Text>
        <Text style={{ color: gainColor, fontSize: type.body, fontWeight: '700', marginTop: 2 }}>
          {money(gain, { sign: true })} ({percent(pct)}) all time
        </Text>
      </Card>

      {investments.map((acc, ai) => {
        const value = accountValue(acc);
        const cost = accountCost(acc);
        const g = value - acc.cash - cost;
        const gp = cost > 0 ? (g / cost) * 100 : 0;
        const gc = g >= 0 ? palette.positive : palette.negative;
        return (
          <Card key={acc.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>{acc.name}</Text>
                <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 2 }}>
                  {acc.institution} · {acc.owner}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>{money(value)}</Text>
                <Text style={{ color: gc, fontSize: type.tiny, fontWeight: '600' }}>{money(g, { sign: true })} ({percent(gp)})</Text>
              </View>
            </Row>

            <View style={{ height: 1, backgroundColor: palette.border, marginVertical: space.md }} />

            {acc.holdings.map((h) => {
              const hv = h.shares * h.price;
              const hg = (h.price - h.costBasis) * h.shares;
              const hgp = h.costBasis > 0 ? ((h.price - h.costBasis) / h.costBasis) * 100 : 0;
              const hc = hg >= 0 ? palette.positive : palette.negative;
              return (
                <Row key={h.ticker} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                  <Row style={{ gap: 10, flex: 1 }}>
                    <Dot color={palette.chart[ai % palette.chart.length]} />
                    <View>
                      <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '700' }}>{h.ticker}</Text>
                      <Text style={{ color: palette.textMuted, fontSize: type.tiny }} numberOfLines={1}>
                        {h.shares} sh · {h.name}
                      </Text>
                    </View>
                  </Row>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600' }}>{money(hv)}</Text>
                    <Text style={{ color: hc, fontSize: type.tiny }}>{percent(hgp)}</Text>
                  </View>
                </Row>
              );
            })}
            {acc.cash > 0 ? (
              <Row style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                <Row style={{ gap: 10 }}>
                  <Dot color={palette.textMuted} />
                  <Text style={{ color: palette.textMuted, fontSize: type.small }}>Cash</Text>
                </Row>
                <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>{money(acc.cash)}</Text>
              </Row>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
