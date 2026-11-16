import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ErrorBoundaryProps } from 'expo-router';
import { CrashScreen } from '@/components/skelp/CrashScreen';

/** Any rendering error shows a recovery screen instead of closing the app. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <CrashScreen error={error} retry={retry} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
