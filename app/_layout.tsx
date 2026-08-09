import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider } from '../src/db/store';

export default function RootLayout() {
  return (
    <StoreProvider>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="task/[id]"
          options={{ title: 'Görev', presentation: 'modal' }}
        />
        <Stack.Screen
          name="placement"
          options={{ title: 'Seviye ölçümü', presentation: 'modal' }}
        />
        <Stack.Screen
          name="feedback"
          options={{ title: 'Düzeltmeler', presentation: 'modal' }}
        />
      </Stack>
    </StoreProvider>
  );
}
