import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Row, SectionTitle } from '../../components/ui';
import { useTheme, type, space } from '../../theme/theme';
import { money, monthLabel } from '../../lib/format';
import { useData } from '../../lib/DataProvider';
import { netWorthHistory } from '../../lib/calc';

export default function NetWorthBreakdown() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data } = useData();

  const history = netWorthHistory(data);
  // Build rows newest-first with month-over-month change.
  const rows = history
    .map((p, i) => {
      const net = p.assets - p.liabilities;
      const prev = i > 0 ? history[i - 1].assets - history[i - 1].liabilities : null;
      return { month: p.month, assets: p.assets, liabilities: p.liabilities, net, change: prev == null ? null : net - prev };
    })
    .reverse();

  // Group by year.
  const byYear = new Map<string, typeof rows>();
  rows.forEach((r) => {
    const y = r.month.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(r);
  });

  return (
    <Screen title="Net Worth History" subtitle="What the trend is made of" onBack={() => router.back()}>
      {[...byYear.entries()].map(([year, months]) => (
        <View key={year} style={{ gap: space.md }}>
          <SectionTitle>{year}</SectionTitle>
          <Card style={{ padding: 0 }}>
            {months.map((r, i) => (
              <View
                key={r.month}
                style={{
                  paddingHorizontal: space.lg,
                  paddingVertical: space.md,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: palette.border,
                }}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>{monthLabel(r.month)}</Text>
                  <Row style={{ gap: 8, alignItems: 'baseline' }}>
                    <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>{money(r.net)}</Text>
                    {r.change != null ? (
                      <Text
                        style={{
                          color: r.change >= 0 ? palette.positive : palette.negative,
                          fontSize: type.small,
                          fontWeight: '600',
                          minWidth: 64,
                          textAlign: 'right',
                        }}
                      >
                        {money(r.change, { sign: true })}
                      </Text>
                    ) : null}
                  </Row>
                </Row>
                <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 3 }}>
                  Assets {money(r.assets)} · Liabilities {money(r.liabilities)}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
