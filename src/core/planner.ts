/**
 * Günlük plan üretimi.
 *
 * Saf TypeScript: ağ çağrısı, veritabanı erişimi ve AI çağrısı YOK.
 * Bu sayede uygulama internetsizken ve senkron olmadan da çalışır.
 */

export type DayType = 'workday' | 'weekend';
export type TaskKind = 'writing' | 'cards' | 'reading' | 'speaking' | 'listening';

export interface PlanTask {
  id: string;
  kind: TaskKind;
  title: string;
  detail: string;
  estimatedMinutes: number;
}

export interface DailyPlan {
  dayType: DayType;
  dayLabel: string;
  totalMinutes: number;
  tasks: PlanTask[];
  lightMode: boolean;
}

export interface PlannerSettings {
  /** İş günü için ayrılan dakika (varsayılan 6) */
  weekdayMinutes: number;
  /** Hafta sonu için ayrılan dakika (varsayılan 25) */
  weekendMinutes: number;
}

export const DEFAULT_SETTINGS: PlannerSettings = {
  weekdayMinutes: 6,
  weekendMinutes: 25,
};

/** İş gününde en fazla bu kadar kart gösterilir — kalanı hafta sonuna kalır */
const WORKDAY_CARD_CAP = 8;
/** "Bugün yoğunum" modunda gösterilen kart sayısı */
const LIGHT_MODE_CARD_COUNT = 5;
/** Bir kartın tahmini süresi (dakika) */
const MINUTES_PER_CARD = 0.25;

const TR_DAYS = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
];

export function getDayType(date: Date): DayType {
  const day = date.getDay();
  return day === 0 || day === 6 ? 'weekend' : 'workday';
}

export function getDayLabel(date: Date): string {
  return TR_DAYS[date.getDay()];
}

export interface PlannerInput {
  date: Date;
  settings?: PlannerSettings;
  /** Bugün tekrarı gelen kart sayısı */
  dueCardCount: number;
  /** En sık tekrarlanan hata kategorileri (en sıktan aza doğru) */
  topErrorCategories: string[];
  /** Kullanıcı "bugün yoğunum" dediyse true */
  lightMode?: boolean;
}

/**
 * Günün planını üretir.
 *
 * Kural özeti:
 *  - "Bugün yoğunum"  → sadece 5 kart, ~90 saniye. Seri korunur, borç devretmez.
 *  - İş günü          → 1 mikro yazma görevi + en fazla 8 kart
 *  - Hafta sonu       → 1 uzun yazma + 1 okuma + bekleyen tüm kartlar
 */
export function buildDailyPlan(input: PlannerInput): DailyPlan {
  const settings = input.settings ?? DEFAULT_SETTINGS;
  const dayType = getDayType(input.date);
  const dayLabel = getDayLabel(input.date);
  const lightMode = input.lightMode ?? false;
  const focus = input.topErrorCategories[0];

  const tasks: PlanTask[] = [];

  if (lightMode) {
    const count = Math.min(input.dueCardCount, LIGHT_MODE_CARD_COUNT);
    if (count > 0) {
      tasks.push(makeCardTask(count));
    }
    return finalize(dayType, dayLabel, tasks, true);
  }

  if (dayType === 'workday') {
    // Beceriler haftaya dağıtılır — her gün aynı görev bıktırır
    tasks.push(makeWorkdayTask(input.date.getDay(), settings.weekdayMinutes, focus));

    const count = Math.min(input.dueCardCount, WORKDAY_CARD_CAP);
    if (count > 0) {
      tasks.push(makeCardTask(count));
    }
  } else {
    tasks.push({
      id: 'writing-long',
      kind: 'writing',
      title: 'Uzun yazma',
      detail: focus
        ? `Bir paragraf. Bu haftanın zayıf noktası: ${focus}`
        : 'Bir paragraf yaz — hafta sonu asıl iş burada',
      estimatedMinutes: 12,
    });

    tasks.push({
      id: 'reading',
      kind: 'reading',
      title: 'Okuma',
      detail: 'Seviyene uygun kısa metin + anlama soruları',
      estimatedMinutes: 6,
    });

    if (input.dueCardCount > 0) {
      tasks.push(makeCardTask(input.dueCardCount));
    }
  }

  return finalize(dayType, dayLabel, tasks, false);
}

/**
 * İş gününün ana görevi — beceriler haftaya dağıtılır.
 * Pzt yazma · Sal okuma · Çar konuşma · Per yazma · Cum konuşma
 *
 * Böylece her gün aynı şeyi yapmıyorsun ve dört beceri de haftada
 * en az bir kez çalışılıyor.
 */
function makeWorkdayTask(
  weekday: number,
  minutes: number,
  focus?: string
): PlanTask {
  const duration = Math.max(3, minutes - 2);

  // 1=Pzt, 2=Sal, 3=Çar, 4=Per, 5=Cum
  if (weekday === 2) {
    return {
      id: 'reading',
      kind: 'reading',
      title: 'Kısa okuma',
      detail: 'Seviyene uygun metin + anlama soruları',
      estimatedMinutes: duration,
    };
  }

  if (weekday === 3 || weekday === 5) {
    return {
      id: 'speaking',
      kind: 'speaking',
      title: 'Konuşma',
      detail: focus
        ? `Mikrofonla sesli cevapla. Odak: ${focus}`
        : 'Klavyedeki mikrofonla sesli cevapla',
      estimatedMinutes: duration,
    };
  }

  return {
    id: 'writing-micro',
    kind: 'writing',
    title: 'Kısa yazma',
    detail: focus
      ? `3-4 cümle. Bugünün odağı: ${focus}`
      : '3-4 cümle yaz, düzeltmesi öğretmenden gelecek',
    estimatedMinutes: duration,
  };
}

function makeCardTask(count: number): PlanTask {
  return {
    id: 'cards',
    kind: 'cards',
    title: 'Kelime kartları',
    detail: `${count} kartın tekrarı geldi`,
    estimatedMinutes: Math.max(1, Math.round(count * MINUTES_PER_CARD)),
  };
}

function finalize(
  dayType: DayType,
  dayLabel: string,
  tasks: PlanTask[],
  lightMode: boolean
): DailyPlan {
  const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  return { dayType, dayLabel, totalMinutes, tasks, lightMode };
}
