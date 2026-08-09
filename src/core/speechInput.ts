/**
 * Mikrofonla konuşma girişi.
 *
 * Kullanıcı konuşma görevini şimdiye kadar iOS klavyesinin dikte tuşuyla
 * yapıyordu: kutuya dokun, klavyeyi aç, mikrofon simgesini bul, bas. Üç adım
 * ve her seferinde aynı zahmet. Bunun yerine ekrandaki tek bir düğme.
 *
 * **Neden tarayıcının kendi motoru:** Ücretli bir konuşma tanıma servisi
 * kullanmak projenin $0 kısıtına aykırı. Safari ve Chrome'da yerleşik
 * `SpeechRecognition` ücretsiz ve anahtarsız. İzin, ilk `start()` çağrısında
 * tarayıcı tarafından bir kez isteniyor; kullanıcı "İzin ver" dedikten sonra
 * bir daha sorulmuyor.
 *
 * **Sınırlar (dürüstçe):**
 * - Safari'de tanıma Apple'ın sunucusunda yapılır, internet gerekir.
 * - iOS'ta oturum bir süre sonra kendiliğinden kapanabiliyor; kayıt sürerken
 *   otomatik yeniden başlatılıyor.
 * - Desteklenmeyen bir tarayıcıda `isSpeechInputSupported()` false döner ve
 *   ekran eski klavye-dikte yönergesini gösterir. Yol kapanmaz.
 */

import { Platform } from 'react-native';

/** Tarayıcının konuşma tanıma arayüzü — tipler henüz standart değil. */
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechInputSupported(): boolean {
  return getCtor() !== null;
}

export type SpeechInputError =
  | 'not-allowed'
  | 'no-speech'
  | 'network'
  | 'unsupported'
  | 'other';

/** Tarayıcının hata kodunu kullanıcıya söylenebilecek Türkçe mesaja çevirir. */
export function describeSpeechError(error: SpeechInputError): string {
  switch (error) {
    case 'not-allowed':
      return 'Mikrofon izni verilmedi. Safari\'de adres çubuğundaki "aA" → Web Sitesi Ayarları → Mikrofon → İzin ver.';
    case 'no-speech':
      return 'Ses duyulmadı. Mikrofona biraz daha yakın konuş.';
    case 'network':
      return 'Tanıma için internet gerekiyor; bağlantını kontrol et.';
    case 'unsupported':
      return 'Bu tarayıcı mikrofonla yazmayı desteklemiyor. Klavyedeki mikrofon tuşunu kullanabilirsin.';
    default:
      return 'Mikrofon başlatılamadı. Klavyedeki mikrofon tuşunu kullanabilirsin.';
  }
}

export interface SpeechInputOptions {
  /** Kesinleşmiş metin — mevcut yazının sonuna eklenir */
  onFinal: (text: string) => void;
  /** Konuşurken anlık görünen taslak metin */
  onInterim?: (text: string) => void;
  onError?: (error: SpeechInputError) => void;
  /** Kayıt tamamen bittiğinde (kullanıcı durdurunca veya hata sonrası) */
  onStop?: () => void;
}

export interface SpeechInputHandle {
  stop: () => void;
}

/**
 * Dinlemeye başlar. Desteklenmiyorsa `null` döner ve `onError` çağrılır.
 *
 * Döndürülen `stop()` çağrılana kadar dinlemeye devam eder; arada tarayıcı
 * oturumu kapatırsa sessizce yeniden başlatılır.
 */
export function startSpeechInput(options: SpeechInputOptions): SpeechInputHandle | null {
  const Ctor = getCtor();
  if (!Ctor) {
    options.onError?.('unsupported');
    return null;
  }

  let stopped = false;
  let recognition: Recognition | null = null;

  const begin = () => {
    const r = new Ctor();
    recognition = r;
    r.lang = 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) options.onFinal(text.trim());
        else interim += text;
      }
      if (interim) options.onInterim?.(interim.trim());
    };

    r.onerror = (event) => {
      const code = event.error;
      // Sessizlik hatası kaydı bitirmez; konuşmayı beklemeye devam eder
      if (code === 'no-speech') return;
      stopped = true;
      const mapped: SpeechInputError =
        code === 'not-allowed' || code === 'service-not-allowed'
          ? 'not-allowed'
          : code === 'network'
            ? 'network'
            : 'other';
      options.onError?.(mapped);
      options.onStop?.();
    };

    r.onend = () => {
      // iOS oturumu kendiliğinden kapatabiliyor — kullanıcı durdurmadıysa devam
      if (stopped) {
        options.onStop?.();
        return;
      }
      try {
        r.start();
      } catch {
        stopped = true;
        options.onStop?.();
      }
    };

    try {
      r.start();
    } catch {
      stopped = true;
      options.onError?.('other');
      options.onStop?.();
    }
  };

  begin();

  return {
    stop: () => {
      stopped = true;
      try {
        recognition?.stop();
      } catch {
        options.onStop?.();
      }
    },
  };
}
