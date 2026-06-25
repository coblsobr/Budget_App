import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row, ProgressBar } from '../../components/ui';
import { ChevronRight } from '../../components/icons';
import { useTheme, type, radius, space } from '../../theme/theme';
import { money, monthLabelLong, dateLabel } from '../../lib/format';
import { budgetStatus, personBudgetStatus, txnsForMonth, thisMonth } from '../../lib/calc';
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

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const anyExpanded = rows.some((r) => expanded[r.category]);
  const toggle = (cat: string) => setExpanded((p) => ({ ...p, [cat]: !p[cat] }));
  const toggleAll = () => {
    if (anyExpanded) {
      setExpanded({});
    } else {
      const all: Record<string, boolean> = {};
      rows.forEach((r) => (all[r.category] = true));
      setExpanded(all);
    }
  };

  const adjust = (cat: string, delta: number) =>
    setBudgets(data.budgets.map((b) => (b.category === cat ? { ...b, limit: Math.max(0, b.limit + delta) } : b)));

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

      {people.length > 0 ? (
        <>
          <SectionTitle
            right={
              <Text style={{ color: palette.primary, fontSize: type.small, fontWeight: '600' }} onPress={() => router.push('/people')}>
                Manage
              </Text>
            }
          >
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

      <SectionTitle
        right={
          <Text style={{ color: palette.primary, fontSize: type.small, fontWeight: '600' }} onPress={toggleAll}>
            {anyExpanded ? 'Collapse all' : 'Expand all'}
          </Text>
        }
      >
        Categories
      </SectionTitle>
      <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: -4 }}>
        Tap a group to expand its transactions · − / + adjusts its monthly limit.
      </Text>

      {rows.map((r) => {
        const over = r.remaining < 0;
        const isOpen = !!expanded[r.category];
        const txns = isOpen
          ? txnsForMonth(data, ym)
              .filter((t) => t.amount < 0 && t.category === r.category)
              .sort((a, b) => (a.date < b.date ? 1 : -1))
          : [];
        return (
          <Card key={r.category} style={{ paddingVertical: space.md }}>
            <Pressable onPress={() => toggle(r.category)}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ gap: 8, flex: 1 }}>
                  <View style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>
                    <ChevronRight color={palette.textMuted} size={18} />
                  </View>
                  <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700' }}>{r.category}</Text>
                </Row>
                <Text style={{ color: over ? palette.negative : palette.textMuted, fontSize: type.small, fontWeight: '600' }}>
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
            </Pressable>

            {isOpen ? (
              <View style={{ marginTop: space.md, borderTopWidth: 1, borderTopColor: palette.border }}>
                {txns.length === 0 ? (
                  <Text style={{ color: palette.textMuted, fontSize: type.small, paddingTop: space.md }}>
                    No transactions in {r.category} this month.
                  </Text>
                ) : (
                  txns.map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}
                      style={({ pressed }) => [{ paddingVertical: 10 }, pressed && { opacity: 0.6 }]}
                    >
                      <Row style={{ justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600' }} numberOfLines={1}>
                            {t.merchant}
                          </Text>
                          <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 2 }}>{dateLabel(t.date)}</Text>
                        </View>
                        <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600' }}>{money(t.amount)}</Text>
                      </Row>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}
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
