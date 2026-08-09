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
import { useRouter } from 'expo-router';
import {
  answerQuestion,
  computeResult,
  isFinished,
  LEVELS,
  LEVEL_DESCRIPTIONS,
  LEVEL_SELF_HINTS,
  nextQuestion,
  progress,
  SKILL_LABELS,
  startPlacement,
  TEST_LENGTH,
  type CEFRLevel,
  type PlacementQuestion,
  type PlacementState,
} from '../src/core/placement';
import { toISODate } from '../src/core/srs';
import { updateProfile } from '../src/db/mutations';
import { useStore } from '../src/db/store';
import { colors, radius, spacing } from '../src/ui/theme';

type Phase = 'intro' | 'self' | 'test' | 'result';

/** Kelime dizme sorularında sabit bir karışıklık üretir (her çizimde değişmesin). */
function shuffle<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function PlacementScreen() {
  const { update } = useStore();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intro');
  const [state, setState] = useState<PlacementState>(() => startPlacement());

  // Yazma ve dizme soruları için geçici cevap durumu
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<number[]>([]);

  const question = useMemo(
    () => (phase === 'test' ? nextQuestion(state) : null),
    [phase, state]
  );

  function submit(answer: { index?: number; text?: string; words?: string[] }) {
    if (!question) return;
    const next = answerQuestion(state, question, answer);
    setTyped('');
    setPicked([]);
    setState(next);
    if (isFinished(next) || nextQuestion(next) === null) setPhase('result');
  }

  function saveAndGo(level: CEFRLevel, extra?: { weakestSkill?: string }) {
    update((current) =>
      updateProfile(current, {
        level,
        placementDone: true,
        weakestSkill: extra?.weakestSkill,
        placementDate: toISODate(new Date()),
      })
    );
    router.replace('/');
  }

  /* ------------------------------------------------------------- giriş */

  if (phase === 'intro') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Seviye ölçümü</Text>
        <Text style={styles.paragraph}>
          {TEST_LENGTH} soruluk kısa bir test, ~10 dakika. Doğru bildikçe
          zorlaşır, zorlandıkça kolaylaşır.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Dört farklı soru tipi var</Text>
          <Text style={styles.infoText}>
            • Şık seçme — bildiğini <Text style={styles.bold}>tanıma</Text>
            {'\n'}• Boşluk doldurma — cevabı{' '}
            <Text style={styles.bold}>sen yazarsın</Text>
            {'\n'}• Kelime dizme — cümleyi{' '}
            <Text style={styles.bold}>sen kurarsın</Text>
            {'\n'}• Hata bulma — yanlış parçayı seçersin
          </Text>
          <Text style={styles.infoNote}>
            Sonunda seviyenin yanı sıra{' '}
            <Text style={styles.bold}>tanıma</Text> ve{' '}
            <Text style={styles.bold}>üretme</Text> başarını ayrı ayrı
            göreceksin. Bu ikisi çoğu kişide farklıdır ve farklı çalışma ister.
          </Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={() => setPhase('test')}>
          <Text style={styles.primaryButtonText}>Teste başla</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => setPhase('self')}>
          <Text style={styles.secondaryButtonText}>
            Seviyemi biliyorum, kendim seçeyim
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  /* -------------------------------------------------- kendi seviyeni seç */

  if (phase === 'self') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Seviyeni seç</Text>
        <Text style={styles.paragraph}>
          Emin değilsen bir alt seviyeyi seç — program zaten sen kullandıkça
          kendini ayarlayacak.
        </Text>

        <View style={styles.levelList}>
          {LEVELS.map((lvl) => (
            <Pressable
              key={lvl}
              style={({ pressed }) => [
                styles.levelOption,
                pressed && styles.optionPressed,
              ]}
              onPress={() => saveAndGo(lvl)}
            >
              <View style={styles.levelChip}>
                <Text style={styles.levelChipText}>{lvl}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.levelOptionTitle}>
                  {LEVEL_DESCRIPTIONS[lvl].split(' — ')[0]}
                </Text>
                <Text style={styles.levelOptionHint}>{LEVEL_SELF_HINTS[lvl]}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.secondaryButton} onPress={() => setPhase('intro')}>
          <Text style={styles.secondaryButtonText}>← Geri dön</Text>
        </Pressable>
      </ScrollView>
    );
  }

  /* -------------------------------------------------------------- sonuç */

  if (phase === 'result') {
    const result = computeResult(state);
    const gap = result.recognitionAccuracy - result.productionAccuracy;

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.resultLabel}>Seviyen</Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{result.level}</Text>
        </View>
        <Text style={styles.levelDescription}>{result.description}</Text>
        <Text style={styles.scoreLine}>
          {result.correctCount} / {result.total} doğru
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Tanıma mı, üretme mi?</Text>
          <SkillBar
            label="Tanıma"
            accuracy={result.recognitionAccuracy}
            color={colors.accent}
          />
          <SkillBar
            label="Üretme"
            accuracy={result.productionAccuracy}
            color={gap >= 20 ? '#F79009' : colors.accent}
          />
          <Text style={styles.infoNote}>
            {gap >= 20
              ? 'Tanıman üretmenden belirgin şekilde iyi: kelimeyi görünce anlıyorsun ama konuşurken/yazarken aklına gelmiyor. Program üretme tarafına ağırlık verecek.'
              : gap <= -20
                ? 'Üretmen tanımandan iyi — cesur kullanıyorsun. Program kelime dağarcığını genişletmeye ağırlık verecek.'
                : 'Tanıma ve üretmen dengeli. Program ikisini birlikte ilerletecek.'}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Beceri dağılımın</Text>
          {result.skills.map((s) => (
            <SkillBar
              key={s.skill}
              label={SKILL_LABELS[s.skill]}
              accuracy={s.accuracy}
              color={s.skill === result.weakestSkill ? '#F79009' : colors.accent}
            />
          ))}
          {result.weakestSkill && (
            <Text style={styles.infoNote}>
              En zayıf alanın{' '}
              <Text style={styles.bold}>{SKILL_LABELS[result.weakestSkill]}</Text>
              . Günlük görevlerin buraya ağırlık verecek.
            </Text>
          )}
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            saveAndGo(result.level, { weakestSkill: result.weakestSkill ?? undefined })
          }
        >
          <Text style={styles.primaryButtonText}>Programımı oluştur</Text>
        </Pressable>
      </ScrollView>
    );
  }

  /* --------------------------------------------------------------- test */

  if (!question) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Pressable style={styles.primaryButton} onPress={() => setPhase('result')}>
          <Text style={styles.primaryButtonText}>Sonucu gör</Text>
        </Pressable>
      </View>
    );
  }

  const { current, total } = progress(state);
  const percent = Math.round((current / total) * 100);

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
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            Soru {current + 1} / {total}
          </Text>
          <Text style={styles.formatTag}>{FORMAT_LABELS[question.format]}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>

        {question.passage && (
          <View style={styles.passageBox}>
            <Text style={styles.passageText}>{question.passage}</Text>
          </View>
        )}

        <Text style={styles.questionText}>{question.prompt}</Text>

        {question.format === 'choice' && (
          <View style={styles.options}>
            {question.options.map((option, index) => (
              <Pressable
                key={option}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                onPress={() => submit({ index })}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {question.format === 'spot' && (
          <View style={styles.options}>
            {question.segments.map((segment, index) => (
              <Pressable
                key={segment + index}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                onPress={() => submit({ index })}
              >
                <Text style={styles.optionText}>{segment}</Text>
              </Pressable>
            ))}
            <Text style={styles.helper}>Yanlış olduğunu düşündüğün parçaya dokun</Text>
          </View>
        )}

        {question.format === 'fill' && (
          <View style={styles.options}>
            <TextInput
              style={styles.input}
              value={typed}
              onChangeText={setTyped}
              placeholder="Cevabını yaz…"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => typed.trim() && submit({ text: typed })}
              returnKeyType="done"
            />
            {question.hint && <Text style={styles.helper}>İpucu: {question.hint}</Text>}
            <Pressable
              style={[styles.primaryButton, !typed.trim() && styles.disabled]}
              disabled={!typed.trim()}
              onPress={() => submit({ text: typed })}
            >
              <Text style={styles.primaryButtonText}>Cevapla</Text>
            </Pressable>
            <Pressable style={styles.skip} onPress={() => submit({ text: '' })}>
              <Text style={styles.skipText}>Bilmiyorum, geç</Text>
            </Pressable>
          </View>
        )}

        {question.format === 'order' && (
          <OrderInput
            question={question}
            picked={picked}
            setPicked={setPicked}
            onSubmit={(words) => submit({ words })}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* -------------------------------------------------------- alt bileşenler */

const FORMAT_LABELS: Record<string, string> = {
  choice: 'Şık seç',
  fill: 'Boşluğu doldur',
  order: 'Kelimeleri sırala',
  spot: 'Hatayı bul',
};

function SkillBar({
  label,
  accuracy,
  color,
}: {
  label: string;
  accuracy: number;
  color: string;
}) {
  return (
    <View style={styles.skillRow}>
      <Text style={styles.skillName}>{label}</Text>
      <View style={styles.skillBarTrack}>
        <View
          style={[styles.skillBarFill, { width: `${accuracy}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={styles.skillPercent}>%{accuracy}</Text>
    </View>
  );
}

function OrderInput({
  question,
  picked,
  setPicked,
  onSubmit,
}: {
  question: Extract<PlacementQuestion, { format: 'order' }>;
  picked: number[];
  setPicked: (v: number[]) => void;
  onSubmit: (words: string[]) => void;
}) {
  const shuffled = useMemo(
    () => shuffle(question.words.map((w, i) => ({ w, i })), question.id),
    [question.id, question.words]
  );

  const chosen = picked.map((p) => shuffled[p].w);
  const remaining = shuffled.filter((_, idx) => !picked.includes(idx));

  return (
    <View style={styles.options}>
      <View style={styles.answerArea}>
        {chosen.length === 0 ? (
          <Text style={styles.helper}>Aşağıdaki kelimelere sırayla dokun</Text>
        ) : (
          <Text style={styles.answerText}>{chosen.join(' ')}</Text>
        )}
      </View>

      <View style={styles.chipRow}>
        {shuffled.map((item, idx) =>
          picked.includes(idx) ? null : (
            <Pressable
              key={item.w + idx}
              style={styles.chip}
              onPress={() => setPicked([...picked, idx])}
            >
              <Text style={styles.chipText}>{item.w}</Text>
            </Pressable>
          )
        )}
      </View>

      <View style={styles.orderActions}>
        <Pressable
          style={[styles.smallButton, picked.length === 0 && styles.disabled]}
          disabled={picked.length === 0}
          onPress={() => setPicked(picked.slice(0, -1))}
        >
          <Text style={styles.smallButtonText}>← Geri al</Text>
        </Pressable>
        <Pressable
          style={[
            styles.smallButtonPrimary,
            remaining.length > 0 && styles.disabled,
          ]}
          disabled={remaining.length > 0}
          onPress={() => onSubmit(chosen)}
        >
          <Text style={styles.smallButtonPrimaryText}>Cevapla</Text>
        </Pressable>
      </View>

      <Pressable style={styles.skip} onPress={() => onSubmit([])}>
        <Text style={styles.skipText}>Bilmiyorum, geç</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { justifyContent: 'center', padding: spacing.md },
  bold: { fontWeight: '700' },

  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  paragraph: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    marginTop: spacing.sm + 2,
  },

  infoBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: { fontSize: 14, color: colors.muted, lineHeight: 22 },
  infoNote: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginTop: spacing.md,
  },

  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryButtonText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.35 },

  levelList: { marginTop: spacing.lg, gap: spacing.sm + 2 },
  levelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  levelChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    minWidth: 44,
    alignItems: 'center',
  },
  levelChipText: { fontSize: 16, fontWeight: '800', color: colors.accent },
  levelOptionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  levelOptionHint: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 18,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressText: { fontSize: 13, color: colors.muted, fontWeight: '500' },
  formatTag: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '700',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: colors.accent, borderRadius: 3 },

  passageBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  passageText: { fontSize: 15, color: colors.text, lineHeight: 23 },

  questionText: {
    fontSize: 19,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 27,
    marginTop: spacing.lg,
  },

  options: { marginTop: spacing.lg, gap: spacing.sm + 2 },
  option: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  optionPressed: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  optionText: { fontSize: 16, color: colors.text },
  helper: { fontSize: 13, color: colors.muted, lineHeight: 19 },

  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 17,
    color: colors.text,
  },
  skip: { alignItems: 'center', paddingVertical: spacing.sm + 2 },
  skipText: { fontSize: 14, color: colors.muted },

  answerArea: {
    minHeight: 56,
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  answerText: { fontSize: 17, color: colors.text, lineHeight: 25 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  chipText: { fontSize: 16, color: colors.text },
  orderActions: { flexDirection: 'row', gap: spacing.sm },
  smallButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  smallButtonText: { fontSize: 15, color: colors.muted, fontWeight: '600' },
  smallButtonPrimary: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  smallButtonPrimaryText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },

  resultLabel: {
    fontSize: 13,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  levelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  levelText: { fontSize: 40, fontWeight: '800', color: '#FFFFFF' },
  levelDescription: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 23,
    marginTop: spacing.md,
  },
  scoreLine: { fontSize: 14, color: colors.muted, marginTop: spacing.sm },

  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  skillName: { fontSize: 14, color: colors.text, width: 62 },
  skillBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  skillBarFill: { height: 8, borderRadius: 4 },
  skillPercent: {
    fontSize: 13,
    color: colors.muted,
    width: 42,
    textAlign: 'right',
  },
});
