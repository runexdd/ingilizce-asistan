import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  answerQuestion,
  computeResult,
  isFinished,
  nextQuestion,
  progress,
  SKILL_LABELS,
  startPlacement,
  TEST_LENGTH,
  type PlacementState,
} from '../src/core/placement';
import { toISODate } from '../src/core/srs';
import { updateProfile } from '../src/db/mutations';
import { useStore } from '../src/db/store';
import { colors, radius, spacing } from '../src/ui/theme';

type Phase = 'intro' | 'test' | 'result';

export default function PlacementScreen() {
  const { update } = useStore();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intro');
  const [state, setState] = useState<PlacementState>(() => startPlacement());

  // Soru, duruma göre bir kez seçilir; her çizimde değişmesin diye useMemo.
  const question = useMemo(
    () => (phase === 'test' ? nextQuestion(state) : null),
    [phase, state]
  );

  const result = useMemo(
    () => (phase === 'result' ? computeResult(state) : null),
    [phase, state]
  );

  function handleAnswer(index: number) {
    if (!question) return;
    const next = answerQuestion(state, question, index);
    setState(next);
    if (isFinished(next) || nextQuestion(next) === null) {
      setPhase('result');
    }
  }

  function handleFinish() {
    const r = computeResult(state);
    update((current) =>
      updateProfile(current, {
        level: r.level,
        placementDone: true,
        weakestSkill: r.weakestSkill ?? undefined,
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
          {TEST_LENGTH} soruluk kısa bir test. Doğru bildikçe sorular zorlaşır,
          zorlandıkça kolaylaşır — böylece seviyeni az soruda doğru ölçer.
        </Text>
        <Text style={styles.paragraph}>
          Bilmediğinde tahmin etmekten çekinme, yanlış cevaplar da seviyeni
          bulmaya yarıyor. Yaklaşık 10 dakika sürer.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Sonunda ne çıkacak</Text>
          <Text style={styles.infoText}>
            • CEFR seviyen (A1–C2){'\n'}
            • Gramer, kelime ve okumada ayrı ayrı başarın{'\n'}
            • En zayıf olduğun alan
          </Text>
          <Text style={styles.infoNote}>
            Bundan sonraki tüm görevler ve içerik bu sonuca göre seçilecek.
          </Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={() => setPhase('test')}>
          <Text style={styles.primaryButtonText}>Teste başla</Text>
        </Pressable>
      </ScrollView>
    );
  }

  /* -------------------------------------------------------------- sonuç */

  if (phase === 'result' && result) {
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
          <Text style={styles.infoTitle}>Beceri dağılımın</Text>
          {result.skills.map((s) => (
            <View key={s.skill} style={styles.skillRow}>
              <Text style={styles.skillName}>{SKILL_LABELS[s.skill]}</Text>
              <View style={styles.skillBarTrack}>
                <View
                  style={[
                    styles.skillBarFill,
                    {
                      width: `${s.accuracy}%`,
                      backgroundColor:
                        s.skill === result.weakestSkill
                          ? '#F79009'
                          : colors.accent,
                    },
                  ]}
                />
              </View>
              <Text style={styles.skillPercent}>%{s.accuracy}</Text>
            </View>
          ))}

          {result.weakestSkill && (
            <Text style={styles.infoNote}>
              En zayıf alanın{' '}
              <Text style={{ fontWeight: '700' }}>
                {SKILL_LABELS[result.weakestSkill]}
              </Text>
              . Günlük görevlerin buraya ağırlık verecek.
            </Text>
          )}
        </View>

        <Pressable style={styles.primaryButton} onPress={handleFinish}>
          <Text style={styles.primaryButtonText}>Programımı oluştur</Text>
        </Pressable>
      </ScrollView>
    );
  }

  /* --------------------------------------------------------------- test */

  if (!question) {
    // Havuz tükendiyse sonuca geç
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          Soru {current + 1} / {total}
        </Text>
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

      <View style={styles.options}>
        {question.options.map((option, index) => (
          <Pressable
            key={option}
            style={({ pressed }) => [
              styles.option,
              pressed && styles.optionPressed,
            ]}
            onPress={() => handleAnswer(index)}
          >
            <Text style={styles.optionText}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { justifyContent: 'center', padding: spacing.md },

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

  progressHeader: { marginBottom: spacing.sm },
  progressText: { fontSize: 13, color: colors.muted, fontWeight: '500' },
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
