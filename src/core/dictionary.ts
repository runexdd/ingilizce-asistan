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
  isIrregularForm,
  matchCase,
  otherMeaningsOf,
  pickByContext,
  pickDefault,
  pickDefGroup,
  type Candidate,
  type DefGroup,
} from './wordsense';

/** v1 önbelleği MyMemory'nin hatalı karşılıklarını içeriyordu; v2 aday
 *  listesi tutmadığı için bağlam eşleştirmesi yapamıyordu. */
const CACHE_KEY = 'ingilizce-asistan/dict-cache-v4';
const OLD_CACHE_KEYS = [
  'ingilizce-asistan/dict-cache',
  'ingilizce-asistan/dict-cache-v2',
  'ingilizce-asistan/dict-cache-v3',
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
  /** Örnek cümleler */
  examples?: string[];
  /**
   * Örnek nereden geldi?
   *
   * `teacher`    — kullanıcının seviyesine ve zayıf yapılarına göre yazılmış,
   *                kişiye özel. En iyisi.
   * `passage`    — okunan metnin kendi cümlesi. Kelime tam o anlamda ve
   *                seviyeye uygun geçiyor, yani güvenilir.
   * `dictionary` — internetteki genel sözlükten. Herkese aynı gelir.
   *
   * Panelde belirtiliyor ki kullanıcı neye baktığını bilsin.
   */
  exampleSource?: 'teacher' | 'passage' | 'dictionary';
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
  /** Yazıldığı hâlin ve sözlük hâlinin sözlük bilgisi ayrı ayrı saklanır;
   *  hangisinin gösterileceği cümleye göre okurken belirleniyor */
  defSurface?: DefGroup[];
  defLemma?: DefGroup[];
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
 * İngilizce tanım + eş anlamlı + örnek cümleler, **sözcük türüne göre ayrık.**
 *
 * Neden ayrık: aynı yazılışın farklı türleri bambaşka kelimeler oluyor ve
 * hepsini tek torbaya atmak yanlış öğretiyor. Canlı testte görülenler:
 *   felt  → isim girdisi *keçe* ("to felt the cylinder of a steam engine")
 *   saw   → isim girdisi *testere*
 *   keep  → isim girdisi *kale (hisar)*
 * Doğrusu, cümleden seçilen anlamın türüyle eşleşen bölümü göstermek:
 * anlam fiilse fiil tanımı, isimse isim tanımı. Seçimi `pickDefGroup` yapar.
 *
 * Bölümler **bütün girdilerden** toplanır ama sırası korunur: ilk girdinin
 * ilk bölümü listenin başında durur. Böylece tür eşleşmesi ararken servisin
 * ayrı girdiye koyduğu fiil bölümü de bulunabiliyor ("watch"ın fiil hâli
 * ikinci girdide), tür eşleşmezse de yine ilk girdiye düşülüyor — "evening"
 * örneği diye "even" fiilinin cümlesinin çıkması bu sıralamayla önleniyor.
 */
async function defineOnline(word: string): Promise<DefGroup[] | null> {
  const data = await fetchDefinition(word);
  if (!data) return null;

  const groups: DefGroup[] = [];
  for (const meaning of data.flatMap((entry) => entry.meanings ?? [])) {
    const definition = meaning.definitions?.[0]?.definition;

    /**
     * Eskimiş anlamlar atlanır. Kullanıcı bunu açıkça istemedi:
     * *"çok eskilerden kalan şu an konuşulmayan eş anlamından bahsetmiyorum."*
     * "worth" için sözlükte hâlâ *to be, become, betide* fiili duruyor ve
     * örneği "Well worth thee, me friend" — bugün kimsenin kurmayacağı cümle.
     */
    if (definition && /\b(archaic|obsolete|dated|poetic|no longer)\b/i.test(definition)) {
      continue;
    }
    const examples: string[] = [];
    for (const d of meaning.definitions ?? []) {
      if (d.example && !examples.includes(d.example)) examples.push(d.example);
      if (examples.length >= 4) break;
    }

    /** Eş anlamlının ilki alınır; liste sıklığa göre sıralı, sondakiler
     *  ("undern" gibi) artık kullanılmayan kelimeler oluyor. */
    const synonym = (meaning.synonyms ?? []).find(
      (s) => /^[a-zA-Z-]{2,}$/.test(s) && s.toLowerCase() !== word.toLowerCase()
    );

    if (!definition && examples.length === 0 && !synonym) continue;
    groups.push({
      pos: meaning.partOfSpeech,
      definition:
        definition && meaning.partOfSpeech
          ? `(${meaning.partOfSpeech}) ${definition}`
          : definition,
      synonym,
      examples: examples.length ? examples : undefined,
    });
  }
  return groups.length ? groups : null;
}


/* -------------------------------------------------------------------- API */

interface LookupOptions {
  /** Öğretmenin sözlüğündeki karşılık — varsa her zaman kazanır */
  entry?: GlossaryEntry | null;
  /** Kelimenin geçtiği cümle — bağlam eşleştirmesi bunun üstünden yapılır */
  sentence?: string;
  /** Örnek cümle üst sınırı; seviyeden ve öğretmenin ayarından geliyor */
  maxExampleWords?: number;
}

/** İnternetten toplanan ham malzeme — hem sözlükte olan hem olmayan kelimeler için */
interface OnlineData {
  candidates: Candidate[];
  defSurface?: DefGroup[];
  defLemma?: DefGroup[];
}

/**
 * Kelimenin çevrimiçi malzemesini toplar; önbellek varsa oradan verir.
 * Anlam seçimi burada yapılmaz — bağlam eşleştirmesi cümleye bağlı olduğu
 * için sonuç değil, **adaylar** saklanır.
 */
async function gatherOnline(word: string, lemma?: string): Promise<OnlineData | null> {
  const cache = await loadCache();
  const cached = cache[word];
  if (cached) {
    return {
      candidates: decodeCandidates(cached.candidates),
      defSurface: cached.defSurface,
      defLemma: cached.defLemma,
    };
  }

  const alt = altBaseForm(word);
  const [surfaceCands, lemmaCands, altCands, defSurface, defLemma] = await Promise.all([
    wordCandidates(word, false),
    lemma ? wordCandidates(lemma, true) : Promise.resolve([]),
    alt && alt !== lemma ? wordCandidates(alt, true) : Promise.resolve([]),
    defineOnline(word),
    lemma ? defineOnline(lemma) : Promise.resolve(null),
  ]);

  const candidates = dedupe([...surfaceCands, ...lemmaCands, ...altCands]);
  if (candidates.length === 0 && !defSurface && !defLemma) return null;

  cache[word] = {
    meaning: pickDefault(candidates, !!lemma)?.term ?? null,
    candidates: encodeCandidates(candidates),
    defSurface: defSurface ?? undefined,
    defLemma: defLemma ?? undefined,
    baseForm: lemma,
  };
  scheduleSave();

  return { candidates, defSurface: defSurface ?? undefined, defLemma: defLemma ?? undefined };
}

/**
 * Metnin kendi cümlesi bir örnektir.
 *
 * Öğretmen o cümleyi kullanıcının seviyesinde yazdı ve kelime orada tam
 * aradığımız anlamda geçiyor. Yani elimizdeki **en güvenilir** örnek.
 * Sözlükte örnek bulunamadığında buna düşülüyor; "worth" gibi kelimelerin
 * örneksiz kalmasının sebebi buydu.
 */
function passageExample(sentence: string | undefined): string[] | undefined {
  const trimmed = sentence?.trim();
  if (!trimmed) return undefined;
  const words = trimmed.split(/\s+/);
  return words.length >= 3 && words.length <= 30 ? [trimmed] : undefined;
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

  const { entry, sentence } = options;
  const maxExampleWords = options.maxExampleWords ?? 14;
  const lemma = baseFormOf(word);

  // Cümle çevirisi her durumda paralel istenir — bağlamı o gösteriyor
  const sentencePromise =
    sentence && sentence.trim().split(/\s+/).length > 1
      ? translateSentence(sentence)
      : Promise.resolve(null);

  /* 1. Öğretmenin sözlüğü — anlamın tek kaynağı */
  if (entry?.meaning) {
    const isPhrase = entry.word.trim().includes(' ');
    const teacherExamples = entry.examples?.length
      ? entry.examples.slice(0, 3)
      : undefined;

    /**
     * Anlam her zaman öğretmenden gelir; internet **anlamın üstüne yazmaz.**
     * Sebebi canlı testte görüldü: metinde "felt" = *hissetti* iken sözlük
     * servisi "felt"i kumaş (keçe) sanıyordu.
     *
     * Örnek cümlede sıra şu:
     *   1. **Öğretmenin yazdığı** — kişiye özel, en iyisi.
     *   2. **Metnin kendi cümlesi** — kelime orada tam öğretmenin verdiği
     *      anlamda ve kullanıcının seviyesinde geçiyor, yani garanti doğru.
     *   3. Sözlük — sadece ilk ikisi yoksa.
     *
     * Sözlüğün sona alınmasının sebebi canlı testte görüldü: öğretmen
     * "worth" için *buna değmek* demişti, sözlük ise kelimenin artık
     * kullanılmayan fiil anlamını bulup *"Well worth thee, me friend"*
     * örneğini verdi. Öğretmen anlamı söylediyse, o anlamda kullanıldığını
     * bildiğimiz tek cümle metindekidir.
     */
    let examples = teacherExamples ?? passageExample(sentence);
    let exampleSource: LookupResult['exampleSource'] = teacherExamples
      ? 'teacher'
      : examples
        ? 'passage'
        : undefined;
    let synonym = entry.synonym;
    let definition: string | undefined;

    if (!examples && !isPhrase) {
      const online = await gatherOnline(word, lemma);
      if (online) {
        const sentenceTr = await sentencePromise;
        const picked =
          pickByContext(online.candidates, sentenceTr) ??
          pickDefault(online.candidates, !!lemma);
        const def = pickDefGroup(
          picked?.pos,
          online.defSurface,
          online.defLemma,
          isIrregularForm(word)
        );
        const filtered = filterExamples(def?.examples, word, lemma, maxExampleWords);
        if (filtered) {
          examples = filtered;
          exampleSource = 'dictionary';
        }
        synonym = synonym ?? def?.synonym;
        definition = def?.definition;
      }
    }

    return {
      word: entry.word,
      phrase: isPhrase ? entry.word : undefined,
      meaning: entry.meaning,
      source: 'glossary',
      otherMeanings: entry.senses?.length ? entry.senses : undefined,
      synonym,
      examples,
      exampleSource,
      definition,
      sentenceTr: (await sentencePromise) ?? undefined,
    };
  }

  /* 2. Sözlükte olmayan kelime — internetten anlam da dahil her şey */
  const online = await gatherOnline(word, lemma);
  const sentenceTr = await sentencePromise;

  if (!online) {
    return { word, meaning: null, source: 'none', sentenceTr: sentenceTr ?? undefined };
  }

  return buildResult({
    word,
    candidates: online.candidates,
    lemma,
    maxExampleWords,
    sentence,
    sentenceTr,
    defSurface: online.defSurface,
    defLemma: online.defLemma,
    source: 'online',
  });
}

/** Adaylardan bağlama uygun olanı seçip sonucu kurar. */
function buildResult(input: {
  word: string;
  candidates: Candidate[];
  lemma?: string;
  maxExampleWords: number;
  /** Metindeki cümle — sözlükte örnek yoksa örnek olarak kullanılır */
  sentence?: string;
  sentenceTr: string | null;
  /** Yazıldığı hâlin sözlük bilgisi ("felt" → keçe + …) */
  defSurface?: DefGroup[];
  /** Sözlük hâlinin sözlük bilgisi ("feel" → hissetmek + …) */
  defLemma?: DefGroup[];
  source: LookupSource;
}): LookupResult {
  const contextual = pickByContext(input.candidates, input.sentenceTr);
  const picked = contextual ?? pickDefault(input.candidates, !!input.lemma);
  const chosen = picked?.term ?? null;

  // Tanım/örnek, seçilen anlamın **sözcük türüyle** eşleşen bölümden alınır
  const def = pickDefGroup(
    picked?.pos,
    input.defSurface,
    input.defLemma,
    isIrregularForm(input.word)
  );

  const filtered = filterExamples(
    def?.examples,
    input.word,
    input.lemma,
    input.maxExampleWords
  );
  const examples = filtered ?? passageExample(input.sentence);

  return {
    word: input.word,
    meaning: chosen ? matchCase(chosen, input.word) : null,
    source: input.source,
    fromContext: !!contextual,
    otherMeanings: otherMeaningsOf(input.candidates, chosen),
    synonym: def?.synonym,
    examples,
    exampleSource: examples ? (filtered ? 'dictionary' : 'passage') : undefined,
    definition: def?.definition,
    baseForm: input.lemma,
    sentenceTr: input.sentenceTr ?? undefined,
  };
}

/** Önbellekteki kelime sayısı — Ayarlar'da gösterilir. */
export async function cachedWordCount(): Promise<number> {
  const cache = await loadCache();
  return Object.keys(cache).length;
}
