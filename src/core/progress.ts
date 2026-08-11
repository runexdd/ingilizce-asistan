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

import {
  activeCurriculum,
  calendarDaysFor,
  curriculumProgress,
  MAX_DAYS,
} from './curriculum';
import { levelIndex, nextLevel, toLevel } from './level';
import { addDays, toISODate } from './srs';
import type { AppData, TargetPoint, TeacherScore } from '../db/types';

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

/**
 * Son 4 haftada **haftada kaç gün** çalışıldı.
 *
 * Müfredat "ders günü" cinsinden konuşuyor; takvim gününe çevirmek için bu
 * lazım. Dakika değil **gün** sayıyoruz: 3 dakikalık bir oturum da o günü
 * çalışılmış yapar, müfredat basamağı dakikayla değil günle ilerliyor.
 */
export function weeklyActiveDays(data: AppData, today: Date = new Date()): number {
  const start = toISODate(addDays(today, -28));
  const gunler = new Set(
    data.sessions.filter((s) => s.date >= start).map((s) => s.date)
  );
  if (gunler.size === 0) return 0;

  /** Kullanıcı 4 haftadır yoksa bölen 4 değil, gerçekten var olduğu süre */
  const enEski = [...gunler].sort()[0];
  const gecenGun = Math.max(
    1,
    Math.round((new Date(toISODate(today)).getTime() - new Date(enEski).getTime()) / 86400000) + 1
  );
  const hafta = Math.max(1, gecenGun / 7);
  return Math.min(7, gunler.size / hafta);
}

/**
 * Müfredattan çıkan hedef tahmini.
 *
 * Hedef seviye **her zaman bir üst basamak** — müfredat o seviyenin
 * müfredatı, bittiğinde varılan yer orası. `plan.targetLevel` iki basamak
 * yukarıyı gösteriyorsa dinlenmiyor; ekranda "A1 → B2, 540 gün" yazmasının
 * sebebi buydu.
 */
function curriculumTarget(
  data: AppData,
  today: Date,
  previousDaysRemaining?: number
): TargetEstimate | null {
  const mufredat = activeCurriculum(data.profile.level, data.plan?.curriculum);
  if (!mufredat) return null;

  const ilerleme = curriculumProgress(mufredat);
  if (ilerleme.total === 0) return null;

  const hedef = nextLevel(toLevel(data.profile.level));
  if (!hedef) return null;

  const haftalikGun = weeklyActiveDays(data, today);
  const olculdu = haftalikGun > 0;
  /**
   * Yeni kullanıcıda ölçüm yok; öğretmenin beklediği tempo, o da yoksa
   * kullanıcının kendi tarifi (hafta içi + hafta sonu ≈ 5 gün) kullanılıyor.
   */
  const kullanilan = olculdu ? haftalikGun : 5;

  const ham = calendarDaysFor(ilerleme.remainingLessonDays, kullanilan);
  /**
   * ⚠️ Tavan burada da gerekli. Bağımsız denetim ölçtü: 175 ders günlük bir
   * müfredat + haftada 2 gün tempo = **613 gün**, haftada 1 gün = **1225
   * gün**. Kullanıcının şikâyet ettiği sayı kaynağı değişmiş hâlde geri
   * geliyordu.
   */
  const kirpildi = ham > MAX_DAYS;
  let daysRemaining = Math.max(1, Math.min(MAX_DAYS, ham));

  /** Ani sıçramayı yumuşat — hedef her gün zıplarsa anlamını yitirir */
  if (previousDaysRemaining !== undefined && previousDaysRemaining > 0) {
    const maxShift = Math.max(2, previousDaysRemaining * 0.25);
    const diff = daysRemaining - previousDaysRemaining;
    if (Math.abs(diff) > maxShift) {
      daysRemaining = Math.round(previousDaysRemaining + Math.sign(diff) * maxShift);
    }
  }

  const aktifGun = new Set(
    data.sessions.filter((s) => s.date >= toISODate(addDays(today, -28))).map((s) => s.date)
  ).size;
  const confidence: TargetEstimate['confidence'] =
    aktifGun >= 14 ? 'high' : aktifGun >= 5 ? 'medium' : 'low';

  const basamak = ilerleme.step;
  /**
   * Tavana dayandıysak sayıyı süsleme — **gerçeği söyle ve yolu göster.**
   * Kırpılmış bir sayıyı olduğu gibi sunmak kullanıcıyı kandırmak olur; ama
   * 1200 gün yazmak da işe yaramaz. Doğrusu: "bu tempoyla uzak, şu tempoyla
   * şu kadar."
   */
  const note = kirpildi
    ? `Bu tempoyla hedef çok uzak. Müfredatta ${ilerleme.remainingLessonDays} ders günü var; haftada 5 gün çalışırsan ${calendarDaysFor(ilerleme.remainingLessonDays, 5)} günde biter, her gün çalışırsan ${ilerleme.remainingLessonDays} günde.`
    : !olculdu
      ? `Müfredatta ${ilerleme.remainingLessonDays} ders günü kaldı. Bu tahmin haftada 5 gün çalışmaya göre; sen çalıştıkça kendi tempona göre yeniden hesaplanacak.`
      : `Müfredatta ${ilerleme.remainingLessonDays} ders günü kaldı ve haftada ${haftalikGun.toFixed(1)} gün çalışıyorsun. Her gün çalışırsan ${ilerleme.remainingLessonDays} günde biter.`;

  return {
    level: hedef,
    date: toISODate(addDays(today, daysRemaining)),
    daysRemaining,
    weeklyMinutes: Math.round(actualWeeklyMinutes(data, today)),
    confidence,
    note,
    curriculum: {
      done: ilerleme.done,
      total: ilerleme.total,
      lessonDaysLeft: ilerleme.remainingLessonDays,
      stepTitle: basamak?.title,
      stepGoal: basamak?.goal,
    },
  };
}

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
  /**
   * Tahmin müfredattan çıktıysa müfredatın durumu — ekranda "A1 · 4/11
   * basamak · şu an: geniş zaman" diye gösteriliyor. Saat modelinden gelen
   * tahminlerde yok.
   */
  curriculum?: {
    done: number;
    total: number;
    lessonDaysLeft: number;
    stepTitle?: string;
    stepGoal?: string;
  };
}

/**
 * Son N haftadaki GERÇEK haftalık çalışma dakikası.
 *
 * ⚠️ **Bölen, kullanıcının gerçekten var olduğu hafta sayısıdır.**
 *
 * Eskiden toplam dakika her zaman 4'e bölünüyordu. Uygulamayı **3 gündür**
 * kullanan biri için bu, temposunu 10'a bölmek demekti: 27 dakika çalışmış
 * biri "haftada 7 dakika" görünüyor, oradan da hedefe "2378 gün" çıkıyordu.
 * Kullanıcı bunu bildirdi ve haklıydı — sayı saçmaydı.
 *
 * Doğrusu: ilk kayıttan bugüne kaç hafta geçtiyse ona böl, en fazla `weeks`
 * kadar geriye bak. Yeni başlayan biri için bölen 1 olur ve tempo gerçeği
 * gösterir.
 */
export function actualWeeklyMinutes(
  data: AppData,
  today: Date = new Date(),
  weeks = 4
): number {
  const start = toISODate(addDays(today, -(weeks * 7 - 1)));
  const window = data.sessions.filter((s) => s.date >= start);
  if (window.length === 0) return 0;

  const minutes = window.reduce((sum, s) => sum + s.minutesSpent, 0);

  const first = window.map((s) => s.date).sort()[0];
  const daysSpanned =
    Math.round(
      (new Date(toISODate(today) + 'T00:00:00').getTime() -
        new Date(first + 'T00:00:00').getTime()) /
        86400000
    ) + 1;

  // En az 1 hafta, en fazla bakılan pencere kadar
  const effectiveWeeks = Math.min(weeks, Math.max(1, daysSpanned / 7));
  return minutes / effectiveWeeks;
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
  /**
   * **Önce müfredat.**
   *
   * ⚠️ Eski model `remainingHours` × tempo idi ve ekranda **540 / 760 gün**
   * gibi sayılar üretiyordu. Sayı hatalı değildi, **soru** hatalıydı: bir
   * seviye için 10-400 saat tahmini, haftada ~80 dakikalık bir tempoyla
   * 2000 günü aşıyor. Kullanıcının tepkisi haklıydı: *"o gün sayılarında
   * abartı oluyordu, 760 günler falan geliyordu."*
   *
   * Yeni soru: **bir sonraki seviyeye kaç ders günü kaldı?** Cevabı
   * müfredat veriyor ve sayı denetlenebilir hâle geliyor — söz verilen gün
   * kadar çalışan gerçekten seviye atlıyor. Bkz. `src/core/curriculum.ts`.
   */
  const mufredat = curriculumTarget(data, today, previousDaysRemaining);
  if (mufredat) return mufredat;

  const plan = data.plan;
  if (!plan || plan.remainingHours <= 0) return null;

  const weeklyMinutes = actualWeeklyMinutes(data, today);
  const plannedWeekly = Math.max(0, plan.dailyMinutes) * 7;

  /**
   * Veri azken ölçülen tempoya tek başına güvenilmez.
   *
   * Üç günlük bir örnekten "haftada 7 dakika" çıkarıp bunu bir yıla yaymak,
   * kullanıcıya anlamsız bir sayı göstermek olur. Bu yüzden aktif gün sayısı
   * 14'ün altındayken ölçülen tempo, öğretmenin **önerdiği** tempoyla
   * harmanlanıyor; veri biriktikçe ölçümün ağırlığı artıyor.
   */
  const activeDays = new Set(
    data.sessions.filter((s) => s.date >= toISODate(addDays(today, -28))).map((s) => s.date)
  ).size;

  const trust = Math.min(1, activeDays / 14);
  const blended =
    weeklyMinutes > 0 && plannedWeekly > 0
      ? weeklyMinutes * trust + plannedWeekly * (1 - trust)
      : weeklyMinutes > 0
        ? weeklyMinutes
        : plannedWeekly;

  if (blended <= 0) return null;

  const weeksNeeded = (plan.remainingHours * 60) / blended;
  /**
   * **Üst sınır 18 ay.** Bir seviye atlamak için gereken süre araştırmalara
   * göre en kötü ihtimalle bu mertebede; "2378 gün" (6.5 yıl) bir tahmin
   * değil, bir hesap hatasının ekrana sızmasıdır. Sınıra dayanıyorsa sorun
   * tempoda ya da öğretmenin verdiği saatte demektir — sayı yine de
   * inandırıcı kalsın.
   */
  const rawDays = Math.ceil(weeksNeeded * 7);
  /**
   * ⚠️ Tavan 540'tan **365'e** indirildi ve müfredat yoluyla aynı sayı oldu.
   *
   * Bağımsız denetim (2026-08-11) bu yolun hâlâ 540 ürettiğini gösterdi:
   * müfredat yalnızca A1 için varsayılan olarak tanımlı, A2 ve üstünde
   * öğretmen müfredat göndermemişse buraya düşülüyor ve kullanıcı yine
   * şikâyet ettiği sayıyı görüyordu. Bir seviye için 1.5 yıl bir plan değil.
   */
  let daysRemaining = Math.min(MAX_DAYS, Math.max(7, rawDays));
  /** Tavana dayandıysak sayı gerçeği değil, sınırı gösteriyor — söylenmeli */
  const capped = rawDays > MAX_DAYS;

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

  const confidence: TargetEstimate['confidence'] =
    activeDays >= 14 ? 'high' : activeDays >= 5 ? 'medium' : 'low';

  /**
   * Tavana dayandıysak sayıyı süslemek yerine **gerçeği söyle ve yol göster.**
   *
   * "540 gün" tek başına umut kırıcı ve yanıltıcı; asıl bilgi şu: bu tempoyla
   * hedef uzak, şu tempoyla altı ayda ulaşılır. Sahte bir küçük sayı yazmak
   * kullanıcıyı kandırmak olurdu — o zaten *"mantıklı şekilde yapması lazım"*
   * dedi, "iyimser görünsün" demedi.
   */
  const neededWeekly = Math.ceil((plan.remainingHours * 60) / 26); // 26 hafta ≈ 6 ay
  /**
   * Buraya düşmüş olmak, **bu seviyenin müfredatı henüz kurulmamış** demektir
   * (varsayılan merdiven şimdilik yalnızca A1'de var, üst seviyeler fazları
   * gelince eklenecek). Tahmin saat modelinden geliyor; kullanıcı sayının
   * neden kaba olduğunu bilsin.
   */
  const mufredatYok = ' Öğretmen bu seviyenin müfredatını kurduğunda gün sayısı ders gününe göre yeniden hesaplanacak.';
  const note = capped
    ? `Bu tempoyla hedef çok uzak. Altı ayda ulaşmak için haftada ~${neededWeekly} dakika gerekiyor; şu an ${Math.round(blended)} dakika.` + mufredatYok
    : confidence === 'low'
      ? 'Henüz az veri var — bu tahmin birkaç hafta içinde netleşecek.'
      : weeklyMinutes === 0
        ? 'Son haftalarda çalışma kaydı yok; tahmin öğretmenin önerdiği tempoya göre.'
        : `Haftada ortalama ${Math.round(weeklyMinutes)} dakika çalışıyorsun.`;

  return {
    level: targetLevelFor(data),
    date: toISODate(addDays(today, daysRemaining)),
    daysRemaining,
    weeklyMinutes: Math.round(weeklyMinutes),
    confidence,
    note,
  };
}

/**
 * Hedef seviye — **her zaman mevcut seviyenin bir üstü.**
 *
 * Kullanıcının kuralı: *"A2'ye hedef B1, A1'se A2, B1'se B2, B2'yse C1,
 * C1'se C2 — her çektiğimde dinamik olması lazım."*
 *
 * ⚠️ Eskiden doğrudan `plan.targetLevel` okunuyordu ve kullanıcı seviyesini
 * elle değiştirdiğinde öğretmenin planı eskimiş oluyordu: A2'den B1'e geçince
 * ekranda **"B1 → B1"**, B2'ye geçince **"B2 → B1"** yazıyordu — yani hedef
 * geriye gidiyordu. Öğretmenin planı ancak gerçekten **yukarıyı** gösteriyorsa
 * dikkate alınır; C2'de üst seviye yoktur, hedef C2'nin kendisidir.
 */
export function targetLevelFor(data: AppData): string {
  const current = toLevel(data.profile.level);
  const above = nextLevel(current);
  if (!above) return current;

  /**
   * ⚠️ **Plandaki hedefe bakılmıyor — her zaman tam bir basamak üstü.**
   *
   * Eskiden `plan.targetLevel` mevcut seviyeden yüksekse o kazanıyordu ve
   * eskimiş bir plan ekranda **"A1 → B2"** yazdırıyordu: kullanıcı B1'deyken
   * yazılmış plan B2 diyordu, sonra seviye A1'e indi ama hedef B2 kaldı.
   * Gün sayısı bu arada A2'ye göre hesaplanıyordu — yani rozet bir şey,
   * sayı başka bir şey söylüyordu.
   *
   * `sanitizePlan` zaten `targetLevel`'ı bir üst basamağa kırpıyor; buradaki
   * ikinci okuma sadece eskimiş veriyi geri getiriyordu. Kullanıcının kuralı
   * da net: *"A2'ye hedef B1, A1'se A2, B1'se B2 — her çektiğimde dinamik
   * olması lazım."*
   */
  return above;
}

/* --------------------------------------------------------- hedefin gidişatı */

export interface TargetTrend {
  /** Bugünkü kalan gün */
  days: number;
  /** En son farklı olan önceki kayıt (yoksa undefined) */
  previousDays?: number;
  /** Negatif = hedef yaklaştı, pozitif = uzaklaştı */
  delta: number;
  /** "2 gün kısaldı" gibi Türkçe etiket */
  label: string;
  /** Grafiğe verilecek son N gün */
  points: TargetPoint[];
}

/**
 * Hedef tarihinin nasıl oynadığını anlatır.
 *
 * Kullanıcının istediği tam olarak buydu: *"çok çalışıyorsun, 80 günde B1
 * olacaksan artık 78 güne düşürecek; girmeyene 82 olacak."* Sayının kendisi
 * `estimateTarget` içinde çıkıyor (öğretmenin `remainingHours`'ı × gerçek
 * tempo); burada yapılan iş onu **dünküyle karşılaştırıp** görünür kılmak.
 *
 * Aynı gün içinde birden çok kayıt olmaz; karşılaştırma **farklı günler**
 * arasında yapılır, yoksa sayfa her açıldığında "0 gün değişti" yazardı.
 */
export function targetTrend(
  history: TargetPoint[],
  currentDays: number
): TargetTrend {
  const sorted = [...history].sort((a, b) => (a.date < b.date ? -1 : 1));
  const points = sorted.slice(-30);

  /**
   * Kıyas **önceki günlerden** yapılır.
   *
   * ⚠️ Eskiden bugünkü kayıt *değere* göre atılıyordu (`daysRemaining !==
   * currentDays`). İki sonucu vardı: geçmişte aynı gün sayısına sahip günler
   * de atlanıp kıyas beklenenden çok daha eskiye gidiyordu, ve `delta === 0`
   * imkânsız olduğu için "Dünle aynı" dalı ölü koda dönüşmüştü.
   */
  const todayISO = toISODate(new Date());
  const previous = sorted.filter((p) => p.date !== todayISO).at(-1);

  if (!previous) {
    return {
      days: currentDays,
      delta: 0,
      label: 'İlk tahmin — birkaç gün sonra kıyaslanacak',
      points,
    };
  }

  const delta = currentDays - previous.daysRemaining;
  const label =
    delta === 0
      ? 'Dünle aynı'
      : delta < 0
        ? `${Math.abs(delta)} gün kısaldı`
        : `${delta} gün uzadı`;

  return { days: currentDays, previousDays: previous.daysRemaining, delta, label, points };
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
