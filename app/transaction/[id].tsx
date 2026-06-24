import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, Row, SectionTitle } from '../../components/ui';
import { useTheme, type, radius, space } from '../../theme/theme';
import { money } from '../../lib/format';
import { useData } from '../../lib/DataProvider';
import { findTxn, accountName } from '../../lib/calc';
import { spendingCategories } from '../../lib/categories';
import { merchantKey } from '../../lib/rules';
import { peopleOf, effectivePerson } from '../../lib/people';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fullDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export default function TransactionDetail() {
  const { palette } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, setMerchantRule, clearMerchantRule, addCategory, setTxnPerson } = useData();

  const txn = findTxn(data, String(id));
  const [newGroup, setNewGroup] = useState('');
  const [adding, setAdding] = useState(false);

  if (!txn) {
    return (
      <Screen title="Transaction" onBack={() => router.back()}>
        <Card>
          <Text style={{ color: palette.textMuted }}>This transaction could not be found.</Text>
        </Card>
      </Screen>
    );
  }

  const isIncome = txn.amount > 0;
  const hasRule = !!data.merchantRules[merchantKey(txn.merchant)];
  const groups = spendingCategories(data.categories);

  const pick = (category: string) => setMerchantRule(txn.merchant, category);

  const addAndPick = () => {
    const clean = newGroup.trim();
    if (!clean) return;
    addCategory(clean);
    setMerchantRule(txn.merchant, clean);
    setNewGroup('');
    setAdding(false);
  };

  return (
    <Screen title="Transaction" onBack={() => router.back()}>
      {/* Amount hero */}
      <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>{txn.merchant}</Text>
        <Text
          style={{
            color: isIncome ? palette.positive : palette.text,
            fontSize: 40,
            fontWeight: '800',
            marginTop: 6,
          }}
        >
          {money(txn.amount, { cents: true })}
        </Text>
      </Card>

      {/* Details */}
      <Card style={{ gap: 0 }}>
        <DetailRow label="Date" value={fullDate(txn.date)} first />
        <DetailRow label="Company" value={txn.merchant} />
        <DetailRow label="Group" value={txn.category} />
        <DetailRow label="Account" value={accountName(data, txn.accountId)} />
        <DetailRow label="Type" value={isIncome ? 'Income' : 'Spending'} />
      </Card>

      {/* Person */}
      <SectionTitle>Person</SectionTitle>
      <Text style={{ color: palette.textMuted, fontSize: type.small, marginTop: -4 }}>
        Whose budget this transaction counts toward.
      </Text>
      <Card>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {peopleOf(data).map((p) => {
            const active = effectivePerson(data, txn.id, txn.accountId) === p;
            return (
              <Pressable
                key={p}
                onPress={() => setTxnPerson(txn.id, p)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: radius.pill,
                  backgroundColor: active ? palette.primary : palette.surfaceAlt,
                }}
              >
                <Text style={{ color: active ? '#fff' : palette.text, fontSize: type.small, fontWeight: '600' }}>
                  {active ? '✓ ' : ''}
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </Row>
      </Card>

      {isIncome ? null : (
        <>
          <SectionTitle>Group</SectionTitle>
          <Text style={{ color: palette.textMuted, fontSize: type.small, marginTop: -4 }}>
            Pick a group for <Text style={{ fontWeight: '700' }}>{txn.merchant}</Text>. It’s applied to every transaction
            from this company.
          </Text>

          <Card>
            <Row style={{ flexWrap: 'wrap', gap: 8 }}>
              {groups.map((g) => {
                const active = g === txn.category;
                return (
                  <Pressable
                    key={g}
                    onPress={() => pick(g)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: radius.pill,
                      backgroundColor: active ? palette.primary : palette.surfaceAlt,
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : palette.text, fontSize: type.small, fontWeight: '600' }}>
                      {active ? '✓ ' : ''}
                      {g}
                    </Text>
                  </Pressable>
                );
              })}
            </Row>

            {adding ? (
              <Row style={{ gap: 8, marginTop: space.md }}>
                <TextInput
                  value={newGroup}
                  onChangeText={setNewGroup}
                  placeholder="New group name"
                  placeholderTextColor={palette.textMuted}
                  autoFocus
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
                  onPress={addAndPick}
                  style={{ paddingHorizontal: 16, justifyContent: 'center', backgroundColor: palette.primary, borderRadius: radius.md }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: type.small }}>Add</Text>
                </Pressable>
              </Row>
            ) : (
              <Pressable onPress={() => setAdding(true)} style={{ marginTop: space.md }}>
                <Text style={{ color: palette.primary, fontSize: type.small, fontWeight: '700' }}>+ New group</Text>
              </Pressable>
            )}
          </Card>

          {hasRule ? (
            <Pressable onPress={() => clearMerchantRule(txn.merchant)} style={{ paddingVertical: 8 }}>
              <Text style={{ color: palette.negative, fontSize: type.small, fontWeight: '600' }}>
                Remove auto-rule for {txn.merchant}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function DetailRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  const { palette } = useTheme();
  return (
    <Row
      style={{
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: palette.border,
      }}
    >
      <Text style={{ color: palette.textMuted, fontSize: type.small }}>{label}</Text>
      <Text style={{ color: palette.text, fontSize: type.small, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </Row>
  );
}
