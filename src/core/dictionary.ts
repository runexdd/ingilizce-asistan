/**
 * Kelime arama.
 *
 * Metindeki HER kelimeye dokunulabilir olmalı — sadece öğretmenin sözlüğe
 * koyduklarına değil. Okurken takıldığın kelime, öğretmenin zor sandığı
 * kelime olmak zorunda değil.
 *
 * ⛔ **MyMemory kullanılmayacak.** Eskiden çeviri için MyMemory çağrılıyordu;
 * o bir sözlük değil, "çeviri hafızası" — insanların çevirdiği cümle
 * parçalarını saklar. Tek kelime sorulduğunda alakasız bir parçadan kalma
 * karşılık dönebiliyor ("evening" → "yapınız" gibi). Yanlış anlam, hiç anlam
 * vermemekten kötüdür; bu yüzden tamamen çıkarıldı. Geri ekleme.
 *
 * Sıra:
 *   1. Öğretmenin sözlüğü  — anında, çevrimdışı, bağlamı bilen tek kaynak
 *   2. Yerel önbellek      — daha önce bakılan kelimeler, çevrimdışı
 *   3. Google sözlük ucu   — Türkçe karşılık + kelimenin diğer yaygın anlamları
 *   4. dictionaryapi.dev   — İngilizce tanım, eş anlamlı, örnek cümle
 *
 * Bağlam: kelimenin tek başına çevirisi yanıltır ("evening" → "akşam" doğru ama
 * "every evening" → "her akşam" görülmeden anlaşılmaz). Bu yüzden kelimenin
 * geçtiği **cümlenin tamamı da çevrilip** panelde gösteriliyor. Kullanıcı
 * kelimeyi yerinde görür, tahmin etmek zorunda kalmaz.
 *
 * Hepsi ücretsiz ve anahtarsızdır — projenin $0 kısıtı gereği.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GlossaryEntry } from '../db/types';

/** v1 önbelleği sadece düz metin tutuyordu ve MyMemory'nin hatalı
 *  karşılıklarını içeriyor — bilerek yeni anahtar kullanılıyor ki eski
 *  yanlışlar taşınmasın. */
const CACHE_KEY = 'ingilizce-asistan/dict-cache-v2';
const LEGACY_CACHE_KEY = 'ingilizce-asistan/dict-cache';
/** Önbellek sınırı — sonsuz büyümesin */
const MAX_ENTRIES = 2000;

export type LookupSource = 'glossary' | 'cache' | 'online' | 'none';

export interface LookupResult {
  /** Aranan kelime (veya eşleşen kalıp) */
  word: string;
  /** Bu bağlamdaki anlamı */
  meaning: string | null;
  source: LookupSource;
  /** Kelimenin diğer yaygın anlamları — bağlamdaki hariç */
  otherMeanings?: string[];
  /** Yaygın bir eş anlamlısı */
  synonym?: string;
  /** Örnek cümleler */
  examples?: string[];
  /** İngilizce tanım (ek bağlam) */
  definition?: string;
  /** Çekimli hâlin sözlük hâli: "ended" → "end" */
  baseForm?: string;
  /** Kelimenin geçtiği cümlenin Türkçe çevirisi — bağlamı gösterir */
  sentenceTr?: string;
  /** Çok kelimeli kalıp eşleştiyse kalıbın kendisi: "every evening" */
  phrase?: string;
}

interface CachedEntry {
  meaning: string | null;
  otherMeanings?: string[];
  synonym?: string;
  examples?: string[];
  definition?: string;
  baseForm?: string;
}

let memoryCache: Record<string, CachedEntry> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Cümle çevirileri oturum boyunca akılda tutulur; diske yazılmaz
 *  (cümle metne özeldir, kalıcı önbellekte yer kaplamasının anlamı yok). */
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
  // Eski, güvenilmez önbellek bir kez temizlenir
  void AsyncStorage.removeItem(LEGACY_CACHE_KEY).catch(() => {});
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

/** İngilizce sözcük türü etiketlerini Türkçeleştirir. */
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
  dict?: Array<{
    pos?: string;
    terms?: string[];
    base_form?: string;
  }>;
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
 * Tek kelime araması.
 * `dt=bd` sözlük bloğunu getirir: kelimenin sözcük türüne göre gruplanmış,
 * **kullanım sıklığına göre sıralı** Türkçe karşılıkları. İstenen "farklı ama
 * yaygın anlamlar" listesi buradan geliyor — sıralı olduğu için baştan 3 tane
 * almak, eskimiş anlamları kendiliğinden dışarıda bırakıyor.
 */
async function translateWord(
  word: string
): Promise<{ meaning: string; others: string[]; baseForm?: string } | null> {
  const json = await gtx(word, 'dt=t&dt=bd');
  if (!json) return null;

  const senses: string[] = [];
  let baseForm: string | undefined;

  for (const group of json.dict ?? []) {
    if (!baseForm && group.base_form) baseForm = group.base_form;
    const pos = group.pos ? (POS_TR[group.pos] ?? group.pos) : '';
    for (const term of (group.terms ?? []).slice(0, 3)) {
      const label = pos ? `${term} (${pos})` : term;
      if (!senses.some((s) => s.split(' (')[0] === term)) senses.push(label);
    }
  }

  const plain = joinTrans(json);
  const usable = plain && plain.toLowerCase() !== word.toLowerCase() ? plain : '';

  const meaning = usable || senses[0]?.split(' (')[0] || '';
  if (!meaning) return null;

  const others = senses
    .filter((s) => s.split(' (')[0].toLowerCase() !== meaning.toLowerCase())
    .slice(0, 5);

  return { meaning, others, baseForm: baseForm?.toLowerCase() };
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

/**
 * Çekimli hâlden sözlük hâline giden makul adaylar.
 * dictionaryapi.dev "ended" veya "stories" için 404 döner; sözlük hâli
 * denenmezse kelime "bulunamadı" görünür.
 */
function lemmaCandidates(word: string): string[] {
  const out: string[] = [];
  const add = (w: string) => {
    if (w.length > 1 && w !== word && !out.includes(w)) out.push(w);
  };

  if (/ies$/.test(word)) add(word.slice(0, -3) + 'y');
  if (/(ches|shes|sses|xes|zes|oes)$/.test(word)) add(word.slice(0, -2));
  if (/s$/.test(word) && !/ss$/.test(word)) add(word.slice(0, -1));
  if (/ied$/.test(word)) add(word.slice(0, -3) + 'y');
  if (/ed$/.test(word)) {
    add(word.slice(0, -1)); // liked → like
    add(word.slice(0, -2)); // ended → end
    if (/([bdgklmnprt])\1ed$/.test(word)) add(word.slice(0, -3)); // stopped → stop
  }
  if (/ing$/.test(word)) {
    add(word.slice(0, -3)); // reading → read
    add(word.slice(0, -3) + 'e'); // taking → take
    if (/([bdgklmnprt])\1ing$/.test(word)) add(word.slice(0, -4)); // running → run
  }
  if (/(er|est)$/.test(word)) add(word.replace(/(er|est)$/, ''));
  return out.slice(0, 3);
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
 * Örnekler gerçek sözlük örnekleridir; uydurma değil.
 */
async function defineOnline(word: string): Promise<{
  definition?: string;
  synonym?: string;
  examples: string[];
  baseForm?: string;
} | null> {
  let data = await fetchDefinition(word);
  let matched = word;

  if (!data) {
    for (const candidate of lemmaCandidates(word)) {
      data = await fetchDefinition(candidate);
      if (data) {
        matched = candidate;
        break;
      }
    }
  }
  if (!data) return null;

  /**
   * ⚠️ Sadece **ilk girdi** kullanılır.
   *
   * dictionaryapi.dev aynı yazılışa sahip farklı kelimeleri ayrı girdiler
   * hâlinde döndürüyor: "evening" için hem *akşam* (isim) hem de *even*
   * fiilinin çekimi geliyor. Hepsi birleştirilince "evening" örneği diye
   * "We need to even this playing field" gösteriliyordu — kelimeyle alakasız.
   * Girdileri karıştırma.
   */
  const meanings = data[0]?.meanings ?? [];
  const first = meanings[0];
  const def = first?.definitions?.[0]?.definition;

  const examples: string[] = [];
  for (const m of meanings) {
    for (const d of m.definitions ?? []) {
      if (d.example && !examples.includes(d.example)) examples.push(d.example);
      if (examples.length >= 3) break;
    }
    if (examples.length >= 3) break;
  }

  /**
   * Eş anlamlının ilki alınır. Liste sıklığa göre sıralı; sondakiler
   * ("undern" gibi) artık kullanılmayan kelimeler oluyor — kullanıcı
   * eskimiş eş anlamlıları istemedi.
   */
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
  /** Kelimenin geçtiği cümle — bağlam çevirisi için */
  sentence?: string;
}

/**
 * Kelimeyi arar.
 *
 * Anlamın kaynağı sırayla: öğretmen sözlüğü → önbellek → internet.
 * Öğretmen sözlüğü varsa anlam ondan gelir; internet sadece **ek bilgiyi**
 * (diğer anlamlar, örnekler) doldurur, anlamın üstüne yazmaz.
 */
export async function lookupWord(
  raw: string,
  options: LookupOptions = {}
): Promise<LookupResult> {
  const word = normalizeWord(raw);
  if (!word) return { word: raw, meaning: null, source: 'none' };

  const { entry, sentence } = options;

  // Cümle çevirisi her durumda paralel istenir — bağlamı o gösteriyor
  const sentencePromise =
    sentence && sentence.trim().split(/\s+/).length > 1
      ? translateSentence(sentence)
      : Promise.resolve(null);

  /* 1. Öğretmenin sözlüğü — bağlamı bilen tek kaynak */
  if (entry?.meaning) {
    const extra = await enrich(word, {
      wantMeaning: false,
      wantSenses: !entry.senses?.length,
      wantExamples: !entry.examples?.length,
    });

    return {
      word: entry.word,
      phrase: entry.word.includes(' ') ? entry.word : undefined,
      meaning: entry.meaning,
      source: 'glossary',
      otherMeanings: entry.senses?.length ? entry.senses : extra?.otherMeanings,
      synonym: entry.synonym ?? extra?.synonym,
      examples: entry.examples?.length ? entry.examples : extra?.examples,
      definition: extra?.definition,
      baseForm: extra?.baseForm,
      sentenceTr: (await sentencePromise) ?? undefined,
    };
  }

  /* 2. Önbellek */
  const cache = await loadCache();
  const cached = cache[word];
  if (cached) {
    return {
      word,
      meaning: cached.meaning,
      source: 'cache',
      otherMeanings: cached.otherMeanings,
      synonym: cached.synonym,
      examples: cached.examples,
      definition: cached.definition,
      baseForm: cached.baseForm,
      sentenceTr: (await sentencePromise) ?? undefined,
    };
  }

  /* 3. İnternet */
  const found = await enrich(word, {
    wantMeaning: true,
    wantSenses: true,
    wantExamples: true,
  });
  const sentenceTr = (await sentencePromise) ?? undefined;

  if (!found || (!found.meaning && !found.definition)) {
    return { word, meaning: null, source: 'none', sentenceTr };
  }

  cache[word] = {
    meaning: found.meaning ?? null,
    otherMeanings: found.otherMeanings,
    synonym: found.synonym,
    examples: found.examples,
    definition: found.definition,
    baseForm: found.baseForm,
  };
  scheduleSave();

  return {
    word,
    meaning: found.meaning ?? null,
    source: 'online',
    otherMeanings: found.otherMeanings,
    synonym: found.synonym,
    examples: found.examples,
    definition: found.definition,
    baseForm: found.baseForm,
    sentenceTr,
  };
}

/** İki ücretsiz kaynağı paralel sorup tek sonuçta birleştirir. */
async function enrich(
  word: string,
  want: { wantMeaning: boolean; wantSenses: boolean; wantExamples: boolean }
): Promise<{
  meaning?: string;
  otherMeanings?: string[];
  synonym?: string;
  examples?: string[];
  definition?: string;
  baseForm?: string;
} | null> {
  const needsGoogle = want.wantMeaning || want.wantSenses;
  const [translated, defined] = await Promise.all([
    needsGoogle ? translateWord(word) : Promise.resolve(null),
    defineOnline(word),
  ]);

  if (!translated && !defined) return null;

  return {
    meaning: translated?.meaning,
    otherMeanings: translated?.others.length ? translated.others : undefined,
    synonym: defined?.synonym,
    examples: defined?.examples.length ? defined.examples : undefined,
    definition: defined?.definition,
    baseForm: translated?.baseForm ?? defined?.baseForm,
  };
}

/** Önbellekteki kelime sayısı — Ayarlar'da gösterilir. */
export async function cachedWordCount(): Promise<number> {
  const cache = await loadCache();
  return Object.keys(cache).length;
}
