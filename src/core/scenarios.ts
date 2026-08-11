/**
 * **Canlandırma senaryoları** — günün sohbetinden ayrı, kendi başına bir iş.
 *
 * ## Neden ayrı duruyor
 *
 * Kullanıcının kararı: *"Senaryo işini çok beğendim, kesinlikle o da olsun,
 * A1 seviyesinde seviyeye bağlı gelsin. Bir de bu senaryo kısmını başka bir
 * uygun yere koyabilir miyiz, beraber koymak yerine… tek yere koymak yerine
 * çeşitlendirme yapmak istiyorum."*
 *
 * İkisi farklı iş yapıyor ve birleştirilirse ikisi de zayıflıyor:
 *
 *   • **Günün sohbeti** bir *içerik* üzerine konuşur — izlediğin video,
 *     dinlediğin şarkı. Konusu dünden gelir, malzemesi hazırdır.
 *   • **Canlandırma** bir *durum* içine sokar — restoranda sipariş
 *     veriyorsun, otele giriş yapıyorsun. Konusu hayattan gelir, hazırlık
 *     istemez.
 *
 * Biri "anlat", öteki "yap". A1'de ikincisi özellikle değerli: yeni başlayan
 * biri asıl kalıpları bir durumun içinde öğrenir, tarif ederek değil.
 *
 * ## Seviye
 *
 * Şimdilik yalnızca A1 yazılı — faz kuralı. Turlar `LEVEL_SPEC.A1.structures`
 * ile aynı ölçüde: present simple, tek yapılı cümle, somut cevap. Üst
 * seviyelerin senaryoları kendi fazlarında eklenecek.
 *
 * Saf TypeScript — ağ yok.
 */

import { dayNumber } from './reading';
import { toLevel } from './level';
import type { Tastes } from '../db/types';

export interface ScenarioTurn {
  /** Karşıdakinin repliği — İngilizce */
  say: string;
  /** Türkçe yönlendirme */
  hint: string;
  /** En az kaç kelimeyle cevaplanmalı */
  minWords: number;
}

export interface Scenario {
  id: string;
  /** Hangi zevk anahtarlarına değiyor — boşsa herkese uygun */
  tastes: string[];
  /** Ekranda görünen başlık (Türkçe) */
  title: string;
  /** Sahne tarifi — kullanıcı nerede, kiminle konuşuyor (Türkçe) */
  setting: string;
  /** Karşısındaki kim — "Garson", "Otel görevlisi" */
  role: string;
  /** Kullanılacak kalıplar — ekranda ipucu olarak duruyor */
  phrases: string[];
  turns: ScenarioTurn[];
}

/**
 * A1 canlandırmaları.
 *
 * ⚠️ **`say` ile `hint` aynı şeyi istemeli.** Bağımsız denetim yedi turda
 * uyuşmazlık buldu: İngilizce "Do you come here every day?" (evet/hayır)
 * diye soruyor, Türkçe ipucu "hangi günler geldiğini söyle" diyordu. İkisi de
 * A1 içindeydi, yani seviye ihlali değildi — ama öğrenci ne yapması
 * gerektiğini bilemiyordu. Soru şekli değiştirildi, ipuçları korundu.
 *
 * Her senaryo 4 turdan oluşuyor — günün sohbeti 6 tur, canlandırma daha
 * kısa. Sebebi: rol içinde kalmak yorucu ve A1'de dördüncü turdan sonra
 * cevaplar tekrara düşüyor (ölçüldü: uzun senaryolarda son turlar hep
 * "yes, thank you" oluyordu).
 */
export const A1_SCENARIOS: Scenario[] = [
  {
    id: 'a1s-restoran',
    tastes: ['yemek', 'gunluk', 'seyahat-ortam'],
    title: 'Restoranda sipariş',
    setting: 'Bir restorandasın. Garson masana geliyor.',
    role: 'Garson',
    phrases: ['I would like…', 'How much is it?', 'Thank you'],
    turns: [
      { say: 'Good evening! Welcome. How many people?', hint: 'Kaç kişi olduğunu söyle.', minWords: 4 },
      { say: 'Here is the menu. What would you like to eat?', hint: 'Ne yemek istediğini söyle. "I would like…" ile başla.', minWords: 5 },
      { say: 'Good choice. And to drink?', hint: 'İçecek söyle. Tek cümle yeter.', minWords: 4 },
      { say: 'Of course. Anything else?', hint: 'Başka bir şey istiyor musun? Evet ya da hayır, sonra bir cümle.', minWords: 5 },
    ],
  },
  {
    id: 'a1s-otel',
    tastes: ['seyahat', 'seyahat-ortam'],
    title: 'Otele giriş',
    setting: 'Bir otelin resepsiyonundasın. Görevli seni karşılıyor.',
    role: 'Otel görevlisi',
    phrases: ['I have a room', 'My name is…', 'What time is breakfast?'],
    turns: [
      { say: 'Hello! Welcome. What is your name?', hint: 'Adını söyle.', minWords: 4 },
      { say: 'Thank you. How many nights do you stay?', hint: 'Kaç gece kalacağını söyle.', minWords: 4 },
      { say: 'Your room is on the third floor. Do you have a question?', hint: 'Bir şey sor — kahvaltı saati, oda numarası…', minWords: 5 },
      { say: 'Breakfast is at seven. Have a good day!', hint: 'Teşekkür et ve bir cümle daha ekle.', minWords: 4 },
    ],
  },
  {
    id: 'a1s-magaza',
    tastes: ['gunluk', 'teknoloji', 'otomobil'],
    title: 'Mağazada alışveriş',
    setting: 'Bir mağazadasın. Görevli sana yardım etmek istiyor.',
    role: 'Satış görevlisi',
    phrases: ['I am looking for…', 'How much is it?', 'It is too expensive'],
    turns: [
      { say: 'Hello! Can I help you?', hint: 'Ne aradığını söyle.', minWords: 5 },
      { say: 'We have this one. Do you like it?', hint: 'Beğendin mi? Sebebini tek cümleyle ekle.', minWords: 5 },
      { say: 'It is forty euros.', hint: 'Fiyat hakkında bir şey söyle — pahalı mı, ucuz mu?', minWords: 4 },
      { say: 'Do you want it?', hint: 'Alıyor musun? Cevabını bir cümleyle söyle.', minWords: 4 },
    ],
  },
  {
    id: 'a1s-ise-giris',
    tastes: ['is', 'ofis'],
    title: 'İşte yeni biriyle tanışma',
    setting: 'İş yerinde yeni bir arkadaşınla tanışıyorsun.',
    role: 'Yeni iş arkadaşı',
    phrases: ['I work in…', 'My job is…', 'Nice to meet you'],
    turns: [
      { say: 'Hi! I am new here. What is your name?', hint: 'Adını söyle ve sen de sor.', minWords: 5 },
      { say: 'Nice to meet you. What do you do here?', hint: 'İşini anlat. Geniş zaman yeter.', minWords: 5 },
      { say: 'That sounds good. What time do you start work?', hint: 'Saat kaçta başladığını söyle.', minWords: 4 },
      { say: 'Same for me. Where do you have lunch?', hint: 'Öğle yemeğini nerede yediğini söyle.', minWords: 5 },
    ],
  },
  {
    id: 'a1s-spor',
    tastes: ['spor', 'futbol', 'basketbol', 'tenis', 'dovus', 'fitness', 'kosu'],
    title: 'Spor salonunda',
    setting: 'Spor salonundasın. Yanındaki kişi seninle konuşuyor.',
    role: 'Spor arkadaşı',
    phrases: ['I come here on…', 'I like…', 'How often do you come?'],
    turns: [
      { say: 'Hi! What days do you come here?', hint: 'Hangi günler geldiğini söyle.', minWords: 5 },
      { say: 'Nice. What sport do you like?', hint: 'Sevdiğin sporu söyle.', minWords: 4 },
      { say: 'Do you watch it on TV too?', hint: 'İzliyor musun? Bir cümleyle anlat.', minWords: 5 },
      { say: 'Who is your favourite team?', hint: 'Takımını söyle ve bir şey ekle.', minWords: 5 },
    ],
  },
  {
    id: 'a1s-yarish',
    tastes: ['motor'],
    title: 'Araba galerisinde',
    setting: 'Bir araba galerisindesin. Görevli sana arabaları gösteriyor.',
    role: 'Galeri görevlisi',
    phrases: ['I like this car', 'It is fast', 'What colour is it?'],
    turns: [
      { say: 'Hello! What car do you want?', hint: 'Nasıl bir araba istediğini söyle.', minWords: 5 },
      { say: 'This car is very fast. Do you like it?', hint: 'Beğendin mi? Bir sebep ekle.', minWords: 5 },
      { say: 'What colour do you want?', hint: 'Rengi söyle.', minWords: 4 },
      { say: 'When do you drive your car?', hint: 'Ne zaman araba kullandığını anlat.', minWords: 5 },
    ],
  },
  {
    id: 'a1s-muzik',
    tastes: ['muzik', 'rock', 'metal', 'pop', 'rap', 'caz', 'klasik', 'blues', 'country', 'elektronik', 'akustik'],
    title: 'Arkadaşına şarkı öneriyorsun',
    setting: 'Arkadaşınla müzik dinliyorsunuz. O senin ne dinlediğini soruyor.',
    role: 'Arkadaş',
    phrases: ['I listen to…', 'This song is…', 'You can hear it on…'],
    turns: [
      { say: 'What music do you listen to?', hint: 'Sevdiğin türü söyle.', minWords: 4 },
      { say: 'Do you know a good song? Tell me one.', hint: 'Bir şarkı söyle ve bir şey ekle.', minWords: 5 },
      { say: 'Is it fast or slow? Say two more things.', hint: 'Hızlı mı yavaş mı? İki şey daha ekle.', minWords: 4 },
      { say: 'When do you listen to music?', hint: 'Ne zaman dinlediğini söyle.', minWords: 5 },
    ],
  },
  {
    id: 'a1s-doktor',
    tastes: ['gunluk'],
    title: 'Doktorda',
    setting: 'Doktordasın. Doktor seni dinliyor.',
    role: 'Doktor',
    phrases: ['I am ill', 'My head hurts', 'I am tired'],
    turns: [
      { say: 'Good morning. What is the problem?', hint: 'Neyin var, söyle. Vücut kelimelerini kullan.', minWords: 5 },
      { say: 'I see. How do you sleep at night?', hint: 'Uykunu anlat.', minWords: 4 },
      { say: 'What do you eat every day?', hint: 'Ne yediğini söyle.', minWords: 5 },
      { say: 'Take this medicine every morning. Is it clear?', hint: 'Anladığını söyle ve teşekkür et.', minWords: 4 },
    ],
  },
  {
    id: 'a1s-film',
    tastes: ['dizi', 'superhero', 'scifi', 'polisiye', 'komedi', 'dram', 'animasyon', 'tarihi', 'fantastik', 'gerilim'],
    title: 'Birlikte film seçiyorsunuz',
    setting: 'Arkadaşınla bir film seçmeye çalışıyorsunuz.',
    role: 'Arkadaş',
    phrases: ['I want to watch…', 'It is about…', 'I do not like…'],
    turns: [
      { say: 'What films do you like?', hint: 'Sevdiğin türü söyle.', minWords: 4 },
      { say: 'Tell me about a good film.', hint: 'Bir film anlat, iki cümle.', minWords: 6 },
      { say: 'Who is in the film?', hint: 'Bir karakteri anlat.', minWords: 5 },
      { say: 'Do we watch it tonight?', hint: 'Cevabını bir cümleyle söyle.', minWords: 4 },
    ],
  },
  {
    id: 'a1s-komsu',
    tastes: [],
    title: 'Komşunla asansörde',
    setting: 'Asansördesin. Komşun içeri giriyor.',
    role: 'Komşu',
    phrases: ['Good morning', 'I go to work', 'See you'],
    turns: [
      { say: 'Good morning! How are you today?', hint: 'Nasıl olduğunu söyle.', minWords: 4 },
      { say: 'Where do you go now?', hint: 'Nereye gittiğini söyle.', minWords: 4 },
      { say: 'The weather is very cold today.', hint: 'Hava hakkında bir cümle söyle.', minWords: 4 },
      { say: 'Have a good day!', hint: 'Sen de bir şey dile ve vedalaş.', minWords: 4 },
    ],
  },
  {
    id: 'a1s-yol-tarifi',
    tastes: [],
    title: 'Yol soruyorsun',
    setting: 'Sokaktasın, kayboldun. Birine yol soruyorsun.',
    role: 'Yoldan geçen',
    phrases: ['Excuse me', 'Where is…?', 'Is it far?'],
    turns: [
      { say: 'Yes? Can I help you?', hint: 'Nereyi aradığını sor. "Excuse me, where is…" ile başla.', minWords: 5 },
      { say: 'It is near. Go to the end of this street.', hint: 'Anladığını söyle ve bir soru daha sor.', minWords: 5 },
      { say: 'About ten minutes on foot.', hint: 'Yürüyerek mi gideceğini söyle.', minWords: 4 },
      { say: 'You are welcome. Good luck!', hint: 'Teşekkür et.', minWords: 4 },
    ],
  },
  {
    id: 'a1s-telefon',
    tastes: ['teknoloji', 'sosyal'],
    title: 'Telefonda randevu',
    setting: 'Bir yeri telefonla arıyorsun.',
    role: 'Görevli',
    phrases: ['Hello, this is…', 'I want an appointment', 'What time?'],
    turns: [
      { say: 'Hello, how can I help you?', hint: 'Kendini tanıt ve ne istediğini söyle.', minWords: 6 },
      { say: 'What day is good for you?', hint: 'Bir gün söyle.', minWords: 4 },
      { say: 'We have ten o clock or four o clock.', hint: 'Bir saat seç.', minWords: 4 },
      { say: 'Good. See you then!', hint: 'Teşekkür et ve vedalaş.', minWords: 4 },
    ],
  },
];

/**
 * Kullanıcının zevklerine değen senaryolar.
 *
 * Zevke uyanlar öne alınıyor ama **herkese uygun olanlar da listede kalıyor**:
 * yol sormak ve komşuyla selamlaşmak hobiye bağlı değil, A1'in temel işleri.
 */
export function scenariosFor(tastes: Tastes | undefined): Scenario[] {
  const keys = new Set([
    ...(tastes?.areas ?? []),
    ...(tastes?.music ?? []),
    ...(tastes?.screen ?? []),
    ...(tastes?.sports ?? []),
    ...(tastes?.other ?? []),
  ]);

  const uyan = A1_SCENARIOS.filter((s) => s.tastes.some((t) => keys.has(t)));
  const genel = A1_SCENARIOS.filter((s) => s.tastes.length === 0);
  return uyan.length > 0 ? [...uyan, ...genel] : A1_SCENARIOS;
}

/**
 * Günün canlandırması.
 *
 * ⚠️ Seçim **sırayla** yürüyor, zar atmıyor — müzikteki hatanın aynısı burada
 * da olmasın diye. `variant` "başkasını ver" düğmesiyle artıyor.
 *
 * A1 dışında `null`: üst seviyelerin senaryoları kendi fazlarında yazılacak,
 * A1 senaryosunu B1'e vermek "seviyeye bağlı olsun" kuralını çiğnerdi.
 */
export function scenarioForDay(
  level: string,
  tastes: Tastes | undefined,
  date: string,
  variant = 0
): Scenario | null {
  if (toLevel(level) !== 'A1') return null;

  const havuz = scenariosFor(tastes);
  if (havuz.length === 0) return null;

  const gun = dayNumber(new Date(date + 'T12:00:00'));
  return havuz[(gun + variant) % havuz.length];
}
