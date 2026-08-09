import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toISODate } from '../core/srs';
import { newId } from './id';
import { DATA_VERSION, type AppData, type Card } from './types';

/**
 * Kalıcı veri deposu.
 *
 * Tüm veri tek bir JSON belgesi olarak AsyncStorage'da tutulur — tarayıcıda
 * localStorage'a, telefonda yerel depoya yazar. Okuma senkron (bellekten),
 * yazma arka planda kalıcılaşır; böylece arayüz hiçbir zaman beklemez.
 */

const STORAGE_KEY = 'ingilizce-asistan/data';

/** Kimlik üretici `id.ts`'e taşındı (saf olsun, testten yüklenebilsin). */
export { newId } from './id';

/**
 * Başlangıç kelimeleri — kasten GENEL günlük İngilizce.
 * Mesleğe özel kelimeler buraya konmaz; onlar kullanıcının kendi
 * yazdıklarından ve seçtiği konulardan doğal olarak üretilir.
 */
const SEED_WORDS: Array<[string, string, string]> = [
  ['to figure out', 'çözmek, anlamak', "I couldn't figure out why the app kept crashing."],
  ['to look forward to', 'dört gözle beklemek', "I'm looking forward to the weekend."],
  ['to come up with', 'bulmak, akıl etmek', 'She came up with a much simpler solution.'],
  ['to run out of', 'tükenmek, bitmek', 'We ran out of time before the last question.'],
  ['eventually', 'sonunda, eninde sonunda', 'It was hard at first, but eventually it got easier.'],
  ['to be about to', 'üzere olmak', 'I was about to call you.'],
  ['to struggle with', 'zorlanmak', 'A lot of people struggle with speaking, not grammar.'],
  ['to keep up with', 'ayak uydurmak, takip etmek', "It's hard to keep up with the news these days."],
  ['reliable', 'güvenilir', 'He is the most reliable person on the team.'],
  ['to make sense', 'mantıklı gelmek', "That doesn't make sense to me."],
  ['on purpose', 'bilerek, kasten', "I didn't do it on purpose."],
  ['to get used to', 'alışmak', 'It took me a month to get used to the new schedule.'],
];

export function createInitialData(today: Date = new Date()): AppData {
  const iso = toISODate(today);
  const cards: Card[] = SEED_WORDS.map(([word, meaning, example]) => ({
    id: newId('card'),
    word,
    meaning,
    example,
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueDate: iso,
    createdAt: iso,
    sourceTaskId: null,
  }));

  return {
    version: DATA_VERSION,
    profile: {
      level: 'B1',
      goals: 'gunluk,is',
      weekdayMinutes: 6,
      weekendMinutes: 25,
      placementDone: false,
    },
    cards,
    errors: [],
    tasks: [],
    sessions: [],
    sync: {},
    suggestedTasks: [],
    content: [],
    scores: [],
    contentDone: [],
    conversations: [],
    targetHistory: [],
  };
}

interface StoreApi {
  data: AppData;
  /** Veriyi değiştirir: yeni AppData döndüren saf bir fonksiyon ver. */
  update: (fn: (current: AppData) => AppData) => void;
  /** Her şeyi siler ve başlangıç durumuna döner. */
  reset: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const dataRef = useRef<AppData | null>(null);

  // İlk yükleme
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let loaded: AppData | null = null;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AppData;
          if (parsed && parsed.version === DATA_VERSION && parsed.profile) {
            // Sonradan eklenen alanlar eski kayıtlarda olmayabilir
            loaded = {
              ...parsed,
              sync: parsed.sync ?? {},
              suggestedTasks: parsed.suggestedTasks ?? [],
              content: parsed.content ?? [],
              scores: parsed.scores ?? [],
              contentDone: parsed.contentDone ?? [],
              conversations: parsed.conversations ?? [],
              targetHistory: parsed.targetHistory ?? [],
            };
          }
        }
      } catch {
        // Bozuk veya okunamayan veri: sıfırdan başla, uygulama çökmesin.
        loaded = null;
      }

      const next = loaded ?? createInitialData();
      if (cancelled) return;
      dataRef.current = next;
      setData(next);
      if (!loaded) {
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((fn: (current: AppData) => AppData) => {
    const current = dataRef.current;
    if (!current) return;
    const next = fn(current);
    dataRef.current = next;
    setData(next);
    // Kalıcılaştırma arka planda; arayüz beklemez.
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    const fresh = createInitialData();
    dataRef.current = fresh;
    setData(fresh);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)).catch(() => {});
  }, []);

  const api = useMemo<StoreApi | null>(
    () => (data ? { data, update, reset } : null),
    [data, update, reset]
  );

  // Veri yüklenene kadar hiçbir ekran çizilmez (çok kısa sürer).
  if (!api) return null;

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore, StoreProvider içinde kullanılmalı');
  }
  return ctx;
}
