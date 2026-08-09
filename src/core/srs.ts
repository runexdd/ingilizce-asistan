/**
 * Aralıklı tekrar (spaced repetition) — SM-2 algoritmasının sadeleştirilmiş hâli.
 *
 * Saf TypeScript: ağ, veritabanı ve AI çağrısı YOK.
 *
 * Mantık: bildiğin kartın tekrar aralığı katlanarak uzar (1 gün → 6 gün →
 * 15 gün → ...), zorlandığın kart başa döner. Böylece unutma eğrisinin tam
 * kırılma noktasında karşına çıkar.
 */

export type ReviewGrade = 'again' | 'good' | 'easy';

export interface CardSchedule {
  /** Kolaylık katsayısı — düştükçe kart sıklaşır. Taban 1.3 */
  ease: number;
  /** Bir sonraki tekrara kaç gün var */
  intervalDays: number;
  /** Üst üste kaç kez doğru bilindi */
  repetitions: number;
  /** Tekrar tarihi, 'YYYY-MM-DD' */
  dueDate: string;
}

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

/** SM-2 kalite puanı karşılıkları */
const GRADE_QUALITY: Record<ReviewGrade, number> = {
  again: 2, // hatırlayamadı → baştan
  good: 4,
  easy: 5,
};

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Yeni eklenen bir kartın başlangıç durumu — bugün tekrarı gelmiş sayılır. */
export function newCardSchedule(today: Date = new Date()): CardSchedule {
  return {
    ease: DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
    dueDate: toISODate(today),
  };
}

/**
 * Bir kartı değerlendirdikten sonraki yeni programı hesaplar.
 * Girdiyi değiştirmez, yeni nesne döndürür.
 */
export function reviewCard(
  current: CardSchedule,
  grade: ReviewGrade,
  today: Date = new Date()
): CardSchedule {
  const q = GRADE_QUALITY[grade];

  // Kolaylık katsayısını güncelle (SM-2 formülü), tabanın altına inmesin.
  const nextEase = Math.max(
    MIN_EASE,
    current.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  // Hatırlayamadıysa baştan başla.
  if (q < 3) {
    return {
      ease: nextEase,
      intervalDays: 1,
      repetitions: 0,
      dueDate: toISODate(addDays(today, 1)),
    };
  }

  const repetitions = current.repetitions + 1;
  let intervalDays: number;
  if (repetitions === 1) {
    intervalDays = 1;
  } else if (repetitions === 2) {
    intervalDays = 6;
  } else {
    intervalDays = Math.round(current.intervalDays * nextEase);
  }

  return {
    ease: nextEase,
    intervalDays,
    repetitions,
    dueDate: toISODate(addDays(today, intervalDays)),
  };
}

/** Kartın bugün (veya daha önce) tekrarı gelmiş mi? */
export function isDue(card: Pick<CardSchedule, 'dueDate'>, today: Date = new Date()): boolean {
  return card.dueDate <= toISODate(today);
}

/** Kullanıcıya gösterilecek "sonraki tekrar" metni. */
export function describeInterval(intervalDays: number): string {
  if (intervalDays <= 1) return 'yarın';
  if (intervalDays < 30) return `${intervalDays} gün sonra`;
  const months = Math.round(intervalDays / 30);
  return months <= 1 ? '1 ay sonra' : `${months} ay sonra`;
}
