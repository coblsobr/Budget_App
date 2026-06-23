import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type, radius, space } from '../theme/theme';

export function Screen({
  children,
  title,
  subtitle,
  right,
  onBack,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const { palette } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
      {title ? (
        <View style={styles.header}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={10} style={{ marginRight: 12 }}>
              <Text style={{ color: palette.primary, fontSize: 26, lineHeight: 28, fontWeight: '600' }}>‹</Text>
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: type.title, fontWeight: '700' }}>{title}</Text>
            {subtitle ? (
              <Text style={{ color: palette.textMuted, fontSize: type.small, marginTop: 2 }}>{subtitle}</Text>
            ) : null}
          </View>
          {right}
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: 40, gap: space.md }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const { palette } = useTheme();
  const base: ViewStyle = {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: space.lg,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, style, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>{children}</Text>
      {right}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: radius.pill,
        backgroundColor: active ? palette.primary : palette.surfaceAlt,
      }}
    >
      <Text
        style={{
          color: active ? '#fff' : palette.textMuted,
          fontSize: type.small,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  const { palette } = useTheme();
  const clamped = Math.max(0, Math.min(100, pct));
  const over = pct > 100;
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.surfaceAlt, overflow: 'hidden' }}>
      <View
        style={{
          height: '100%',
          width: `${clamped}%`,
          borderRadius: 4,
          backgroundColor: over ? palette.negative : color ?? palette.primary,
        }}
      />
    </View>
  );
}

export function StatTile({
  label,
  value,
  accent,
  valueStyle,
}: {
  label: string;
  value: string;
  accent?: string;
  valueStyle?: TextStyle;
}) {
  const { palette } = useTheme();
  return (
    <Card style={{ flex: 1, padding: space.md }}>
      <Text style={{ color: palette.textMuted, fontSize: type.tiny, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Text>
      <Text style={[{ color: accent ?? palette.text, fontSize: type.title, fontWeight: '700', marginTop: 4 }, valueStyle]}>
        {value}
      </Text>
    </Card>
  );
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
});
