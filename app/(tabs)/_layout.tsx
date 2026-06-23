import { Tabs } from 'expo-router';
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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <HomeIcon color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="budgets"
        options={{ title: 'Budgets', tabBarIcon: ({ color }) => <BudgetIcon color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="spending"
        options={{ title: 'Spending', tabBarIcon: ({ color }) => <SpendingIcon color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="networth"
        options={{ title: 'Net Worth', tabBarIcon: ({ color }) => <NetWorthIcon color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <SettingsIcon color={color} size={22} /> }}
      />
    </Tabs>
  );
}
