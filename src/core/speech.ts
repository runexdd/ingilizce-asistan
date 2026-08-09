import * as Speech from 'expo-speech';

/**
 * Seslendirme yardımcısı.
 *
 * Sorun: cihazlarda birden fazla İngilizce ses var ve varsayılan genellikle
 * en düşük kaliteli olanı ("compact"). Robotik duyulmasının sebebi bu.
 * Burada mevcut sesler taranıp en iyisi seçiliyor.
 *
 * Not: iOS'ta en büyük kalite sıçraması, kullanıcının
 * Ayarlar → Erişilebilirlik → Sözlü İçerik → Sesler bölümünden
 * "Enhanced/Premium" İngilizce sesi indirmesiyle olur (ücretsiz).
 * Uygulama indirilmiş sesi otomatik bulup kullanır.
 */

let cached: string | null | undefined;

/** Sesin kalitesini puanlar — yüksek puan daha doğal. */
function rankVoice(voice: Speech.Voice): number {
  const name = (voice.name ?? '').toLowerCase();
  const identifier = (voice.identifier ?? '').toLowerCase();
  const quality = String(voice.quality ?? '').toLowerCase();
  const language = (voice.language ?? '').toLowerCase();

  let score = 0;

  // Cihazın "gelişmiş" olarak işaretlediği sesler belirgin şekilde daha doğal
  if (quality.includes('enhanced') || quality.includes('premium')) score += 12;

  // Modern sinir ağı tabanlı sesler
  if (/premium|enhanced|neural|natural|siri/.test(name + identifier)) score += 8;

  // iOS/macOS ve tarayıcılarda kalitesi bilinen sesler
  if (/samantha|ava|allison|serena|daniel|karen|moira|tessa|nathan|joelle/.test(name)) {
    score += 4;
  }

  // Google'ın web sesleri de fena değil
  if (/google (uk|us) english/.test(name)) score += 5;

  // Sıkıştırılmış / eski sesler — robotik duyulanlar bunlar
  if (/compact|eloquence|espeak|microsoft (david|zira)/.test(name + identifier)) {
    score -= 10;
  }

  // Aksan tercihi: US > GB > diğer
  if (language.startsWith('en-us')) score += 3;
  else if (language.startsWith('en-gb')) score += 2;

  return score;
}

/** Cihazdaki en doğal İngilizce sesi bulur (bir kez, sonra önbellekten). */
async function bestVoice(): Promise<string | undefined> {
  if (cached !== undefined) return cached ?? undefined;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const english = voices.filter((v) =>
      (v.language ?? '').toLowerCase().startsWith('en')
    );
    if (english.length === 0) {
      cached = null;
      return undefined;
    }
    const best = [...english].sort((a, b) => rankVoice(b) - rankVoice(a))[0];
    cached = best?.identifier ?? null;
  } catch {
    // Ses listesi alınamadıysa varsayılanla devam et
    cached = null;
  }
  return cached ?? undefined;
}

/**
 * Kullanıcının Ayarlar'dan seçtiği ses.
 * Seçilmişse otomatik seçimin önüne geçer — kulak, algoritmadan iyi karar verir.
 */
let preferredVoice: string | undefined;

export function setPreferredVoice(id: string | undefined) {
  preferredVoice = id || undefined;
}

export interface SpeakOptions {
  onDone?: () => void;
  onError?: () => void;
  /** Konuşma hızı — 1.0 normal. Öğrenciler için biraz yavaş iyidir. */
  rate?: number;
  /** Bu çağrı için sesi zorla (ses denemede kullanılır) */
  voice?: string;
}

/**
 * İngilizce metni mümkün olan en doğal sesle okur.
 * Zaten konuşuyorsa durdurur (aynı butona basınca dursun).
 */
export async function speakEnglish(text: string, options: SpeakOptions = {}) {
  const voice = options.voice ?? preferredVoice ?? (await bestVoice());
  Speech.speak(text, {
    language: 'en-US',
    voice,
    // 0.95: doğal ama takip edilebilir. Çok yavaş olunca robotik duyuluyor.
    rate: options.rate ?? 0.95,
    pitch: 1.0,
    onDone: options.onDone,
    onStopped: options.onDone,
    onError: options.onError ?? options.onDone,
  });
}

export function stopSpeaking() {
  void Speech.stop();
}

export interface VoiceOption {
  id: string;
  name: string;
  quality: string;
  language: string;
  score: number;
  /** Algoritmanın en iyi bulduğu ses mi */
  recommended: boolean;
}

/** Ayarlar ekranındaki ses seçici için: cihazdaki İngilizce sesler, iyiden kötüye. */
export async function listEnglishVoices(): Promise<VoiceOption[]> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const list = voices
      .filter((v) => (v.language ?? '').toLowerCase().startsWith('en'))
      .map((v) => ({
        id: v.identifier ?? v.name ?? '',
        name: v.name ?? v.identifier ?? '?',
        quality: String(v.quality ?? '-'),
        language: v.language ?? '-',
        score: rankVoice(v),
        recommended: false,
      }))
      .filter((v) => v.id)
      .sort((a, b) => b.score - a.score);

    if (list.length > 0) list[0].recommended = true;
    return list;
  } catch {
    return [];
  }
}
