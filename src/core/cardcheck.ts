/**
 * Kart cevabı denetimi ve aşama merdiveni.
 *
 * Saf TypeScript: ağ, veritabanı ve AI çağrısı YOK. `node` ile doğrudan
 * çalıştırılıp gerçek kelimelerle sınanabilir.
 *
 * ## Üç aşama — kullanıcının tarif ettiği sıra
 *
 * Eski kart ekranı "Bildim / Bilmedim" butonlarından ibaretti; kullanıcı haklı
 * olarak "bu hiçbir şey ölçmüyor, suistimale açık" dedi. Yerine günün
 * kelimeleri üç basamaktan geçiyor:
 *
 *   1. **Tanıma** — İngilizce kelime, dört Türkçe şık. İlk karşılaşmada
 *      doğrudan yazdırmak yıldırır; "belki aklına gelmez" durumunun karşılığı.
 *   2. **Yazma, karışık yön** — Bazen Türkçe verilip İngilizcesi, bazen
 *      İngilizce verilip Türkçesi yazdırılır. Yön karışık olmalı: tek yöne
 *      alışan kişi kelimeyi değil, sıralamayı ezberler.
 *   3. **Telaffuz** — Önce öğretmen (cihaz sesi) kelimeyi okur, sonra öğrenci
 *      mikrofona tekrar eder, tanınan ses kelimeyle karşılaştırılır.
 *
 * Kart doğru cevaplandıkça bir üst basamağa çıkar, yanlışta bir alta iner.
 * Aralıklı tekrar (SM-2) kartın **ne zaman** çıkacağını belirler; aşama ise
 * **nasıl sorulacağını**. İkisi birbirine karışmaz.
 *
 * Aşama 3'ü geçen kelimeler "bugün öğrenildi" sayılır ve bu bilgi öğretmene
 * gider; günün kelimelerinin oturup oturmadığına o karar verir.
 */

export type CardStage = 1 | 2 | 3;

export const STAGE_LABELS: Record<CardStage, string> = {
  1: 'Tanıma',
  2: 'Yazma',
  3: 'Telaffuz',
};

export const STAGE_HINTS: Record<CardStage, string> = {
  1: 'Anlamını şıklardan seç',
  2: 'Karşılığını yaz',
  3: 'Dinle ve tekrar et',
};

/** 2. aşamada sorunun hangi yönde sorulduğu */
export type WriteDirection = 'tr-to-en' | 'en-to-tr';

/** Cevabın karşılaştırma için sadeleştirilmiş hâli. */
export function normalizeAnswer(raw: string): string {
  return raw
    .toLocaleLowerCase('tr')
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?;:"()]/g, ' ')
    // Fiillerde "to " ve isimlerde "a/an/the " yazmak yanlış sayılmamalı
    .replace(/^(to|a|an|the)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** İki metin arasındaki düzenleme mesafesi (Levenshtein). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * Yazım hatası toleransı.
 *
 * Kullanıcı "küçük yazım hataları tolere edilmeli" dedi ve haklı: amaç
 * kelimeyi üretebilmek, daktilo doğruluğu değil. Ama tolerans uzunlukla
 * orantılı olmalı — kısa kelimede tek harf değişince bambaşka kelime olur
 * (cat/cut), uzun kelimede olmaz (necessary/neccessary).
 */
function tolerance(length: number): number {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  return 2;
}

export type AnswerVerdict = 'correct' | 'close' | 'wrong';

export interface CheckableCard {
  word: string;
  meaning: string;
  /** Öğretmenin belirttiği, aynı derecede doğru sayılan diğer cevaplar */
  accepted?: string[];
}

/**
 * Bir metnin kabul edilebilir karşılıklardan birine uyup uymadığı.
 * `close` = doğru cevap ama yazımında ufak hata.
 */
function matchAgainst(input: string, targets: string[]): AnswerVerdict {
  const given = normalizeAnswer(input);
  if (!given) return 'wrong';

  const normalized = targets.map(normalizeAnswer).filter(Boolean);
  if (normalized.includes(given)) return 'correct';

  for (const target of normalized) {
    if (editDistance(given, target) <= tolerance(target.length)) return 'close';
  }
  return 'wrong';
}

/**
 * Türkçe karşılıklar genelde birden çok seçenek içerir: "değer, buna değmek".
 * Kullanıcının bunlardan **birini** yazması yeterlidir; hepsini yazmasını
 * beklemek anlamsız olurdu.
 */
function meaningVariants(card: CheckableCard): string[] {
  return [card.meaning, ...(card.accepted ?? [])]
    .flatMap((text) => text.split(/[,;/]|\bveya\b/))
    .map((part) => part.replace(/\([^)]*\)/g, '').trim())
    .filter(Boolean);
}

function wordVariants(card: CheckableCard): string[] {
  return [card.word, ...(card.accepted ?? [])].map((w) => w.trim()).filter(Boolean);
}

/** 2. aşama denetimi — soru yönüne göre doğru hedef kümesi seçilir. */
export function checkWritten(
  input: string,
  card: CheckableCard,
  direction: WriteDirection
): AnswerVerdict {
  return direction === 'tr-to-en'
    ? matchAgainst(input, wordVariants(card))
    : matchAgainst(input, meaningVariants(card));
}

/**
 * 3. aşama denetimi — mikrofondan gelen metin.
 *
 * Konuşma tanıma gürültülüdür: kullanıcı tek kelime söylese bile motor cümle
 * döndürebiliyor ("notice" → "no tice", "the notice"). Bu yüzden hem tam
 * eşleşmeye hem de **metnin içinde geçmesine** bakılıyor ve tolerans bir tık
 * geniş tutuluyor. Amaç telaffuzu ölçmek, tanıma motorunu sınamak değil.
 */
export function checkSpoken(transcript: string, card: CheckableCard): AnswerVerdict {
  const heard = normalizeAnswer(transcript);
  if (!heard) return 'wrong';

  const targets = wordVariants(card).map(normalizeAnswer).filter(Boolean);

  for (const target of targets) {
    if (heard === target) return 'correct';
    // Kelime, tanınan cümlenin içinde geçiyorsa doğru say
    if (new RegExp(`(^|\\s)${escapeRegExp(target)}($|\\s)`).test(heard)) return 'correct';
  }
  for (const target of targets) {
    if (editDistance(heard, target) <= tolerance(target.length) + 1) return 'close';
  }
  return 'wrong';
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Doğru cevaplandığında kartın çıkacağı aşama; yanlışta ineceği aşama.
 * `close` (ufak hata) aşamayı ilerletmez — kelime henüz tam oturmamıştır.
 */
export function nextStage(current: CardStage, verdict: AnswerVerdict): CardStage {
  if (verdict === 'correct') return Math.min(3, current + 1) as CardStage;
  if (verdict === 'close') return current;
  return Math.max(1, current - 1) as CardStage;
}

/**
 * 1. aşamanın şıkları: doğru anlam + havuzdan üç çeldirici.
 *
 * Çeldiriciler mümkün olduğunca **aynı günün kelimelerinden** seçilir; gün tek
 * tema üzerine kurulduğu için bu, ayırt etmeyi gerçekten zorlaştırır ve
 * öğretir. Havuz yetmezse diğer kartlardan tamamlanır.
 */
export function buildOptions(
  correct: string,
  pool: string[],
  count = 4,
  /** Test edilebilirlik için karıştırıcı dışarıdan verilebilir */
  shuffle: <T>(items: T[]) => T[] = defaultShuffle
): string[] {
  const seen = new Set([correct.trim().toLowerCase()]);
  const distractors: string[] = [];

  for (const candidate of shuffle(pool)) {
    const key = candidate.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    distractors.push(candidate);
    if (distractors.length >= count - 1) break;
  }

  return shuffle([correct, ...distractors]);
}

function defaultShuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 2. aşamada soru yönü.
 *
 * Kart her çıkışında yön değişsin diye tekrar sayısına bağlandı; rastgele
 * olsaydı üst üste aynı yön gelebilirdi. Kullanıcı ikisinin de karışık
 * gelmesini istedi.
 */
export function directionFor(repetitions: number): WriteDirection {
  return repetitions % 2 === 0 ? 'tr-to-en' : 'en-to-tr';
}
