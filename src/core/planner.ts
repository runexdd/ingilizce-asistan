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
  /**
   * Öğretmenin bugün için gönderdiği görevler.
   * Doluysa günün planı BUDUR — uygulama kendi başına program uydurmaz.
   * Boşsa aşağıdaki yedek karışım devreye girer.
   */
  suggestedTasks?: Array<{ kind: string; prompt: string; targetError?: string }>;
  /**
   * Bugün için öğretmenin yazdığı hikâye bölümü var mı.
   * Varsa okuma görevi listede garanti edilir — öğretmen görev listesinde
   * unutsa bile hikâyeye erişim kaybolmasın.
   */
  hasLessonPassage?: boolean;
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

  // 1) ÖĞRETMENİN GÖREVLERİ — varsa esas budur.
  //    Karar verici öğretmendir; uygulama kendi başına program uydurmaz.
  const fromTeacher = (input.suggestedTasks ?? []).filter((t) => t.prompt?.trim());

  if (fromTeacher.length > 0) {
    const budget = dayType === 'workday' ? settings.weekdayMinutes : settings.weekendMinutes;

    // Günün hikâyesi varsa okuma HER ZAMAN listede olur.
    // Öğretmen görev listesinde unutsa bile hikâye erişilebilir kalmalı.
    if (input.hasLessonPassage) {
      tasks.push({
        id: 'reading',
        kind: 'reading',
        title: 'Okuma',
        detail: 'Günün hikâyesi — kelimelere dokunup anlamlarını gör',
        estimatedMinutes: dayType === 'workday' ? 3 : 7,
      });
    }

    // Yazma günde TEK olur. İki yazma görevi bıktırır ve süreyi yer.
    // Gün tipine uygun olanı seç: hafta sonu uzun, iş günü kısa.
    const preferredWriting = dayType === 'weekend' ? 'writing-long' : 'writing-micro';
    let writingUsed = false;

    const selected = fromTeacher.filter((t) => {
      if (t.kind === 'reading') return false; // yukarıda zaten eklendi
      if (t.kind.startsWith('writing')) {
        if (writingUsed) return false;
        writingUsed = true;
        return true;
      }
      return true;
    });

    // İki yazma geldiyse gün tipine uygun olanı öne al
    selected.sort((a, b) => {
      const score = (k: string) => (k === preferredWriting ? -1 : 0);
      return score(a.kind) - score(b.kind);
    });

    const used = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
    const taskBudget = Math.max(3, budget - used - Math.min(3, input.dueCardCount * 0.25));
    const per = Math.max(2, Math.round(taskBudget / Math.max(1, selected.length)));

    for (const t of selected) {
      tasks.push({
        id: t.kind,
        kind: taskKindOf(t.kind),
        title: TITLES[t.kind] ?? 'Görev',
        detail: t.targetError
          ? `Odak: ${t.targetError}`
          : 'Öğretmenin bugün için verdiği görev',
        estimatedMinutes: per,
      });
    }
  } else if (dayType === 'workday') {
    // 2) YEDEK — öğretmen henüz görev göndermediyse.
    //    Kısa günde bile tek tip değil: üretim + tanıma birlikte.
    tasks.push(makeRotatingTask(input.date.getDay(), settings.weekdayMinutes, focus));

    // Süre elveriyorsa ikinci bir kısa dokunuş ekle — gün tek renk olmasın
    if (settings.weekdayMinutes >= 9) {
      tasks.push(makeSecondTouch(input.date.getDay(), focus));
    }

    const count = Math.min(input.dueCardCount, WORKDAY_CARD_CAP);
    if (count > 0) tasks.push(makeCardTask(count));
  } else {
    // Hafta sonu: dört becerinin hepsi bir arada
    tasks.push({
      id: 'reading',
      kind: 'reading',
      title: 'Okuma',
      detail: 'Günün kelimelerini bağlamda gör',
      estimatedMinutes: 7,
    });
    tasks.push({
      id: 'writing-long',
      kind: 'writing',
      title: 'Uzun yazma',
      detail: focus ? `Bir paragraf. Odak: ${focus}` : 'Bir paragraf yaz',
      estimatedMinutes: 10,
    });
    tasks.push({
      id: 'speaking',
      kind: 'speaking',
      title: 'Konuşma',
      detail: 'Aynı kelimelerle sesli üretim — mikrofonla',
      estimatedMinutes: 5,
    });

    if (input.dueCardCount > 0) tasks.push(makeCardTask(input.dueCardCount));
  }

  return finalize(dayType, dayLabel, tasks, false);
}

const TITLES: Record<string, string> = {
  'writing-micro': 'Kısa yazma',
  'writing-long': 'Uzun yazma',
  speaking: 'Konuşma',
  reading: 'Okuma',
  listening: 'Dinleme',
};

function taskKindOf(kind: string): TaskKind {
  if (kind === 'reading') return 'reading';
  if (kind === 'speaking') return 'speaking';
  if (kind === 'listening') return 'listening';
  return 'writing';
}

/**
 * Yedek plandaki ana görev — öğretmen henüz görev göndermemişken.
 * Gün gün dönüşür ki hep aynı şey olmasın.
 */
function makeRotatingTask(weekday: number, minutes: number, focus?: string): PlanTask {
  const duration = Math.max(3, Math.round(minutes * 0.6));

  // 1=Pzt, 2=Sal, 3=Çar, 4=Per, 5=Cum
  if (weekday === 2 || weekday === 4) {
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

/** Günü tek renk bırakmamak için ikinci kısa dokunuş. */
function makeSecondTouch(weekday: number, focus?: string): PlanTask {
  if (weekday === 2 || weekday === 4) {
    return {
      id: 'writing-micro',
      kind: 'writing',
      title: 'Kısa yazma',
      detail: focus ? `Birkaç cümle. Odak: ${focus}` : 'Birkaç cümle yaz',
      estimatedMinutes: 3,
    };
  }
  return {
    id: 'reading',
    kind: 'reading',
    title: 'Kısa okuma',
    detail: 'Günün kelimelerini bağlamda gör',
    estimatedMinutes: 3,
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
