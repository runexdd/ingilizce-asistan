/**
 * Seviye içi puanlama sınavı ekranı — **ikinci sınav**.
 *
 * Yerleştirme sınavı "hangi seviyedesin" der; bu sınav "o seviyenin neresinde
 * duruyorsun" der ve 0-100 bir puan üretir (`profile.levelScore`).
 *
 * Beş beceri sırayla: kelime → gramer → dinleme → yazma → konuşma. Kolaydan
 * zora dizilmesi bilinçli; üretim soruları başta olsa sınav yarıda kalırdı.
 *
 * Dinlemede metin **hiç gösterilmiyor** — cihaz okur, kullanıcı dinler.
 * Konuşmada mikrofon var; desteklenmeyen tarayıcıda yazarak da geçilebiliyor
 * ki yol kapanmasın (o durumda cevap yine öğretmene gidiyor).
 */

import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SKILL_LABELS,
  describeLevelScore,
  itemsForLevel,
  scoreExam,
  type ExamAnswer,
} from '../src/core/levelexam';
import { speakEnglish, stopSpeaking } from '../src/core/speech';
import {
  describeSpeechError,
  isSpeechInputSupported,
  startSpeechInput,
  type SpeechInputHandle,
} from '../src/core/speechInput';
import { saveLevelExam } from '../src/db/mutations';
import { useStore } from '../src/db/store';
import { goBack } from '../src/ui/BackButton';
import { colors, radius, spacing } from '../src/ui/theme';

export default function LevelExamScreen() {
  const { data, update } = useStore();
  const level = data.profile.level;

  const items = useMemo(() => itemsForLevel(level), [level]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [played, setPlayed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const micRef = useRef<SpeechInputHandle | null>(null);
  const usedMic = useRef(false);
  const micSupported = useMemo(() => isSpeechInputSupported(), []);

  const item = items[index];

  /* --------------------------------------------------------------- sonuç */
  const result = useMemo(() => (done ? scoreExam(answers) : null), [done, answers]);

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Bu seviye için sınav yok</Text>
        <Text style={styles.body}>
          Önce yerleştirme sınavını yap; seviyen belirlendikten sonra o seviyeye
          özel puanlama sınavı açılır.
        </Text>
        <Pressable style={styles.primary} onPress={goBack}>
          <Text style={styles.primaryText}>Geri dön</Text>
        </Pressable>
      </View>
    );
  }

  if (done && result) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md }}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>{level} içindeki puanın</Text>
          <Text style={styles.scoreValue}>{result.score}</Text>
          <Text style={styles.scoreNote}>
            {describeLevelScore(level, result.score)}
          </Text>
        </View>

        <Text style={styles.section}>Beceri dağılımın</Text>
        {result.skills.map((s) => (
          <View key={s.skill} style={styles.skillRow}>
            <Text style={styles.skillName}>{SKILL_LABELS[s.skill]}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${s.score}%`,
                    backgroundColor:
                      s.score >= 70
                        ? colors.success
                        : s.score >= 40
                          ? colors.accent
                          : '#F79009',
                  },
                ]}
              />
            </View>
            <Text style={styles.skillScore}>{s.score}</Text>
          </View>
        ))}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Kelime, gramer ve dinleme puanları kesin. Yazma ve konuşma puanı
            kabadır — uygulama uzunluğa, istenen kelimeleri kullanıp
            kullanmadığına ve yakalayabildiği hatalara bakabilir. Cevapların
            olduğu gibi öğretmene gitti; bir sonraki senkronda o okuyup puanı
            düzeltecek ve bundan sonraki içerik bu puana göre seçilecek.
          </Text>
        </View>

        <Pressable style={styles.primary} onPress={goBack}>
          <Text style={styles.primaryText}>Bitir</Text>
        </Pressable>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    );
  }

  /* ------------------------------------------------------------ mikrofon */
  const toggleMic = () => {
    if (recording) {
      micRef.current?.stop();
      return;
    }
    setMicError(null);
    setInterim('');
    setRecording(true);
    const handle = startSpeechInput({
      onFinal: (chunk) => {
        if (!chunk) return;
        usedMic.current = true;
        setText((current) => (current ? `${current.trim()} ${chunk}` : chunk));
        setInterim('');
      },
      onInterim: setInterim,
      onError: (code) => setMicError(describeSpeechError(code)),
      onStop: () => {
        setRecording(false);
        setInterim('');
        micRef.current = null;
      },
    });
    micRef.current = handle;
    if (!handle) setRecording(false);
  };

  /* --------------------------------------------------------------- akış */
  const canSubmit =
    item.format === 'choice' || item.format === 'listen'
      ? choice !== null
      : text.trim().length > 0;

  function submit() {
    micRef.current?.stop();
    stopSpeaking();

    const answer: ExamAnswer = {
      item,
      index: choice ?? undefined,
      text: text.trim() || undefined,
      via: usedMic.current ? 'mic' : 'text',
    };
    const nextAnswers = [...answers, answer];

    setAnswers(nextAnswers);
    setChoice(null);
    setText('');
    setPlayed(false);
    setMicError(null);
    usedMic.current = false;

    if (index >= items.length - 1) {
      const scoring = scoreExam(nextAnswers);
      update((current) =>
        saveLevelExam(current, {
          level,
          date: new Date().toISOString().slice(0, 10),
          score: scoring.score,
          skills: scoring.skills,
          weakest: scoring.weakest,
          responses: nextAnswers
            .filter((a) => a.item.format === 'write' || a.item.format === 'speak')
            .map((a) => ({
              questionId: a.item.id,
              skill: a.item.skill,
              prompt: a.item.prompt,
              answer: a.text ?? '',
              via: a.via,
            })),
          syncState: 'pending',
        })
      );
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <View style={styles.headerRow}>
          <Text style={styles.progress}>
            {index + 1} / {items.length}
          </Text>
          <Text style={styles.skillTag}>{SKILL_LABELS[item.skill]}</Text>
        </View>

        {/* dinleme: metin gösterilmez, sadece dinlenir */}
        {item.format === 'listen' ? (
          <View style={styles.listenBox}>
            <Text style={styles.listenHint}>
              Dinle ve cevapla. Metin gösterilmiyor — istediğin kadar
              tekrarlayabilirsin.
            </Text>
            <Pressable
              style={styles.listenButton}
              onPress={() => {
                setPlayed(true);
                void speakEnglish(item.audio, {
                  rate: data.profile.speechRate ?? 0.95,
                });
              }}
            >
              <Text style={styles.listenButtonText}>
                {played ? '🔁  Tekrar dinle' : '▶️  Dinle'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.prompt}>{item.prompt}</Text>

        {/* konuşma tekrar sorusu: okunacak cümle */}
        {item.format === 'speak' && item.target ? (
          <View style={styles.targetBox}>
            <Text style={styles.targetText}>{item.target}</Text>
            <Pressable
              onPress={() =>
                void speakEnglish(item.target!, {
                  rate: data.profile.speechRate ?? 0.95,
                })
              }
            >
              <Text style={styles.speakLink}>🔊  Önce dinle</Text>
            </Pressable>
          </View>
        ) : null}

        {/* kullanması istenen kelimeler */}
        {(item.format === 'write' || item.format === 'speak') &&
        item.mustUse?.length ? (
          <Text style={styles.mustUse}>
            Kullan: {item.mustUse.join(' · ')}
            {'minWords' in item && item.minWords
              ? ` · en az ${item.minWords} kelime`
              : ''}
          </Text>
        ) : null}

        {/* şıklar */}
        {item.format === 'choice' || item.format === 'listen' ? (
          <View style={styles.options}>
            {item.options.map((option, i) => (
              <Pressable
                key={i}
                style={[styles.option, choice === i && styles.optionOn]}
                onPress={() => setChoice(i)}
              >
                <Text
                  style={[styles.optionText, choice === i && styles.optionTextOn]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <>
            <TextInput
              style={[
                styles.input,
                (item.format === 'write' || item.format === 'speak') &&
                  styles.inputTall,
              ]}
              value={recording && interim ? `${text} ${interim}`.trim() : text}
              onChangeText={setText}
              placeholder={
                item.format === 'fill'
                  ? (item.hint ?? 'Cevabını yaz')
                  : item.format === 'speak'
                    ? 'Mikrofona konuş ya da buraya yaz'
                    : 'İngilizce yaz'
              }
              placeholderTextColor={colors.muted}
              multiline={item.format !== 'fill'}
              editable={!recording}
              autoCapitalize={item.format === 'fill' ? 'none' : 'sentences'}
            />

            {item.format === 'speak' ? (
              <>
                {micError ? <Text style={styles.micError}>{micError}</Text> : null}
                {micSupported ? (
                  <Pressable
                    style={[styles.micButton, recording && styles.micButtonActive]}
                    onPress={toggleMic}
                  >
                    <Text
                      style={[styles.micText, recording && styles.micTextActive]}
                    >
                      {recording ? '⏹  Durdur' : '🎤  Konuş'}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.micHint}>
                    Bu tarayıcı ekrandan mikrofonu desteklemiyor; klavyedeki
                    mikrofon tuşunu kullanabilir ya da yazabilirsin.
                  </Text>
                )}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.primary, !canSubmit && styles.primaryOff]}
          disabled={!canSubmit}
          onPress={submit}
        >
          <Text style={styles.primaryText}>
            {index >= items.length - 1 ? 'Bitir ve puanla' : 'Devam'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  progress: { fontSize: 13, fontWeight: '700', color: colors.accent },
  skillTag: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  body: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  prompt: {
    fontSize: 19,
    color: colors.text,
    lineHeight: 27,
    marginTop: spacing.md,
    fontWeight: '600',
  },

  listenBox: {
    marginTop: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  listenHint: { fontSize: 13, color: colors.accent, lineHeight: 19 },
  listenButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  listenButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  targetBox: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  targetText: { fontSize: 18, color: colors.text, lineHeight: 26 },
  speakLink: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  mustUse: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    marginTop: spacing.sm,
  },

  options: { marginTop: spacing.md, gap: spacing.sm },
  option: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  optionOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionText: { fontSize: 16, color: colors.text },
  optionTextOn: { fontWeight: '700', color: colors.accent },

  input: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.card,
  },
  inputTall: { minHeight: 120 },
  micError: { fontSize: 13, color: '#B42318', marginTop: spacing.sm },
  micButton: {
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  micButtonActive: { backgroundColor: '#D92D20', borderColor: '#D92D20' },
  micText: { fontSize: 15, fontWeight: '700', color: colors.accent },
  micTextActive: { color: '#FFFFFF' },
  micHint: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    marginTop: spacing.sm,
  },

  scoreBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  scoreLabel: { fontSize: 14, color: colors.accent, fontWeight: '700' },
  scoreValue: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 62,
  },
  scoreNote: {
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  skillName: { width: 72, fontSize: 14, color: colors.text },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: { height: 10, borderRadius: 5 },
  skillScore: {
    width: 32,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  infoBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  infoText: { fontSize: 14, color: colors.muted, lineHeight: 21 },

  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryOff: { backgroundColor: colors.border },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
