import { useState } from 'react';
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
import { Stack } from 'expo-router';
import { askTeacher, markAnswerRead } from '../src/db/mutations';
import { useStore } from '../src/db/store';
import { colors, radius, spacing } from '../src/ui/theme';

/**
 * Öğretmene sor — serbest soru posta kutusu.
 *
 * Kullanıcının isteği: *"öğretmenle konuşacağım yer olsun."* Günün sohbeti
 * öğretmenin önceden yazdığı senaryoyu oynatıyor; burası ters yön: aklına
 * takılan şeyi kendisi soruyor.
 *
 * **Anında cevap yok ve bunu ekranda saklamıyoruz.** Telefondaki uygulama
 * canlı yapay zekâ çağıramıyor (Claude Max dışında ödeme yok). Soru senkronla
 * gist'e gidiyor, Ömer bilgisayarda `/ogretmen` çalıştırınca cevaplanıyor,
 * sonraki senkronda cevap buraya düşüyor. Kullanıcı bunu bilmezse cevap
 * beklerken uygulamayı bozuk sanar — o yüzden durum açıkça yazıyor.
 */
export default function AskScreen() {
  const { data, update } = useStore();
  const [text, setText] = useState('');
  const [justSent, setJustSent] = useState(false);

  const questions = [...(data.teacherQuestions ?? [])].sort((a, b) =>
    b.askedAt.localeCompare(a.askedAt)
  );
  const waiting = questions.filter((q) => !q.answer).length;

  function send() {
    if (!text.trim()) return;
    update((d) => askTeacher(d, text));
    setText('');
    setJustSent(true);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Öğretmene sor' }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Aklına takılan her şeyi sor — bir gramer kuralı, bir kelimenin farkı,
          "bunu neden böyle söylüyoruz". Türkçe yazabilirsin.
        </Text>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(v) => {
            setText(v);
            setJustSent(false);
          }}
          placeholder="Örnek: since ile for arasındaki fark tam olarak ne?"
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
        />

        <Pressable
          style={[styles.button, !text.trim() && styles.disabled]}
          disabled={!text.trim()}
          onPress={send}
        >
          <Text style={styles.buttonText}>Soruyu gönder</Text>
        </Pressable>

        {justSent && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>Soru kaydedildi</Text>
            <Text style={styles.noticeText}>
              Bir sonraki senkronda öğretmene gidecek, cevabı da senkronla geri
              gelecek. Anında cevap gelmiyor — öğretmen bilgisayarda çalışıyor.
            </Text>
          </View>
        )}

        {waiting > 0 && !justSent && (
          <Text style={styles.waitingLine}>
            {waiting} soru cevap bekliyor. Ayarlar → Şimdi senkronla dersen yola
            çıkarlar.
          </Text>
        )}

        {questions.length > 0 && (
          <Text style={styles.sectionTitle}>Sorduklarım</Text>
        )}

        {questions.map((q) => (
          <Pressable
            key={q.id}
            style={styles.qaBox}
            onPress={() =>
              q.answer && !q.readAt && update((d) => markAnswerRead(d, q.id))
            }
          >
            <Text style={styles.qDate}>
              {new Date(q.askedAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            <Text style={styles.qText}>{q.text}</Text>

            {q.answer ? (
              <View style={styles.answerBox}>
                <Text style={styles.answerLabel}>ÖĞRETMEN</Text>
                <Text style={styles.answerText}>{q.answer}</Text>
              </View>
            ) : (
              <Text style={styles.pending}>
                ⏳ Cevap bekleniyor
                {q.syncState === 'pending' ? ' · henüz gönderilmedi' : ' · gönderildi'}
              </Text>
            )}
          </Pressable>
        ))}

        {questions.length === 0 && (
          <Text style={styles.empty}>
            Henüz soru sormadın. İlk soruyu yukarıya yaz.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  lead: { fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: spacing.md },

  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    minHeight: 110,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  disabled: { opacity: 0.4 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  noticeBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 4,
  },
  noticeText: { fontSize: 14, color: colors.text, lineHeight: 20 },

  waitingLine: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.md,
    lineHeight: 19,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  qaBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  qDate: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  qText: { fontSize: 16, color: colors.text, lineHeight: 22, fontWeight: '600' },

  answerBox: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  answerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.accent,
    marginBottom: 4,
  },
  answerText: { fontSize: 15, color: colors.text, lineHeight: 22 },

  pending: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  empty: { fontSize: 14, color: colors.muted, marginTop: spacing.lg, lineHeight: 20 },
});
