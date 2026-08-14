import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { colors, radius, spacing } from './theme';

/**
 * Geri dönüş — tek yerden.
 *
 * Kullanıcının bildirdiği hata: *"görevlere veya başka yere tıklayınca geri
 * tuşu yok; site formatında olmayınca dönemiyorsun."* Sebep şu: bu ekranlar
 * `presentation: 'modal'` ile açılıyor ve react-navigation modal'a geri oku
 * koymuyor. Tarayıcıda fark edilmiyor (adres çubuğunun geri tuşu var), ama
 * **ana ekrana eklenmiş PWA'da adres çubuğu yok** — ekrandan çıkış yolu
 * kalmıyor, kullanıcı uygulamayı kapatmak zorunda kalıyor.
 *
 * ⚠️ `router.back()` tek başına yetmiyor: kullanıcı uygulamayı doğrudan bu
 * adreste açtıysa (PWA son sayfayı hatırlar, sayfa yenilenir, yer imi
 * paylaşılır) geçmişte dönülecek bir yer yoktur ve düğme **hiçbir şey
 * yapmaz** — yani hatanın aynısı. O yüzden geçmiş boşken "Bugün" ekranına
 * düşülüyor: geri düğmesi her koşulda bir çıkış kapısıdır.
 */
export function goBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/');
}

/**
 * Başlıktaki geri düğmesi. `app/_layout.tsx` içinde `screenOptions.headerLeft`
 * olarak veriliyor — böylece yeni bir ekran eklendiğinde geri tuşu
 * kendiliğinden gelir, tek tek eklemek unutulamaz.
 */
export function BackButton() {
  return (
    <Pressable
      onPress={goBack}
      // Parmakla basılacak; ikonun kendisi küçük olsa da alan 44 px olmalı.
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Geri"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.text}>‹ Geri</Text>
    </Pressable>
  );
}

/**
 * Ekranın sonundaki büyük geri düğmesi (görev bitince, sonuç ekranında).
 * Başlıktakiyle aynı davranış; oradaki küçük, burası "işim bitti" hareketi.
 */
export function BackToTodayButton({ label = 'Bugüne dön' }: { label?: string }) {
  return (
    <Pressable
      onPress={goBack}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.wide, pressed && styles.pressed]}
    >
      <Text style={styles.wideText}>‹ {label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.sm + 2,
    paddingRight: spacing.md,
    paddingLeft: spacing.sm,
    justifyContent: 'center',
  },
  text: { fontSize: 17, color: colors.accent, fontWeight: '600' },
  pressed: { opacity: 0.5 },

  wide: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  wideText: { fontSize: 16, color: colors.accent, fontWeight: '600' },
});
