import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../theme/theme';
import { DataProvider } from '../lib/DataProvider';

function Layout() {
  const { palette } = useTheme();
  return (
    <>
      <StatusBar style={palette.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DataProvider>
          <Layout />
        </DataProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
