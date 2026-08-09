/**
 * Seviye — uygulamanın tek doğruluk kaynağı.
 *
 * Saf TypeScript: ağ, veritabanı ve AI çağrısı YOK.
 *
 * **Neden tek dosya:** Seviye önce sadece yerleştirme sınavındaydı, sonra
 * okuma sözlüğündeki örnek cümlelere eklendi. Her yere ayrı ayrı serpiştirmek
 * kaçınılmaz olarak birbirini tutmayan sayılar doğurur — bir ekran A2'ye 10
 * kelimelik cümle uygun görürken diğeri 20 kelimelik görev verir. Seviyeye
 * bağlı ne varsa buradan okunur; öğretmen tarafındaki karşılığı
 * `.claude/commands/ogretmen.md` içindeki "Seviye" bölümüdür ve bu tabloyla
 * aynı sayıları kullanır.
 *
 * Ürün kararı: seviye sabit bir kapı değil, **kayan bir başlangıç noktası.**
 * Kullanıcı bir seviyeye kilitlenmez; gerçek performansına göre güncellenir.
 */

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const LEVEL_DESCRIPTIONS: Record<CEFRLevel, string> = {
  A1: 'Başlangıç — temel kalıplar ve günlük kelimeler',
  A2: 'Temel — tanıdık konularda basit iletişim',
  B1: 'Orta — günlük durumlarda kendini ifade edebiliyorsun',
  B2: 'Orta-üstü — akıcı konuşuyor, karmaşık metinleri anlıyorsun',
  C1: 'İleri — esnek ve etkili dil kullanımı',
  C2: 'Ustalık — neredeyse ana dili düzeyinde',
};

/** Kendi seviyesini seçmek isteyenler için açıklamalar */
export const LEVEL_SELF_HINTS: Record<CEFRLevel, string> = {
  A1: 'Yeni başlıyorum, temel cümleler kurabiliyorum',
  A2: 'Basit sohbetleri anlıyorum, kendimi zorlanarak anlatıyorum',
  B1: 'Günlük konularda konuşabiliyorum, hata yapıyorum',
  B2: 'Rahat konuşuyorum, film/dizi çoğunlukla anlaşılıyor',
  C1: 'Karmaşık konularda tartışabiliyorum',
  C2: 'Neredeyse ana dilim gibi',
};

/**
 * Bir seviyede neyin ne kadar olacağı.
 *
 * Sayılar kullanıcının temposuna göre seçildi: iş günü ~6 dk, hafta sonu
 * ~25 dk. Bu yüzden görevler kısa, metinler bir oturuşta okunacak boyutta.
 */
export interface LevelSpec {
  /** Örnek cümle en fazla kaç kelime olabilir (okuma sözlüğü, kartlar) */
  maxExampleWords: number;
  /** Yazma görevinde beklenen cümle sayısı */
  writingSentences: [number, number];
  /** Konuşma görevinde hedeflenen süre (saniye) */
  speakingSeconds: number;
  /** Okuma parçasının uzunluğu (kelime) */
  passageWords: [number, number];
  /** Günde önerilen yeni kelime üst sınırı */
  maxNewWordsPerDay: number;
  /** Bu seviyede beklenen dil yapıları — öğretmene ve ekrana aynı metin gider */
  structures: string;
}

export const LEVEL_SPEC: Record<CEFRLevel, LevelSpec> = {
  A1: {
    maxExampleWords: 8,
    writingSentences: [2, 3],
    speakingSeconds: 30,
    passageWords: [60, 100],
    maxNewWordsPerDay: 4,
    structures: 'present simple, temel isim-fiil, tek yapılı kısa cümle',
  },
  A2: {
    maxExampleWords: 10,
    writingSentences: [3, 4],
    speakingSeconds: 45,
    passageWords: [120, 180],
    maxNewWordsPerDay: 5,
    structures: 'past simple, going to, karşılaştırma, temel edatlar',
  },
  B1: {
    maxExampleWords: 14,
    writingSentences: [5, 6],
    speakingSeconds: 60,
    passageWords: [200, 280],
    maxNewWordsPerDay: 6,
    structures: 'present perfect, 1. tip koşul, edilgen çatı, bağlaçlar',
  },
  B2: {
    maxExampleWords: 18,
    writingSentences: [7, 9],
    speakingSeconds: 90,
    passageWords: [300, 400],
    maxNewWordsPerDay: 8,
    structures: 'karma zamanlar, ilgi cümlecikleri, soyut bağlam, deyimsel kullanım',
  },
  C1: {
    maxExampleWords: 25,
    writingSentences: [10, 12],
    speakingSeconds: 120,
    passageWords: [400, 550],
    maxNewWordsPerDay: 10,
    structures: 'esnek üslup, nüans, üstü kapalı anlatım',
  },
  C2: {
    maxExampleWords: 25,
    writingSentences: [10, 14],
    speakingSeconds: 150,
    passageWords: [400, 600],
    maxNewWordsPerDay: 10,
    structures: 'ana dili düzeyinde esneklik, ince ayrımlar',
  },
};

/**
 * Öğretmenin bu öğrenci için verdiği ölçüler — tablodaki varsayılanların
 * üstüne yazar.
 *
 * **Neden var:** Tablo bir başlangıç noktası, kanun değil. Kullanıcının kuralı
 * net: *"A1 şu, A2 bu demektense öğretmen karar versin; karar alıcı o,
 * öğrencilerden gelen geri bildirime göre ayarlasın."* Aynı A2'deki iki kişi
 * aynı değildir — biri 3 cümlede zorlanır, öteki 6 cümleyi rahat yazar.
 * Öğretmen `plan.sizing` ile bunu her senkronda güncelleyebilir.
 *
 * Uygulama hiçbir zaman bu değerleri kendi kendine değiştirmez; sadece
 * öğretmen yazarsa uygular. Yazmazsa tabloya düşer.
 */
export interface LevelSizing {
  writingSentences?: [number, number];
  speakingSeconds?: number;
  passageWords?: [number, number];
  maxExampleWords?: number;
  maxNewWordsPerDay?: number;
  structures?: string;
}

/** Bilinmeyen/boş seviye geldiğinde kullanılan orta nokta. */
export const DEFAULT_LEVEL: CEFRLevel = 'B1';

/** Serbest metni güvenli biçimde CEFR seviyesine çevirir. */
export function toLevel(raw: string | undefined | null): CEFRLevel {
  const key = (raw ?? '').trim().toUpperCase();
  return (LEVELS as string[]).includes(key) ? (key as CEFRLevel) : DEFAULT_LEVEL;
}

export function levelIndex(raw: string | undefined | null): number {
  return LEVELS.indexOf(toLevel(raw));
}

/**
 * Bu öğrenci için geçerli ölçüler.
 *
 * Öğretmen bir alanı doldurmuşsa o kazanır; doldurmadıklarında seviye
 * tablosundaki varsayılan kalır. Uygulamadaki **tek** okuma noktası burasıdır
 * — ekranların doğrudan `LEVEL_SPEC`'e bakması, öğretmenin kararını görmezden
 * gelmek demek olur.
 */
export function specOf(
  raw: string | undefined | null,
  sizing?: LevelSizing | null
): LevelSpec {
  const base = LEVEL_SPEC[toLevel(raw)];
  if (!sizing) return base;
  return {
    writingSentences: sizing.writingSentences ?? base.writingSentences,
    speakingSeconds: sizing.speakingSeconds ?? base.speakingSeconds,
    passageWords: sizing.passageWords ?? base.passageWords,
    maxExampleWords: sizing.maxExampleWords ?? base.maxExampleWords,
    maxNewWordsPerDay: sizing.maxNewWordsPerDay ?? base.maxNewWordsPerDay,
    structures: sizing.structures ?? base.structures,
  };
}

/** Öğretmen bu alanda karar vermiş mi — ekranda belirtmek için. */
export function isTeacherTuned(sizing?: LevelSizing | null): boolean {
  return !!sizing && Object.values(sizing).some((v) => v !== undefined);
}

/** Bir basamak yukarısı — hedef seviye gösterimi için. */
export function nextLevel(raw: string | undefined | null): CEFRLevel | null {
  const index = levelIndex(raw);
  return index >= 0 && index < LEVELS.length - 1 ? LEVELS[index + 1] : null;
}

/** "3-4 cümle" gibi ekranda gösterilecek metin. */
export function describeWritingSize(
  raw: string | undefined | null,
  sizing?: LevelSizing | null
): string {
  const [min, max] = specOf(raw, sizing).writingSentences;
  return `${min}-${max} cümle`;
}

/** "yaklaşık 45 saniye" gibi ekranda gösterilecek metin. */
export function describeSpeakingSize(
  raw: string | undefined | null,
  sizing?: LevelSizing | null
): string {
  return `yaklaşık ${specOf(raw, sizing).speakingSeconds} saniye`;
}
