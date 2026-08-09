import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { buildDailyPlan, type PlanTask } from '../../src/core/planner';
import { useStore } from '../../src/db/store';
import {
  getActiveConversation,
  getDueCardCount,
  getTopErrorCategories,
} from '../../src/db/selectors';
import { colors, radius, spacing } from '../../src/ui/theme';

export default function TodayScreen() {
  const { data } = useStore();
  const router = useRouter();
  const [lightMode, setLightMode] = useState(false);

  const plan = useMemo(() => {
    const today = new Date();
    return buildDailyPlan({
      date: today,
      settings: {
        weekdayMinutes: data.profile.weekdayMinutes,
        weekendMinutes: data.profile.weekendMinutes,
      },
      dueCardCount: getDueCardCount(data, today),
      topErrorCategories: getTopErrorCategories(data, 3).map((e) => e.category),
      lightMode,
      // Öğretmen görev gönderdiyse günün planı odur
      suggestedTasks: data.suggestedTasks,
      hasLessonPassage: Boolean(
        data.lesson?.passage && data.lesson.date === today.toISOString().slice(0, 10)
      ),
    });
  }, [data, lightMode]);

  // Sadece HENÜZ OKUNMAMIŞ düzeltmeler sayılır; okununca kart kaybolur
  const correctedCount = data.tasks.filter(
    (t) => t.feedback !== null && !t.feedbackSeen
  ).length;

  /**
   * Bugünün sohbeti bitirildi mi.
   *
   * Sohbet artık her gün var: öğretmenin planı yoksa uygulama seviye ve zevke
   * göre kendisi kuruyor (`getActiveConversation`). Eskiden yalnızca
   * öğretmenin planına bakılıyordu ve senkron yapılmayan günde sohbet hiç
   * görünmüyordu.
   */
  const todayISO = new Date().toISOString().slice(0, 10);
  const conversation = useMemo(() => getActiveConversation(data), [data]);
  const conversationWaiting = !(data.conversations ?? []).some(
    (c) => c.date === todayISO && c.finished
  );
  const isWeekend = plan.dayType === 'weekend';
  const accent = isWeekend ? colors.weekend : colors.accent;
  const accentSoft = isWeekend ? colors.weekendSoft : colors.accentSoft;

  function openTask(task: PlanTask) {
    if (task.kind === 'cards') {
      router.push('/cards');
      return;
    }
    router.push({ pathname: '/task/[id]', params: { id: task.id } });
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {!data.profile.placementDone && (
        <Pressable
          style={({ pressed }) => [styles.placement, pressed && styles.taskPressed]}
          onPress={() => router.push('/placement')}
        >
          <Text style={styles.placementTitle}>Önce seviyeni ölçelim</Text>
          <Text style={styles.placementText}>
            25 soruluk kısa bir test, ~10 dakika. Bundan sonraki tüm görevler ve
            içerik senin seviyene göre seçilecek.
          </Text>
          <Text style={styles.placementCta}>Teste başla →</Text>
        </Pressable>
      )}

      {/* Günün sohbeti — öğretmen gönderdiyse ve bugün henüz yapılmadıysa.
          Öğretmen sekmesinde de duruyor ama günlük alışkanlık burada kurulur:
          kullanıcı önce "Bugün" ekranını açıyor. */}
      {conversationWaiting && (
        <Pressable
          style={({ pressed }) => [styles.feedbackCard, pressed && styles.taskPressed]}
          onPress={() => router.push('/conversation')}
        >
          <View style={styles.taskMain}>
            <Text style={styles.feedbackTitle}>💬 Günün sohbeti hazır</Text>
            <Text style={styles.feedbackText}>
              {conversation.plan.topic} — mikrofonla ya da yazarak
            </Text>
          </View>
          <Text style={styles.feedbackArrow}>→</Text>
        </Pressable>
      )}

      {correctedCount > 0 && (
        <Pressable
          style={({ pressed }) => [styles.feedbackCard, pressed && styles.taskPressed]}
          onPress={() => router.push('/feedback')}
        >
          <View style={styles.taskMain}>
            <Text style={styles.feedbackTitle}>
              ✍️ {correctedCount} düzeltme hazır
            </Text>
            <Text style={styles.feedbackText}>
              Öğretmenin yazdıklarını düzeltti — oku, hatalarını gör
            </Text>
          </View>
          <Text style={styles.feedbackArrow}>→</Text>
        </Pressable>
      )}

      <View style={[styles.badge, { backgroundColor: accentSoft }]}>
        <Text style={[styles.badgeText, { color: accent }]}>
          {plan.dayLabel} · {isWeekend ? 'Hafta sonu' : 'İş günü'}
        </Text>
      </View>

      <Text style={styles.heading}>
        Bugün <Text style={{ color: accent }}>{plan.totalMinutes} dakika</Text>
      </Text>
      <Text style={styles.sub}>
        {plan.lightMode
          ? 'Yoğun gün modu — serin korunuyor, borç yarına devretmiyor.'
          : isWeekend
            ? 'Hafta sonu: asıl iş bugün. Acele yok.'
            : 'Mesai günü. Kısa tut, düzenli ol.'}
      </Text>

      <View style={styles.list}>
        {plan.tasks.map((task) => (
          <Pressable
            key={task.id}
            style={({ pressed }) => [styles.task, pressed && styles.taskPressed]}
            onPress={() => openTask(task)}
          >
            <View style={styles.taskMain}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskDetail}>{task.detail}</Text>
            </View>
            <Text style={[styles.taskMinutes, { color: accent }]}>
              {task.estimatedMinutes} dk
            </Text>
          </Pressable>
        ))}

        {plan.tasks.length === 0 && (
          <View style={styles.task}>
            <Text style={styles.taskDetail}>
              Bugün tekrarı gelen kart yok. Dinlen.
            </Text>
          </View>
        )}
      </View>

      <Pressable
        style={styles.lightToggle}
        onPress={() => setLightMode((v) => !v)}
      >
        <Text style={styles.lightToggleText}>
          {plan.lightMode ? '↩︎  Normal plana dön' : '😮‍💨  Bugün yoğunum'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
  placement: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  placementTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  placementText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 20,
    marginTop: spacing.xs + 2,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  feedbackTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  feedbackText: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
    lineHeight: 18,
  },
  feedbackArrow: { fontSize: 20, color: '#FFFFFF', fontWeight: '700' },
  placementCta: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: spacing.sm + 2,
  },
  heading: { fontSize: 30, fontWeight: '700', color: colors.text },
  sub: {
    fontSize: 15,
    color: colors.muted,
    marginTop: spacing.xs + 2,
    lineHeight: 21,
  },
  list: { marginTop: spacing.lg, gap: spacing.sm + 2 },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  taskPressed: { opacity: 0.6 },
  taskMain: { flex: 1, paddingRight: spacing.sm },
  taskTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  taskDetail: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 19,
  },
  taskMinutes: { fontSize: 15, fontWeight: '700' },
  lightToggle: {
    marginTop: spacing.lg,
    alignSelf: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  lightToggleText: { fontSize: 15, color: colors.muted, fontWeight: '500' },
});
