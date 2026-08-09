import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { estimateTarget, targetTrend } from '../../src/core/progress';
import { useStore } from '../../src/db/store';
import {
  getRecentSessions,
  getStats,
  getTopErrorCategories,
} from '../../src/db/selectors';
import { colors, radius, spacing } from '../../src/ui/theme';

const TR_SHORT_DAYS = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

export default function ProgressScreen() {
  const { data } = useStore();

  const stats = useMemo(() => getStats(data), [data]);
  const errors = useMemo(() => getTopErrorCategories(data, 5), [data]);
  const week = useMemo(() => getRecentSessions(data, 7), [data]);

  /* Hedef tahmini ve gidişatı. Kaydı Öğretmen ekranı tutuyor; burası sadece
     gösteriyor — aynı kaydı iki ekranın birden yazması karışıklık yaratır. */
  const history = data.targetHistory ?? [];
  // Kıyas noktası bugünün kendi kaydı olmamalı (bkz. teacher.tsx'teki not)
  const todayISO = new Date().toISOString().slice(0, 10);
  const estimate = useMemo(
    () =>
      estimateTarget(
        data,
        new Date(),
        history.filter((p) => p.date !== todayISO).at(-1)?.daysRemaining
      ),
    [data, history, todayISO]
  );
  const trend = useMemo(
    () => (estimate ? targetTrend(history, estimate.daysRemaining) : null),
    [history, estimate]
  );

  const maxMinutes = Math.max(1, ...week.map((d) => d.minutes));

  const cells = [
    { label: 'Seri', value: `${stats.streakDays} gün` },
    { label: 'Seviye', value: stats.level },
    { label: 'Kelime', value: String(stats.cardCount) },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.md }}
    >
      <View style={styles.row}>
        {cells.map((c) => (
          <View key={c.label} style={styles.stat}>
            <Text style={styles.statValue}>{c.value}</Text>
            <Text style={styles.statLabel}>{c.label}</Text>
          </View>
        ))}
      </View>

      {/* --------------------------------------------------- hedef eğrisi
          Kullanıcının istediği grafik: "şu günde B1 olursun, sen şu an A2sin."
          Çubuklar kalan gün sayısıdır — **aşağı inmesi iyidir**, o yüzden
          altında ne anlama geldiği yazıyor. */}
      {trend && estimate ? (
        <>
          <Text style={styles.sectionTitle}>
            {data.profile.level} → {estimate.level} · {estimate.daysRemaining} gün
          </Text>
          <View style={styles.box}>
            {trend.points.length >= 2 ? (
              <View style={styles.chart}>
                {trend.points.slice(-14).map((p) => {
                  const max = Math.max(
                    1,
                    ...trend.points.slice(-14).map((x) => x.daysRemaining)
                  );
                  const height = Math.round((p.daysRemaining / max) * 80);
                  return (
                    <View key={p.date} style={styles.barColumn}>
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max(3, height), backgroundColor: colors.weekend },
                        ]}
                      />
                      <Text style={styles.barLabel}>{p.date.slice(8)}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
            <Text
              style={[
                styles.trend,
                trend.delta < 0 && { color: colors.success },
                trend.delta > 0 && { color: '#D92D20' },
              ]}
            >
              {trend.label}
            </Text>
            <Text style={styles.chartNote}>
              Çubuk = hedefe kalan gün; kısalması iyi. Sayıyı öğretmen belirler:
              çalıştıkça kalan saati düşürür, ara verince artırır. Tek seferde
              %25'ten fazla oynayamaz — bir iyi hafta "iki ay erken bitiyorsun"
              demek değildir.
            </Text>
            {data.plan?.targetReason ? (
              <Text style={styles.reason}>{data.plan.targetReason}</Text>
            ) : null}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Son 7 gün</Text>
      <View style={styles.box}>
        <View style={styles.chart}>
          {week.map((d) => {
            const height = Math.round((d.minutes / maxMinutes) * 80);
            const day = TR_SHORT_DAYS[new Date(d.date + 'T00:00:00').getDay()];
            return (
              <View key={d.date} style={styles.barColumn}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(3, height),
                      backgroundColor:
                        d.minutes > 0 ? colors.accent : colors.border,
                    },
                  ]}
                />
                <Text style={styles.barLabel}>{day}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.chartNote}>
          {week.every((d) => d.minutes === 0)
            ? 'Henüz kayıt yok. Bir görev tamamla, buraya işlensin.'
            : 'Çubuklar günlük çalışma süreni gösterir.'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>En sık tekrarlanan hataların</Text>
      <View style={styles.box}>
        {errors.length === 0 ? (
          <Text style={styles.empty}>
            Henüz veri yok. Birkaç yazma görevi yaptıktan sonra burada en çok
            takıldığın gramer konuları sıralanacak — ve günlük görevlerin bunlara
            göre üretilecek.
          </Text>
        ) : (
          errors.map((e, i) => (
            <View
              key={e.category}
              style={[styles.errorRow, i < errors.length - 1 && styles.divider]}
            >
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <Text style={styles.errorCategory}>{e.category}</Text>
                {e.exampleSentence && (
                  <Text style={styles.errorExample}>{e.exampleSentence}</Text>
                )}
              </View>
              <Text style={styles.errorCount}>{e.count}×</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', gap: spacing.sm + 2 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 13, color: colors.muted, marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  box: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
  },
  barColumn: { alignItems: 'center', flex: 1 },
  bar: { width: 18, borderRadius: 4 },
  barLabel: { fontSize: 11, color: colors.muted, marginTop: spacing.xs + 2 },
  chartNote: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.md,
    lineHeight: 18,
  },
  empty: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  errorCategory: { fontSize: 15, color: colors.text, fontWeight: '500' },
  errorExample: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  errorCount: { fontSize: 15, fontWeight: '700', color: colors.accent },
  trend: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.muted,
    marginTop: spacing.md,
  },
  reason: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
});
