import { useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, Row, ProgressBar } from '../../components/ui';
import { useTheme, type, radius, space } from '../../theme/theme';
import { money, dateLabel } from '../../lib/format';
import { useData } from '../../lib/DataProvider';
import { peopleOf, effectivePerson, isExcluded } from '../../lib/people';
import { personBudgetFor, personSpend, txnsForPersonMonth, thisMonth } from '../../lib/calc';
import { Txn } from '../../lib/types';

type Undo = { message: string; revert: () => void };

export default function PersonBudget() {
  const { palette } = useTheme();
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const person = String(name);
  const { data, setTxnPerson, setTxnExcluded } = useData();

  const ym = thisMonth();
  const budget = personBudgetFor(data, person);
  const limit = budget?.limit ?? 0;
  const excludedGroups = budget?.excludedGroups ?? [];
  const spent = personSpend(data, person, ym, excludedGroups);
  const remaining = limit - spent;
  const txns = txnsForPersonMonth(data, person, ym);
  const others = peopleOf(data).filter((p) => p !== person);

  const [undo, setUndo] = useState<Undo | null>(null);
  const [reassignFor, setReassignFor] = useState<Txn | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showUndo = (message: string, revert: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    setUndo({ message, revert });
    timer.current = setTimeout(() => setUndo(null), 10000);
  };
  const runUndo = () => {
    if (timer.current) clearTimeout(timer.current);
    undo?.revert();
    setUndo(null);
  };

  const removeFromBudget = (t: Txn) => {
    setTxnExcluded(t.id, true);
    showUndo(`Removed ${t.merchant}`, () => setTxnExcluded(t.id, false));
  };
  const includeInBudget = (t: Txn) => setTxnExcluded(t.id, false);

  const reassign = (t: Txn, target: string) => {
    const prev = effectivePerson(data, t.id, t.accountId);
    setTxnPerson(t.id, target);
    setReassignFor(null);
    showUndo(`Moved ${t.merchant} to ${target}`, () => setTxnPerson(t.id, prev));
  };
  const onSwipeReassign = (t: Txn) => {
    if (others.length === 0) return;
    if (others.length === 1) reassign(t, others[0]);
    else setReassignFor(t);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      {/* header */}
      <Row style={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xs }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: 12 }}>
          <Text style={{ color: palette.primary, fontSize: 26, lineHeight: 28, fontWeight: '600' }}>‹</Text>
        </Pressable>
        <Text style={{ color: palette.text, fontSize: type.title, fontWeight: '700' }}>{person}’s Budget</Text>
      </Row>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 120, gap: space.md }}>
        {/* budget summary */}
        <Card style={{ backgroundColor: palette.primarySoft, borderColor: palette.primary }}>
          <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>This month</Text>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
            <Text style={{ color: palette.text, fontSize: type.title, fontWeight: '800' }}>
              {money(spent)} <Text style={{ color: palette.textMuted, fontSize: type.body }}>/ {money(limit)}</Text>
            </Text>
            <Text style={{ color: remaining >= 0 ? palette.positive : palette.negative, fontWeight: '700' }}>
              {money(Math.abs(remaining))} {remaining >= 0 ? 'left' : 'over'}
            </Text>
          </Row>
          <View style={{ marginTop: 10 }}>
            <ProgressBar pct={limit > 0 ? (spent / limit) * 100 : 0} />
          </View>
          {excludedGroups.length ? (
            <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 8 }}>
              Ignoring: {excludedGroups.join(', ')}
            </Text>
          ) : null}
        </Card>

        <Text style={{ color: palette.textMuted, fontSize: type.tiny, paddingHorizontal: 4 }}>
          Swipe a transaction: ← remove from budget · → reassign to another person
        </Text>

        {txns.length === 0 ? (
          <Card>
            <Text style={{ color: palette.textMuted, fontSize: type.small }}>No transactions for {person} this month.</Text>
          </Card>
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {txns.map((t, i) => (
              <PersonTxnRow
                key={t.id}
                txn={t}
                excluded={isExcluded(data, t.id)}
                ignoredGroup={excludedGroups.includes(t.category)}
                first={i === 0}
                onRemove={() => removeFromBudget(t)}
                onReassign={() => onSwipeReassign(t)}
                onToggleInclude={() => (isExcluded(data, t.id) ? includeInBudget(t) : removeFromBudget(t))}
              />
            ))}
          </Card>
        )}
      </ScrollView>

      {/* Undo snackbar */}
      {undo ? (
        <View style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: 28 }}>
          <Row
            style={{
              justifyContent: 'space-between',
              backgroundColor: palette.text,
              borderRadius: radius.md,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ color: palette.bg, fontSize: type.small, flex: 1 }} numberOfLines={1}>
              {undo.message}
            </Text>
            <Pressable onPress={runUndo} hitSlop={8}>
              <Text style={{ color: palette.primary, fontSize: type.small, fontWeight: '800' }}>UNDO</Text>
            </Pressable>
          </Row>
        </View>
      ) : null}

      {/* Reassign picker (when >1 other person) */}
      <Modal visible={!!reassignFor} transparent animationType="fade" onRequestClose={() => setReassignFor(null)}>
        <Pressable
          onPress={() => setReassignFor(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: palette.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: 8 }}>
            <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700', marginBottom: 4 }}>
              Move to whose budget?
            </Text>
            {others.map((p) => (
              <Pressable
                key={p}
                onPress={() => reassignFor && reassign(reassignFor, p)}
                style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: palette.border }}
              >
                <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '600' }}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function PersonTxnRow({
  txn,
  excluded,
  ignoredGroup,
  first,
  onRemove,
  onReassign,
  onToggleInclude,
}: {
  txn: Txn;
  excluded: boolean;
  ignoredGroup: boolean;
  first: boolean;
  onRemove: () => void;
  onReassign: () => void;
  onToggleInclude: () => void;
}) {
  const { palette } = useTheme();
  const ref = useRef<any>(null);
  const dim = excluded || ignoredGroup;

  const LeftAction = () => (
    <View style={{ backgroundColor: palette.positive, justifyContent: 'center', paddingHorizontal: 20 }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: type.small }}>Reassign →</Text>
    </View>
  );
  const RightAction = () => (
    <View style={{ backgroundColor: palette.negative, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 20 }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: type.small }}>← Remove</Text>
    </View>
  );

  return (
    <Swipeable
      ref={ref}
      renderLeftActions={() => <LeftAction />}
      renderRightActions={() => <RightAction />}
      onSwipeableOpen={(direction: 'left' | 'right') => {
        if (direction === 'right') onRemove();
        else onReassign();
        ref.current?.close();
      }}
    >
      <Pressable
        onPress={onToggleInclude}
        style={{
          backgroundColor: palette.surface,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          borderTopWidth: first ? 0 : 1,
          borderTopColor: palette.border,
        }}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 10, opacity: dim ? 0.45 : 1 }}>
            <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '600' }} numberOfLines={1}>
              {txn.merchant}
            </Text>
            <Row style={{ gap: 6, marginTop: 3 }}>
              <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>{dateLabel(txn.date)}</Text>
              <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>· {txn.category}</Text>
              {excluded ? (
                <Text style={{ color: palette.negative, fontSize: type.tiny, fontWeight: '700' }}>· removed</Text>
              ) : ignoredGroup ? (
                <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>· ignored group</Text>
              ) : null}
            </Row>
          </View>
          <Text style={{ color: palette.text, fontSize: type.body, fontWeight: '700', opacity: dim ? 0.45 : 1 }}>
            {money(txn.amount)}
          </Text>
        </Row>
      </Pressable>
    </Swipeable>
  );
}
