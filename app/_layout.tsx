import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider } from '../src/db/store';
import { AutoSync } from '../src/sync/autosync';
import { BackButton } from '../src/ui/BackButton';
import { colors } from '../src/ui/theme';

export default function RootLayout() {
  return (
    <StoreProvider>
      {/* Görünmez: açılışta çeker, değişiklikten sonra gönderir. */}
      <AutoSync />
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          /**
           * ⚠️ Geri tuşu burada, **her ekran için birden** veriliyor.
           *
           * Sebebi: ekranlar `presentation: 'modal'` ile açılıyor ve
           * react-navigation modal'a kendi geri okunu koymuyor. Tarayıcıda
           * fark edilmiyordu (adres çubuğunun geri tuşu var), ama ana ekrana
           * eklenmiş PWA'da adres çubuğu yok — kullanıcı göreve girince
           * ekranda kilitli kalıyordu.
           *
           * Tek tek ekranlara yazmak yerine `screenOptions`'ta olması şart:
           * yarın yeni bir ekran eklendiğinde geri tuşu kendiliğinden gelir,
           * eklemeyi unutmak mümkün olmaz.
           */
          headerLeft: () => <BackButton />,
          /** iOS'ta yerleşik ok da çıkarsa iki geri tuşu görünür. */
          headerBackVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTitleStyle: { color: colors.text, fontSize: 17 },
        }}
      >
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
        {/* Bu ikisi listede hiç yoktu; başlıkları rota adından (“scenario”,
            “sor”) türüyordu. Artık ötekilerle aynı düzende. */}
        <Stack.Screen
          name="scenario"
          options={{ title: 'Canlandırma', presentation: 'modal' }}
        />
        <Stack.Screen
          name="sor"
          options={{ title: 'Öğretmene sor', presentation: 'modal' }}
        />
      </Stack>
    </StoreProvider>
  );
}
