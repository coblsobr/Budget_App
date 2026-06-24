import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row } from '../components/ui';
import { useTheme, type, radius, space } from '../theme/theme';
import { money } from '../lib/format';
import { useData } from '../lib/DataProvider';
import { peopleOf } from '../lib/people';
import { spendingCategories } from '../lib/categories';
import { personBudgetFor } from '../lib/calc';

export default function People() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data, addPerson, removePerson } = useData();
  const [newName, setNewName] = useState('');
  const people = peopleOf(data);

  return (
    <Screen title="People & Budgets" onBack={() => router.back()}>
      <Text style={{ color: palette.textMuted, fontSize: type.small, lineHeight: 19 }}>
        Give each person a monthly allowance. Choose groups to ignore (like Housing or Gas) so shared/fixed costs don’t
        eat someone’s personal budget.
      </Text>

      {people.map((p) => (
        <PersonCard key={p} person={p} onRemove={people.length > 1 ? () => removePerson(p) : undefined} />
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

function PersonCard({ person, onRemove }: { person: string; onRemove?: () => void }) {
  const { palette } = useTheme();
  const { data, setPersonBudget } = useData();
  const budget = personBudgetFor(data, person);
  const [limitText, setLimitText] = useState(budget ? String(budget.limit) : '');
  const excluded = budget?.excludedGroups ?? [];
  const groups = spendingCategories(data.categories);

  const commitLimit = (text: string) => {
    setLimitText(text);
    const n = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
    setPersonBudget(person, n, excluded);
  };

  const toggleGroup = (g: string) => {
    const next = excluded.includes(g) ? excluded.filter((x) => x !== g) : [...excluded, g];
    const n = parseFloat(limitText.replace(/[^0-9.]/g, '')) || 0;
    setPersonBudget(person, n, next);
  };

  return (
    <Card style={{ gap: space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>{person}</Text>
        {onRemove ? (
          <Pressable onPress={onRemove} hitSlop={8}>
            <Text style={{ color: palette.negative, fontSize: type.small, fontWeight: '600' }}>Remove</Text>
          </Pressable>
        ) : null}
      </Row>

      <Row style={{ gap: 10, alignItems: 'center' }}>
        <Text style={{ color: palette.textMuted, fontSize: type.small }}>Monthly allowance</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: palette.surfaceAlt,
            borderRadius: radius.md,
            paddingHorizontal: 10,
          }}
        >
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

      <View>
        <Text style={{ color: palette.textMuted, fontSize: type.small, marginBottom: 8 }}>Ignore these groups</Text>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {groups.map((g) => {
            const on = excluded.includes(g);
            return (
              <Pressable
                key={g}
                onPress={() => toggleGroup(g)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: radius.pill,
                  backgroundColor: on ? palette.negative : palette.surfaceAlt,
                }}
              >
                <Text style={{ color: on ? '#fff' : palette.textMuted, fontSize: type.small, fontWeight: '600' }}>
                  {on ? '✕ ' : ''}
                  {g}
                </Text>
              </Pressable>
            );
          })}
        </Row>
      </View>
    </Card>
  );
}
