import { addDays, toISODate } from '../core/srs';
import type { AppData, Card, ErrorCategory } from './types';

/**
 * Salt-okunur sorgular. Hepsi saf fonksiyon — veriyi değiştirmezler.
 */

export interface Stats {
  streakDays: number;
  level: string;
  cardCount: number;
  dueCardCount: number;
  learnedCardCount: number;
}

/** Tekrarı bugün veya daha önce gelmiş kartlar, en eskiden başlayarak. */
export function getDueCards(
  data: AppData,
  today: Date = new Date(),
  limit?: number
): Card[] {
  const iso = toISODate(today);
  const due = data.cards
    .filter((c) => c.dueDate <= iso)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  return limit ? due.slice(0, limit) : due;
}

export function getDueCardCount(data: AppData, today: Date = new Date()): number {
  const iso = toISODate(today);
  return data.cards.reduce((n, c) => (c.dueDate <= iso ? n + 1 : n), 0);
}

/** En sık tekrarlanan hata kategorileri — görev üretiminin girdisi. */
export function getTopErrorCategories(data: AppData, limit = 5): ErrorCategory[] {
  return [...data.errors]
    .sort((a, b) => b.count - a.count || (a.lastSeen < b.lastSeen ? 1 : -1))
    .slice(0, limit);
}

/**
 * Kesintisiz gün sayısı. Bugün henüz çalışılmadıysa seri dünden sayılır —
 * gün bitmeden seri kırılmış gibi görünmesin diye.
 */
export function getStreak(data: AppData, today: Date = new Date()): number {
  const days = new Set(data.sessions.map((s) => s.date));
  if (days.size === 0) return 0;

  let cursor = days.has(toISODate(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(toISODate(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function getStats(data: AppData, today: Date = new Date()): Stats {
  return {
    streakDays: getStreak(data, today),
    level: data.profile.level,
    cardCount: data.cards.length,
    dueCardCount: getDueCardCount(data, today),
    // 3+ kez üst üste bilinen kart "öğrenilmiş" sayılır
    learnedCardCount: data.cards.reduce(
      (n, c) => (c.repetitions >= 3 ? n + 1 : n),
      0
    ),
  };
}

/** Son N günün çalışma dakikaları — ilerleme grafiği için. */
export function getRecentSessions(
  data: AppData,
  days = 7,
  today: Date = new Date()
): Array<{ date: string; minutes: number }> {
  const out: Array<{ date: string; minutes: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const iso = toISODate(addDays(today, -i));
    const found = data.sessions.find((s) => s.date === iso);
    out.push({ date: iso, minutes: found?.minutesSpent ?? 0 });
  }
  return out;
}
