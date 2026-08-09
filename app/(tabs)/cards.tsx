import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  buildOptions,
  checkSpoken,
  checkWritten,
  directionFor,
  STAGE_HINTS,
  STAGE_LABELS,
  type AnswerVerdict,
  type CardStage,
  type WriteDirection,
} from '../../src/core/cardcheck';
import { specOf } from '../../src/core/level';
import { speakEnglish } from '../../src/core/speech';
import {
  describeSpeechError,
  isSpeechInputSupported,
  startSpeechInput,
  type SpeechInputHandle,
} from '../../src/core/speechInput';
import { describeInterval } from '../../src/core/srs';
import { answerCard, recordSession } from '../../src/db/mutations';
import { useStore } from '../../src/db/store';
import { getStudyQueue } from '../../src/db/selectors';
import type { Card } from '../../src/db/types';
import { colors, radius, spacing } from '../../src/ui/theme';

/**
 * Kartlar — üç aşamalı öğrenme.
 *
 * Eski ekran "Bildim / Bilmedim" butonlarından ibaretti; kullanıcı bunun
 * hiçbir şey ölçmediğini ve suistimale açık olduğunu söyledi. Yerine kelimenin
 * üç basamaktan geçtiği bir akış:
 *
 *   1. Tanıma    — dört şıktan doğru anlamı seç
 *   2. Yazma     — karışık yön: bazen TR→EN, bazen EN→TR
 *   3. Telaffuz  — önce cihaz okur, sonra kullanıcı mikrofona tekrar eder
 *
 * Kart doğru cevaplarda yükselir, yanlışta düşer. Günün ders kelimeleri
 * listenin başında gelir; okuma ve konuşma neyi çalışıyorsa kartlar da onu
 * çalışsın diye.
 */

export default function CardsScreen() {
  const { data, update } = useStore();

  /** Yeni kelime sayısına öğretmen karar verir; yoksa seviye tavanı geçerli */
  const dailyNewWords =
    data.plan?.dailyNewWords ??
    specOf(data.profile.level, data.plan?.sizing).maxNewWordsPerDay;

  const queue = useMemo(
    () => getStudyQueue(data, dailyNewWords),
    [data, dailyNewWords]
  );
  const card = queue[0];
  const stage: CardStage = (card?.stage ?? 1) as CardStage;

  const [reviewedCount, setReviewedCount] = useState(0);
  const [lastResult, setLastResult] = useState<string | null>(null);

  if (!card) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.doneEmoji}>✅</Text>
        <Text style={styles.doneTitle}>
          {reviewedCount > 0 ? 'Bugünlük bitti' : 'Tekrarı gelen kart yok'}
        </Text>
        <Text style={styles.doneText}>
          {reviewedCount > 0
            ? `${reviewedCount} kart çalışıldı. Kalanlar unutma eğrisine göre ileri tarihlere dağıtıldı.`
            : 'Günün kelimeleri senkronla geldiğinde burada belirecek.'}
        </Text>
        {lastResult && <Text style={styles.lastResult}>{lastResult}</Text>}
      </View>
    );
  }

  function handleAnswer(verdict: AnswerVerdict, note: string) {
    const current = card!;
    update((data) => {
      const graded = answerCard(data, current.id, verdict);
      return queue.length === 1
        ? recordSession(graded, Math.max(1, Math.round((reviewedCount + 1) * 0.25)))
        : graded;
    });
    setLastResult(note);
    setReviewedCount((n) => n + 1);
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
        <View style={styles.headerRow}>
          {card.theme && <Text style={styles.theme}>{card.theme}</Text>}
          <Text style={styles.counter}>{queue.length} kart kaldı</Text>
        </View>

        <StageBar stage={stage} />

        {/* Kart kimliği değişince aşama bileşeni sıfırdan kurulsun */}
        {stage === 1 && (
          <RecognizeStage
            key={`r-${card.id}`}
            card={card}
            pool={queue}
            onAnswer={handleAnswer}
          />
        )}
        {stage === 2 && (
          <WriteStage key={`w-${card.id}`} card={card} onAnswer={handleAnswer} />
        )}
        {stage === 3 && (
          <SpeakStage key={`s-${card.id}`} card={card} onAnswer={handleAnswer} />
        )}

        {lastResult && <Text style={styles.lastResult}>{lastResult}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------- aşama çubuğu */

function StageBar({ stage }: { stage: CardStage }) {
  return (
    <View style={styles.stageBar}>
      {([1, 2, 3] as CardStage[]).map((s) => (
        <View key={s} style={styles.stageItem}>
          <View
            style={[
              styles.stageDot,
              s < stage && styles.stageDotDone,
              s === stage && styles.stageDotActive,
            ]}
          >
            <Text style={[styles.stageDotText, s <= stage && styles.stageDotTextOn]}>
              {s}
            </Text>
          </View>
          <Text style={[styles.stageName, s === stage && styles.stageNameActive]}>
            {STAGE_LABELS[s]}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* --------------------------------------------------------- 1. aşama: tanıma */

function RecognizeStage({
  card,
  pool,
  onAnswer,
}: {
  card: Card;
  pool: Card[];
  onAnswer: (verdict: AnswerVerdict, note: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  /**
   * Çeldiriciler aynı kuyruktaki diğer kelimelerin anlamlarından geliyor.
   * Gün tek tema üzerine kurulu olduğu için bunlar birbirine yakın çıkıyor —
   * ayırt etmeyi gerçekten zorlaştıran, dolayısıyla öğreten şey bu.
   */
  const options = useMemo(
    () =>
      buildOptions(
        card.meaning,
        pool.filter((c) => c.id !== card.id).map((c) => c.meaning)
      ),
    [card.id, card.meaning, pool]
  );

  function choose(option: string) {
    if (picked) return;
    setPicked(option);
    const correct = option === card.meaning;
    setTimeout(
      () =>
        onAnswer(
          correct ? 'correct' : 'wrong',
          correct
            ? `"${card.word}" → yazma aşamasına geçti`
            : `"${card.word}" → ${card.meaning}`
        ),
      correct ? 550 : 1400
    );
  }

  return (
    <View>
      <Text style={styles.question}>{card.word}</Text>
      <Text style={styles.prompt}>{STAGE_HINTS[1]}</Text>

      <View style={styles.options}>
        {options.map((option) => {
          const isCorrect = picked && option === card.meaning;
          const isWrong = picked === option && option !== card.meaning;
          return (
            <Pressable
              key={option}
              disabled={!!picked}
              style={[
                styles.option,
                isCorrect && styles.optionCorrect,
                isWrong && styles.optionWrong,
              ]}
              onPress={() => choose(option)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------- 2. aşama: yazma */

function WriteStage({
  card,
  onAnswer,
}: {
  card: Card;
  onAnswer: (verdict: AnswerVerdict, note: string) => void;
}) {
  /** Yön kartın tekrar sayısına bağlı — üst üste aynı yön gelmesin */
  const direction: WriteDirection = useMemo(
    () => directionFor(card.repetitions),
    [card.repetitions]
  );

  const [text, setText] = useState('');
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);

  const asked = direction === 'tr-to-en' ? card.meaning : card.word;
  const answer = direction === 'tr-to-en' ? card.word : card.meaning;

  function submit() {
    if (!text.trim() || verdict) return;
    const result = checkWritten(text, card, direction);
    setVerdict(result);
    setTimeout(
      () =>
        onAnswer(
          result,
          result === 'correct'
            ? `"${card.word}" → telaffuz aşamasına geçti`
            : result === 'close'
              ? `Doğru yazımı: ${answer}`
              : `"${asked}" → ${answer}`
        ),
      result === 'correct' ? 700 : 1800
    );
  }

  return (
    <View>
      <Text style={styles.directionTag}>
        {direction === 'tr-to-en' ? 'Türkçe → İngilizce' : 'İngilizce → Türkçe'}
      </Text>
      <Text style={styles.question}>{asked}</Text>
      <Text style={styles.prompt}>
        {direction === 'tr-to-en' ? 'İngilizcesini yaz' : 'Türkçesini yaz'}
      </Text>

      <TextInput
        style={[
          styles.input,
          verdict === 'correct' && styles.inputCorrect,
          verdict === 'close' && styles.inputClose,
          verdict === 'wrong' && styles.inputWrong,
        ]}
        value={text}
        onChangeText={setText}
        editable={!verdict}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={direction === 'tr-to-en' ? 'in English...' : 'Türkçe...'}
        placeholderTextColor={colors.muted}
        onSubmitEditing={submit}
        returnKeyType="done"
      />

      {verdict === 'close' && (
        <Text style={styles.closeNote}>
          Doğru saydım ama yazımına dikkat: <Text style={styles.bold}>{answer}</Text>
        </Text>
      )}
      {verdict === 'wrong' && (
        <Text style={styles.wrongNote}>
          Doğrusu: <Text style={styles.bold}>{answer}</Text>
        </Text>
      )}

      {!verdict && (
        <Pressable
          style={[styles.button, !text.trim() && styles.disabled]}
          disabled={!text.trim()}
          onPress={submit}
        >
          <Text style={styles.buttonText}>Kontrol et</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ------------------------------------------------------- 3. aşama: telaffuz */

function SpeakStage({
  card,
  onAnswer,
}: {
  card: Card;
  onAnswer: (verdict: AnswerVerdict, note: string) => void;
}) {
  const [heard, setHeard] = useState('');
  const [recording, setRecording] = useState(false);
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [listened, setListened] = useState(false);

  const micRef = useRef<SpeechInputHandle | null>(null);
  const supported = useMemo(() => isSpeechInputSupported(), []);

  useEffect(() => () => micRef.current?.stop(), []);

  /** Önce öğretmen okur — kullanıcı neyi tekrar edeceğini duymadan konuşmasın */
  function playModel() {
    setListened(true);
    void speakEnglish(card.word, { rate: 0.8 });
  }

  function toggleMic() {
    if (recording) {
      micRef.current?.stop();
      return;
    }
    setMicError(null);
    setHeard('');
    setRecording(true);
    const handle = startSpeechInput({
      onFinal: (chunk) => {
        if (!chunk) return;
        setHeard(chunk);
        micRef.current?.stop();
        const result = checkSpoken(chunk, card);
        setVerdict(result);
        setTimeout(
          () =>
            onAnswer(
              result,
              result === 'correct'
                ? `"${card.word}" telaffuzu tamam — öğrenildi sayılıyor`
                : result === 'close'
                  ? `"${card.word}" — neredeyse, bir kez daha dinle`
                  : `"${card.word}" — tekrar deneyelim`
            ),
          result === 'wrong' ? 1800 : 900
        );
      },
      onInterim: setHeard,
      onError: (code) => setMicError(describeSpeechError(code)),
      onStop: () => {
        setRecording(false);
        micRef.current = null;
      },
    });
    if (!handle) setRecording(false);
    micRef.current = handle;
  }

  return (
    <View>
      <Text style={styles.question}>{card.word}</Text>
      <Text style={styles.prompt}>{card.meaning}</Text>

      <Pressable style={styles.listenButton} onPress={playModel}>
        <Text style={styles.listenText}>🔊  Önce dinle</Text>
      </Pressable>

      {supported ? (
        <>
          <Pressable
            style={[
              styles.micButton,
              recording && styles.micButtonActive,
              !listened && styles.disabled,
            ]}
            disabled={!listened || !!verdict}
            onPress={toggleMic}
          >
            <Text style={[styles.micText, recording && styles.micTextActive]}>
              {recording ? '⏹  Durdur' : '🎤  Şimdi sen söyle'}
            </Text>
          </Pressable>

          <Text style={styles.micHint}>
            {!listened
              ? 'Önce doğru telaffuzu dinle, sonra tekrar et.'
              : recording
                ? heard
                  ? `Duyduğum: “${heard}”`
                  : 'Dinliyorum…'
                : 'Kelimeyi tek başına, net söyle.'}
          </Text>

          {verdict === 'close' && (
            <Text style={styles.closeNote}>
              Yakın — bir kez daha dinleyip tekrar et.
            </Text>
          )}
          {verdict === 'wrong' && heard && (
            <Text style={styles.wrongNote}>
              Duyduğum: “{heard}” · beklenen: <Text style={styles.bold}>{card.word}</Text>
            </Text>
          )}
          {micError && <Text style={styles.wrongNote}>{micError}</Text>}
        </>
      ) : (
        <>
          <Text style={styles.micHint}>
            Bu tarayıcı mikrofonu desteklemiyor. Kelimeyi sesli tekrar et, sonra
            aşağıdaki düğmeye bas.
          </Text>
          <Pressable
            style={styles.button}
            onPress={() =>
              onAnswer('correct', `"${card.word}" tekrar edildi`)
            }
          >
            <Text style={styles.buttonText}>Tekrar ettim</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  bold: { fontWeight: '700' },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  theme: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  counter: { fontSize: 13, color: colors.muted },

  /* aşama çubuğu */
  stageBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  stageItem: { alignItems: 'center', flex: 1 },
  stageDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  stageDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  stageDotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  stageDotText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  stageDotTextOn: { color: '#FFFFFF' },
  stageName: { fontSize: 11, color: colors.muted, marginTop: 4 },
  stageNameActive: { color: colors.accent, fontWeight: '700' },

  directionTag: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  question: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  prompt: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs + 2,
  },

  options: { marginTop: spacing.lg, gap: spacing.sm },
  option: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  optionCorrect: { borderColor: colors.success, backgroundColor: '#E7F8F0' },
  optionWrong: { borderColor: '#D92D20', backgroundColor: '#FEF0EF' },
  optionText: { fontSize: 16, color: colors.text, textAlign: 'center' },

  input: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  inputCorrect: { borderColor: colors.success, backgroundColor: '#E7F8F0' },
  inputClose: { borderColor: '#F79009', backgroundColor: '#FEF6E7' },
  inputWrong: { borderColor: '#D92D20', backgroundColor: '#FEF0EF' },

  closeNote: {
    fontSize: 14,
    color: '#B54708',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  wrongNote: {
    fontSize: 14,
    color: '#D92D20',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
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

  listenButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  listenText: { fontSize: 16, fontWeight: '600', color: colors.accent },

  micButton: {
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  micButtonActive: { backgroundColor: '#D92D20', borderColor: '#D92D20' },
  micText: { fontSize: 16, fontWeight: '700', color: colors.accent },
  micTextActive: { color: '#FFFFFF' },
  micHint: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 19,
  },

  lastResult: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  doneEmoji: { fontSize: 40 },
  doneTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  doneText: {
    fontSize: 15,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 21,
  },
});
