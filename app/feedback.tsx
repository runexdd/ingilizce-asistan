import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../src/db/store';
import { colors, radius, spacing } from '../src/ui/theme';

/**
 * Öğretmenden gelen düzeltmeler.
 * Döngünün kullanıcıya görünen kısmı: yaz → düzelt → oku → tekrar yaz.
 */
export default function FeedbackScreen() {
  const { data } = useStore();

  const corrected = useMemo(
    () =>
      data.tasks
        .filter((t) => t.feedback !== null)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [data.tasks]
  );

  if (corrected.length === 0) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.emptyTitle}>Henüz düzeltme yok</Text>
        <Text style={styles.emptyText}>
          Bir yazma görevi yap, sonra Ayarlar → Şimdi senkronla de. Bilgisayarda{' '}
          <Text style={styles.bold}>/ogretmen</Text> komutunu çalıştırınca
          düzeltmen buraya gelecek.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
    >
      {corrected.map((task) => {
        const fb = task.feedback!;
        return (
          <View key={task.id} style={styles.card}>
            <Text style={styles.date}>{task.date}</Text>

            <Text style={styles.sectionLabel}>Senin yazdığın</Text>
            <Text style={styles.original}>{task.userResponse}</Text>

            <Text style={styles.sectionLabel}>Düzeltilmiş hâli</Text>
            <Text style={styles.corrected}>{fb.corrected}</Text>

            {fb.natural && fb.natural !== fb.corrected && (
              <>
                <Text style={styles.sectionLabel}>Daha doğal söyleyiş</Text>
                <Text style={styles.natural}>{fb.natural}</Text>
              </>
            )}

            {fb.errors.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>
                  Hatalar ({fb.errors.length})
                </Text>
                {fb.errors.map((e, i) => (
                  <View key={i} style={styles.errorRow}>
                    <Text style={styles.errorCategory}>{e.category}</Text>
                    <Text style={styles.errorText}>{e.explanation}</Text>
                  </View>
                ))}
              </>
            )}

            {fb.newWords.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>
                  Karta eklenen kelimeler ({fb.newWords.length})
                </Text>
                <View style={styles.wordRow}>
                  {fb.newWords.map((w) => (
                    <View key={w.word} style={styles.wordChip}>
                      <Text style={styles.wordText}>{w.word}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { justifyContent: 'center', padding: spacing.lg },
  bold: { fontWeight: '700' },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  date: { fontSize: 12, color: colors.muted, marginBottom: spacing.sm },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.md,
    marginBottom: spacing.xs + 2,
  },
  original: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  corrected: { fontSize: 15, color: colors.text, lineHeight: 22 },
  natural: {
    fontSize: 15,
    color: colors.accent,
    lineHeight: 22,
    fontStyle: 'italic',
  },

  errorRow: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  errorCategory: { fontSize: 13, fontWeight: '700', color: '#F79009' },
  errorText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginTop: 2,
  },

  wordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  wordChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  wordText: { fontSize: 14, color: colors.accent, fontWeight: '600' },
});
