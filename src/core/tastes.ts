/**
 * Zevkler — **aşamalı seçim**.
 *
 * Kullanıcının kuralı: *"bu tercihleri hobileri biz yazmayalım, aşamalı
 * seçenek kısmını getir; ilk olarak hobiler alanları aç — spor, hayat,
 * eğlence falan — en son seçenek 'kendim yazmak istiyorum'. Sonra sıradaki
 * soru müzik türü, seçenekler, en son 'kendim yazmak istiyorum'."*
 *
 * Tasarım kararları:
 *
 * 1. **Soru soru ilerler**, hepsi tek ekranda değil. Uzun liste seçtirmiyor,
 *    yıldırıyor (kullanıcının bilinen tercihi: uzun seçenek listesi yerine
 *    somut, kısa adımlar).
 * 2. **Sonraki soru öncekine bağlı.** Müzik seçmediyse müzik türü sorulmaz.
 *    Sormak zaman kaybı, cevap da gürültü olur.
 * 3. **Her listenin sonunda "Kendim yazmak istiyorum"** var — hazır
 *    seçenekler kimseyi kutuya sokmasın.
 * 4. Değerler **sabit anahtarlar** (`metal`, `superhero`), etiketler Türkçe.
 *    Öğretmene giden metni `describeTastes` üretir; böylece "metal" ile
 *    "metal müzik" iki ayrı şey sanılmaz.
 *
 * Saf TypeScript — ekrandan bağımsız, node ile sınanabilir.
 */

import type { Tastes } from '../db/types';

export interface TasteOption {
  /** Sabit anahtar — veriye bu yazılır */
  value: string;
  /** Ekranda görünen Türkçe etiket */
  label: string;
}

export interface TasteStep {
  /** Hangi alana yazılacak */
  field: 'areas' | 'music' | 'screen' | 'sports' | 'other';
  /** Ekranda görünen soru */
  question: string;
  /** Neden soruyoruz — tek satır, altında görünür */
  why: string;
  options: TasteOption[];
  /**
   * Bu adım yalnızca ilgi alanlarında şu seçenek varsa sorulur.
   * Boşsa her zaman sorulur.
   */
  requiresArea?: string;
}

/** Her listenin sonuna eklenen kaçış seçeneği */
export const CUSTOM_VALUE = 'kendim';
const CUSTOM_OPTION: TasteOption = {
  value: CUSTOM_VALUE,
  label: '✏️  Kendim yazmak istiyorum',
};

function withCustom(options: TasteOption[]): TasteOption[] {
  return [...options, CUSTOM_OPTION];
}

export const TASTE_STEPS: TasteStep[] = [
  {
    field: 'areas',
    question: 'Neyle ilgilenirsin?',
    why: 'Öğretmen günlük içeriği ve sohbet konusunu buradan seçecek. Birkaç tane seçebilirsin.',
    options: withCustom([
      { value: 'muzik', label: '🎵  Müzik' },
      { value: 'dizi', label: '📺  Dizi ve film' },
      { value: 'spor', label: '⚽  Spor' },
      { value: 'oyun', label: '🎮  Oyun' },
      { value: 'teknoloji', label: '💻  Teknoloji' },
      { value: 'yemek', label: '🍳  Yemek' },
      { value: 'seyahat', label: '✈️  Seyahat' },
      { value: 'tarih', label: '🏛️  Tarih ve belgesel' },
      { value: 'bilim', label: '🔬  Bilim' },
      { value: 'kitap', label: '📚  Kitap' },
      { value: 'is', label: '📈  İş ve ekonomi' },
      { value: 'otomobil', label: '🚗  Otomobil' },
    ]),
  },
  {
    field: 'music',
    /**
     * ⚠️ **Müzik herkese sorulur** — burada bir zamanlar `requiresArea: 'muzik'`
     * vardı. Kullanıcının tespiti: *"bu sistemde müzik seçmeyen adam çöpe
     * gidiyor, ondan zorunlu seçtirelim."*
     *
     * Haklı: günün dinleme içeriği bir şarkı ve tür seçilmemişse herkese aynı
     * tarafsız parça çıkıyordu. Oysa müzik dinlemeyi "ilgi alanı" saymayan
     * biri de bir tür tercih ediyor — sadece hobisi olarak görmüyor. İlgi
     * alanına bağlamak, cevabı olan bir soruyu sormamak demekti.
     */
    question: 'Hangi müziği dinlersin?',
    why: 'Günün dinleme çalışması bir şarkı üzerinden gidiyor. Sevmediğin türden şarkı açılmaz; açılmayan şarkı hiçbir şey öğretmez.',
    options: withCustom([
      { value: 'rock', label: '🎸  Rock' },
      { value: 'metal', label: '🤘  Metal' },
      { value: 'pop', label: '🎤  Pop' },
      { value: 'rap', label: '🎧  Rap / Hip-hop' },
      { value: 'elektronik', label: '🎛️  Elektronik' },
      { value: 'caz', label: '🎺  Caz' },
      { value: 'blues', label: '🎹  Blues' },
      { value: 'klasik', label: '🎻  Klasik' },
      { value: 'country', label: '🪕  Country' },
      { value: 'akustik', label: '🪗  Akustik / folk' },
    ]),
  },
  {
    field: 'screen',
    requiresArea: 'dizi',
    question: 'Ne izlemeyi seversin?',
    why: 'Dizi bölümü önerisi ve akşamki sohbet konusu buna göre seçilecek.',
    options: withCustom([
      { value: 'superhero', label: '🦸  Süper kahraman' },
      { value: 'scifi', label: '🚀  Bilim kurgu' },
      { value: 'polisiye', label: '🕵️  Polisiye / suç' },
      { value: 'komedi', label: '😄  Komedi' },
      { value: 'dram', label: '🎭  Dram' },
      { value: 'gerilim', label: '😰  Gerilim' },
      { value: 'belgesel', label: '🌍  Belgesel' },
      { value: 'animasyon', label: '🎨  Animasyon' },
      { value: 'tarihi', label: '⚔️  Tarihi' },
      { value: 'fantastik', label: '🐉  Fantastik' },
    ]),
  },
  {
    field: 'sports',
    requiresArea: 'spor',
    question: 'Hangi spor?',
    why: 'Maç özeti, röportaj ve spor podcast’i önerileri buradan gelecek.',
    options: withCustom([
      { value: 'futbol', label: '⚽  Futbol' },
      { value: 'basketbol', label: '🏀  Basketbol' },
      { value: 'fitness', label: '🏋️  Fitness' },
      { value: 'dovus', label: '🥊  Dövüş sporları' },
      { value: 'motor', label: '🏎️  Motor sporları' },
      { value: 'kosu', label: '🏃  Koşu' },
      { value: 'tenis', label: '🎾  Tenis' },
      { value: 'dogaspor', label: '🥾  Doğa sporları' },
    ]),
  },
  {
    field: 'other',
    question: 'Son bir şey: hangi ortamda İngilizce kullanmak istersin?',
    why: 'Sohbetin ve yazma görevlerinin geçtiği dünya buna göre kurulacak.',
    options: withCustom([
      { value: 'gunluk', label: '☕  Günlük hayat, arkadaş sohbeti' },
      { value: 'ofis', label: '🏢  İş / toplantı / e-posta' },
      { value: 'seyahat-ortam', label: '🧳  Seyahat, havaalanı, otel' },
      { value: 'sosyal', label: '📱  Sosyal medya, internet' },
      { value: 'akademik', label: '🎓  Akademik / teknik metin' },
    ]),
  },
];

/** Kullanıcının seçimlerine göre gerçekten sorulacak adımlar */
export function activeSteps(tastes: Tastes): TasteStep[] {
  return TASTE_STEPS.filter(
    (step) => !step.requiresArea || tastes.areas.includes(step.requiresArea)
  );
}

export function emptyTastes(): Tastes {
  return { areas: [], music: [], screen: [], sports: [], other: [] };
}

/** Bir anahtarın Türkçe etiketi — ekranda özet göstermek için */
export function labelOf(value: string): string {
  for (const step of TASTE_STEPS) {
    const found = step.options.find((o) => o.value === value);
    // Etiketin başındaki emojiyi at, sadece kelime kalsın
    if (found) return found.label.replace(/^[^\p{L}]+/u, '').trim();
  }
  return value;
}

/**
 * Öğretmene giden metin.
 *
 * Neden düz metin: öğretmen komutu bunu okuyup içerik seçiyor; yapılandırılmış
 * JSON'u da okuyabilirdi ama cümle hâlinde okumak "rock ve metal dinliyor,
 * süper kahraman dizileri izliyor" gibi bir bağlam veriyor ve öneri daha
 * isabetli çıkıyor. Ham liste yine `outbox.profile.tastes` içinde gidiyor.
 */
export function describeTastes(tastes: Tastes | undefined): string {
  if (!tastes) return '';
  const parts: string[] = [];

  const named = (values: string[]) =>
    values.filter((v) => v !== CUSTOM_VALUE).map(labelOf);

  const areas = named(tastes.areas);
  if (areas.length) parts.push(`İlgi alanları: ${areas.join(', ')}`);

  const music = named(tastes.music);
  if (music.length) parts.push(`Müzik: ${music.join(', ')}`);

  const screen = named(tastes.screen);
  if (screen.length) parts.push(`Dizi/film: ${screen.join(', ')}`);

  const sports = named(tastes.sports);
  if (sports.length) parts.push(`Spor: ${sports.join(', ')}`);

  const other = named(tastes.other);
  if (other.length) parts.push(`Kullanım ortamı: ${other.join(', ')}`);

  if (tastes.note?.trim()) parts.push(`Kendi yazdığı: ${tastes.note.trim()}`);

  return parts.join(' · ');
}

/** Hiç seçim yapılmamış mı — ekranda "doldur" uyarısı için */
export function isEmpty(tastes: Tastes | undefined): boolean {
  if (!tastes) return true;
  return (
    tastes.areas.length === 0 &&
    tastes.music.length === 0 &&
    tastes.screen.length === 0 &&
    tastes.sports.length === 0 &&
    tastes.other.length === 0 &&
    !tastes.note?.trim()
  );
}
