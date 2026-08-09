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
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { pickPassage, type ReadingPassage } from '../../src/core/reading';
import { recordSession, saveTaskResponse } from '../../src/db/mutations';
import { useStore } from '../../src/db/store';
import { colors, radius, spacing } from '../../src/ui/theme';

/**
 * Görev ekranı. Görev tipine göre farklı arayüz gösterir:
 *   writing-*  → yazma alanı
 *   reading    → metin + anlama soruları + sesli okuma
 *   speaking   → klavye diktesiyle konuşma
 *
 * Öğretmenden gelen görev metni varsa o kullanılır; yoksa yerel yedek devreye
 * girer ki uygulama senkron olmadan da çalışsın.
 */
export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const kind = String(id ?? '');

  if (kind === 'reading') return <ReadingTask />;
  if (kind === 'speaking') return <SpeakingTask />;
  return <WritingTask long={kind === 'writing-long'} />;
}

/* ------------------------------------------------------------------ yazma */

function WritingTask({ long }: { long: boolean }) {
  const { data, update } = useStore();
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Öğretmenin gönderdiği görev varsa onu kullan
  const suggested = data.suggestedTasks.find((t) =>
    long ? t.kind === 'writing-long' : t.kind === 'writing-micro'
  );

  const prompt =
    suggested?.prompt ??
    (long
      ? 'Tell the story of one thing that happened to you this week. Use at least five separate sentences.'
      : 'Write 3-4 sentences about what you did today.');

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  function handleSubmit() {
    const response = text.trim();
    if (!response) return;
    update((current) => {
      const withTask = saveTaskResponse(current, {
        kind: long ? 'writing-long' : 'writing-micro',
        prompt,
        userResponse: response,
      });
      return recordSession(withTask, long ? 12 : 4);
    });
    setSubmitted(true);
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
        <PromptBox label="Yazma görevi" text={prompt} focus={suggested?.targetError} />

        <TextInput
          style={styles.input}
          multiline
          editable={!submitted}
          placeholder="Write in English..."
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{wordCount} kelime</Text>

        {!submitted ? (
          <Pressable
            style={[styles.button, !text.trim() && styles.disabled]}
            disabled={!text.trim()}
            onPress={handleSubmit}
          >
            <Text style={styles.buttonText}>Gönder</Text>
          </Pressable>
        ) : (
          <SavedNotice />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ----------------------------------------------------------------- okuma */

function ReadingTask() {
  const { data, update } = useStore();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Öğretmenin gönderdiği okuma içeriği varsa onu göster
  const teacherReading = data.content.find((c) => c.skill === 'reading' && !c.done);

  const passage: ReadingPassage | null = useMemo(
    () => (teacherReading ? null : pickPassage(data.profile.level)),
    [teacherReading, data.profile.level]
  );

  function toggleSpeech(text: string) {
    if (speaking) {
      void Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(text, {
      language: 'en-US',
      rate: 0.9,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  // Öğretmenden gelen okuma görevi (dış içerik: haber, makale)
  if (teacherReading) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <PromptBox label="Okuma" text={teacherReading.title} />
        <Text style={styles.instruction}>{teacherReading.instruction}</Text>
        <Pressable
          style={styles.button}
          onPress={() => {
            update((current) => recordSession(current, 6));
          }}
        >
          <Text style={styles.buttonText}>Okudum, tamamlandı</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (!passage) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.emptyText}>
          Okuma içeriği bulunamadı. Ayarlar → Şimdi senkronla dediğinde öğretmen
          sana seviyene uygun bir metin gönderecek.
        </Text>
      </View>
    );
  }

  const correctCount = passage.questions.reduce(
    (n, q, i) => (answers[i] === q.answerIndex ? n + 1 : n),
    0
  );
  const allAnswered = passage.questions.every((_, i) => answers[i] !== undefined);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.passageHeader}>
        <Text style={styles.passageTitle}>{passage.title}</Text>
        <Pressable
          style={styles.speakButton}
          onPress={() => toggleSpeech(passage.text)}
        >
          <Text style={styles.speakButtonText}>
            {speaking ? '⏹ Durdur' : '🔊 Sesli oku'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.passageText}>{passage.text}</Text>

      <Text style={styles.sectionTitle}>Anlama soruları</Text>
      {passage.questions.map((q, qi) => (
        <View key={qi} style={styles.questionBlock}>
          <Text style={styles.questionText}>{q.question}</Text>
          {q.options.map((option, oi) => {
            const selected = answers[qi] === oi;
            const isCorrect = checked && oi === q.answerIndex;
            const isWrong = checked && selected && oi !== q.answerIndex;
            return (
              <Pressable
                key={option}
                disabled={checked}
                style={[
                  styles.option,
                  selected && styles.optionSelected,
                  isCorrect && styles.optionCorrect,
                  isWrong && styles.optionWrong,
                ]}
                onPress={() => setAnswers({ ...answers, [qi]: oi })}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      {!checked ? (
        <Pressable
          style={[styles.button, !allAnswered && styles.disabled]}
          disabled={!allAnswered}
          onPress={() => {
            setChecked(true);
            update((current) => recordSession(current, 6));
          }}
        >
          <Text style={styles.buttonText}>Kontrol et</Text>
        </Pressable>
      ) : (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>
            {correctCount} / {passage.questions.length} doğru
          </Text>
          <Text style={styles.noticeText}>
            {correctCount === passage.questions.length
              ? 'Metni tam anlamışsın. Bir sonraki okuma bir tık zorlaşacak.'
              : 'Yanlış cevapladıklarında doğru şık yeşil işaretlendi — metne dönüp o kısmı tekrar oku.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

/* -------------------------------------------------------------- konuşma */

function SpeakingTask() {
  const { data, update } = useStore();
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const suggested = data.suggestedTasks.find((t) => t.kind === 'speaking');
  const prompt =
    suggested?.prompt ??
    'Talk for about 60 seconds: What did you do today, and what was the hardest part?';

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  function speakPrompt() {
    if (speaking) {
      void Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(prompt, {
      language: 'en-US',
      rate: 0.9,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  function handleSubmit() {
    const response = text.trim();
    if (!response) return;
    update((current) => {
      const withTask = saveTaskResponse(current, {
        kind: 'speaking',
        prompt,
        userResponse: response,
      });
      return recordSession(withTask, 5);
    });
    setSubmitted(true);
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
        <PromptBox label="Konuşma görevi" text={prompt} focus={suggested?.targetError} />

        <Pressable style={styles.speakButtonWide} onPress={speakPrompt}>
          <Text style={styles.speakButtonText}>
            {speaking ? '⏹ Durdur' : '🔊 Soruyu dinle'}
          </Text>
        </Pressable>

        <View style={styles.howtoBox}>
          <Text style={styles.howtoTitle}>Nasıl yapılır</Text>
          <Text style={styles.howtoText}>
            Aşağıdaki kutuya dokun, klavye açılsın. Klavyenin altındaki{' '}
            <Text style={styles.bold}>mikrofon simgesine</Text> bas ve cevabını{' '}
            <Text style={styles.bold}>sesli söyle</Text>. Telefon konuştuğunu
            yazıya çevirecek.{'\n\n'}
            Yazarak değil, <Text style={styles.bold}>konuşarak</Text> cevapla —
            amaç düşünmeden üretmek. Telefonun yanlış yazdığı kelimeler telaffuz
            sinyalidir, öğretmen onları ayrıca takip edecek.
          </Text>
        </View>

        <TextInput
          style={styles.input}
          multiline
          editable={!submitted}
          placeholder="Mikrofona basıp konuş..."
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{wordCount} kelime</Text>

        {!submitted ? (
          <Pressable
            style={[styles.button, !text.trim() && styles.disabled]}
            disabled={!text.trim()}
            onPress={handleSubmit}
          >
            <Text style={styles.buttonText}>Gönder</Text>
          </Pressable>
        ) : (
          <SavedNotice />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------- ortak parçalar */

function PromptBox({
  label,
  text,
  focus,
}: {
  label: string;
  text: string;
  focus?: string;
}) {
  return (
    <View style={styles.promptBox}>
      <Text style={styles.promptLabel}>{label}</Text>
      <Text style={styles.prompt}>{text}</Text>
      {focus && <Text style={styles.promptFocus}>Odak: {focus}</Text>}
    </View>
  );
}

function SavedNotice() {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>Kaydedildi ✅</Text>
      <Text style={styles.noticeText}>
        Ayarlar → Şimdi senkronla dediğinde öğretmene gidecek. Bilgisayarda{' '}
        <Text style={styles.bold}>/ogretmen</Text> çalıştırınca düzeltmesi
        hazırlanıp buraya dönecek.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { justifyContent: 'center', padding: spacing.lg },
  bold: { fontWeight: '700' },

  promptBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prompt: {
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.xs + 2,
    lineHeight: 23,
  },
  promptFocus: {
    fontSize: 13,
    color: colors.accent,
    marginTop: spacing.sm,
    fontWeight: '600',
  },

  input: {
    minHeight: 150,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text,
    lineHeight: 23,
  },
  counter: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.xs + 2,
    textAlign: 'right',
  },

  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.4 },

  notice: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  noticeText: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  emptyText: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 23,
    marginTop: spacing.md,
  },

  passageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  passageTitle: { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 },
  speakButton: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  speakButtonWide: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  speakButtonText: { fontSize: 14, color: colors.accent, fontWeight: '600' },
  passageText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
    marginTop: spacing.md,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
  },
  questionBlock: { marginTop: spacing.md, gap: spacing.sm },
  questionText: { fontSize: 15, color: colors.text, fontWeight: '600', lineHeight: 22 },
  option: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionCorrect: { borderColor: colors.success, backgroundColor: '#E7F8F0' },
  optionWrong: { borderColor: '#D92D20', backgroundColor: '#FEF0EF' },
  optionText: { fontSize: 15, color: colors.text },

  howtoBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  howtoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs + 2,
  },
  howtoText: { fontSize: 14, color: colors.muted, lineHeight: 21 },
});
