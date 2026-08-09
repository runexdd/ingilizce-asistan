import { addDays, toISODate } from '../core/srs';
import { isTooHardFor } from '../core/wordbank';
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

  const fresh = untouched
    .sort((a, b) => Number(isTodays(b)) - Number(isTodays(a)))
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
  const stale = isContentStale(data);

  return data.cards.filter((c) => {
    if (c.introducedAt !== iso) return false;
    if (!stale || !changed) return true;
    return (c.lastAnsweredAt ?? c.introducedAt) >= changed;
  }).length;
}

export function isContentStale(data: AppData): boolean {
  const changed = data.profile.levelChangedAt;
  if (!changed) return false;
  if (!data.lastInboxAt) return true;
  return changed > data.lastInboxAt;
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
