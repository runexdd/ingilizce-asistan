/**
 * Kelime arama.
 *
 * Metindeki HER kelimeye dokunulabilir olmalı — sadece öğretmenin sözlüğe
 * koyduklarına değil. Okurken takıldığın kelime, öğretmenin zor sandığı
 * kelime olmak zorunda değil.
 *
 * Sıra:
 *   1. Öğretmenin sözlüğü  — anında, çevrimdışı, en güvenilir (bağlama uygun)
 *   2. Yerel önbellek      — daha önce baktığın kelimeler, anında ve çevrimdışı
 *   3. Ücretsiz çeviri API — ilk kez bakılan kelimeler
 *
 * Sonuçlar önbelleğe yazılır; aynı kelimeye ikinci kez baktığında internet
 * gerekmez.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'ingilizce-asistan/dict-cache';
/** Önbellek sınırı — sonsuz büyümesin */
const MAX_ENTRIES = 3000;

export type LookupSource = 'glossary' | 'cache' | 'online' | 'none';

export interface LookupResult {
  word: string;
  meaning: string | null;
  source: LookupSource;
  /** Varsa İngilizce tanım (ek bağlam) */
  definition?: string;
}

let memoryCache: Record<string, string> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/^[^a-zçğıöşü']+|[^a-zçğıöşü']+$/gi, '')
    .trim();
}

async function loadCache(): Promise<Record<string, string>> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    memoryCache = raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    memoryCache = {};
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

/** MyMemory — ücretsiz, anahtar gerektirmez, tarayıcıdan çağrılabilir. */
async function translateOnline(word: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|tr`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    const text = data.responseData?.translatedText?.trim();
    if (!text) return null;
    // API bazen bulamadığında sorguyu aynen geri döndürür
    if (text.toLowerCase() === word.toLowerCase()) return null;
    // Bazen büyük harfle uyarı metni döner
    if (/NO QUERY SPECIFIED|INVALID/i.test(text)) return null;
    return text;
  } catch {
    return null;
  }
}

/** dictionaryapi.dev — İngilizce tanım, ek bağlam için. Ücretsiz, anahtarsız. */
async function defineOnline(word: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      meanings?: Array<{
        partOfSpeech?: string;
        definitions?: Array<{ definition?: string }>;
      }>;
    }>;
    const first = data?.[0]?.meanings?.[0];
    const def = first?.definitions?.[0]?.definition;
    if (!def) return null;
    return first?.partOfSpeech ? `(${first.partOfSpeech}) ${def}` : def;
  } catch {
    return null;
  }
}

/**
 * Kelimeyi arar.
 * `glossary` öğretmenin bağlama uygun anlamıdır — her zaman önceliklidir.
 */
export async function lookupWord(
  raw: string,
  glossary: Record<string, string> = {}
): Promise<LookupResult> {
  const word = normalizeWord(raw);
  if (!word) return { word: raw, meaning: null, source: 'none' };

  if (glossary[word]) {
    return { word, meaning: glossary[word], source: 'glossary' };
  }

  const cache = await loadCache();
  if (cache[word]) {
    return { word, meaning: cache[word], source: 'cache' };
  }

  // Çeviri ve tanımı paralel iste — biri gelmezse diğeri kurtarır
  const [translation, definition] = await Promise.all([
    translateOnline(word),
    defineOnline(word),
  ]);

  if (translation) {
    cache[word] = translation;
    scheduleSave();
  }

  if (!translation && !definition) {
    return { word, meaning: null, source: 'none' };
  }

  return {
    word,
    meaning: translation,
    source: 'online',
    definition: definition ?? undefined,
  };
}

/** Önbellekteki kelime sayısı — Ayarlar'da gösterilir. */
export async function cachedWordCount(): Promise<number> {
  const cache = await loadCache();
  return Object.keys(cache).length;
}
