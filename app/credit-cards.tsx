import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Row, ProgressBar, StatTile } from '../components/ui';
import { useTheme, type, space } from '../theme/theme';
import { money, percent } from '../lib/format';
import { useData } from '../lib/DataProvider';
import { creditCardDebt } from '../lib/calc';

export default function CreditCards() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data } = useData();
  const creditCards = data.creditCards;
  const totalOwed = creditCardDebt(data);
  const totalLimit = creditCards.reduce((s, c) => s + c.limit, 0);
  const hasLimits = totalLimit > 0;
  const utilization = hasLimits ? (totalOwed / totalLimit) * 100 : 0;

  return (
    <Screen title="Credit Cards" onBack={() => router.back()}>
      <Card>
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>Total Owed</Text>
        <Text style={{ color: palette.negative, fontSize: type.display, fontWeight: '800', marginTop: 4 }}>
          {money(totalOwed)}
        </Text>
        {hasLimits ? (
          <>
            <Row style={{ justifyContent: 'space-between', marginTop: 8, marginBottom: 6 }}>
              <Text style={{ color: palette.textMuted, fontSize: type.small }}>Overall utilization</Text>
              <Text style={{ color: utilization > 30 ? palette.warning : palette.positive, fontSize: type.small, fontWeight: '700' }}>
                {percent(utilization, 0)}
              </Text>
            </Row>
            <ProgressBar pct={utilization} color={utilization > 30 ? palette.warning : palette.positive} />
          </>
        ) : null}
      </Card>

      {creditCards.map((c) => {
        const hasLimit = c.limit > 0;
        const util = hasLimit ? (c.balance / c.limit) * 100 : 0;
        const meta: string[] = [];
        if (c.apr > 0) meta.push(`${c.apr}% APR`);
        if (c.dueDay > 0 && hasLimit) meta.push(`due ${ordinal(c.dueDay)}`);
        return (
          <Card key={c.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 2 }} numberOfLines={1}>
                  {c.institution} · {c.owner}
                </Text>
              </View>
              <Text style={{ color: palette.negative, fontSize: type.heading, fontWeight: '700', flexShrink: 0 }}>
                {money(c.balance)}
              </Text>
            </Row>

            {hasLimit ? (
              <>
                <View style={{ marginVertical: 10 }}>
                  <ProgressBar pct={util} color={util > 30 ? palette.warning : palette.primary} />
                </View>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>
                    {money(c.balance)} of {money(c.limit)} · {percent(util, 0)} used
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>{meta.join(' · ')}</Text>
                </Row>
              </>
            ) : (
              <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 8 }}>
                {meta.length ? `${meta.join(' · ')} · ` : ''}Add a credit limit in-app to track utilization.
              </Text>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
