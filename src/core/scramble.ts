/**
 * Yazma aşamasının desteği: karışık harfler ve kademeli ipucu.
 *
 * Kullanıcının isteği: *"türkçe verip ingilizcesini yazarken veya tam tersini
 * yaparken kelimenin doğru hâlini karışık şekilde ver — örnek 'meşale' dedin,
 * karşılığı 'torch', sen 'hortc' olarak vereceksin. Yanlış yaptıkça ilk harf,
 * ikinci harf ve ipucu gelip destek verecek."*
 *
 * Amaç boş sayfa korkusunu kaldırmak. Kelimeyi hiç hatırlamayan biri boş
 * kutuya bakıp pes ediyordu; harfleri görünce hatırlama işi tanımaya dönüşüyor
 * ve deneme yapılabiliyor. Yanlışta ceza değil destek verme ilkesi kartların
 * 1. aşamasında da geçerli — bu onun yazma aşamasındaki karşılığı.
 *
 * Saf TypeScript, `node --experimental-strip-types` ile test edilebilir.
 */

/** Kaç kez yanlış yapıldığında ne kadar destek açılacağı */
export const MAX_ATTEMPTS = 4;

export interface WriteSupport {
  /** Harfleri karışık hâli — "h o r t c" */
  scrambled: string | null;
  /** Baştan açılan harfler — "t o _ _ _" */
  revealed: string | null;
  /** Son çare: örnek cümlede kelimenin yeri boş bırakılmış hâli */
  hint: string | null;
  /** Bundan sonra bir deneme hakkı daha var mı */
  canRetry: boolean;
  /** Destek alındı mı — alındıysa cevap tam puan saymaz */
  helped: boolean;
}

/**
 * Cevabın karıştırılacak çekirdeği.
 *
 * Türkçe karşılıklar çoğu zaman "değer, değmek" gibi birden fazla seçenek
 * içeriyor; hepsini birden karıştırmak anlamsız olurdu. İlk seçenek alınır —
 * `checkWritten` diğerlerini yine kabul ediyor, bu sadece göstermelik destek.
 */
export function coreAnswer(answer: string): string {
  return (answer.split(/[,;/]/)[0] ?? answer).trim();
}

/** Deterministik karıştırma — aynı kelime aynı gün aynı biçimde karışsın. */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWord(word: string, random: () => number): string {
  const letters = [...word];
  if (letters.length < 2) return word;

  // Aynı harflerden oluşan kelime (örn. "aaa") hiçbir zaman farklı olamaz
  const distinct = new Set(letters).size;
  if (distinct < 2) return word;

  for (let attempt = 0; attempt < 12; attempt++) {
    const out = [...letters];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    const joined = out.join('');
    if (joined !== word) return joined;
  }

  // Karışmadıysa elle bir takas yap — "karışık" dediğimiz şey aynısı olmasın
  const swapped = [...letters];
  const at = swapped.findIndex((c, i) => i > 0 && c !== swapped[0]);
  if (at > 0) [swapped[0], swapped[at]] = [swapped[at], swapped[0]];
  return swapped.join('');
}

/**
 * Harfleri karışık hâli. Uygun değilse `null`.
 *
 * Uzun ya da ikiden fazla kelimeli cevaplarda karıştırma yardım etmiyor,
 * bulmacaya dönüyor: "look forward to" karışınca 13 harflik bir yapboz olur ve
 * kelimeyi bilen biri bile çözemez. O durumda destek olarak harf açma ve ipucu
 * kalır — ikisi de uzun kalıplarda çalışıyor.
 */
export function scrambleAnswer(answer: string, seed = ''): string | null {
  const core = coreAnswer(answer);
  const words = core.split(/\s+/).filter(Boolean);
  if (core.length < 3 || core.length > 14 || words.length > 2) return null;

  const random = seeded(`${core}|${seed}`);
  const scrambled = words.map((w) => shuffleWord(w, random));
  if (scrambled.join(' ') === core) return null;

  // Harfleri aralıklı göster: "hortc" değil "h o r t c" — göz tek tek seçsin
  return scrambled.map((w) => [...w].join(' ')).join('   ');
}

/**
 * Baştan `count` harfi açılmış maske: "t o _ _ _".
 * Boşluk ve tire olduğu gibi durur, harf sayılmaz.
 */
export function revealPrefix(answer: string, count: number): string {
  const core = coreAnswer(answer);
  let shown = 0;

  return core
    .split(/\s+/)
    .map((word) =>
      [...word]
        .map((ch) => {
          if (!/[\p{L}\p{N}]/u.test(ch)) return ch;
          return shown++ < count ? ch : '_';
        })
        .join(' ')
    )
    .join('   ');
}

/**
 * Örnek cümlede kelimenin yerini boş bırakır — anlamı bağlamdan hatırlatır.
 * Kelime cümlede geçmiyorsa (çekimli hâli varsa) `null` döner.
 */
export function blankOutExample(example: string, word: string): string | null {
  const core = coreAnswer(word).trim();
  if (!core || !example) return null;

  const escaped = core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escaped}\\w*`, 'iu');
  if (!pattern.test(example)) return null;

  return example.replace(pattern, '_____');
}

/**
 * Deneme sayısına göre açılacak destek.
 *
 * 0 yanlış → sadece karışık harfler
 * 1 yanlış → ilk harf açılır
 * 2 yanlış → ilk iki harf açılır
 * 3 yanlış → ipucu cümlesi (örnek cümle, kelime boş bırakılmış)
 * 4 yanlış → hak biter, doğru cevap gösterilir
 */
export function supportFor(
  answer: string,
  attempts: number,
  options: { example?: string | null; seed?: string } = {}
): WriteSupport {
  const scrambled = scrambleAnswer(answer, options.seed ?? '');

  /**
   * Harf açma, karıştırma yapılamayan cevaplarda da çalışmalı: uzun kalıpta
   * ("look forward to") karışık harf yardım etmez ama ilk harfler eder.
   */
  const revealCount = Math.min(attempts, 2);
  const revealed = attempts >= 1 ? revealPrefix(answer, revealCount) : null;

  const hint =
    attempts >= 3 && options.example
      ? blankOutExample(options.example, answer)
      : null;

  return {
    scrambled,
    revealed,
    hint,
    canRetry: attempts < MAX_ATTEMPTS,
    helped: attempts > 0,
  };
}
