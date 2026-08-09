import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { describeInterval, reviewCard, type ReviewGrade } from '../../src/core/srs';
import { gradeCard, recordSession } from '../../src/db/mutations';
import { useStore } from '../../src/db/store';
import { getDueCards } from '../../src/db/selectors';
import { colors, radius, spacing } from '../../src/ui/theme';

const GRADES: Array<{ grade: ReviewGrade; label: string; color: string }> = [
  { grade: 'again', label: 'Bilmedim', color: '#D92D20' },
  { grade: 'good', label: 'Bildim', color: colors.accent },
  { grade: 'easy', label: 'Kolaydı', color: colors.success },
];

export default function CardsScreen() {
  const { data, update } = useStore();
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const dueCards = useMemo(() => getDueCards(data), [data]);
  const card = dueCards[0];

  function handleGrade(grade: ReviewGrade) {
    if (!card) return;
    const today = new Date();
    const next = reviewCard(card, grade, today);

    update((current) => {
      const graded = gradeCard(current, card.id, grade, today);
      // Son kart bitiyorsa oturumu kaydet
      return dueCards.length === 1
        ? recordSession(graded, Math.max(1, Math.round((reviewedCount + 1) * 0.25)), today)
        : graded;
    });

    setLastResult(`"${card.word}" → ${describeInterval(next.intervalDays)}`);
    setReviewedCount((n) => n + 1);
    setRevealed(false);
  }

  if (!card) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.doneEmoji}>✅</Text>
        <Text style={styles.doneTitle}>
          {reviewedCount > 0 ? 'Bugünlük bitti' : 'Tekrarı gelen kart yok'}
        </Text>
        <Text style={styles.doneText}>
          {reviewedCount > 0
            ? `${reviewedCount} kart tekrar edildi. Kalanlar unutma eğrisine göre ileri tarihlere dağıtıldı.`
            : 'Yeni kelimeler, yazma görevlerindeki düzeltmelerden otomatik eklenecek.'}
        </Text>
        {lastResult && <Text style={styles.lastResult}>{lastResult}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.counter}>{dueCards.length} kart kaldı</Text>

      <View style={styles.card}>
        <Text style={styles.word}>{card.word}</Text>

        {revealed ? (
          <>
            <Text style={styles.meaning}>{card.meaning}</Text>
            {card.example && <Text style={styles.example}>{card.example}</Text>}
          </>
        ) : (
          <Text style={styles.hint}>Anlamını hatırlıyor musun?</Text>
        )}
      </View>

      {revealed ? (
        <View style={styles.gradeRow}>
          {GRADES.map((g) => (
            <Pressable
              key={g.grade}
              style={[styles.gradeButton, { borderColor: g.color }]}
              onPress={() => handleGrade(g.grade)}
            >
              <Text style={[styles.gradeLabel, { color: g.color }]}>{g.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable style={styles.revealButton} onPress={() => setRevealed(true)}>
          <Text style={styles.revealText}>Göster</Text>
        </Pressable>
      )}

      {lastResult && <Text style={styles.lastResult}>{lastResult}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  centered: { justifyContent: 'center', alignItems: 'center' },
  counter: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 200,
    justifyContent: 'center',
  },
  word: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center' },
  meaning: {
    fontSize: 17,
    color: colors.accent,
    marginTop: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  example: {
    fontSize: 15,
    color: colors.muted,
    marginTop: spacing.md,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: colors.muted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  revealButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  revealText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  gradeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  gradeButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  gradeLabel: { fontSize: 15, fontWeight: '600' },
  lastResult: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
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
    paddingHorizontal: spacing.md,
  },
});
