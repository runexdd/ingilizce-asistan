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

/**
 * Aynı karşılığı bir kez tutar.
 *
 * ⚠️ Tekrarı **silmeden önce sözcük türünü devralır.** Google kelimenin düz
 * çevirisini türsüz veriyor ("feel" → *hissetmek*), aynı karşılık sözlük
 * bloğunda türüyle birlikte tekrar geliyor (fiil: hissetmek). Körlemesine
 * silince türsüz olan kalıyor ve sonrasında "hangi türün tanımını
 * göstereyim" sorusu cevapsız kalıyordu.
 */
export function dedupe(cands: Candidate[]): Candidate[] {
  const index = new Map<string, Candidate>();
  const out: Candidate[] = [];
  for (const c of cands) {
    if (!c.term) continue;
    const key = c.term.toLowerCase();
    const kept = index.get(key);
    if (kept) {
      if (!kept.pos && c.pos) kept.pos = c.pos;
      continue;
    }
    const copy = { ...c };
    index.set(key, copy);
    out.push(copy);
  }
  return out;
}

/**
 * Örnek cümleleri seviyeye göre süzer.
 *
 * Sözlüklerin hazır örnekleri çoğu zaman edebî ve uzun oluyor; A2 seviyesinde
 * birine 25 kelimelik cümle göstermek öğretmez, yıldırır. Sınır `level.ts`
 * içindeki tek tablodan okunuyor — öğretmenin kullandığı sayılarla aynı.
 * Öğretmenin kendi yazdığı örnekler zaten seviyeye göre üretildiği için bu
 * süzgeç sadece internetten gelen yedekler için çalışır.
 */
export function filterExamples(
  examples: string[] | undefined,
  word: string,
  lemma: string | undefined,
  /** Seviyeye (ve öğretmenin ayarına) göre üst sınır */
  maxWords: number
): string[] | undefined {
  if (!examples?.length) return undefined;
  const limit = maxWords;
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

  /**
   * Kelimenin **metindeki hâlini** içeren örnekler öne alınır.
   *
   * "tried" için sözlük hem *I tried to rollerblade* hem *Repeated failures try
   * one's patience* döndürüyor; ikincisi kelimeyi bambaşka anlamda kullanıyor.
   * Aynı çekimi içeren örnek, aranan anlamda olma ihtimali belirgin yüksek.
   */
  const surface = word.toLowerCase();
  const ranked = [...kept].sort((a, b) => {
    const aHit = a.toLowerCase().includes(surface) ? 0 : 1;
    const bHit = b.toLowerCase().includes(surface) ? 0 : 1;
    return aHit - bHit;
  });

  // İnternetten gelen örneklerde 2 tane yeter; öğretmenin yazdıkları zaten
  // ayrı yoldan geliyor ve 3 tanesi de gösteriliyor.
  return ranked.length > 0 ? ranked.slice(0, 2) : undefined;
}

/** Sözlük bilgisinin bir sözcük türüne ait bölümü */
export interface DefGroup {
  /** 'noun' | 'verb' | 'adjective' | 'adverb' … */
  pos?: string;
  definition?: string;
  synonym?: string;
  examples?: string[];
}

/** Türkçeleştirilmiş sözcük türünü sözlüğün etiketine çevirir. */
const POS_BACK: Record<string, string> = {
  isim: 'noun',
  fiil: 'verb',
  sıfat: 'adjective',
  zarf: 'adverb',
};

/**
 * Gösterilecek sözlük bölümünü seçer.
 *
 * Aynı yazılışın farklı türleri bambaşka kelimeler olabiliyor:
 *   felt → isim *keçe* / fiil *hissetmek*
 *   saw  → isim *testere* / fiil *görmek*
 *   keep → isim *kale (hisar)* / fiil *tutmak*
 *
 * Bu yüzden cümleden seçilen anlamın **türüyle** eşleşen bölüm aranır; önce
 * kelimenin yazıldığı hâlinde, yoksa sözlük hâlinde. Tek bir biçime bakmak
 * yetmiyor: fiil bölümü "felt" için *feel* girdisinde, "kept" için *kept*
 * girdisinde duruyor. Hiçbiri tutmazsa ilk bölüme düşülür.
 */
export function pickDefGroup(
  posTr: string | undefined,
  surface?: DefGroup[],
  lemma?: DefGroup[],
  /**
   * Kelime düzensiz bir fiil çekimi mi (`felt`, `saw`, `kept`)?
   *
   * Öyleyse **sözlük hâline öncelik verilir.** Çünkü bu kelimelerin kendi
   * girdilerinde de aynı türden bir madde bulunabiliyor ama başka kelimeye
   * ait: "felt" girdisindeki fiil *keçe yapmak*, "saw" girdisindekiyse
   * *testereyle kesmek*. Tür eşleşmesi tek başına bunları eleyemiyor.
   */
  preferLemma = false
): DefGroup | undefined {
  const wanted = posTr ? POS_BACK[posTr] : undefined;
  if (wanted) {
    const first = preferLemma ? lemma : surface;
    const second = preferLemma ? surface : lemma;
    const hit = first?.find((g) => g.pos === wanted) ?? second?.find((g) => g.pos === wanted);
    if (hit) return hit;
  }
  return surface?.[0] ?? lemma?.[0];
}

/** Kelime düzensiz fiil tablosunda mı — `pickDefGroup` için. */
export function isIrregularForm(word: string): boolean {
  return IRREGULAR_FORMS[word] !== undefined;
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
