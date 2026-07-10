import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row, ProgressBar } from '../components/ui';
import { useTheme, type, radius, space } from '../theme/theme';
import { money } from '../lib/format';
import { useData } from '../lib/DataProvider';
import { peopleOf } from '../lib/people';
import { personBudgetFor, personSpend, accountName, thisMonth } from '../lib/calc';

export default function People() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data, addPerson } = useData();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const people = peopleOf(data);

  return (
    <Screen title="Individual Budgets" onBack={() => router.back()}>
      <Text style={{ color: palette.textMuted, fontSize: type.small, lineHeight: 19 }}>
        Nothing counts toward a person by default. Tap the ⋮ on someone, then light up the cards and categories that
        should count toward their allowance.
      </Text>

      {people.map((p) => (
        <PersonCard key={p} person={p} editing={editing === p} onToggleEdit={() => setEditing(editing === p ? null : p)} />
      ))}

      <SectionTitle>Add a person</SectionTitle>
      <Card>
        <Row style={{ gap: 8 }}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Name (e.g. Teen)"
            placeholderTextColor={palette.textMuted}
            style={{
              flex: 1,
              backgroundColor: palette.surfaceAlt,
              borderRadius: radius.md,
              color: palette.text,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: type.small,
            }}
          />
          <Pressable
            onPress={() => {
              addPerson(newName);
              setNewName('');
            }}
            style={{ paddingHorizontal: 16, justifyContent: 'center', backgroundColor: palette.primary, borderRadius: radius.md }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: type.small }}>Add</Text>
          </Pressable>
        </Row>
      </Card>
    </Screen>
  );
}

function PersonCard({ person, editing, onToggleEdit }: { person: string; editing: boolean; onToggleEdit: () => void }) {
  const { palette } = useTheme();
  const { data, removePerson, setPersonLimit, setPersonInclusion, setPersonBudget } = useData();
  const ym = thisMonth();

  const pb = personBudgetFor(data, person);
  const limit = pb?.limit ?? 0;
  const included = pb?.included ?? {};
  const spent = personSpend(data, person, ym);
  const over = spent > limit && limit > 0;

  const [limitText, setLimitText] = useState(String(limit || ''));

  // Accounts/cards that actually have spending, plus the categories seen on each.
  const accountIds = [...new Set(data.transactions.filter((t) => t.amount < 0).map((t) => t.accountId))];
  const cards = accountIds
    .map((id) => {
      const cats = [
        ...new Set(data.transactions.filter((t) => t.accountId === id && t.amount < 0).map((t) => t.category)),
      ]
        .filter((c) => c !== 'Income')
        .sort();
      return { id, name: accountName(data, id), cats };
    })
    .filter((c) => c.cats.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const commitLimit = (text: string) => {
    setLimitText(text);
    const n = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
    if (pb) setPersonLimit(person, n);
    else setPersonBudget(person, n, {});
  };

  return (
    <Card style={{ gap: space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>{person}</Text>
        <Row style={{ gap: 10, alignItems: 'center' }}>
          <Text style={{ color: over ? palette.negative : palette.textMuted, fontSize: type.small, fontWeight: '600' }}>
            {money(spent)} / {money(limit)}
          </Text>
          <Pressable onPress={onToggleEdit} hitSlop={8}>
            <Text style={{ color: editing ? palette.primary : palette.textMuted, fontSize: 20, fontWeight: '800', lineHeight: 20 }}>
              ⋮
            </Text>
          </Pressable>
        </Row>
      </Row>
      <ProgressBar pct={limit > 0 ? (spent / limit) * 100 : 0} />

      {editing ? (
        <View style={{ gap: space.md, marginTop: 4 }}>
          <Row style={{ gap: 10, alignItems: 'center' }}>
            <Text style={{ color: palette.textMuted, fontSize: type.small }}>Monthly allowance</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surfaceAlt, borderRadius: radius.md, paddingHorizontal: 10 }}>
              <Text style={{ color: palette.textMuted, fontSize: type.body }}>$</Text>
              <TextInput
                value={limitText}
                onChangeText={commitLimit}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={palette.textMuted}
                style={{ color: palette.text, paddingVertical: 8, paddingHorizontal: 4, fontSize: type.body, minWidth: 70 }}
              />
            </View>
          </Row>

          <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>
            Light up a category to count its purchases on that card toward {person}.
          </Text>

          {cards.length === 0 ? (
            <Text style={{ color: palette.textMuted, fontSize: type.small }}>No spending accounts yet.</Text>
          ) : (
            cards.map((card) => (
              <View key={card.id} style={{ gap: 8 }}>
                <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '700' }}>{card.name}</Text>
                <Row style={{ flexWrap: 'wrap', gap: 8 }}>
                  {card.cats.map((cat) => {
                    const on = (included[card.id] ?? []).includes(cat);
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => setPersonInclusion(person, card.id, cat, !on)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: radius.pill,
                          backgroundColor: on ? palette.primary : palette.surfaceAlt,
                          opacity: on ? 1 : 0.55,
                        }}
                      >
                        <Text style={{ color: on ? '#fff' : palette.textMuted, fontSize: type.small, fontWeight: '600' }}>
                          {cat}
                        </Text>
                      </Pressable>
                    );
                  })}
                </Row>
              </View>
            ))
          )}

          <Pressable onPress={() => removePerson(person)} hitSlop={6} style={{ paddingTop: 4 }}>
            <Text style={{ color: palette.negative, fontSize: type.small, fontWeight: '600' }}>Remove {person}</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}
