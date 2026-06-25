import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Row } from '../components/ui';
import { useTheme, type, radius, space } from '../theme/theme';
import { money } from '../lib/format';
import { useData } from '../lib/DataProvider';
import { manualAssetsTotal } from '../lib/calc';
import { ManualAsset } from '../lib/types';

const KINDS: { key: ManualAsset['kind']; label: string }[] = [
  { key: 'real_estate', label: 'Real estate' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'investment', label: 'Investment' },
  { key: 'cash', label: 'Cash' },
  { key: 'other', label: 'Other' },
];

export default function Assets() {
  const { palette } = useTheme();
  const router = useRouter();
  const { data, addManualAsset, updateManualAsset, removeManualAsset } = useData();
  const assets = data.manualAssets ?? [];

  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [kind, setKind] = useState<ManualAsset['kind']>('real_estate');

  const add = () => {
    const v = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
    if (!name.trim() || v <= 0) return;
    addManualAsset({ id: `a-${Date.now()}`, name: name.trim(), value: v, kind });
    setName('');
    setValue('');
  };

  return (
    <Screen title="Manual Assets" subtitle="Things not tied to a linked account" onBack={() => router.back()}>
      <Card style={{ backgroundColor: palette.primarySoft, borderColor: palette.primary }}>
        <Text style={{ color: palette.textMuted, fontSize: type.small, fontWeight: '600' }}>Manual assets total</Text>
        <Text style={{ color: palette.text, fontSize: type.title, fontWeight: '800', marginTop: 2 }}>
          {money(manualAssetsTotal(data))}
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 4 }}>Counts toward your net worth.</Text>
      </Card>

      {assets.map((a) => (
        <AssetCard key={a.id} asset={a} onChange={updateManualAsset} onRemove={() => removeManualAsset(a.id)} />
      ))}

      <SectionTitle>Add an asset</SectionTitle>
      <Card style={{ gap: space.md }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name (e.g. 2021 Honda Pilot, Primary Residence)"
          placeholderTextColor={palette.textMuted}
          style={inputStyle(palette)}
        />
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {KINDS.map((k) => (
            <Pressable
              key={k.key}
              onPress={() => setKind(k.key)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: radius.pill,
                backgroundColor: kind === k.key ? palette.primary : palette.surfaceAlt,
              }}
            >
              <Text style={{ color: kind === k.key ? '#fff' : palette.textMuted, fontSize: type.small, fontWeight: '600' }}>
                {k.label}
              </Text>
            </Pressable>
          ))}
        </Row>
        <Row style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surfaceAlt, borderRadius: radius.md, paddingHorizontal: 10, flex: 1 }}>
            <Text style={{ color: palette.textMuted, fontSize: type.body }}>$</Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              keyboardType="numeric"
              placeholder="Current value"
              placeholderTextColor={palette.textMuted}
              style={{ color: palette.text, paddingVertical: 10, paddingHorizontal: 4, fontSize: type.body, flex: 1 }}
            />
          </View>
          <Pressable onPress={add} style={{ paddingHorizontal: 18, justifyContent: 'center', backgroundColor: palette.primary, borderRadius: radius.md }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: type.small }}>Add</Text>
          </Pressable>
        </Row>
      </Card>
    </Screen>
  );
}

function AssetCard({
  asset,
  onChange,
  onRemove,
}: {
  asset: ManualAsset;
  onChange: (a: ManualAsset) => void;
  onRemove: () => void;
}) {
  const { palette } = useTheme();
  const [val, setVal] = useState(String(asset.value));
  const label = KINDS.find((k) => k.key === asset.kind)?.label ?? 'Other';

  const commit = (text: string) => {
    setVal(text);
    const v = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
    onChange({ ...asset, value: v });
  };

  return (
    <Card style={{ gap: space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>{asset.name}</Text>
          <Text style={{ color: palette.textMuted, fontSize: type.tiny, marginTop: 2 }}>{label}</Text>
        </View>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Text style={{ color: palette.negative, fontSize: type.small, fontWeight: '600' }}>Remove</Text>
        </Pressable>
      </Row>
      <Row style={{ gap: 10, alignItems: 'center' }}>
        <Text style={{ color: palette.textMuted, fontSize: type.small }}>Value</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surfaceAlt, borderRadius: radius.md, paddingHorizontal: 10 }}>
          <Text style={{ color: palette.textMuted, fontSize: type.body }}>$</Text>
          <TextInput
            value={val}
            onChangeText={commit}
            keyboardType="numeric"
            style={{ color: palette.text, paddingVertical: 8, paddingHorizontal: 4, fontSize: type.body, minWidth: 90 }}
          />
        </View>
      </Row>
    </Card>
  );
}

function inputStyle(palette: any) {
  return {
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.md,
    color: palette.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: type.body,
  };
}
