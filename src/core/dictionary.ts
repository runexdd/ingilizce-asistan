/**
 * Kelime arama.
 *
 * Metindeki HER kelimeye dokunulabilir olmalı — sadece öğretmenin sözlüğe
 * koyduklarına değil. Okurken takıldığın kelime, öğretmenin zor sandığı
 * kelime olmak zorunda değil.
 *
 * ⛔ **MyMemory kullanılmayacak.** Sözlük değil, "çeviri hafızası" — tek kelime
 * sorulduğunda alakasız karşılık dönüyordu ("evening" → "yapınız"). Kaldırıldı,
 * geri ekleme.
 *
 * ## Bağlam problemi — bu dosyanın asıl işi
 *
 * Tek kelime çevirisi düzensiz fiillerde çöküyor. Google'a tek başına sorunca:
 *
 *     saw   → "testere"    (gördü değil)
 *     felt  → "keçe"       (hissetti değil)
 *     tried → "sınanmış"   (denedi değil)
 *     left  → "sol"        (ayrıldı değil)
 *
 * Çünkü Google yazılışı aynı olan **başka kelimeyi** veriyor. Çözüm üç adım:
 *
 *   1. Kelimeyi hem **yazıldığı hâliyle** hem **sözlük hâliyle** sor
 *      (saw + see). Sözlük hâli için ek kuralları ve düzensiz fiil tablosunu
 *      kullan (`irregular.ts`).
 *   2. Kelimenin geçtiği **cümlenin tamamını** çevir.
 *   3. Çıkan bütün Türkçe adayları cümlenin çevirisiyle karşılaştır. Cümlede
 *      hangi aday geçiyorsa bağlamdaki anlam odur.
 *
 * Böylece "He left the office" → *ayrılmak*, "his left hand" → *sol* çıkıyor;
 * aynı kelime, iki farklı doğru cevap. Eşleşme bulunamazsa uydurulmaz:
 * fiil çekimiyse sözlük hâlinin anlamı, değilse genel çeviri gösterilir ve
 * cümlenin çevirisi zaten panelde durur.
 *
 * Kaynakların hepsi ücretsiz ve anahtarsızdır — projenin $0 kısıtı gereği.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GlossaryEntry } from '../db/types';
import {
  altBaseForm,
  baseFormOf,
  dedupe,
  filterExamples,
  matchCase,
  otherMeaningsOf,
  pickByContext,
  pickDefault,
  type Candidate,
} from './wordsense';

/** v1 önbelleği MyMemory'nin hatalı karşılıklarını içeriyordu; v2 aday
 *  listesi tutmadığı için bağlam eşleştirmesi yapamıyordu. */
const CACHE_KEY = 'ingilizce-asistan/dict-cache-v3';
const OLD_CACHE_KEYS = [
  'ingilizce-asistan/dict-cache',
  'ingilizce-asistan/dict-cache-v2',
];
/** Önbellek sınırı — sonsuz büyümesin */
const MAX_ENTRIES = 2000;

export type LookupSource = 'glossary' | 'cache' | 'online' | 'none';

export interface LookupResult {
  /** Aranan kelime (veya eşleşen kalıp) */
  word: string;
  /** Bu bağlamdaki anlamı */
  meaning: string | null;
  source: LookupSource;
  /** Anlam cümleye bakılarak mı seçildi — panelde dürüstçe belirtilir */
  fromContext?: boolean;
  /** Kelimenin diğer yaygın anlamları — gösterilen anlam hariç */
  otherMeanings?: string[];
  /** Yaygın bir eş anlamlısı */
  synonym?: string;
  /** Seviyeye uygun örnek cümleler */
  examples?: string[];
  /** İngilizce tanım (ek bağlam) */
  definition?: string;
  /** Çekimli hâlin sözlük hâli: "saw" → "see" */
  baseForm?: string;
  /** Kelimenin geçtiği cümlenin Türkçe çevirisi */
  sentenceTr?: string;
  /** Çok kelimeli kalıp eşleştiyse kalıbın kendisi: "every evening" */
  phrase?: string;
}

interface CachedEntry {
  /** Bağlam eşleşmezse gösterilecek varsayılan anlam */
  meaning: string | null;
  /** "term|pos|fromLemma" biçiminde adaylar — bağlam eşleştirmesi bunun üstünde
   *  çalışır, bu yüzden seçilen anlam değil aday listesi saklanır */
  candidates?: string[];
  synonym?: string;
  /** Seviyeye göre süzülmeden önceki hâlleri; süzme okurken yapılır */
  examples?: string[];
  definition?: string;
  baseForm?: string;
}

let memoryCache: Record<string, CachedEntry> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Cümle çevirileri oturum boyunca akılda tutulur; diske yazılmaz. */
const sentenceCache = new Map<string, string>();

export function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/^[^a-zçğıöşü']+|[^a-zçğıöşü']+$/gi, '')
    .replace(/'s$/, '')
    .trim();
}

async function loadCache(): Promise<Record<string, CachedEntry>> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    memoryCache = raw ? (JSON.parse(raw) as Record<string, CachedEntry>) : {};
  } catch {
    memoryCache = {};
  }
  // Eski, güvenilmez önbellekler bir kez temizlenir
  for (const key of OLD_CACHE_KEYS) {
    void AsyncStorage.removeItem(key).catch(() => {});
  }
  return memoryCache;
}

/** Yazma işlemini geciktir — her kelimede diske yazmayalım. */
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!memoryCache) return;
    const entries = Object.entries(memoryCache);
    const trimmed =
      entries.length > MAX_ENTRIES
        ? Object.fromEntries(entries.slice(entries.length - MAX_ENTRIES))
        : memoryCache;
    void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(trimmed)).catch(() => {});
  }, 1500);
}

/* ------------------------------------------------------------------ Google */

const GTX = 'https://translate.googleapis.com/translate_a/single';

const POS_TR: Record<string, string> = {
  noun: 'isim',
  verb: 'fiil',
  adjective: 'sıfat',
  adverb: 'zarf',
  preposition: 'edat',
  conjunction: 'bağlaç',
  pronoun: 'zamir',
  interjection: 'ünlem',
  abbreviation: 'kısaltma',
  numeral: 'sayı',
};

interface GtxResponse {
  sentences?: Array<{ trans?: string }>;
  dict?: Array<{ pos?: string; terms?: string[]; base_form?: string }>;
}

async function gtx(text: string, dt: string): Promise<GtxResponse | null> {
  try {
    const url = `${GTX}?client=gtx&sl=en&tl=tr&dj=1&${dt}&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as GtxResponse;
  } catch {
    return null;
  }
}

function joinTrans(json: GtxResponse): string {
  return (json.sentences ?? [])
    .map((s) => s.trans ?? '')
    .join('')
    .trim();
}

/**
 * Tek kelimenin bütün Türkçe karşılık adayları.
 * `dt=bd` sözlük bloğunu getirir: sözcük türüne göre gruplanmış ve
 * **kullanım sıklığına göre sıralı** karşılıklar. Sıralı olduğu için baştan
 * birkaç tane almak, eskimiş anlamları kendiliğinden eler.
 */
async function wordCandidates(word: string, fromLemma: boolean): Promise<Candidate[]> {
  const json = await gtx(word, 'dt=t&dt=bd');
  if (!json) return [];

  const out: Candidate[] = [];
  const plain = joinTrans(json);
  if (plain && plain.toLowerCase() !== word.toLowerCase()) {
    out.push({ term: plain, fromLemma });
  }
  for (const group of json.dict ?? []) {
    const pos = group.pos ? (POS_TR[group.pos] ?? group.pos) : undefined;
    for (const term of (group.terms ?? []).slice(0, 4)) {
      out.push({ term, pos, fromLemma });
    }
  }
  return out;
}

/** Cümlenin tamamını çevirir — kelimeyi yerinde görmek için. */
async function translateSentence(sentence: string): Promise<string | null> {
  const key = sentence.trim();
  if (!key) return null;
  const hit = sentenceCache.get(key);
  if (hit) return hit;

  const json = await gtx(key.slice(0, 400), 'dt=t');
  const text = json ? joinTrans(json) : '';
  if (!text || text.toLowerCase() === key.toLowerCase()) return null;

  sentenceCache.set(key, text);
  return text;
}

/* ---------------------------------------------------------- dictionaryapi */

interface DictApiEntry {
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string; example?: string }>;
    synonyms?: string[];
  }>;
}

async function fetchDefinition(word: string): Promise<DictApiEntry[] | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as DictApiEntry[];
    return Array.isArray(data) && data.length > 0 ? data : null;
  } catch {
    return null;
  }
}

/**
 * İngilizce tanım + eş anlamlı + örnek cümleler.
 *
 * ⚠️ Sadece **ilk girdi** kullanılır. dictionaryapi.dev aynı yazılışa sahip
 * farklı kelimeleri ayrı girdiler hâlinde döndürüyor: "evening" için hem
 * *akşam* hem de *even* fiilinin çekimi geliyor. Hepsi birleştirilince
 * "evening" örneği diye "We need to even this playing field" çıkıyordu.
 */
async function defineOnline(
  word: string,
  lemma?: string
): Promise<{
  definition?: string;
  synonym?: string;
  examples: string[];
  baseForm?: string;
} | null> {
  let data = await fetchDefinition(word);
  let matched = word;

  if (!data && lemma) {
    data = await fetchDefinition(lemma);
    if (data) matched = lemma;
  }
  if (!data) return null;

  const meanings = data[0]?.meanings ?? [];
  const first = meanings[0];
  const def = first?.definitions?.[0]?.definition;

  const examples: string[] = [];
  for (const m of meanings) {
    for (const d of m.definitions ?? []) {
      if (d.example && !examples.includes(d.example)) examples.push(d.example);
      if (examples.length >= 6) break;
    }
    if (examples.length >= 6) break;
  }

  /** Eş anlamlının ilki alınır; liste sıklığa göre sıralı, sondakiler
   *  ("undern" gibi) artık kullanılmayan kelimeler oluyor. */
  const synonym = (first?.synonyms ?? []).find(
    (s) => /^[a-zA-Z-]{2,}$/.test(s) && s.toLowerCase() !== word.toLowerCase()
  );

  return {
    definition: def
      ? first?.partOfSpeech
        ? `(${first.partOfSpeech}) ${def}`
        : def
      : undefined,
    synonym,
    examples,
    baseForm: matched !== word ? matched : undefined,
  };
}

/* -------------------------------------------------------------------- API */

interface LookupOptions {
  /** Öğretmenin sözlüğündeki karşılık — varsa her zaman kazanır */
  entry?: GlossaryEntry | null;
  /** Kelimenin geçtiği cümle — bağlam eşleştirmesi bunun üstünden yapılır */
  sentence?: string;
  /** Kullanıcının CEFR seviyesi — örnek cümleleri buna göre süzülür */
  level?: string;
}

function encodeCandidates(cands: Candidate[]): string[] {
  return cands.map((c) => `${c.term}|${c.pos ?? ''}|${c.fromLemma ? '1' : ''}`);
}

function decodeCandidates(raw: string[] | undefined): Candidate[] {
  if (!raw) return [];
  return raw.map((line) => {
    const [term, pos, fromLemma] = line.split('|');
    return { term, pos: pos || undefined, fromLemma: fromLemma === '1' };
  });
}

/**
 * Kelimeyi arar.
 *
 * Anlamın kaynağı sırayla: öğretmen sözlüğü → önbellek → internet.
 * Öğretmen sözlüğü varsa anlam ondan gelir; internet sadece **ek bilgiyi**
 * doldurur, anlamın üstüne yazmaz.
 */
export async function lookupWord(
  raw: string,
  options: LookupOptions = {}
): Promise<LookupResult> {
  const word = normalizeWord(raw);
  if (!word) return { word: raw, meaning: null, source: 'none' };

  const { entry, sentence, level } = options;
  const lemma = baseFormOf(word);

  // Cümle çevirisi her durumda paralel istenir — bağlamı o gösteriyor
  const sentencePromise =
    sentence && sentence.trim().split(/\s+/).length > 1
      ? translateSentence(sentence)
      : Promise.resolve(null);

  /* 1. Öğretmenin sözlüğü — bağlamı bilen tek kaynak */
  if (entry?.meaning) {
    const isPhrase = entry.word.trim().includes(' ');

    /**
     * ⛔ Kalıplarda internetten ek bilgi çekilmez.
     *
     * Sözlük servisi kalıbı değil, dokunulan **tek kelimeyi** tanır. "every
     * evening" için eş anlamlı diye *eve*, örnek diye *"It was the evening of
     * the Roman Empire"* dönüyordu — ikisi de kalıpla ilgisiz. Kalıpta ne
     * varsa öğretmenden gelir; yoksa hiç gösterilmez.
     */
    const extra =
      !isPhrase && (!entry.senses?.length || !entry.examples?.length)
        ? await defineOnline(word, lemma)
        : null;

    return {
      word: entry.word,
      phrase: isPhrase ? entry.word : undefined,
      meaning: entry.meaning,
      source: 'glossary',
      otherMeanings: entry.senses?.length ? entry.senses : undefined,
      synonym: entry.synonym ?? extra?.synonym,
      examples: entry.examples?.length
        ? entry.examples.slice(0, 3)
        : filterExamples(extra?.examples, word, lemma, level),
      definition: extra?.definition,
      sentenceTr: (await sentencePromise) ?? undefined,
    };
  }

  /* 2. Önbellek — adaylar saklandığı için bağlam eşleştirmesi burada da çalışır */
  const cache = await loadCache();
  const cached = cache[word];
  if (cached) {
    const sentenceTr = await sentencePromise;
    return buildResult({
      word,
      candidates: decodeCandidates(cached.candidates),
      fallback: cached.meaning,
      lemma,
      sentenceTr,
      synonym: cached.synonym,
      examples: filterExamples(cached.examples, word, lemma, level),
      definition: cached.definition,
      baseForm: cached.baseForm,
      source: 'cache',
    });
  }

  /* 3. İnternet — yazılan hâl, sözlük hâli ve tanım aynı anda istenir */
  const [surfaceCands, lemmaCands, altCands, defined, sentenceTr] = await Promise.all([
    wordCandidates(word, false),
    lemma ? wordCandidates(lemma, true) : Promise.resolve([]),
    (() => {
      const alt = altBaseForm(word);
      return alt && alt !== lemma ? wordCandidates(alt, true) : Promise.resolve([]);
    })(),
    defineOnline(word, lemma),
    sentencePromise,
  ]);

  const candidates = dedupe([...surfaceCands, ...lemmaCands, ...altCands]);

  if (candidates.length === 0 && !defined) {
    return { word, meaning: null, source: 'none', sentenceTr: sentenceTr ?? undefined };
  }

  const fallback = pickDefault(candidates, !!lemma)?.term ?? null;

  cache[word] = {
    meaning: fallback,
    candidates: encodeCandidates(candidates),
    synonym: defined?.synonym,
    examples: defined?.examples,
    definition: defined?.definition,
    baseForm: lemma ?? defined?.baseForm,
  };
  scheduleSave();

  return buildResult({
    word,
    candidates,
    fallback,
    lemma,
    sentenceTr,
    synonym: defined?.synonym,
    examples: filterExamples(defined?.examples, word, lemma, level),
    definition: defined?.definition,
    baseForm: lemma ?? defined?.baseForm,
    source: 'online',
  });
}

/** Adaylardan bağlama uygun olanı seçip sonucu kurar. */
function buildResult(input: {
  word: string;
  candidates: Candidate[];
  fallback: string | null;
  lemma?: string;
  sentenceTr: string | null;
  synonym?: string;
  examples?: string[];
  definition?: string;
  baseForm?: string;
  source: LookupSource;
}): LookupResult {
  const contextual = pickByContext(input.candidates, input.sentenceTr);
  const chosen =
    contextual?.term ??
    input.fallback ??
    pickDefault(input.candidates, !!input.lemma)?.term ??
    null;

  return {
    word: input.word,
    meaning: chosen ? matchCase(chosen, input.word) : null,
    source: input.source,
    fromContext: !!contextual,
    otherMeanings: otherMeaningsOf(input.candidates, chosen),
    synonym: input.synonym,
    examples: input.examples,
    definition: input.definition,
    baseForm: input.baseForm,
    sentenceTr: input.sentenceTr ?? undefined,
  };
}

/** Önbellekteki kelime sayısı — Ayarlar'da gösterilir. */
export async function cachedWordCount(): Promise<number> {
  const cache = await loadCache();
  return Object.keys(cache).length;
}
