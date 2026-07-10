import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row, ProgressBar } from '../components/ui';
import { ChevronRight } from '../components/icons';
import { useTheme, type, radius, space } from '../theme/theme';
import { money, monthLabelLong, dateLabel } from '../lib/format';
import { budgetStatus, txnsForMonth, thisMonth } from '../lib/calc';
import { useData } from '../lib/DataProvider';

export default function BudgetCategories() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data, setBudgets } = useData();
  const ym = thisMonth();
  const rows = budgetStatus(data, ym);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const anyExpanded = rows.some((r) => expanded[r.category]);
  const toggle = (cat: string) => setExpanded((p) => ({ ...p, [cat]: !p[cat] }));
  const toggleAll = () => {
    if (anyExpanded) setExpanded({});
    else {
      const all: Record<string, boolean> = {};
      rows.forEach((r) => (all[r.category] = true));
      setExpanded(all);
    }
  };

  const adjust = (cat: string, delta: number) =>
    setBudgets(data.budgets.map((b) => (b.category === cat ? { ...b, limit: Math.max(0, b.limit + delta) } : b)));

  const startEdit = (cat: string, current: number) => {
    setEditing(cat);
    setDraft(current > 0 ? String(current) : '');
  };

  const saveEdit = () => {
    if (!editing) return;
    const val = parseFloat(draft.replace(/[^0-9.]/g, ''));
    if (!isNaN(val) && val >= 0) {
      setBudgets(data.budgets.map((b) => (b.category === editing ? { ...b, limit: Math.round(val) } : b)));
    }
    setEditing(null);
    setDraft('');
  };

  const addBudget = (cat: string) => {
    setBudgets([...data.budgets, { category: cat, limit: 0 }]);
    setExpanded((p) => ({ ...p, [cat]: true }));
    setEditing(cat);
    setDraft('');
  };

  const removeBudget = (cat: string) => {
    setBudgets(data.budgets.filter((b) => b.category !== cat));
    setExpanded((p) => ({ ...p, [cat]: false }));
    if (editing === cat) setEditing(null);
  };

  // Categories that don't have a budget yet (available to add).
  const budgeted = new Set(data.budgets.map((b) => b.category));
  const unbudgeted = data.categories.filter((c) => !budgeted.has(c));

  return (
    <Screen
      title="Categories"
      subtitle={monthLabelLong(ym)}
      onBack={() => router.back()}
      right={
        <Text style={{ color: palette.primary, fontSize: type.small, fontWeight: '600' }} onPress={toggleAll}>
          {anyExpanded ? 'Collapse all' : 'Expand all'}
        </Text>
      }
    >
      {rows.map((r) => {
        const over = r.remaining < 0;
        const isOpen = !!expanded[r.category];
        const isEditing = editing === r.category;
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
              <View style={{ marginTop: 10 }}>
                <ProgressBar pct={r.pct} />
              </View>
            </Pressable>

            {isOpen ? (
              <View style={{ marginTop: space.md }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: over ? palette.negative : palette.positive, fontSize: type.small, fontWeight: '600' }}>
                    {money(Math.abs(r.remaining))} {over ? 'over' : 'left'}
                  </Text>
                  <Row style={{ gap: 8 }}>
                    <Stepper label="−" onPress={() => adjust(r.category, -25)} />
                    <Stepper label="+" onPress={() => adjust(r.category, 25)} />
                  </Row>
                </Row>

                {/* Set exact amount */}
                {isEditing ? (
                  <Row style={{ gap: 8, marginTop: space.md }}>
                    <View
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: palette.surfaceAlt,
                        borderRadius: radius.sm,
                        borderWidth: 1,
                        borderColor: palette.primary,
                        paddingHorizontal: 12,
                      }}
                    >
                      <Text style={{ color: palette.textMuted, fontSize: type.body, fontWeight: '600' }}>$</Text>
                      <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        keyboardType="numeric"
                        autoFocus
                        placeholder="Monthly amount"
                        placeholderTextColor={palette.textMuted}
                        onSubmitEditing={saveEdit}
                        style={{ flex: 1, color: palette.text, fontSize: type.body, fontWeight: '700', paddingVertical: 10, paddingHorizontal: 6 }}
                      />
                    </View>
                    <Pressable
                      onPress={saveEdit}
                      style={{
                        backgroundColor: palette.primary,
                        borderRadius: radius.sm,
                        paddingHorizontal: 16,
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: type.small }}>Save</Text>
                    </Pressable>
                  </Row>
                ) : (
                  <Row style={{ justifyContent: 'space-between', marginTop: space.md }}>
                    <Text
                      onPress={() => startEdit(r.category, r.limit)}
                      style={{ color: palette.primary, fontSize: type.small, fontWeight: '600', paddingVertical: 4 }}
                    >
                      Set exact amount
                    </Text>
                    <Text
                      onPress={() => removeBudget(r.category)}
                      style={{ color: palette.negative, fontSize: type.small, fontWeight: '600', paddingVertical: 4 }}
                    >
                      Remove budget
                    </Text>
                  </Row>
                )}

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
              </View>
            ) : null}
          </Card>
        );
      })}

      {/* Add a budget for a category that doesn't have one */}
      {unbudgeted.length > 0 ? (
        <>
          <SectionTitle>Not budgeted</SectionTitle>
          <Card style={{ paddingVertical: space.md }}>
            <Text style={{ color: palette.textMuted, fontSize: type.small, marginBottom: space.md }}>
              Tap a category to start budgeting it.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {unbudgeted.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => addBudget(c)}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: palette.surfaceAlt,
                      borderWidth: 1,
                      borderColor: palette.border,
                    },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600' }}>+ {c}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </>
      ) : null}
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
