import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { checkInstant } from '../src/core/instantcheck';
import { scenarioForDay } from '../src/core/scenarios';
import { speakEnglish } from '../src/core/speech';
import { toISODate } from '../src/core/srs';
import { saveScenarioRun } from '../src/db/mutations';
import { useStore } from '../src/db/store';
import { goBack } from '../src/ui/BackButton';
import { colors, radius, spacing } from '../src/ui/theme';

/**
 * **Canlandırma** — günün sohbetinden ayrı duran ikinci konuşma işi.
 *
 * Kullanıcının kararı: *"Bu senaryo kısmını başka bir uygun yere koyabilir
 * miyiz, beraber koymak yerine… tek yere koymak yerine çeşitlendirme yapmak
 * istiyorum."*
 *
 * Fark şu: **Günün sohbeti** bir içerik üzerine konuşturur (izlediğin video,
 * dinlediğin şarkı) — konusu dünden gelir. **Canlandırma** bir durumun içine
 * sokar (restoranda sipariş, otele giriş) — hazırlık istemez, hayattan gelir.
 * Biri "anlat", öteki "yap".
 *
 * A1'de ikincisi özellikle değerli: yeni başlayan biri kalıpları bir durumun
 * içinde öğrenir, tarif ederek değil.
 *
 * ⚠️ Uygulama canlı yapay zekâ çağıramıyor (ek ücret kısıtı). Karşı taraf
 * yazılı bir senaryo; ekran cevabı **yargılamıyor**, yalnızca yazım ve
 * noktalama uyarısı veriyor (`instantcheck`). Asıl düzeltme öğretmenden
 * gelir — bu, sohbet tarafındaki takasın aynısı ve ekranda söyleniyor.
 */
export default function ScenarioScreen() {
  const { data, update } = useStore();
  const [variant, setVariant] = useState(0);
  const [turn, setTurn] = useState(0);
  const [text, setText] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  /** Verilen cevaplar — bitişte kaydedilip öğretmene gidiyor */
  const [answers, setAnswers] = useState<string[]>([]);

  const iso = toISODate(new Date());
  const scenario = useMemo(
    () => scenarioForDay(data.profile.level, data.profile.tastes, iso, variant),
    [data.profile.level, data.profile.tastes, iso, variant]
  );

  if (!scenario) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.emptyTitle}>Canlandırma şimdilik A1'de</Text>
        <Text style={styles.emptyText}>
          Üst seviyelerin senaryoları sırası geldiğinde yazılacak. O zamana
          kadar günün sohbeti ve görevler devam ediyor.
        </Text>
        <Pressable style={styles.secondary} onPress={goBack}>
          <Text style={styles.secondaryText}>← Geri dön</Text>
        </Pressable>
      </View>
    );
  }

  const current = scenario.turns[turn];

  function submit() {
    if (!scenario || !current) return;
    const cevap = text.trim();
    const kelime = cevap ? cevap.split(/\s+/).length : 0;

    if (kelime < current.minWords) {
      setNotes([
        `Biraz daha uzun olsun — en az ${current.minWords} kelime. Şu an ${kelime}.`,
      ]);
      return;
    }

    /** Yalnızca yazım/noktalama; üslup ve dilbilgisi öğretmenin işi */
    setNotes(checkInstant(cevap).slice(0, 3).map((n) => n.message));

    const yeniCevaplar = [...answers, cevap];
    setAnswers(yeniCevaplar);

    if (turn + 1 >= scenario.turns.length) {
      /**
       * ⚠️ **Kayıt şart.** Bitiş kutusu "öğretmen cümlelerini görecek"
       * diyor; kaydetmezsek bu bir yalan olur. İlk sürümde tam olarak öyleydi
       * — cevaplar yalnızca ekranın belleğindeydi ve ekran kapanınca
       * kayboluyordu. Bağımsız denetim yakaladı.
       */
      update((d) =>
        saveScenarioRun(d, {
          date: iso,
          scenarioId: scenario.id,
          title: scenario.title,
          turns: scenario.turns.map((t, i) => ({
            say: t.say,
            answer: yeniCevaplar[i] ?? '',
          })),
        })
      );
      setDone(true);
    } else {
      setTurn(turn + 1);
      setText('');
    }
  }

  function yenile() {
    setVariant((v) => v + 1);
    setTurn(0);
    setText('');
    setNotes([]);
    setDone(false);
    setAnswers([]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>🎭  CANLANDIRMA</Text>
          <Text style={styles.title}>{scenario.title}</Text>
          <Text style={styles.setting}>{scenario.setting}</Text>
        </View>

        {/* Kalıplar hep görünür duruyor — A1'de cevabı boş sayfadan
            beklemek yerine kullanılacak parçayı önüne koymak gerekiyor. */}
        <View style={styles.phraseBox}>
          <Text style={styles.phraseHead}>Bu kalıpları kullanabilirsin</Text>
          {scenario.phrases.map((p) => (
            <View key={p} style={styles.phraseRow}>
              <Text style={styles.phrase}>{p}</Text>
              <Pressable onPress={() => speakEnglish(p)}>
                <Text style={styles.speak}>🔊</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {done ? (
          <View style={styles.doneBox}>
            <Text style={styles.doneTitle}>✓ Canlandırma bitti</Text>
            <Text style={styles.doneText}>
              {scenario.turns.length} turun hepsini cevapladın. Bir sonraki
              senkronda öğretmen cümlelerini görüp düzeltecek.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.turnCounter}>
              <Text style={styles.turnCounterText}>
                Tur {turn + 1} / {scenario.turns.length}
              </Text>
            </View>

            <View style={styles.sayBox}>
              <Text style={styles.role}>{scenario.role}</Text>
              <Text style={styles.say}>{current.say}</Text>
              <Pressable onPress={() => speakEnglish(current.say)}>
                <Text style={styles.listen}>🔊  Dinle</Text>
              </Pressable>
            </View>

            <Text style={styles.hint}>💡 {current.hint}</Text>

            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={`İngilizce cevapla — en az ${current.minWords} kelime`}
              placeholderTextColor={colors.muted}
              multiline
            />

            <Pressable style={styles.primary} onPress={submit}>
              <Text style={styles.primaryText}>Cevabı gönder</Text>
            </Pressable>
          </>
        )}

        {notes.length > 0 ? (
          <View style={styles.noteBox}>
            {notes.map((n, i) => (
              <Text key={i} style={styles.note}>
                • {n}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.navRow}>
          <Pressable style={styles.secondary} onPress={yenile}>
            <Text style={styles.secondaryText}>🔄  Başka senaryo</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={goBack}>
            <Text style={styles.secondaryText}>← Geri dön</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          Cevapların yalnızca yazım ve noktalama açısından kontrol ediliyor.
          Cümle düzeltmesi öğretmen çalıştığında gelir.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },

  header: { marginBottom: spacing.lg },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.weekend,
    letterSpacing: 0.6,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 4 },
  setting: { fontSize: 15, color: colors.muted, marginTop: 4, lineHeight: 21 },

  phraseBox: {
    backgroundColor: colors.weekendSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  phraseHead: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.weekend,
    marginBottom: spacing.sm,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  phrase: { fontSize: 15, color: colors.text, fontWeight: '600' },
  speak: { fontSize: 16 },

  turnCounter: { marginBottom: spacing.sm },
  turnCounterText: { fontSize: 12, fontWeight: '700', color: colors.muted },

  sayBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  role: { fontSize: 12, fontWeight: '700', color: colors.accent, marginBottom: 4 },
  say: { fontSize: 17, color: colors.text, lineHeight: 24 },
  listen: { fontSize: 14, color: colors.accent, marginTop: spacing.sm, fontWeight: '600' },

  hint: { fontSize: 14, color: colors.muted, marginTop: spacing.md, lineHeight: 20 },

  input: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    minHeight: 90,
    marginTop: spacing.md,
    textAlignVertical: 'top',
  },

  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  noteBox: {
    backgroundColor: '#FFFAEB',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  note: { fontSize: 14, color: '#7A5B00', lineHeight: 20 },

  doneBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  doneTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  doneText: { fontSize: 14, color: colors.muted, marginTop: spacing.sm, lineHeight: 20 },

  navRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  secondary: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  secondaryText: { fontSize: 14, fontWeight: '700', color: colors.muted },

  footer: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.lg,
    lineHeight: 18,
    textAlign: 'center',
  },

  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
