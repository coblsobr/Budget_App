import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Row, ProgressBar } from '../components/ui';
import { useTheme, type, space } from '../theme/theme';
import { money, percent } from '../lib/format';
import { useData } from '../lib/DataProvider';
import { loanDebt } from '../lib/calc';

const KIND_LABEL: Record<string, string> = {
  mortgage: 'Mortgage',
  auto: 'Auto Loan',
  student: 'Student Loan',
  personal: 'Personal Loan',
};

export default function Debts() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data } = useData();
  const debts = data.debts;
  const total = loanDebt(data);
  const totalMin = debts.reduce((s, d) => s + d.minPayment, 0);

  return (
    <Screen title="Debts & Loans" onBack={() => router.back()}>
      <Card>
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>Total Debt</Text>
        <Text style={{ color: palette.negative, fontSize: type.display, fontWeight: '800', marginTop: 4 }}>
          {money(total)}
        </Text>
        {totalMin > 0 ? (
          <Text style={{ color: palette.textMuted, fontSize: type.small, marginTop: 2 }}>
            {money(totalMin)} / mo minimum payments
          </Text>
        ) : null}
      </Card>

      {debts.map((d) => {
        const paidOff = d.originalBalance - d.balance;
        const progress = d.originalBalance > 0 ? (paidOff / d.originalBalance) * 100 : 0;
        const hasProgress = progress > 0.5;
        const sub = [KIND_LABEL[d.kind]];
        if (d.apr > 0) sub.push(`${d.apr}% APR`);
        return (
          <Card key={d.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>{d.name}</Text>
                <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 2 }}>{sub.join(' · ')}</Text>
              </View>
              <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>{money(d.balance)}</Text>
            </Row>

            {hasProgress ? (
              <>
                <View style={{ marginVertical: 10 }}>
                  <ProgressBar pct={progress} color={palette.positive} />
                </View>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: palette.positive, fontSize: type.tiny, fontWeight: '600' }}>
                    {percent(progress, 0)} paid off
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>
                    {d.minPayment > 0 ? `${money(d.minPayment)}/mo · ` : ''}of {money(d.originalBalance)}
                  </Text>
                </Row>
              </>
            ) : d.minPayment > 0 ? (
              <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 8 }}>
                {money(d.minPayment)}/mo minimum
              </Text>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
