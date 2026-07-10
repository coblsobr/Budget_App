import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/theme';
import {
  HomeIcon,
  BudgetIcon,
  SpendingIcon,
  NetWorthIcon,
  SettingsIcon,
} from '../../components/icons';

export default function TabsLayout() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  // Lift the bar above Android's gesture / 3-button nav area.
  const bottomInset = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: 58 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <HomeIcon color={color as string} size={22} /> }}
      />
      <Tabs.Screen
        name="budgets"
        options={{ title: 'Budgets', tabBarIcon: ({ color }) => <BudgetIcon color={color as string} size={22} /> }}
      />
      <Tabs.Screen
        name="spending"
        options={{ title: 'Spending', tabBarIcon: ({ color }) => <SpendingIcon color={color as string} size={22} /> }}
      />
      <Tabs.Screen
        name="networth"
        options={{ title: 'Net Worth', tabBarIcon: ({ color }) => <NetWorthIcon color={color as string} size={22} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <SettingsIcon color={color as string} size={22} /> }}
      />
    </Tabs>
  );
}
