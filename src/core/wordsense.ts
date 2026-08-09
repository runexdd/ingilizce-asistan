/**
 * Anlam seçme mantığı — saf TypeScript, ağ ve depolama yok.
 *
 * `dictionary.ts` internetten adayları toplar; hangisinin doğru olduğuna
 * karar veren kısım burada. Ayrı durmasının sebebi **test edilebilmesi**:
 * bu dosya React Native'e bağlı olmadığı için doğrudan `node` ile çalıştırılıp
 * gerçek kelimelerle sınanabiliyor.
 */

import { IRREGULAR_FORMS } from './irregular';

/** Sözlükten dönen tek bir Türkçe karşılık adayı */
export interface Candidate {
  term: string;
  /** Türkçeleştirilmiş sözcük türü: isim, fiil, sıfat… */
  pos?: string;
  /** Sözlük hâlinden mi geldi (saw → see) */
  fromLemma?: boolean;
}

/**
 * Kelimenin sözlük hâli. Önce düzensiz fiil tablosu, sonra ek kuralları.
 * Bulamazsa `undefined` — o zaman kelime zaten sözlük hâlindedir.
 */
export function baseFormOf(word: string): string | undefined {
  const irregular = IRREGULAR_FORMS[word];
  if (irregular) return irregular;

  const rules: Array<[RegExp, (w: string) => string]> = [
    [/ies$/, (w) => w.slice(0, -3) + 'y'],
    [/(ches|shes|sses|xes|zes|oes)$/, (w) => w.slice(0, -2)],
    [/ied$/, (w) => w.slice(0, -3) + 'y'],
    [/([bdgklmnprt])\1ed$/, (w) => w.slice(0, -3)],
    [/([bdgklmnprt])\1ing$/, (w) => w.slice(0, -4)],
    [/ing$/, (w) => w.slice(0, -3)],
    [/ed$/, (w) => w.slice(0, -2)],
    [/s$/, (w) => (/ss$/.test(w) ? w : w.slice(0, -1))],
  ];

  for (const [pattern, apply] of rules) {
    if (!pattern.test(word)) continue;
    const base = apply(word);
    if (base.length >= 2 && base !== word) return base;
  }
  return undefined;
}

/** "taking" → "take", "hoped" → "hope" için ikinci bir aday. */
export function altBaseForm(word: string): string | undefined {
  if (/ing$/.test(word)) return word.slice(0, -3) + 'e';
  if (/ed$/.test(word) && !/ied$/.test(word)) return word.slice(0, -1);
  return undefined;
}

/**
 * Türkçe karşılığın kökü.
 *
 * Türkçe sondan eklemeli olduğu için sözlükteki "görmek", cümlede "gördüm"
 * hâlinde geçer. Mastar ekini atıp kalan parçayı arıyoruz. Ünsüz yumuşaması
 * da denenir ("gitmek" → git → gid, çünkü cümlede "gidiyor" yazar).
 *
 * 3 harften kısa kökler rastgele eşleştiği için eleniyor.
 */
export function stemsOf(term: string): string[] {
  let stem = term.toLowerCase().split(/[ ,(/]/)[0];
  stem = stem.replace(/(mek|mak)$/, '');
  stem = stem.replace(/(miş|mış|muş|müş)$/, '');

  const out = [stem];

  // Ünsüz yumuşaması: gitmek → git, ama cümlede "gidiyor" yazar
  const softened: Record<string, string> = { t: 'd', k: 'ğ', p: 'b', ç: 'c' };
  const last = stem.slice(-1);
  if (softened[last]) out.push(stem.slice(0, -1) + softened[last]);

  // Ünlü düşmesi: izlemek → izle, ama cümlede "izliyorum" yazar (sondaki
  // ünlü düşer). Bu olmadan "watch" için "izlemek" eşleşmiyordu.
  if (/[aeıioöuü]$/.test(stem)) out.push(stem.slice(0, -1));

  return out.filter((s) => s.length >= 3);
}

/**
 * Adaylardan cümlenin çevirisinde geçeni seçer — bu dosyanın kalbi.
 * En uzun kök eşleşmesi kazanır; kısa kökler tesadüfen tutabiliyor.
 */
export function pickByContext(
  cands: Candidate[],
  sentenceTr: string | null | undefined
): Candidate | null {
  if (!sentenceTr) return null;
  const hay = sentenceTr.toLowerCase();

  let best: { cand: Candidate; length: number } | null = null;
  for (const cand of cands) {
    for (const stem of stemsOf(cand.term)) {
      if (!hay.includes(stem)) continue;
      if (!best || stem.length > best.length) best = { cand, length: stem.length };
    }
  }
  return best?.cand ?? null;
}

/**
 * Bağlam tutmazsa varsayılan anlam.
 *
 * Kelime çekimliyse (saw, kept, running) metinde neredeyse her zaman fiildir;
 * o yüzden **fiil** karşılığı öne alınır: "tutulmuş" yerine "tutmak".
 *
 * ⚠️ Burada "sözlük hâlinden gelen ilk aday"a düşmek yanlış. "kept" için
 * fiil karşılıkları zaten yazılan hâlden gelip tekilleştirmede silinince,
 * sözlük hâlinden geriye sadece *kale* (keep = hisar) kalıyordu. Fiil
 * araması kaynağa bakmamalı.
 */
export function pickDefault(cands: Candidate[], hasLemma: boolean): Candidate | null {
  if (hasLemma) {
    const verb = cands.find((c) => c.pos === 'fiil');
    if (verb) return verb;
  }
  return cands[0] ?? null;
}

/** Google bazen karşılığı büyük harfle döndürüyor ("Görmek"). */
export function matchCase(term: string, source: string): string {
  if (!term) return term;
  const sourceIsLower = source[0] === source[0]?.toLowerCase();
  if (!sourceIsLower) return term;
  const first = term[0];
  if (first !== first.toUpperCase()) return term;
  // Türkçe: I → ı, İ → i
  const lowered = first === 'I' ? 'ı' : first === 'İ' ? 'i' : first.toLowerCase();
  return lowered + term.slice(1);
}

export function dedupe(cands: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of cands) {
    const key = c.term.toLowerCase();
    if (!c.term || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/**
 * Seviyeye göre en fazla kaç kelimelik örnek gösterilir.
 *
 * Sözlüklerin hazır örnekleri çoğu zaman edebî ve uzun oluyor; A2 seviyesinde
 * birine 25 kelimelik cümle göstermek öğretmez, yıldırır. Öğretmenin kendi
 * yazdığı örnekler zaten seviyeye göre üretiliyor (bkz. `ogretmen.md`); bu
 * süzgeç sadece internetten gelen yedekler için.
 */
export const MAX_EXAMPLE_WORDS: Record<string, number> = {
  A1: 8,
  A2: 10,
  B1: 14,
  B2: 18,
  C1: 25,
  C2: 25,
};

export function filterExamples(
  examples: string[] | undefined,
  word: string,
  lemma: string | undefined,
  level: string | undefined
): string[] | undefined {
  if (!examples?.length) return undefined;
  const limit = MAX_EXAMPLE_WORDS[(level ?? 'B1').toUpperCase()] ?? 14;
  const stems = [word, lemma]
    .filter((w): w is string => !!w)
    .map((w) => w.slice(0, 4).toLowerCase());

  const kept = examples.filter((ex) => {
    const words = ex.trim().split(/\s+/);
    if (words.length > limit) return false;
    if (/[;:]|\.\.\./.test(ex)) return false;
    // Örnek gerçekten bu kelimeyi içermeli — başka kelimenin örneği sızmasın
    const lower = ex.toLowerCase();
    return stems.some((s) => lower.includes(s));
  });

  return kept.length > 0 ? kept.slice(0, 3) : undefined;
}

/** Panelde gösterilecek "diğer anlamlar" listesi. */
export function otherMeaningsOf(
  cands: Candidate[],
  chosen: string | null
): string[] | undefined {
  const others = cands
    .map((c) => (c.pos ? `${c.term} (${c.pos})` : c.term))
    .filter((label) => label.split(' (')[0].toLowerCase() !== chosen?.toLowerCase())
    .slice(0, 5);
  return others.length ? others : undefined;
}
