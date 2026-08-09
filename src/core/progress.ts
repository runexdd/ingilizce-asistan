/**
 * İlerleme ölçümü.
 *
 * Görev dağılımı nettir:
 *   • Bu dosya SAYAR   — süreklilik, üretim hacmi, kelime tutma. Hepsi objektif.
 *   • Öğretmen YARGILAR — doğruluk, zenginlik, yaratıcılık. Bunlar makineyle
 *     ölçülemez, Claude Code her senkronda puanlar.
 *
 * Uygulama asla kendi kendine "seviye atladın" demez; o kararı öğretmen verir.
 *
 * Saf TypeScript: ağ, veritabanı, AI çağrısı yok.
 */

import { addDays, toISODate } from './srs';
import type { AppData, TeacherScore } from '../db/types';

/** Tek bir günün / dönemin ölçüm sonucu. Her boyut 0-100. */
export interface ProgressSnapshot {
  /** Kaç gün çalışıldı — düzen */
  consistency: number;
  /** Ne kadar üretildi — kelime sayısı, görev sayısı */
  output: number;
  /** Kelime tutma oranı — kartlarda başarı */
  retention: number;
  /** Öğretmenin doğruluk puanı (yoksa null) */
  accuracy: number | null;
  /** Öğretmenin zenginlik + yaratıcılık ortalaması (yoksa null) */
  expression: number | null;
  /** Ağırlıklı genel puan 0-100 */
  overall: number;
  /** Kaç günlük pencereye bakıldı */
  windowDays: number;
}

/** Objektif ölçümlerin ağırlıkları — toplamları 1 olmalı. */
const WEIGHTS_WITHOUT_TEACHER = {
  consistency: 0.4,
  output: 0.3,
  retention: 0.3,
};

/** Öğretmen puanı geldiğinde ağırlıklar yeniden dağılır. */
const WEIGHTS_WITH_TEACHER = {
  consistency: 0.25,
  output: 0.15,
  retention: 0.2,
  accuracy: 0.25,
  expression: 0.15,
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Verilen pencerede ilerlemeyi ölçer.
 *
 * `windowDays` varsayılan 14: tek bir kötü gün tabloyu bozmasın,
 * ama iki hafta öncesi de bugünü gölgelemesin.
 */
export function measureProgress(
  data: AppData,
  today: Date = new Date(),
  windowDays = 14
): ProgressSnapshot {
  const start = toISODate(addDays(today, -(windowDays - 1)));
  const end = toISODate(today);

  const sessions = data.sessions.filter((s) => s.date >= start && s.date <= end);
  const tasks = data.tasks.filter((t) => t.date >= start && t.date <= end);
  const scores = data.scores.filter((s) => s.date >= start && s.date <= end);

  /* --- süreklilik: kaç günde çalışıldı --- */
  const activeDays = new Set(sessions.map((s) => s.date)).size;
  const consistency = clamp((activeDays / windowDays) * 100);

  /* --- üretim: yazılan kelime sayısı ---
     Hedef: günde ortalama 40 kelime = %100. Bu bir üst sınır değil, ölçek. */
  const wordsWritten = tasks.reduce(
    (sum, t) => sum + (t.userResponse.trim() ? t.userResponse.trim().split(/\s+/).length : 0),
    0
  );
  const output = clamp((wordsWritten / (windowDays * 40)) * 100);

  /* --- hatırlama: kartlarda tutma oranı ---
     repetitions >= 2 olan kartlar "tutulmuş" sayılır. Hiç kart görülmediyse
     ölçüm yapılamaz; nötr 50 verilir ki tablo çarpılmasın. */
  const seenCards = data.cards.filter((c) => c.repetitions > 0);
  const retention =
    seenCards.length === 0
      ? 50
      : clamp(
          (seenCards.filter((c) => c.repetitions >= 2).length / seenCards.length) * 100
        );

  /* --- öğretmen yargısı --- */
  const accuracy = scores.length > 0 ? clamp(average(scores.map((s) => s.accuracy))) : null;
  const expression =
    scores.length > 0
      ? clamp(average(scores.map((s) => (s.range + s.creativity) / 2)))
      : null;

  const overall =
    accuracy === null || expression === null
      ? consistency * WEIGHTS_WITHOUT_TEACHER.consistency +
        output * WEIGHTS_WITHOUT_TEACHER.output +
        retention * WEIGHTS_WITHOUT_TEACHER.retention
      : consistency * WEIGHTS_WITH_TEACHER.consistency +
        output * WEIGHTS_WITH_TEACHER.output +
        retention * WEIGHTS_WITH_TEACHER.retention +
        accuracy * WEIGHTS_WITH_TEACHER.accuracy +
        expression * WEIGHTS_WITH_TEACHER.expression;

  return {
    consistency: Math.round(consistency),
    output: Math.round(output),
    retention: Math.round(retention),
    accuracy: accuracy === null ? null : Math.round(accuracy),
    expression: expression === null ? null : Math.round(expression),
    overall: Math.round(overall),
    windowDays,
  };
}

/* ------------------------------------------------------------------- ivme */

export type MomentumDirection = 'rising' | 'flat' | 'falling' | 'unknown';

export interface Momentum {
  direction: MomentumDirection;
  /** Son iki hafta ile önceki iki hafta arasındaki puan farkı */
  delta: number;
  label: string;
}

/**
 * Son 14 gün ile ondan önceki 14 günü karşılaştırır.
 *
 * Neden fark eşiği var: puanın 1-2 puan oynaması gürültüdür, "ilerliyorsun"
 * demek abartı olur. Anlamlı sayılması için en az 5 puan fark aranır.
 */
export function measureMomentum(data: AppData, today: Date = new Date()): Momentum {
  const recent = measureProgress(data, today, 14);
  const earlier = measureProgress(data, addDays(today, -14), 14);

  const hasHistory =
    data.sessions.some((s) => s.date <= toISODate(addDays(today, -14)));

  if (!hasHistory) {
    return { direction: 'unknown', delta: 0, label: 'Henüz karşılaştıracak geçmiş yok' };
  }

  const delta = recent.overall - earlier.overall;

  if (delta >= 5) return { direction: 'rising', delta, label: 'Yükselişte' };
  if (delta <= -5) return { direction: 'falling', delta, label: 'Düşüşte' };
  return { direction: 'flat', delta, label: 'Sabit' };
}

/* -------------------------------------------------------- hedef tahmini */

export interface TargetEstimate {
  /** Hedeflenen seviye */
  level: string;
  /** Tahmini varış tarihi 'YYYY-MM-DD' */
  date: string;
  daysRemaining: number;
  /** Mevcut haftalık gerçek çalışma dakikası */
  weeklyMinutes: number;
  /** Bu tahmin ne kadar güvenilir */
  confidence: 'low' | 'medium' | 'high';
  /** Kullanıcıya gösterilecek açıklama */
  note: string;
}

/** Son N haftadaki GERÇEK haftalık çalışma dakikası. */
export function actualWeeklyMinutes(
  data: AppData,
  today: Date = new Date(),
  weeks = 4
): number {
  const start = toISODate(addDays(today, -(weeks * 7 - 1)));
  const minutes = data.sessions
    .filter((s) => s.date >= start)
    .reduce((sum, s) => sum + s.minutesSpent, 0);
  return minutes / weeks;
}

/**
 * Öğretmenin planından ve kullanıcının gerçek temposundan varış tarihi çıkarır.
 *
 * Kural: plan öğretmenindir, tempo kullanıcınındır. Uygulama ikisini çarpar,
 * kendi başına hedef uydurmaz. Plan yoksa tahmin de yoktur.
 *
 * `maxShiftRatio`: tahmin bir seferde en fazla %25 oynayabilir. Böylece iyi
 * geçen bir hafta "2 ay erken bitiriyorsun" gibi abartılı bir sıçrama yapmaz.
 */
export function estimateTarget(
  data: AppData,
  today: Date = new Date(),
  previousDaysRemaining?: number
): TargetEstimate | null {
  const plan = data.plan;
  if (!plan || plan.remainingHours <= 0) return null;

  const weeklyMinutes = actualWeeklyMinutes(data, today);

  // Hiç veri yoksa öğretmenin önerdiği tempoyu varsay
  const effectiveWeekly =
    weeklyMinutes > 0 ? weeklyMinutes : plan.dailyMinutes * 7;

  if (effectiveWeekly <= 0) return null;

  const weeksNeeded = (plan.remainingHours * 60) / effectiveWeekly;
  let daysRemaining = Math.ceil(weeksNeeded * 7);

  // Ani sıçramaları yumuşat — abartılı tahmin yapma
  if (previousDaysRemaining !== undefined && previousDaysRemaining > 0) {
    const maxShift = previousDaysRemaining * 0.25;
    const diff = daysRemaining - previousDaysRemaining;
    if (Math.abs(diff) > maxShift) {
      daysRemaining = Math.round(
        previousDaysRemaining + Math.sign(diff) * maxShift
      );
    }
  }

  const activeDays = new Set(
    data.sessions.filter((s) => s.date >= toISODate(addDays(today, -28))).map((s) => s.date)
  ).size;

  const confidence: TargetEstimate['confidence'] =
    activeDays >= 14 ? 'high' : activeDays >= 5 ? 'medium' : 'low';

  const note =
    confidence === 'low'
      ? 'Henüz az veri var — bu tahmin birkaç hafta içinde netleşecek.'
      : weeklyMinutes === 0
        ? 'Son haftalarda çalışma kaydı yok; tahmin öğretmenin önerdiği tempoya göre.'
        : `Haftada ortalama ${Math.round(weeklyMinutes)} dakika çalışıyorsun.`;

  return {
    level: plan.targetLevel,
    date: toISODate(addDays(today, daysRemaining)),
    daysRemaining,
    weeklyMinutes: Math.round(weeklyMinutes),
    confidence,
    note,
  };
}

/* ----------------------------------------------------------------- uyarı */

export interface Nudge {
  severity: 'info' | 'warning';
  message: string;
}

/**
 * Aksatma uyarısı. Gerçek öğretmen mantığı: sessiz kalmaz, ama
 * bir gün kaçırdın diye de dram yapmaz.
 */
export function checkNudge(data: AppData, today: Date = new Date()): Nudge | null {
  if (data.sessions.length === 0) return null;

  const lastDate = data.sessions
    .map((s) => s.date)
    .sort()
    .at(-1)!;

  const daysSince = Math.round(
    (new Date(toISODate(today) + 'T00:00:00').getTime() -
      new Date(lastDate + 'T00:00:00').getTime()) /
      86400000
  );

  if (daysSince <= 1) return null;

  if (daysSince <= 3) {
    return {
      severity: 'info',
      message: `${daysSince} gündür ara verdin. Bugün 5 dakika bile seriyi geri getirir.`,
    };
  }

  const weekly = actualWeeklyMinutes(data, today);
  const slipDays = data.plan
    ? Math.round((daysSince * (data.plan.dailyMinutes || 10)) / 60 / (weekly / 7 / 60 || 1))
    : daysSince;

  return {
    severity: 'warning',
    message: `${daysSince} gündür girmedin. Bu gidişle hedef tarihin yaklaşık ${Math.max(daysSince, slipDays)} gün geriye kaydı.`,
  };
}

/** Öğretmen puanlarını tarihe göre sıralı döndürür — grafik için. */
export function scoreHistory(data: AppData, days = 30, today: Date = new Date()): TeacherScore[] {
  const start = toISODate(addDays(today, -(days - 1)));
  return data.scores
    .filter((s) => s.date >= start)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
