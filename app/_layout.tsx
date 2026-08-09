import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider } from '../src/db/store';
import { AutoSync } from '../src/sync/autosync';

export default function RootLayout() {
  return (
    <StoreProvider>
      {/* Görünmez: açılışta çeker, değişiklikten sonra gönderir. */}
      <AutoSync />
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
        <Stack.Screen
          name="conversation"
          options={{ title: 'Günün sohbeti', presentation: 'modal' }}
        />
        <Stack.Screen
          name="interests"
          options={{ title: 'Zevklerin', presentation: 'modal' }}
        />
        <Stack.Screen
          name="levelexam"
          options={{ title: 'Seviye puanlaması', presentation: 'modal' }}
        />
      </Stack>
    </StoreProvider>
  );
}
