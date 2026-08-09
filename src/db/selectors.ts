import { buildLocalConversation, pickLocalContent } from '../core/localcontent';
import { addDays, toISODate } from '../core/srs';
import { isTooHardFor, levelDistance } from '../core/wordbank';
import type {
  AppData,
  Card,
  ContentSuggestion,
  ConversationPlan,
  ErrorCategory,
} from './types';

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

/**
 * Bugünün çalışma sırası.
 *
 * İki ürün kuralını birden uygular:
 *
 * 1. **Gün tek tema, tek kelime seti.** Okuma, yazma ve konuşma neyi
 *    dövüyorsa kartlar da onu dövsün diye günün ders kelimeleri listenin
 *    başına alınır. Araya alakasız eski kelimeler girerse günün konusu
 *    dağılır.
 * 2. **Yeni kelime sayısına öğretmen karar verir.** Bir günde tanıştırılacak
 *    *yeni* kelime `dailyNewWords` ile sınırlanır; hiç görülmemiş kartların
 *    fazlası bugün gösterilmez, yarına kalır. Eski kartların tekrarı bu
 *    sınıra dahil değildir — onlar zaten öğrenilmeye başlanmış kelimeler.
 */
export function getStudyQueue(
  data: AppData,
  dailyNewWords: number,
  today: Date = new Date()
): Card[] {
  const todayISO = toISODate(today);
  const lessonWords = new Set(
    data.lesson?.date === todayISO
      ? data.lesson.targetWords.map((w) => w.word.trim().toLowerCase())
      : []
  );

  const isTodays = (card: Card) => lessonWords.has(card.word.trim().toLowerCase());

  /**
   * Seviyenin iki band üstündeki kelimeler kuyruğa **hiç girmez.**
   *
   * ⚠️ Bu süzgeç en başta, `due` üzerinde uygulanmalı. Önce sadece *yeni*
   * kartlar süzülüyordu ve hata devam etti: kullanıcının destesindeki B2
   * kalıpları çoktan bir kez cevaplanmıştı, yani "yeni" değil "tekrar"
   * sayılıyorlardı — tekrarlar ise süzgeci hiç görmüyordu. Kullanıcı
   * güncellemeden sonra bile *"to be worth it"* görmeye devam etti.
   *
   * Kart silinmiyor: seviye yükselince kendiliğinden geri gelir.
   *
   * ⚠️ **Öğretmenin bugünkü hedef kelimeleri de bu süzgece tabidir.** Önce
   * "öğretmen bilerek koymuştur, son söz onundur" diye muaf tutulmuşlardı ve
   * hata üçüncü kez aynı yerden çıktı: gist'teki bugüne ait ders `to notice,
   * on time, to end up, exhausted, to be worth it` hedefliyordu — beşi de B2,
   * profil A2. Kullanıcı üst üste *"a2 biri bunu bilemez"* dedi.
   *
   * Öğretmenin yetkisi **hangi** kelimeyi seçtiğidir, seviyeyi çiğnemek değil;
   * seviye kullanıcının kendi ayarıdır. Öğretmen öğrencinin hazır olduğunu
   * düşünüyorsa yapması gereken şey `levelSuggestion` ile seviyeyi yükseltmek.
   * Kural zaten `ogretmen.md`'de yazılı; doğru seçtiğinde hiçbir şey elenmez.
   */
  const due = getDueCards(data, today).filter(
    (c) => !isTooHardFor(c.word, data.profile.level)
  );

  /**
   * Kota **bugün tanıştırılan** kelimeler üzerinden sayılır.
   *
   * ⚠️ Buraya "henüz cevaplanmamış kart" diye bakmak hatalıydı: kart ilk
   * cevapta yeni olmaktan çıkıyor, kota da boşalan yere bir kelime daha
   * çekiyordu. Yanlış cevaplayan biri hiç ilerleyemiyor, buna karşılık kuyruk
   * her cevapta uzuyordu — 5 kelimelik gün 17 karta çıkmıştı.
   */
  const introducedToday = due.filter((c) => c.introducedAt === todayISO);
  const untouched = due.filter((c) => !c.introducedAt);

  /**
   * Kota **bütün kartlar** üzerinden sayılır, sadece bugün sırada bekleyenler
   * üzerinden değil. Bir kelime üç basamağı bitirip kuyruktan çıkınca yerine
   * yenisi çekilmemeli: günün bütçesi doldu demektir. Aksi hâlde beş kelime
   * bitirilir bitirilmez yeni beş kelime geliyordu.
   */
  const quota = Math.max(0, dailyNewWords - countIntroducedToday(data, today));

  /**
   * Kotaya girecek yeni kartlar seçilirken **seviye yakınlığı** de sayılır.
   *
   * ⚠️ Eskiden yalnızca "bugünün ders kelimesi mi" bakılıyordu. Kart eklerken
   * yeni kelimeler dizinin sonuna gittiği için, destede bekleyen eski
   * (seviyenin çok altındaki) kartlar kotayı önce doldurup yeni seviyenin
   * kelimelerini dışarıda bırakıyordu — kullanıcı seviyeyi yükseltiyor ama
   * ekranda hep aynı eski kelimeleri görüyordu.
   *
   * Sıra: önce günün ders kelimeleri, sonra seviyeye en yakın olanlar.
   */
  const fresh = untouched
    .sort(
      (a, b) =>
        Number(isTodays(b)) - Number(isTodays(a)) ||
        levelDistance(a.word, data.profile.level) -
          levelDistance(b.word, data.profile.level)
    )
    .slice(0, quota);

  // Önceki günlerden gelen, tekrarı bugüne düşmüş kartlar
  const reviews = due.filter((c) => c.introducedAt && c.introducedAt !== todayISO);

  const selected = [
    ...introducedToday,
    ...fresh.filter(isTodays),
    ...fresh.filter((c) => !isTodays(c)),
    ...reviews,
  ];

  /**
   * Basamağa göre sırala: bütün kelimeler önce 1. aşamadan (tanıma) geçer,
   * sonra hepsi 2'ye (yazma), sonra 3'e (telaffuz). Kullanıcının istediği akış
   * bu: *"o 5 kelime için ilk olarak seçenek kısmı gelmeli, sonra 2. aşama,
   * son aşama telaffuz."*
   *
   * Aynı basamakta olanlar arasında en uzun süredir cevaplanmayan öne gelir;
   * böylece aynı kart üst üste çıkmaz, beşi sırayla döner.
   */
  return selected.sort((a, b) => {
    const stageDiff = (a.stage ?? 1) - (b.stage ?? 1);
    if (stageDiff !== 0) return stageDiff;
    return (a.lastAnsweredAt ?? '').localeCompare(b.lastAnsweredAt ?? '');
  });
}

/**
 * Bugünün ders kelimelerinin durumu — öğretmene giden rapor.
 * Öğretmen buna bakıp "bugünün kelimeleri oturdu mu" kararını verir.
 */
export interface WordProgress {
  word: string;
  /** 1 tanıma · 2 yazma · 3 telaffuz */
  stage: number;
  /** Telaffuz aşamasını geçti mi */
  spoken: boolean;
  lastResult?: 'correct' | 'close' | 'wrong';
  /** Bugün hiç çalışıldı mı */
  studiedToday: boolean;
}

export function getTodayWordProgress(
  data: AppData,
  today: Date = new Date()
): WordProgress[] {
  const iso = toISODate(today);
  if (!data.lesson || data.lesson.date !== iso) return [];

  return data.lesson.targetWords.map((target) => {
    const key = target.word.trim().toLowerCase();
    const card = data.cards.find((c) => c.word.trim().toLowerCase() === key);
    return {
      word: target.word,
      stage: card?.stage ?? 1,
      spoken: !!card?.spokenOkAt,
      lastResult: card?.lastResult,
      studiedToday: card?.lastReviewedAt === iso,
    };
  });
}

/**
 * Bugün çalışılacak kart sayısı.
 *
 * Kuyrukla **aynı süzgeci** kullanır: seviyesinin çok üstündeki kelimeler
 * kuyruğa girmiyorsa burada da sayılmamalı. Aksi hâlde ana ekran "12 kartın
 * tekrarı geldi" derken kart ekranı "5 kart kaldı" diyor ve kullanıcı hangi
 * sayının doğru olduğunu bilemiyor.
 */
/**
 * Öğretmenden gelen ders/içerik/sohbet, elimizdeki seviyeye göre **eski mi**?
 *
 * Kullanıcı seviyesini A2'den B1'e çektiğinde ekranda hâlâ A2 için seçilmiş
 * dizi bölümü ("The Flash 1. bölüm") duruyordu — içerik öğretmenden gelen eski
 * pakette yazdığı için. Uygulama yeni içerik **üretemez** (onu öğretmen
 * üretir), ama eskidiğini **söyleyebilir**; sessizce yanlış şeyi göstermek
 * dinamik olmayan bir sistem hissi veriyor.
 *
 * ⚠️ Bu fonksiyon `mutations.ts` yerine burada duruyor: `github.ts` bunu
 * kullanıyor ve `mutations.ts` de `github.ts`'ten tip alıyor — orada dursaydı
 * çalışma anında döngüsel bağımlılık olurdu.
 */
/**
 * Bugünün **yeni kelime bütçesinden** kaç tanesi harcanmış.
 *
 * ⚠️ `getStudyQueue` ve `seedDailyWords` bunu **ortak** kullanmalı. Üçüncü kez
 * aynı tuzağa düşüldü: tohumlama seviye değişimini hesaba katıp yeni kelimeleri
 * ekliyordu, kuyruk ise katmıyordu — bugün 13 kelime çalışmış biri B1'e
 * geçtiğinde kelimeler destede beliriyor ama kotayı eski seviyenin sayısı
 * doldurduğu için ekranda hiç görünmüyorlardı.
 *
 * Seviye değişiminden **önce** çalışılan kartlar yeni seviyenin bütçesini
 * yemez: elle seviye değiştirmek "bana verilen yanlıştı" demektir, gün
 * baştan başlar.
 */
export function countIntroducedToday(
  data: AppData,
  today: Date = new Date()
): number {
  const iso = toISODate(today);
  const changed = data.profile.levelChangedAt;
  // ⚠️ Kota **seviyeye** bağlı; zevk değişimi günün kelimelerini sıfırlamamalı
  const stale = isLevelStale(data);

  return data.cards.filter((c) => {
    if (c.introducedAt !== iso) return false;
    if (!stale || !changed) return true;
    return (c.lastAnsweredAt ?? c.introducedAt) >= changed;
  }).length;
}

function staleSince(data: AppData, changed: string | undefined): boolean {
  if (!changed) return false;
  if (!data.lastInboxAt) return true;
  return changed > data.lastInboxAt;
}

/**
 * **Seviye** son paketten sonra mı değişti?
 *
 * ⚠️ Bu, kelime/kart tarafının kullandığı ölçüdür ve **yalnızca seviyeye**
 * bakar. `seedDailyWords` bu bayrağı görünce o güne ait tohumlanmış kartları
 * siliyor ve günün kotasını sıfırlıyor; `github.ts` bunu `levelJustChanged`
 * diye öğretmene gönderiyor. Buraya zevk değişimini karıştırmak, kullanıcı
 * hobisine dokunduğu anda o günün kelime kartlarını sildirirdi — istenen şey
 * bu değil.
 */
export function isLevelStale(data: AppData): boolean {
  return staleSince(data, data.profile.levelChangedAt);
}

/**
 * **İçerik ve sohbet** eskidi mi — seviye *veya* zevk değiştiyse evet.
 *
 * Kullanıcının şikâyeti: *"spordayken bana maç anlatmamı istiyor, hobimi
 * seyahat yaptığımda hâlâ maç anlatmamı istiyor."* Zevk değişince
 * `levelChangedAt` değişmiyor, paket "taze" sayılıyor ve öğretmenin spor
 * temalı eski paketi kazanmaya devam ediyordu.
 *
 * En son hangisi değiştiyse o geçerli.
 */
export function isContentStale(data: AppData): boolean {
  const changed = [data.profile.levelChangedAt, data.profile.tastes?.updatedAt]
    .filter((s): s is string => Boolean(s))
    .sort()
    .at(-1);
  return staleSince(data, changed);
}

/* ------------------------------------------- öğretmen mi, uygulama mı? */

export interface ActiveContent {
  items: ContentSuggestion[];
  /** Öğretmenden mi geldi, uygulama mı seçti */
  source: 'teacher' | 'app';
}

/**
 * Ekranda gösterilecek içerik önerileri.
 *
 * Kural: **öğretmenin paketi kazanır — eskimediği sürece.** Seviye son
 * paketten sonra değiştiyse ya da öğretmen hiç konuşmadıysa uygulama kendi
 * kataloğundan seviyeye ve zevke uyan bir şey koyuyor.
 *
 * Kullanıcının şikâyeti buydu: *"A2'den B1'e çektim, hemen o öğretmen sayfası
 * değişecek… yoksa her seçtiğimde bilgisayara gir öğretmen çalıştır, çok uzun
 * sürer."* Uygulama öğretmen kadar iyi seçemez ama **anında** seçebilir; ekran
 * kaynağı yazdığı için kimse yanılmıyor.
 */
export function getActiveContent(
  data: AppData,
  today: Date = new Date()
): ActiveContent {
  const iso = toISODate(today);
  /**
   * ⚠️ **Bugün bitirilenler havuzdan elenmez.**
   *
   * Eleme kuralı "aynı bölümü iki kez verme" içindi ama bugünkü kaydı da
   * eleyince şu oluyordu: kullanıcı "Bitirdim" der → kayıt düşer → içerik
   * havuzdan atılır → **öğe ekrandan kaybolur** ve tik hiç görünmez. Emeğin
   * karşılığını görmeden kaybolan bir düğme, çalışmayan düğmeden farksız.
   *
   * Bugünküler listede kalıp tik alıyor; yarın havuzdan eleniyorlar.
   */
  const doneTitles = (data.contentDone ?? [])
    .filter((d) => d.date !== iso)
    .map((d) => d.title);
  const stale = isContentStale(data);

  /**
   * Tamamlanma işareti **kalıcı günlükten** okunuyor.
   *
   * Uygulamanın seçtiği içerik `data.content` içinde olmadığı için `done`
   * alanı hiç dolmuyordu; kullanıcı "bitirdim" dese de ertesi gün aynı şey
   * çıkıyordu. Artık iki kaynak da aynı günlüğe bakıyor.
   */
  const withDone = (items: ContentSuggestion[]): ContentSuggestion[] =>
    items.map((c) => {
      const record = (data.contentDone ?? []).find((d) => d.title === c.title);
      return record ? { ...c, done: true, doneAt: record.date } : c;
    });

  if (!stale && data.content.length > 0) {
    return { items: withDone(data.content), source: 'teacher' };
  }
  return {
    items: withDone(
      pickLocalContent(data.profile.level, data.profile.tastes, iso, doneTitles)
    ),
    source: 'app',
  };
}

export interface ActiveConversation {
  plan: ConversationPlan;
  source: 'teacher' | 'app';
}

/**
 * Bugünün sohbeti. Öğretmenin bugüne yazdığı senaryo varsa o; yoksa (ya da
 * seviye değiştiyse) uygulama içeriğin üstüne bir sohbet kuruyor.
 *
 * Sohbetsiz gün olmasın diye: kullanıcı *"her gün böyle bir konuşma
 * yapılsın"* dedi ve öğretmenin çalışmadığı bir gün bunu bozmamalı.
 */
export function getActiveConversation(
  data: AppData,
  today: Date = new Date()
): ActiveConversation {
  const iso = toISODate(today);
  const stale = isContentStale(data);

  if (!stale && data.conversationPlan?.date === iso) {
    return { plan: data.conversationPlan, source: 'teacher' };
  }

  const content = getActiveContent(data, today).items[0];
  return {
    plan: buildLocalConversation(content, data.profile.level, data.plan?.sizing, iso),
    source: 'app',
  };
}

export function getDueCardCount(data: AppData, today: Date = new Date()): number {
  const iso = toISODate(today);
  const lessonWords = new Set(
    data.lesson?.date === iso
      ? data.lesson.targetWords.map((w) => w.word.trim().toLowerCase())
      : []
  );

  return data.cards.reduce((n, c) => {
    if (c.dueDate > iso) return n;
    const isTodays = lessonWords.has(c.word.trim().toLowerCase());
    if (!isTodays && isTooHardFor(c.word, data.profile.level)) return n;
    return n + 1;
  }, 0);
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
