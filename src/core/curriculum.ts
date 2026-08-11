/**
 * Müfredat — **öğretmenin seviye içindeki yol haritası.**
 *
 * Kullanıcının tarifi: *"Öğretmen seviyeye uygun müfredat belirlemeli, A2'ye
 * geçene kadar performansa bağlı gün belirlemeli ve hazırlanan müfredatla
 * beraber gün sayısı eşleşmeli — böylece ekstra çalışmadan o gün sayısı kadar
 * uğraşan A2'ye geçebilmeli."* Ayrıca: *"A1 içinde 80 puan A1 ile 20 puan A1
 * aynı müfredata sahip olmasın."*
 *
 * ## Neden gerekliydi
 *
 * Seviye tablosu (`LEVEL_SPEC`) bir **ölçü** veriyordu — cümle kaç kelime,
 * günde kaç yeni kelime — ama bir **sıra** vermiyordu. `structures` alanı
 * A1 için tek satırdı: *"present simple, temel isim-fiil, tek yapılı kısa
 * cümle."* Bu bir seviye tarifi; müfredat değil. Öğretmen her gün bu torbadan
 * rastgele bir şey çalıştırıyordu, dolayısıyla:
 *
 *  - bazı yapılar hiç gelmiyordu (öğrenci "there is/are" görmeden A2'ye gidebilirdi),
 *  - "ne kadar kaldı" sorusunun cevabı yoktu,
 *  - aynı seviyedeki iki kişi aynı şeyi alıyordu.
 *
 * ## Gün sayısı buradan çıkar — saat tahmininden değil
 *
 * ⚠️ Eski model `remainingHours` (bir seviye için 10-400 saat) × kullanıcının
 * temposu idi. Hafta içi 6 dk + hafta sonu 25 dk ≈ haftada 80 dakika eder;
 * 400 saat bu tempoyla **2000 günden fazla** sürer. Ekranda 540 (tavan) ya da
 * 760 gibi sayılar çıkıyordu. Sayı yanlış değildi — soru yanlıştı: "B2'ye kaç
 * saat" diye sorulmuştu.
 *
 * Doğru soru: **"bir sonraki seviyeye kaç ders günü kaldı?"** Müfredatta
 * kalan basamakların gün toplamı bunu doğrudan verir. Kullanıcı her gün
 * çalışırsa takvim günü = ders günü; haftada 4 gün çalışırsa 7/4 ile uzar.
 * Sayı hem küçük hem **denetlenebilir**: söz verilen gün kadar çalışan
 * gerçekten A2'ye geçer.
 *
 * Saf TypeScript — ağ yok, `node --experimental-strip-types` ile test edilir.
 */

import { LEVELS, levelIndex, toLevel, type CEFRLevel } from './level';

export type StepStatus = 'done' | 'active' | 'todo';

export interface CurriculumStep {
  /** Kararlı kimlik — 'a1-03'. Öğretmen durumu bununla günceller. */
  id: string;
  /** Ne çalışılıyor — kısa, Türkçe */
  title: string;
  /** Bu basamak bitince öğrenci ne yapabiliyor — tek cümle, Türkçe */
  goal: string;
  /** Öğretmenin bu basamağa ayırdığı **ders günü** (takvim günü değil) */
  days: number;
  status: StepStatus;
}

export interface Curriculum {
  /** Hangi seviyenin müfredatı */
  level: CEFRLevel;
  steps: CurriculumStep[];
  /** Öğretmen en son ne zaman güncelledi */
  updatedAt?: string;
}

/**
 * **A1 merdiveni — varsayılan.**
 *
 * Öğretmen konuşana kadar geçerli olan sıra. Öğretmen kendi müfredatını
 * gönderdiği anda bu devre dışı kalır: karar verici odur, burası yedektir
 * (uygulamanın her yerindeki aynı ilke).
 *
 * Sıralama ölçütü **kullanılabilirlik**: her basamak bittiğinde öğrenci bir
 * şey *söyleyebiliyor* olmalı. Bu yüzden `to be` en başta (ilk cümleyi o
 * kurdurur) ve zamanlar en sonda değil — A1 boyunca tek zaman var.
 *
 * Gün toplamı **63 ders günü**. Kelime tarafıyla tutarlı: A1 havuzu 423
 * kelime, günde 4 yeni kelime, terfi ölçütü havuzun ~%60'ı → ~63 gün. İki
 * ölçünün aynı sayıyı vermesi tesadüf değil, kasıt: müfredat biterken kelime
 * de bitiyor.
 */
export const A1_STEPS: CurriculumStep[] = [
  {
    id: 'a1-01',
    title: 'to be — I am, you are, it is',
    goal: 'Kendini ve çevrendeki şeyleri tek cümleyle tanıtabiliyorsun.',
    days: 5,
    status: 'todo',
  },
  {
    id: 'a1-02',
    title: 'Sahiplik ve aile — my, your, have',
    goal: 'Ailenden ve eşyalarından bahsedebiliyorsun.',
    days: 5,
    status: 'todo',
  },
  {
    id: 'a1-03',
    title: 'Geniş zaman — olumlu cümle',
    goal: 'Her gün ne yaptığını anlatabiliyorsun.',
    days: 7,
    status: 'todo',
  },
  {
    id: 'a1-04',
    title: 'Geniş zaman — olumsuz ve soru',
    goal: 'Soru sorabiliyor ve "yapmıyorum" diyebiliyorsun.',
    days: 7,
    status: 'todo',
  },
  {
    id: 'a1-05',
    title: 'Çoğul ve a / an / the',
    goal: 'Tek mi çok mu olduğunu doğru söyleyebiliyorsun.',
    days: 5,
    status: 'todo',
  },
  {
    id: 'a1-06',
    title: 'can / cannot — yapabilmek',
    goal: 'Neyi yapabildiğini ve yapamadığını söyleyebiliyorsun.',
    days: 5,
    status: 'todo',
  },
  {
    id: 'a1-07',
    title: 'Sıklık zarfları — always, sometimes, never',
    goal: 'Bir şeyi ne sıklıkta yaptığını anlatabiliyorsun.',
    days: 5,
    status: 'todo',
  },
  {
    id: 'a1-08',
    title: 'Yer edatları — in, on, at, under, near',
    goal: 'Bir şeyin nerede olduğunu tarif edebiliyorsun.',
    days: 6,
    status: 'todo',
  },
  {
    id: 'a1-09',
    title: 'there is / there are — var ve yok',
    goal: 'Bir yerde ne olduğunu anlatabiliyorsun.',
    days: 6,
    status: 'todo',
  },
  {
    id: 'a1-10',
    title: 'Sayılar, saat ve günler',
    goal: 'Saat kaç, kaç tane, hangi gün — söyleyebiliyorsun.',
    days: 6,
    status: 'todo',
  },
  {
    id: 'a1-11',
    title: 'A1 kapanışı — hepsini birlikte kullan',
    goal: 'Öğrendiğin yapıları tek bir konuşmada birleştirebiliyorsun.',
    days: 6,
    status: 'todo',
  },
];

/** Seviyenin varsayılan merdiveni. Yazılmamış seviyeler için `null`. */
export function defaultSteps(level: string): CurriculumStep[] | null {
  return toLevel(level) === 'A1' ? A1_STEPS.map((s) => ({ ...s })) : null;
}

/**
 * Bu kullanıcı için geçerli müfredat.
 *
 * Öğretmenin planındaki müfredat **doğru seviyeye aitse** o kazanır. Seviye
 * uyuşmuyorsa (kullanıcı elle seviye değiştirmiş, paket eski) varsayılana
 * düşülür — eski seviyenin merdivenini göstermek, yanlış hedef göstermektir.
 */
export function activeCurriculum(
  level: string,
  planCurriculum: Curriculum | undefined
): Curriculum | null {
  const current = toLevel(level);

  if (
    planCurriculum &&
    toLevel(planCurriculum.level) === current &&
    planCurriculum.steps.length > 0
  ) {
    return planCurriculum;
  }

  const steps = defaultSteps(current);
  return steps ? { level: current, steps } : null;
}

/** Şu an çalışılan basamak — yoksa ilk bitmemiş basamak */
export function activeStep(c: Curriculum | null): CurriculumStep | undefined {
  if (!c) return undefined;
  return (
    c.steps.find((s) => s.status === 'active') ??
    c.steps.find((s) => s.status !== 'done')
  );
}

export interface CurriculumProgress {
  done: number;
  total: number;
  /** 0-1 */
  ratio: number;
  /** Kalan **ders günü** — takvim günü değil */
  remainingLessonDays: number;
  step?: CurriculumStep;
  stepIndex: number;
}

/**
 * Müfredatın durumu.
 *
 * ⚠️ Aktif basamak **yarım** sayılır. Beş günlük bir basamağın ilk gününde
 * "5 gün kaldı", son gününde de "5 gün kaldı" demek sayıyı dondurur;
 * kullanıcı ilerlediğini göremez. Basamak içi ilerlemeyi ölçmüyoruz (öğretmen
 * `status`'ü gün gün değiştirmiyor), o yüzden ortalama alınıyor.
 */
export function curriculumProgress(c: Curriculum | null): CurriculumProgress {
  if (!c || c.steps.length === 0) {
    return { done: 0, total: 0, ratio: 0, remainingLessonDays: 0, stepIndex: -1 };
  }

  const done = c.steps.filter((s) => s.status === 'done').length;
  const step = activeStep(c);
  const stepIndex = step ? c.steps.indexOf(step) : c.steps.length;

  /**
   * ⚠️ Yalnızca **açıkça `active`** olan basamak yarım sayılır. Bir ara
   * "ilk bitmemiş basamak" yarım sayılıyordu; o zaman hiç başlanmamış bir
   * müfredat bile ilk basamağın yarısını bitmiş gösteriyordu. Öğretmen
   * basamağı `active` yapana kadar o basamak başlamamıştır.
   */
  let remaining = 0;
  for (const s of c.steps) {
    if (s.status === 'done') continue;
    remaining += s.status === 'active' ? s.days / 2 : s.days;
  }

  return {
    done,
    total: c.steps.length,
    ratio: c.steps.length > 0 ? done / c.steps.length : 0,
    remainingLessonDays: Math.max(0, Math.round(remaining)),
    step,
    stepIndex,
  };
}

/**
 * **Müfredatı puana göre yerleştir.**
 *
 * Kullanıcının kuralı: *"A1 içinde 80 puan A1 ile 20 puan A1 aynı müfredata
 * sahip olmasın."* Seviye bir aralıktır; 80 puanlık A1 merdivenin başında
 * değildir, `to be` çalıştırmak onun zamanını çalar.
 *
 * Bu fonksiyon **ilk yerleştirme** içindir: öğretmen henüz bu kullanıcıyı
 * tanımıyorken, yerleştirme sınavının puanına bakıp merdivende bir yer
 * seçer. Sonrasında karar öğretmenindir — o gerçek performansı görüyor.
 *
 * Ölçü kaba ama dürüst: puan merdivenin yüzdesidir. 0 puan başta, 100 puan
 * sonda. Yerleştirilen basamağın öncekiler `done` sayılır; öğrenci onları
 * bildiği için oraya dönmek gerekmiyor — gerekiyorsa öğretmen geri alır.
 */
export function placeByScore(
  steps: CurriculumStep[],
  levelScore: number | undefined
): CurriculumStep[] {
  const puan = Math.max(0, Math.min(100, levelScore ?? 0));
  /** 80 puan → merdivenin %80'i bitmiş sayılır, ama son basamak asla atlanmaz */
  const bitmis = Math.min(steps.length - 1, Math.floor((puan / 100) * steps.length));

  return steps.map((s, i) => ({
    ...s,
    status: i < bitmis ? 'done' : i === bitmis ? 'active' : 'todo',
  }));
}

/**
 * **Takvim günü tahmini.**
 *
 * `remainingLessonDays` ders günüdür; kullanıcı her gün çalışmıyorsa takvimde
 * daha uzun sürer. Çevirme oranı haftada kaç gün çalıştığı:
 *
 *     takvim günü = ders günü × 7 / (haftalık çalışma günü)
 *
 * Haftada 7 gün çalışan için ikisi eşittir — kullanıcının istediği tam olarak
 * bu: *"o gün sayısı kadar uğraşan A2'ye geçebilmeli."*
 *
 * `weeklyActiveDays` ölçülemiyorsa (yeni kullanıcı) öğretmenin beklentisi
 * kullanılır; o da yoksa 5 gün/hafta varsayılır — kullanıcının kendi tarifi
 * hafta içi + hafta sonu çalışmak.
 */
export function calendarDaysFor(
  remainingLessonDays: number,
  weeklyActiveDays: number | undefined
): number {
  if (remainingLessonDays <= 0) return 0;
  const gun = Math.max(1, Math.min(7, weeklyActiveDays && weeklyActiveDays > 0 ? weeklyActiveDays : 5));
  return Math.ceil((remainingLessonDays * 7) / gun);
}

/** Bir sonraki seviye — müfredat bitince nereye geçilecek */
export function levelAfter(level: string): CEFRLevel | null {
  const i = levelIndex(level);
  return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1] : null;
}
