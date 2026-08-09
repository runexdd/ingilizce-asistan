/**
 * Öğretmen ekranı — sistemin merkezi.
 *
 * Kullanıcının kuralı: *"öğretmen her şeye karar verici olarak ana merkezde
 * yer almalı."* Diğer ekranlar birer araç (kartlar, okuma, görev); burası
 * öğretmenin konuştuğu yer:
 *
 *   1. Bugünün kararı ve tavsiyesi
 *   2. Hedef — kaç gün kaldı, dünkünden kısaldı mı, neden
 *   3. Günün sohbeti (dizi/şarkı üstüne, mikrofonlu)
 *   4. İzle / dinle önerileri — tamamlandı işaretiyle
 *   5. Öğretmenin son değerlendirmesi ve sohbet istatistiği
 *
 * Ekran hiçbir şeye kendi karar vermez; öğretmenden gelen veriyi gösterir ve
 * kullanıcının yaptıklarını ölçer.
 */

import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { conversationStats } from '../../src/core/conversation';
import { nextLevel } from '../../src/core/level';
import { describeLevelScore } from '../../src/core/levelexam';
import { estimateTarget, targetTrend } from '../../src/core/progress';
import { toISODate } from '../../src/core/srs';
import { markContentDone } from '../../src/db/mutations';
import {
  getActiveContent,
  getActiveConversation,
  isContentStale,
} from '../../src/db/selectors';
import { useStore } from '../../src/db/store';
import { colors, radius, spacing } from '../../src/ui/theme';
import type { ContentSuggestion } from '../../src/db/types';

const TYPE_LABEL: Record<ContentSuggestion['type'], string> = {
  series: '📺  Dizi / film',
  song: '🎵  Müzik',
  youtube: '▶️  Video',
  podcast: '🎧  Podcast',
  reading: '📖  Okuma',
  task: '🎯  Görev',
};

export default function TeacherScreen() {
  const { data, update } = useStore();
  const today = toISODate(new Date());

  const plan = data.plan;
  const lastScore = data.scores.at(-1);

  /* --- hedef tahmini ---
     Önceki kayıt tahmine veriliyor ki %25 sınırı işlesin; öğretmen bir
     haftada "60 gün → 20 gün" diyemesin. */
  const history = data.targetHistory ?? [];
  const estimate = useMemo(
    () => estimateTarget(data, new Date(), history.at(-1)?.daysRemaining),
    [data, history]
  );

  const trend = useMemo(
    () => (estimate ? targetTrend(history, estimate.daysRemaining) : null),
    [history, estimate]
  );

  /* Bugünkü tahmini geçmişe işle — yarın "kısaldı/uzadı" diyebilmek için. */
  useEffect(() => {
    if (!estimate) return;
    const existing = history.find((p) => p.date === today);
    if (existing && existing.daysRemaining === estimate.daysRemaining) return;

    update((current) => {
      const list = current.targetHistory ?? [];
      const same = list.find(
        (p) => p.date === today && p.daysRemaining === estimate.daysRemaining
      );
      if (same) return current;
      return {
        ...current,
        targetHistory: [
          ...list.filter((p) => p.date !== today),
          {
            date: today,
            level: estimate.level,
            daysRemaining: estimate.daysRemaining,
            reason: current.plan?.targetReason,
          },
        ].sort((a, b) => (a.date < b.date ? -1 : 1)),
      };
    });
  }, [estimate, history, today, update]);

  const stats = useMemo(
    () => conversationStats(data.conversations ?? []),
    [data.conversations]
  );

  /**
   * Sohbet ve içerik **tek yerden** seçiliyor: öğretmenin paketi taze ise o,
   * değilse uygulamanın kendi seçimi. Böylece seviye değiştiği anda ekran
   * değişiyor; bilgisayarda öğretmen çalışana kadar beklemek gerekmiyor.
   */
  const activeConversation = useMemo(
    () => getActiveConversation(data),
    [data]
  );
  const conversationPlan = activeConversation.plan;
  const todayConversation = (data.conversations ?? []).find((c) => c.date === today);
  const reviewed = (data.conversations ?? []).filter((c) => c.review).slice(-1)[0];

  /**
   * Seviye, öğretmenin son paketinden **sonra** mı değişti? Öyleyse elimizdeki
   * dizi/şarkı/sohbet eski seviyeye göre yazılmıştır.
   */
  const stale = isContentStale(data);

  const teacherQuestions = data.teacherQuestions ?? [];
  const unansweredQuestions = teacherQuestions.filter((q) => !q.answer).length;
  const answeredQuestions = teacherQuestions.filter(
    (q) => q.answer && !q.readAt
  ).length;

  const activeContent = useMemo(() => getActiveContent(data), [data]);
  const watch = activeContent.items.filter((c) => c.type !== 'task');
  const chores = activeContent.items.filter((c) => c.type === 'task');

  const goal = plan?.targetLevel ?? nextLevel(data.profile.level) ?? data.profile.level;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md }}>
      {/* ---------------------------------------------- seviye değişti mi
          Kullanıcının şikâyeti: *"seviyemi A2'den B1'e götürdüm, hâlâ The
          Flash diyorsun."* Uygulama yeni içerik üretemez — onu öğretmen
          üretir — ama eskidiğini söyleyebilir. Sessizce yanlış şeyi
          göstermek, sistemin dinamik olmadığı hissini veren asıl şeydi. */}
      {stale ? (
        <View style={styles.staleBox}>
          <Text style={styles.staleTitle}>
            Seviyen {data.profile.level} oldu — aşağıdaki içerik eski seviyene göre
            seçilmişti
          </Text>
          <Text style={styles.staleText}>
            Dizi/şarkı önerisini ve sohbeti öğretmen seçiyor, uygulama değil.
            Yeni seviyene göre olanlar bir sonraki senkronda gelecek; o zamana
            kadar kartlar ve okuma zaten {data.profile.level} seviyesinden
            geliyor.
          </Text>
        </View>
      ) : null}

      {/* ---------------------------------------- öğretmenin bugünkü sözü */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Öğretmenin bugünkü notu</Text>
        <Text style={styles.heroText}>
          {plan?.note ??
            'Henüz not yok. Bir görev yapıp Ayarlar → Şimdi senkronla dediğinde öğretmen buraya yazacak.'}
        </Text>
        {plan?.advice ? (
          <View style={styles.adviceBox}>
            <Text style={styles.adviceLabel}>Bugünün tavsiyesi</Text>
            <Text style={styles.adviceText}>{plan.advice}</Text>
          </View>
        ) : null}
      </View>

      {/* ------------------------------------------------------ hedef */}
      <Text style={styles.sectionTitle}>Hedef</Text>
      <View style={styles.box}>
        <View style={styles.levelRow}>
          <View style={styles.levelPill}>
            <Text style={styles.levelPillText}>{data.profile.level}</Text>
          </View>
          <Text style={styles.levelArrow}>→</Text>
          <View style={[styles.levelPill, styles.levelPillTarget]}>
            <Text style={[styles.levelPillText, styles.levelPillTextTarget]}>{goal}</Text>
          </View>
          {estimate ? (
            <Text style={styles.daysText}>{estimate.daysRemaining} gün</Text>
          ) : null}
        </View>

        {/* Seviye içi konum — "B1" bir aralıktır, bir nokta değil.
            Çubuk mevcut seviyenin içinde nerede durduğunu gösteriyor. */}
        <View style={styles.scoreTrack}>
          <View
            style={[
              styles.scoreFill,
              { width: `${data.profile.levelScore ?? 0}%` },
            ]}
          />
        </View>
        <Pressable onPress={() => router.push('/levelexam')}>
          <Text style={styles.scoreText}>
            {describeLevelScore(data.profile.level, data.profile.levelScore)}
            {data.profile.levelScore === undefined
              ? ' — ölçmek için dokun'
              : ` · ${data.profile.levelScore}/100`}
          </Text>
        </Pressable>

        {estimate && trend ? (
          <>
            <Text
              style={[
                styles.trend,
                trend.delta < 0 && styles.trendGood,
                trend.delta > 0 && styles.trendBad,
              ]}
            >
              {trend.previousDays !== undefined
                ? `${trend.label} (önceki tahmin ${trend.previousDays} gündü)`
                : trend.label}
            </Text>
            {plan?.targetReason ? (
              <Text style={styles.trendReason}>{plan.targetReason}</Text>
            ) : null}
            <Text style={styles.note}>{estimate.note}</Text>
          </>
        ) : (
          <Text style={styles.empty}>
            Öğretmen henüz bir plan kurmadı. Yerleştirme sınavını yapıp bir görev
            gönderdiğinde hedef tarihi buraya gelecek.
          </Text>
        )}
      </View>

      {/* --------------------------------------------- günün sohbeti */}
      <Text style={styles.sectionTitle}>
        Günün sohbeti
        {activeConversation.source === 'app' ? (
          <Text style={styles.sourceTag}>  · uygulamanın hazırladığı</Text>
        ) : null}
      </Text>
      {conversationPlan ? (
        <View style={styles.box}>
          <Text style={styles.topic}>{conversationPlan.topic}</Text>
          <Text style={styles.intro}>{conversationPlan.intro}</Text>

          {conversationPlan.targetWords.length > 0 ? (
            <View style={styles.chipRow}>
              {conversationPlan.targetWords.map((w) => (
                <View key={w} style={styles.chip}>
                  <Text style={styles.chipText}>{w}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {todayConversation?.finished ? (
            <View style={styles.doneBanner}>
              <Text style={styles.doneBannerText}>
                ✓ Bugünkü sohbet tamam — {todayConversation.turnsDone} tur,{' '}
                {todayConversation.spokenTurns}'i mikrofonla.
              </Text>
            </View>
          ) : null}

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/conversation')}
          >
            <Text style={styles.primaryButtonText}>
              {todayConversation
                ? todayConversation.finished
                  ? 'Sohbeti tekrar oku'
                  : 'Sohbete devam et'
                : '💬  Sohbete başla'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/**
        * Öğretmene serbest soru — günün sohbetinin **ters yönü.**
        * Sohbette soruyu öğretmen soruyor; burada kullanıcı soruyor.
        * Kullanıcının isteği: *"öğretmenle konuşacağım yer olsun."*
        */}
      <Text style={styles.sectionTitle}>Aklına takılan bir şey mi var?</Text>
      <Pressable style={styles.box} onPress={() => router.push('/sor')}>
        <Text style={styles.askTitle}>❓  Öğretmene sor</Text>
        <Text style={styles.askText}>
          {unansweredQuestions > 0
            ? `${unansweredQuestions} soru cevap bekliyor`
            : answeredQuestions > 0
              ? `${answeredQuestions} soruna cevap geldi — okumak için dokun`
              : 'Bir gramer kuralı, iki kelimenin farkı, "bu neden böyle" — Türkçe sorabilirsin'}
        </Text>
      </Pressable>

      {/* --------------------------------- öğretmenin sohbet değerlendirmesi */}
      {reviewed?.review ? (
        <>
          <Text style={styles.sectionTitle}>Son sohbetin değerlendirmesi</Text>
          <View style={styles.box}>
            <Text style={styles.verdict}>{reviewed.review.verdict}</Text>
            {reviewed.review.praise ? (
              <Text style={styles.praise}>👏 {reviewed.review.praise}</Text>
            ) : null}
            {reviewed.review.corrections.slice(0, 3).map((c, i) => (
              <View key={i} style={styles.correction}>
                <Text style={styles.correctionWrong}>{c.original}</Text>
                <Text style={styles.correctionRight}>→ {c.corrected}</Text>
                {c.natural && c.natural !== c.corrected ? (
                  <Text style={styles.correctionNatural}>
                    Doğalı: {c.natural}
                  </Text>
                ) : null}
                <Text style={styles.correctionNote}>{c.note}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* ------------------------------------------------ izle / dinle */}
      <Text style={styles.sectionTitle}>
        İzle · dinle
        {activeContent.source === 'app' ? (
          <Text style={styles.sourceTag}>  · uygulamanın seçtiği</Text>
        ) : null}
      </Text>
      {activeContent.source === 'app' && watch.length > 0 ? (
        <Text style={styles.sourceNote}>
          Bunları uygulama seviyene ve zevklerine göre seçti — anında değişsin
          diye. Öğretmen çalıştığında yerini ona bırakacak; onunki senin dünkü
          hatalarına da bağlanır.
        </Text>
      ) : null}
      {watch.length === 0 ? (
        <View style={styles.box}>
          <Text style={styles.empty}>
            Henüz öneri yok. Ayarlar → Zevklerim'i doldurursan sevdiğin türden,
            seviyene uygun bir şey seçilecek.
          </Text>
        </View>
      ) : (
        watch.map((item) => (
          <View key={item.title} style={[styles.box, item.done && styles.boxDone]}>
            <Text style={styles.contentType}>{TYPE_LABEL[item.type] ?? item.type}</Text>
            <Text style={styles.contentTitle}>{item.title}</Text>
            {item.segment ? (
              <Text style={styles.contentMeta}>Bölüm: {item.segment}</Text>
            ) : null}
            {item.where ? (
              <Text style={styles.contentMeta}>Nereden: {item.where}</Text>
            ) : null}
            {item.why ? <Text style={styles.contentWhy}>{item.why}</Text> : null}
            <Text style={styles.contentInstruction}>{item.instruction}</Text>

            {item.words?.length ? (
              <View style={styles.wordBox}>
                <Text style={styles.wordBoxTitle}>Önce bunları bil</Text>
                {item.words.map((w) => (
                  <Text key={w.word} style={styles.wordLine}>
                    <Text style={styles.wordEn}>{w.word}</Text> — {w.meaning}
                  </Text>
                ))}
              </View>
            ) : null}

            {item.watchFor?.length ? (
              <View style={styles.wordBox}>
                <Text style={styles.wordBoxTitle}>Dikkat et</Text>
                {item.watchFor.map((line, i) => (
                  <Text key={i} style={styles.wordLine}>
                    • {line}
                  </Text>
                ))}
              </View>
            ) : null}

            {item.done ? (
              <Text style={styles.doneMark}>
                ✓ Tamamlandı{item.doneAt ? ` · ${item.doneAt}` : ''}
              </Text>
            ) : (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => update((c) => markContentDone(c, item.title))}
              >
                <Text style={styles.secondaryButtonText}>Bitirdim, işaretle</Text>
              </Pressable>
            )}
          </View>
        ))
      )}

      {chores.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Günlük hayat görevi</Text>
          {chores.map((item) => (
            <View key={item.title} style={[styles.box, item.done && styles.boxDone]}>
              <Text style={styles.contentTitle}>{item.title}</Text>
              <Text style={styles.contentInstruction}>{item.instruction}</Text>
              {item.done ? (
                <Text style={styles.doneMark}>✓ Tamamlandı</Text>
              ) : (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => update((c) => markContentDone(c, item.title))}
                >
                  <Text style={styles.secondaryButtonText}>Bitirdim, işaretle</Text>
                </Pressable>
              )}
            </View>
          ))}
        </>
      ) : null}

      {/* ------------------------------------------------ istatistik */}
      <Text style={styles.sectionTitle}>Konuşma istatistiğin</Text>
      <View style={styles.box}>
        {stats.userTurns === 0 ? (
          <Text style={styles.empty}>
            Henüz sohbet yok. İlk sohbetten sonra burada kaç kelime konuştuğun,
            ne kadarını mikrofonla yaptığın ve hata oranının nasıl değiştiği
            görünecek.
          </Text>
        ) : (
          <>
            <View style={styles.statRow}>
              {[
                { label: 'Sohbet', value: String(stats.sessions) },
                { label: 'Kelime', value: String(stats.wordsSpoken) },
                { label: 'Mikrofon', value: `%${stats.spokenRatio}` },
              ].map((s) => (
                <View key={s.label} style={styles.statCell}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.note}>
              Cevap başına ortalama {stats.averageWords} kelime · 1000 kelimede{' '}
              {stats.errorsPerThousand} yazım/noktalama hatası. Bu sayı
              uygulamanın kuralla yakaladıklarıdır; üslup ve doğallık öğretmenin
              işi.
            </Text>
          </>
        )}
      </View>

      {lastScore ? (
        <>
          <Text style={styles.sectionTitle}>Son puanlama</Text>
          <View style={styles.box}>
            <View style={styles.statRow}>
              {[
                { label: 'Doğruluk', value: lastScore.accuracy },
                { label: 'Zenginlik', value: lastScore.range },
                { label: 'Cesaret', value: lastScore.creativity },
              ].map((s) => (
                <View key={s.label} style={styles.statCell}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.verdict}>{lastScore.verdict}</Text>
          </View>
        </>
      ) : null}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  hero: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#C9DBFB',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  adviceBox: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  adviceLabel: { fontSize: 12, fontWeight: '700', color: colors.muted },
  adviceText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginTop: spacing.xs,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    marginBottom: spacing.sm,
  },
  boxDone: { opacity: 0.65 },
  askTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  askText: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  empty: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  note: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginTop: spacing.sm,
  },

  /* hedef */
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelPill: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  levelPillTarget: { backgroundColor: colors.accent },
  levelPillText: { fontSize: 15, fontWeight: '700', color: colors.text },
  levelPillTextTarget: { color: '#FFFFFF' },
  levelArrow: { fontSize: 16, color: colors.muted },
  daysText: {
    marginLeft: 'auto',
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  trend: { fontSize: 14, color: colors.muted, marginTop: spacing.sm },
  trendGood: { color: colors.success, fontWeight: '600' },
  trendBad: { color: '#D92D20', fontWeight: '600' },
  trendReason: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  scoreTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  scoreFill: { height: 8, borderRadius: 4, backgroundColor: colors.weekend },
  scoreText: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.xs + 2,
    lineHeight: 19,
  },

  staleBox: {
    backgroundColor: '#FFFAEB',
    borderWidth: 1,
    borderColor: '#FEC84B',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sourceTag: { fontSize: 12, fontWeight: '600', color: colors.muted },
  sourceNote: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  staleTitle: { fontSize: 15, fontWeight: '700', color: '#93370D', lineHeight: 22 },
  staleText: {
    fontSize: 14,
    color: '#93370D',
    lineHeight: 21,
    marginTop: spacing.sm,
  },

  /* sohbet */
  topic: { fontSize: 17, fontWeight: '700', color: colors.text },
  intro: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
    marginTop: spacing.xs + 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  chip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  doneBanner: {
    marginTop: spacing.sm,
    backgroundColor: '#E7F6EF',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  doneBannerText: { fontSize: 13, color: '#08794A', lineHeight: 19 },

  primaryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  secondaryButton: {
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '700', color: colors.accent },

  /* içerik */
  contentType: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  contentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  contentMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  contentWhy: {
    fontSize: 14,
    color: colors.accent,
    lineHeight: 21,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  contentInstruction: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  wordBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
  },
  wordBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  wordLine: { fontSize: 14, color: colors.text, lineHeight: 22 },
  wordEn: { fontWeight: '700' },
  doneMark: {
    marginTop: spacing.md,
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },

  /* istatistik */
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statCell: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },

  /* değerlendirme */
  verdict: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  praise: {
    fontSize: 14,
    color: colors.success,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  correction: {
    marginTop: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    paddingLeft: spacing.sm + 2,
  },
  correctionWrong: {
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  correctionRight: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  correctionNatural: {
    fontSize: 14,
    color: colors.accent,
    marginTop: 2,
    fontStyle: 'italic',
  },
  correctionNote: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
});
