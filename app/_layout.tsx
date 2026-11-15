import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
