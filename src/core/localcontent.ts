/**
 * Yerel içerik ve sohbet — **öğretmen konuşana kadar boşluk kalmasın diye.**
 *
 * ## Neden var
 *
 * Kullanıcının isteği net: *"ben A2'den B1'e çektim, hemen o öğretmen sayfası
 * değişecek… yoksa ben her seçtiğimde bilgisayara gir öğretmen çalıştır, çok
 * uzun sürer."*
 *
 * Öğretmen (Claude Code) bilgisayarda çalışıyor ve paketi gist'e bırakıyor;
 * arada en iyi ihtimalle bir-iki dakika var, bilgisayar kapalıysa daha uzun.
 * O aralıkta ekranın eski seviyenin dizisini göstermesi ya da boş kalması,
 * sistemin "dinamik olmadığı" hissini veren şeydi.
 *
 * Bu dosya o boşluğu dolduruyor: seviye ve zevk seçimine göre **anında**
 * bir dizi/şarkı önerisi ve bir sohbet senaryosu üretiyor.
 *
 * ## Sınırları dürüstçe
 *
 * Bu bir yapay zekâ değil, bir katalog ve birkaç şablon. Öğretmenin yaptığı
 * şeyi yapamaz: kullanıcının dünkü hatalarına bağlanamaz, hikâyeyi
 * sürdüremez, cevabın içeriğine göre soru soramaz. Bu yüzden ekranda kaynağı
 * yazılıyor ("Uygulamanın seçtiği") ve öğretmenin paketi geldiği anda
 * **onunkiler kazanıyor.** Projenin baştan beri işleyen kuralı: uygulama
 * yedektir, karar verici öğretmendir (`reading.ts` ve `wordbank.ts` de aynı
 * mantıkla çalışıyor).
 *
 * Saf TypeScript — ağ yok, React yok, node ile sınanabilir.
 */

import { LEVELS, specOf, toLevel, type LevelSizing } from './level';
import type { ContentSuggestion, ConversationPlan, Tastes } from '../db/types';
import type { CatalogItem } from './catalog/types';
import { A1_CATALOG } from './catalog/a1';
import { A1_CESIT } from './catalog/a1-cesit';
import { A1_MUZIK } from './catalog/a1-muzik';
import { labelOf, sanitizeTastes } from './tastes';
import { tasteFocusFor } from './prompts';
import { dayNumber } from './reading';
import { keysFromNote } from './tastematch';
import { isTooHardFor, levelOfWord } from './wordbank';

/**
 * Ortak katalog — birden çok seviyeye açık, seviyeye özel olmayan içerikler.
 *
 * ⚠️ **Bağlantı ve video kimliği yok, bilerek.** Projenin kuralı: emin
 * olmadığın bağlantıyı uydurma. Burada yalnızca herkesin bulabileceği,
 * yaygın olarak bilinen yapımlar var; kullanıcı kendi servisinde arayıp
 * buluyor. Ölçüt: kullanıcı içeriğin **yarısından fazlasını** anlayabilmeli.
 *
 * Seviyeye özel malzeme artık `catalog/<seviye>.ts` içinde. Sebebi:
 * katalog yatay büyütülünce her seviyede zevklerin çoğu boşta kalıyordu
 * (ölçüm için `catalog/types.ts` başlığına bak). Faz bitince o dosya
 * donuyor, bir daha açılmıyor — hem düzen hem token tasarrufu.
 */
const SHARED_CATALOG: CatalogItem[] = [
  /* ------------------------------------------------ süper kahraman / bilim kurgu */
  {
    id: 'flash-s1e1',
    type: 'series',
    title: 'The Flash · 1. sezon 1. bölüm',
    where: 'Netflix / dijital platformlar',
    levels: ['A2', 'B1'],
    tastes: ['superhero', 'scifi'],
    why: 'Süper kahraman seviyorsun; bu bölümün diyalogları kısa ve olay örgüsü görsel, anlamadığın cümleyi ekrandan tamamlayabiliyorsun.',
    instruction: 'İngilizce altyazıyla izle. İlk 20 dakika yeter; anlamadığın 3 kelimeyi not al.',
    words: [
      { word: 'lightning', meaning: 'şimşek' },
      { word: 'to strike', meaning: 'çarpmak, vurmak' },
      { word: 'lab', meaning: 'laboratuvar' },
      { word: 'to pass out', meaning: 'bayılmak' },
      { word: 'on purpose', meaning: 'bilerek, kasten' },
    ],
    watchFor: [
      'Barry kendini tanıtırken hangi zamanı kullanıyor?',
      'Fırtına sahnesinde geçen "strike" kelimesini yakala.',
    ],
    noun: 'episode',
  },
  {
    id: 'stranger-s1e1',
    type: 'series',
    title: 'Stranger Things · 1. sezon 1. bölüm',
    where: 'Netflix',
    levels: ['B1', 'B2'],
    tastes: ['scifi', 'gerilim', 'fantastik'],
    why: 'Bilim kurgu seviyorsun ve bu dizide konuşmalar günlük dilde — okulda, evde, arkadaş arasında geçen İngilizce.',
    instruction: 'İngilizce altyazıyla izle, ilk 25 dakika. Çocukların birbirine söylediği kalıplara dikkat et.',
    words: [
      { word: 'to disappear', meaning: 'kaybolmak' },
      { word: 'basement', meaning: 'bodrum' },
      { word: 'to freak out', meaning: 'panikleyip çıldırmak' },
      { word: 'weird', meaning: 'tuhaf, garip' },
      { word: 'to show up', meaning: 'ortaya çıkmak, gelmek' },
    ],
    watchFor: [
      '"weird" kelimesi kaç kez geçiyor?',
      'Anne telefonda konuşurken hangi zamanı kullanıyor?',
    ],
    noun: 'episode',
  },
  /* ------------------------------------------------------------- komedi */
  {
    id: 'friends-s1e1',
    type: 'series',
    title: 'Friends · 1. sezon 1. bölüm',
    where: 'Netflix / dijital platformlar',
    levels: ['A1', 'A2', 'B1'],
    tastes: ['komedi', 'dram'],
    why: 'Günlük konuşma İngilizcesi için en kolay başlangıçlardan biri: cümleler kısa, sahneler tek mekânda geçiyor.',
    instruction: 'İngilizce altyazıyla izle. Bir bölüm 22 dakika, bir oturuşta biter.',
    words: [
      { word: 'to break up', meaning: 'ayrılmak (ilişki)' },
      { word: 'to move in', meaning: 'taşınmak (birlikte yaşamaya)' },
      { word: 'awkward', meaning: 'garip, tuhaf (durum)' },
      { word: 'to figure out', meaning: 'çözmek, anlamak' },
      { word: 'to be into something', meaning: 'bir şeye ilgi duymak' },
    ],
    watchFor: [
      'Kahve dükkânı sahnesinde geçen "so" kelimesinin kaç farklı işi var?',
      'Birinin sözünü keserken hangi kalıbı kullanıyorlar?',
    ],
    noun: 'episode',
  },
  {
    id: 'office-s1e1',
    type: 'series',
    title: 'The Office (ABD) · 1. sezon 1. bölüm',
    where: 'Netflix / dijital platformlar',
    levels: ['B1', 'B2'],
    tastes: ['komedi', 'ofis'],
    why: 'Ofis İngilizcesi seçtin; bu dizi toplantı, e-posta ve iş arkadaşı diliyle dolu — üstelik ders kitabı gibi değil.',
    instruction: 'İngilizce altyazıyla izle. Toplantı sahnelerinde geçen kalıpları not al.',
    words: [
      { word: 'downsizing', meaning: 'küçülme, işten çıkarma' },
      { word: 'branch', meaning: 'şube' },
      { word: 'to bring up', meaning: 'konuyu açmak' },
      { word: 'deadline', meaning: 'son teslim tarihi' },
      { word: 'to look forward to', meaning: 'dört gözle beklemek' },
    ],
    watchFor: [
      'Michael toplantıyı nasıl açıyor?',
      '"actually" kelimesi hangi anlamda kullanılıyor?',
    ],
    noun: 'episode',
  },
  /* ------------------------------------------------------------ polisiye */
  {
    id: 'sherlock-s1e1',
    type: 'series',
    title: 'Sherlock · 1. sezon 1. bölüm',
    where: 'Netflix / dijital platformlar',
    levels: ['B2', 'C1'],
    tastes: ['polisiye', 'gerilim'],
    why: 'Polisiye seviyorsun; bu dizi hızlı konuşuyor ve İngiliz aksanı taşıyor — seviyene uygun bir zorlama.',
    instruction: 'İngilizce altyazıyla izle. Sherlock’un hızlı çıkarım yaptığı sahneyi iki kez dinle.',
    words: [
      { word: 'to deduce', meaning: 'çıkarım yapmak' },
      { word: 'evidence', meaning: 'kanıt' },
      { word: 'suspect', meaning: 'şüpheli' },
      { word: 'to turn out', meaning: 'ortaya çıkmak, öyle olduğu anlaşılmak' },
      { word: 'obvious', meaning: 'apaçık, bariz' },
    ],
    watchFor: [
      'Sherlock ilk karşılaşmada Watson hakkında neyi nasıl anlıyor?',
      '"obvious" ve "evidence" kelimelerini yakala.',
    ],
    noun: 'episode',
  },
  /* ---------------------------------------------------------- belgesel */
  {
    id: 'planet-earth',
    type: 'series',
    title: 'Planet Earth II · 1. bölüm (Islands)',
    where: 'Netflix / BBC',
    levels: ['A2', 'B1', 'B2'],
    tastes: ['belgesel', 'bilim', 'tarih'],
    why: 'Belgesel seçtin: anlatım net ve yavaş, görüntü anlamadığın kelimeyi tamamlıyor — dinleme için en kolay başlangıç.',
    instruction: 'Önce altyazısız izle, sonra altyazıyla tekrar et. 15 dakika yeter.',
    words: [
      { word: 'survive', meaning: 'hayatta kalmak' },
      { word: 'prey', meaning: 'av' },
      { word: 'shore', meaning: 'kıyı' },
      { word: 'to hunt', meaning: 'avlanmak' },
      { word: 'harsh', meaning: 'sert, zorlu' },
    ],
    watchFor: [
      'Anlatıcı hangi zamanı kullanıyor — geniş zaman mı, geçmiş mi?',
      '"survive" kelimesinin geçtiği cümleyi not al.',
    ],
    noun: 'episode',
  },
  /* -------------------------------------------------------------- müzik */
  {
    id: 'metallica-nothing',
    type: 'song',
    title: 'Metallica — Nothing Else Matters',
    where: 'Spotify / YouTube',
    /**
     * B2 ve C1 de dahil: metal seçmiş bir B2 kullanıcısına katalogda uyan
     * hiçbir parça kalmıyordu ve tarafsız yedeğe düşüyordu. Sözleri sade
     * olduğu için üst seviyelerde de dinleme malzemesi olarak çalışır.
     */
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    tastes: ['metal', 'rock'],
    why: 'Metal dinliyorsun ama bu parça yavaş ve sözler net söyleniyor — bağırarak söylenen bir şarkı dinleme pratiği olmaz.',
    instruction: 'Önce sözlere bakmadan dinle, sonra sözleriyle bir kez daha. Anladığın 5 kelimeyi not al.',
    words: [
      { word: 'to trust', meaning: 'güvenmek' },
      { word: 'to matter', meaning: 'önemli olmak' },
      { word: 'to care', meaning: 'önemsemek, umursamak' },
      { word: 'forever', meaning: 'sonsuza dek' },
    ],
    watchFor: [
      '"nothing else matters" ne demek — kelime kelime değil, anlam olarak?',
      'Şarkıda "never" kaç kez geçiyor?',
    ],
    noun: 'song',
  },
  {
    id: 'coldplay-fix',
    type: 'song',
    title: 'Coldplay — Fix You',
    where: 'Spotify / YouTube',
    levels: ['A1', 'A2', 'B1'],
    tastes: ['rock', 'pop', 'akustik'],
    why: 'Sözler yavaş ve tekrarlı; ilk şarkı çalışması için en kolayından biri.',
    instruction: 'Önce sözlere bakmadan dinle, sonra sözleriyle. Tekrar eden dizeyi ezberle.',
    words: [
      { word: 'to fix', meaning: 'onarmak, düzeltmek' },
      { word: 'to replace', meaning: 'yerine koymak' },
      { word: 'tears', meaning: 'gözyaşları' },
      { word: 'to guide', meaning: 'yol göstermek' },
    ],
    watchFor: [
      '"I will try to fix you" hangi zaman?',
      'Şarkıdaki en çok tekrar eden kelime hangisi?',
    ],
    noun: 'song',
  },
  {
    id: 'eminem-lose',
    type: 'song',
    title: 'Eminem — Lose Yourself',
    where: 'Spotify / YouTube',
    levels: ['B1', 'B2', 'C1'],
    tastes: ['rap'],
    why: 'Rap dinliyorsun; bu parça hızlı ama kelimeler net telaffuz ediliyor — hız alıştırması olarak iyi.',
    instruction: 'İlk kıtayı sözleriyle takip et, sonra sözsüz dinlemeyi dene.',
    words: [
      { word: 'opportunity', meaning: 'fırsat' },
      { word: 'to seize', meaning: 'yakalamak, kapmak' },
      { word: 'to slip', meaning: 'kaçırmak, elden gitmek' },
      { word: 'to blow', meaning: 'harcamak, boşa geçirmek' },
    ],
    watchFor: [
      '"You only get one shot" ne demek?',
      'İlk kıtada kaç tane fiil sayabiliyorsun?',
    ],
    noun: 'song',
  },
  {
    id: 'sinatra-fly',
    type: 'song',
    title: 'Frank Sinatra — Fly Me to the Moon',
    where: 'Spotify / YouTube',
    levels: ['A2', 'B1'],
    tastes: ['caz', 'blues', 'klasik'],
    why: 'Caz seçtin: bu parça yavaş, telaffuz açık ve cümleler kısa — dinleyerek kalıp öğrenmek için ideal.',
    instruction: 'Sözlere bakmadan dinle, ne kadarını yakaladığını not et; sonra sözleriyle karşılaştır.',
    words: [
      { word: 'to hold', meaning: 'tutmak' },
      { word: 'in other words', meaning: 'başka bir deyişle' },
      { word: 'true', meaning: 'gerçek, doğru' },
      { word: 'to long for', meaning: 'özlemek, hasret duymak' },
    ],
    watchFor: [
      '"In other words" kalıbı kaç kez geçiyor?',
      'Şarkıdaki emir kipi cümleleri bul.',
    ],
    noun: 'song',
  },
  /* ------------------------------------------------------------- video */
  {
    id: 'ted-short',
    type: 'youtube',
    title: 'TED-Ed · kısa İngilizce video',
    where: 'YouTube',
    levels: ['A2', 'B1', 'B2'],
    tastes: ['bilim', 'teknoloji', 'kitap', 'akademik'],
    why: 'Kısa, altyazılı ve net konuşulan videolar; dinleme alışkanlığı kurmak için günde 5 dakika yeter.',
    instruction:
      'YouTube\'da "TED-Ed" ara, ilgini çeken 5 dakikalık bir video seç. Önce altyazısız izle, sonra altyazıyla. Anlamadığın 3 kelimeyi not al.',
    words: [
      { word: 'according to', meaning: 'göre' },
      { word: 'research', meaning: 'araştırma' },
      { word: 'to point out', meaning: 'dikkat çekmek, belirtmek' },
      { word: 'result', meaning: 'sonuç' },
    ],
    watchFor: [
      'Konuşmacı fikrini nasıl açıyor?',
      'Bir örneği anlatırken hangi bağlaçları kullanıyor?',
    ],
    noun: 'video',
  },
  {
    id: 'football-highlights',
    type: 'youtube',
    title: 'Premier League maç özeti · İngilizce anlatım',
    where: 'YouTube',
    levels: ['A2', 'B1', 'B2'],
    tastes: ['futbol', 'spor', 'basketbol', 'motor'],
    why: 'Spor seçtin: maç anlatımında olay ekranda olduğu için kelimeyi bilmesen de bağlamdan çıkarıyorsun.',
    instruction:
      'YouTube\'da "Premier League highlights" ara, 10 dakikalık bir özet izle. Spikerin tekrar ettiği 5 kelimeyi not al.',
    words: [
      { word: 'to score', meaning: 'gol atmak, sayı yapmak' },
      { word: 'defender', meaning: 'defans oyuncusu' },
      { word: 'to miss', meaning: 'kaçırmak' },
      { word: 'draw', meaning: 'beraberlik' },
    ],
    watchFor: [
      'Spiker gol anında hangi zamanı kullanıyor?',
      '"chance" kelimesi hangi anlamda geçiyor?',
    ],
    noun: 'video',
  },
  /* --------------------------------------------- zevk seçilmemişse yedek
   *
   * ⚠️ **Tarafsız şarkı şart.** Önce katalogda `tastes: []` olan hiç şarkı
   * yoktu; zevkini doldurmamış birine `pickBest` zorunlu olarak zevk iddia
   * eden bir parça seçiyordu ve gerekçesinde *"Caz seçtin"*, *"Rap
   * dinliyorsun"* yazıyordu. Kullanıcı öyle bir şey seçmemişti — yani öneri
   * yalan söylüyordu. Her tür için bir tarafsız yedek olmalı.
   */
  {
    id: 'neutral-song-easy',
    type: 'song',
    title: 'Ed Sheeran — Photograph',
    where: 'Spotify / YouTube',
    levels: ['A1', 'A2', 'B1'],
    tastes: [],
    why: 'Zevklerine tam uyan bir parça bulamadım. Bu şarkı yavaş ve sözleri net; güvenli bir başlangıç.',
    instruction:
      'Önce sözlere bakmadan dinle, sonra sözleriyle bir kez daha. Anladığın 5 kelimeyi not al.',
    words: [
      { word: 'to keep', meaning: 'saklamak, tutmak' },
      { word: 'memory', meaning: 'hatıra, anı' },
      { word: 'to hurt', meaning: 'acıtmak, incitmek' },
      { word: 'to hold on', meaning: 'tutunmak, bırakmamak' },
    ],
    watchFor: [
      'Tekrar eden dizeyi yakala ve ezberle.',
      '"we keep" ile "we kept" farkını duyabiliyor musun?',
    ],
    noun: 'song',
  },
  {
    id: 'neutral-song-mid',
    type: 'song',
    title: 'The Beatles — Let It Be',
    where: 'Spotify / YouTube',
    levels: ['B2', 'C1', 'C2'],
    tastes: [],
    why: 'Zevklerine tam uyan bir parça bulamadım. Sözleri sade ama deyimsel; seviyene uygun bir dinleme.',
    instruction:
      'Sözlere bakmadan dinle, ne kadarını yakaladığını not et; sonra sözleriyle karşılaştır.',
    words: [
      { word: 'to let it be', meaning: 'olduğu gibi bırakmak' },
      { word: 'wisdom', meaning: 'bilgelik' },
      { word: 'trouble', meaning: 'sıkıntı, dert' },
      { word: 'to part', meaning: 'ayrılmak' },
    ],
    watchFor: [
      '"let it be" kalıbı ne anlama geliyor — kelime kelime değil, gerçekte?',
      'Şarkıda kaç tane emir kipi var?',
    ],
    noun: 'song',
  },
  {
    id: 'easy-english',
    type: 'podcast',
    title: 'Easy English · günlük konuşma podcast’i',
    where: 'Spotify / YouTube',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    tastes: [],
    why: 'Zevklerine tam uyan bir şey bulamadım — Ayarlar → Zevklerim’i doldurursan öneri sana göre değişir.',
    instruction:
      'Spotify veya YouTube\'da "Easy English podcast" ara, 10 dakika dinle. Anlamadığın 3 kelimeyi not al.',
    words: [
      { word: 'to mean', meaning: 'demek istemek, anlamına gelmek' },
      { word: 'actually', meaning: 'aslında' },
      { word: 'to end up', meaning: 'sonunda bir yerde/durumda olmak' },
      { word: 'kind of', meaning: 'biraz, bir bakıma' },
    ],
    watchFor: ['Konuşmacı düşünürken hangi kelimeleri kullanıyor?'],
    noun: 'video',
  },
];

/**
 * Kullanılan katalog: ortak + seviye fazlarının getirdikleri.
 *
 * Fazlar tamamlandıkça buraya `...A2_CATALOG` gibi satırlar eklenecek.
 * Sıra önemli değil — seçim `poolFor` içinde seviyeye ve zevke göre yapılıyor.
 */
const CATALOG: CatalogItem[] = [
  ...SHARED_CATALOG,
  ...A1_CATALOG,
  ...A1_CESIT,
  ...A1_MUZIK,
];

/**
 * Tüm zevk seçimlerini tek bir anahtar kümesine indirir.
 *
 * Serbest metin de burada: "Kendim yazmak istiyorum" deyip *tiyatro* yazan
 * kullanıcı hiçbir anahtar taşımıyordu ve tarafsız yedeğe düşüyordu.
 * `keysFromNote` yazdığını en yakın anahtarlara bağlıyor (tiyatro →
 * dizi + dram); bağlayamazsa hiçbir şey uydurmuyor.
 */
function tasteKeys(ham: Tastes | undefined): Map<string, number> {
  const w = new Map<string, number>();
  if (!ham) return w;
  /**
   * ⚠️ İlgi alanı kaldırıldığı hâlde veride kalmış alt seçimler elenir —
   * yoksa Spor'u bırakıp Oyun'a geçen kullanıcıya spor içeriği gelmeye
   * devam ediyor. Aynı süzgeç `prompts.ts` içinde de var; kural
   * `tastes.ts` → `sanitizeTastes` içinde **tek yerde** tanımlı.
   */
  const tastes = sanitizeTastes(ham);

  /** En yüksek ağırlık kazanır — bir anahtar iki yerden gelirse güçlüsü sayılır */
  const ekle = (values: string[], agirlik: number) => {
    for (const v of values) w.set(v, Math.max(w.get(v) ?? 0, agirlik));
  };

  /**
   * **İlgi alanı** — konuyu belirleyen ana seçim.
   */
  ekle(tastes.areas, 1);

  /**
   * **Alt seçimler biraz daha ağır (1.2).**
   *
   * "Spor" demek geniş bir tercih; "Tenis" demek dar ve bilinçli bir tercih.
   * İkisi eşit sayılınca ölçümde şu çıktı: "Dizi ve film" + "Belgesel" seçen
   * kullanıcıya belgesel değil, `dizi` etiketli genel bir yapım geliyordu —
   * çünkü ana alan da bir puan ekliyordu ve toplamı büyütüyordu. Alt seçim
   * her zaman ana alandan daha çok şey söyler; ağırlığı da öyle olmalı.
   */
  ekle(tastes.music, 1.2);
  ekle(tastes.screen, 1.2);
  ekle(tastes.sports, 1.2);

  /**
   * **Kullanım ortamı — yarım ağırlık.**
   *
   * ⚠️ Buranın tam ağırlıkta olması ölçülmüş bir hataydı. "Günlük hayat,
   * arkadaş sohbeti" seçen kullanıcı hangi hobiyi seçerse seçsin Easy
   * English sokak röportajı alıyordu; çünkü o içerik tek etiketli ve
   * `gunluk` anahtarını tam tutturuyordu. Ortam seçmek bir konu tercihi
   * değildir: "günlük hayatta İngilizce kullanacağım" diyen biri bilimden
   * vazgeçmiş olmaz.
   *
   * Yarım ağırlık şunu sağlıyor: gerçek bir ilgi alanı varsa o kazanır,
   * yoksa ortam yine de tarafsız yedekten iyi bir seçim yapar.
   */
  ekle(tastes.other, 0.5);

  /**
   * **Serbest metinden çıkarılan anahtarlar — 0.8.**
   *
   * Kullanıcının açıkça seçtiği kadar kesin değil (biz çıkardık), ama
   * hiç yokmuş gibi de davranılmaz. Tam ağırlık verirsek "tiyatro" yazan
   * birinin çıkarımı, açıkça seçtiği "bilim"le eşit olur.
   */
  ekle(keysFromNote(tastes.note), 0.8);

  return w;
}

/** Tarihten türetilen kararlı sayı — aynı gün aynı öneri, ertesi gün başkası */
function daySeed(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) hash = (hash * 31 + date.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/**
 * Karıştırıcı tohum — **birbirine çok benzeyen dizeler için.**
 *
 * ⚠️ `daySeed` (çarpan 31, klasik dize karması) küçük bir modda kötü dağılıyor:
 * 31 ≡ 1 (mod 5) olduğu için `daySeed(s) % 5`, dizedeki karakterlerin
 * **toplamının** mod 5'ine eşit. Yani "…|3|0" ile "…|2|1" aynı sonucu veriyor.
 * Sohbet turları buna takıldı: yuvalar bağımsız seçiliyor sanılırken 30
 * varyant yalnızca 10 farklı sohbet üretti (ölçüldü).
 *
 * FNV-1a + son karıştırma bitleri gerçekten dağıtıyor. Kararlılık aynı: aynı
 * dize her zaman aynı sayıyı verir.
 */
function karisikTohum(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return h >>> 0;
}

/**
 * Bir içeriğin kullanıcının zevkleriyle kesişme **ağırlığı.**
 *
 * ## Bu ölçü iki kez yanlış kuruldu, ikisi de ekranda görüldü
 *
 * **1. deneme — eşleşme sayısı.** Geniş etiketli içerik her şeyi eziyordu:
 * "sözlü şarkı videosu" 11 anahtar taşıyor, metal + süper kahraman seçende
 * 2 puan alıp süper kahraman çizgi dizisinin 1 puanını geçiyordu. Süper
 * kahraman seçen adam süper kahraman göremiyordu.
 *
 * **2. deneme — isabet oranı (eşleşen / toplam etiket).** Bu sefer tersi
 * oldu: **tek etiketli içerik üç etiketliyi hep yendi.** Kullanıcı "Bilim" +
 * "Günlük hayat" seçtiğinde
 *
 *     Easy English  [gunluk]                 -> 1/1 = 1.00   ← hep kazanıyor
 *     BBC Earth     [belgesel, bilim, tarih] -> 1/3 = 0.33
 *
 * çıkıyordu ve kullanıcı *"günün sohbeti Easy English sokak röportajları fix
 * geliyor"* dedi. Haklıydı: bilim seçen adam bilim göremiyordu.
 *
 * ## Doğrusu: anahtarın **ne olduğu** önemli
 *
 * İki hata da aynı kökten: bütün anahtarlar eşit sayılıyordu. Oysa
 * `tastes.other` bir hobi değil, **kullanım ortamı** — "günlük hayatta
 * İngilizce kullanmak istiyorum" demek "belgesel yerine sokak röportajı
 * izlemek istiyorum" demek değildir. Ortam, konu seçimini belirlemez;
 * eşitlik bozulduğunda tarafı tayin eder.
 *
 * Bu yüzden puan = **eşleşen anahtarların ağırlık toplamı** (bkz.
 * `tasteWeights`), eşitlikte dar etiketli içerik kazanır.
 */
function tasteScore(item: CatalogItem, weights: Map<string, number>): number {
  return item.tastes.reduce((sum, t) => sum + (weights.get(t) ?? 0), 0);
}

/**
 * Havuzdan **en iyi eşleşenler** arasından günün seçimini yapar.
 *
 * ⚠️ Burada bir kez hata yapıldı ve testte yakalandı: liste zevke göre
 * sıralanıp sonra **tüm liste üzerinden** rastgele seçiliyordu. Sıralamanın
 * hiçbir etkisi olmuyordu — metal + süper kahraman seçmiş bir A2 kullanıcıya
 * TED-Ed videosu, polisiye seçmemiş birine *"Polisiye seviyorsun"* gerekçeli
 * Sherlock çıkıyordu. Yani öneri hem alakasız hem de **yalan gerekçeliydi.**
 *
 * Doğrusu: önce en yüksek puanı bul, sadece o puandakiler arasından seç.
 * Hiçbiri kullanıcının zevkine değmiyorsa (puan 0) tarafsız içeriklere düş —
 * onların gerekçesi bir zevk iddia etmiyor.
 */
/**
 * Aynı sanatçının parçalarını **sıraya yayar.**
 *
 * ⚠️ Ölçümde çıktı: sıra yürümeye başladıktan sonra bile aynı sanatçı ardışık
 * iki güne düşebiliyordu — metal havuzunda iki Metallica parçası katalogda yan
 * yana duruyordu. Kullanıcının şikâyeti şarkı adı değil **sanatçı** üzerineydi:
 * *"yarın yine Bruno Mars'a gelmesin."* İki farklı Bruno Mars şarkısı da
 * "yine Bruno Mars" demektir.
 *
 * Yöntem açgözlü: her adımda **en çok parçası kalan** sanatçıdan, bir önceki
 * adımda kullanılandan farklı olmak kaydıyla bir parça alınıyor. Sonda
 * sarmalı da kontrol ediliyor — liste her gün başa döndüğü için son ile ilk
 * de komşudur; ilk sürüm bunu kaçırmıştı ve tur başında tekrar çıkıyordu.
 */
function sanatciyaGoreDagit(liste: CatalogItem[]): CatalogItem[] {
  if (liste.length < 3) return liste;

  /** "Katy Perry — Firework" → "katy perry" */
  const sanatci = (item: CatalogItem) =>
    item.title.split('—')[0].trim().toLowerCase();

  const gruplar = new Map<string, CatalogItem[]>();
  for (const item of liste) {
    const k = sanatci(item);
    const g = gruplar.get(k);
    if (g) g.push(item);
    else gruplar.set(k, [item]);
  }
  /** Her sanatçının tek parçası varsa dizilim zaten sorunsuz */
  if (gruplar.size === liste.length) return liste;

  const out: CatalogItem[] = [];
  let onceki = '';
  while (out.length < liste.length) {
    const adaylar = [...gruplar.entries()]
      .filter(([, g]) => g.length > 0)
      .sort((a, b) => b[1].length - a[1].length);
    /** Öncekinden farklı olan ilk aday; yoksa mecburen aynı sanatçı */
    const secilen = adaylar.find(([ad]) => ad !== onceki) ?? adaylar[0];
    if (!secilen) break;
    out.push(secilen[1].shift()!);
    onceki = secilen[0];
  }

  /** Sarmal: son ile ilk aynı sanatçıysa sondakini bir öne al */
  if (out.length > 2 && sanatci(out[0]) === sanatci(out[out.length - 1])) {
    for (let i = out.length - 2; i > 0; i--) {
      if (sanatci(out[i]) !== sanatci(out[0])) {
        const [tasinan] = out.splice(out.length - 1, 1);
        out.splice(i, 0, tasinan);
        break;
      }
    }
  }
  return out;
}

function pickBest(
  pool: CatalogItem[],
  keys: Map<string, number>,
  seed: number,
  /**
   * **Gün sırası — verildiğinde seçim rastgele değil, sırayla yürür.**
   *
   * ⚠️ Kullanıcının bildirimi: *"adam müziğe girdi, Bruno Mars geldi; yarın
   * geldi yine Bruno Mars'a gelmesin, Katy Perry, X sanatçı."* Seçim
   * `winners[seed % winners.length]` ile yapılıyordu; tohum tarihten
   * türese de **ardışık iki günün aynı öğeye düşmesi tesadüfe kalmıştı** —
   * 5 parçalık bir havuzda bunun olasılığı her gün 1/5.
   *
   * Gün sırası verildiğinde indeks her gün tam bir adım ilerliyor: aynı
   * parça havuz turu tamamlanmadan geri gelmiyor. Kaydırma tohumdan
   * geldiği için iki farklı kullanıcı aynı günde aynı sırayı görmüyor.
   */
  gunSirasi?: number
): CatalogItem | null {
  if (pool.length === 0) return null;

  /**
   * ⚠️ Sıra yürürken **tohum karışmamalı.** İlk sürümde indeks
   * `(gunSirasi + seed) % n` idi; `seed` her gün değiştiği için toplam yine
   * zar atmaya dönüyordu ve ölçümde 63 günün 148 kez ardışık tekrarı çıktı.
   * Kaydırma çağıran tarafta **sabit** bir sayıdan geliyor (zevklerin
   * kaydedilme anı), burada yalnızca gün sırası kullanılıyor.
   */
  const sec = (liste: CatalogItem[]) =>
    gunSirasi === undefined
      ? liste[seed % liste.length]
      : sanatciyaGoreDagit(liste)[gunSirasi % liste.length];

  /**
   * Önce ağırlık toplamı; eşitlikte **çok geniş** etiketliyi ele.
   *
   * ⚠️ Buradaki tolerans şart. Önce "eşitlikte en dar etiketli kazansın"
   * yazılmıştı ve ölçümde iki yan etki çıktı:
   *
   *   1. Çok etiketli iyi içerik **tamamen** eleniyordu: bilim seçen
   *      kullanıcı SciModern ['akademik','bilim'] ve BBC Earth
   *      ['belgesel','bilim','tarih'] öğelerini bir daha hiç göremiyordu,
   *      çünkü tek etiketli bir alternatif hep önlerine geçiyordu.
   *   2. Kazanan küme tek öğeye indiği için **çeşitlilik ölüyordu** —
   *      tohum ne olursa olsun aynı şey çıkıyordu. Kullanıcının şikâyeti
   *      tam olarak buydu: *"çıktım girdim, yine aynısı."*
   *
   * Amaç 11 etiketli "her şeye biraz değen" içeriği elemek; 1 ile 3 etiketli
   * içerikleri birbirine rakip tutmak. Bu yüzden en dar olana **+2 tolerans**
   * veriliyor: geniş toplayıcılar eleniyor, gerçek adaylar havuzda kalıyor.
   */
  const en = Math.max(...pool.map((i) => tasteScore(i, keys)));
  if (en > 0) {
    const esitler = pool.filter((i) => tasteScore(i, keys) === en);
    const enDar = Math.min(...esitler.map((i) => i.tastes.length));
    const winners = esitler.filter((i) => i.tastes.length <= enDar + 2);
    return sec(winners);
  }

  /**
   * Zevke değen yok. Tarafsız içeriğe düş — gerekçesi bir zevk iddia etmiyor.
   *
   * ⚠️ Tarafsız içerik **hiç yoksa** eskiden bütün havuza düşülüyordu ve
   * kullanıcıya *"Rap dinliyorsun"* diye seçmediği bir zevk atfediliyordu.
   * Artık katalogda her tür için tarafsız bir yedek var; yine de bulunamazsa
   * seviye süzgecini gevşetip **bütün katalogdaki** tarafsızları arıyoruz —
   * yanlış seviye, yalan gerekçeden iyidir.
   */
  const neutral = pool.filter((i) => i.tastes.length === 0);
  if (neutral.length > 0) return sec(neutral);

  const sameType = new Set(pool.map((i) => i.type));
  const anyNeutral = CATALOG.filter(
    (i) => i.tastes.length === 0 && sameType.has(i.type)
  );
  if (anyNeutral.length > 0) return sec(anyNeutral);

  return sec(pool);
}

/**
 * Seviyeye uyan içerikler.
 *
 * Seviye **şart**: A2'ye Sherlock vermek 30 saniyede pes ettirir. Şarkılarda
 * bu kural gevşetiliyor — katalogdaki parçaların çoğu A1-B1 ve C1/C2'deki
 * birine hiç şarkı çıkmaması, sırf zorluk uymadı diye dinleme pratiğini
 * tamamen kesmek olurdu.
 */
function poolFor(
  level: string,
  type: 'song' | 'watch',
  done: Set<string>
): CatalogItem[] {
  const current = toLevel(level);
  const all = CATALOG.filter((i) =>
    type === 'song' ? i.type === 'song' : i.type !== 'song'
  );
  const fits = all.filter((i) => i.levels.includes(current));
  const base = fits.length > 0
    ? fits
    : type === 'song'
      ? all
      : all.filter((i) => i.tastes.length === 0);

  /**
   * **Bitirilen içerik tekrar önerilmez.**
   *
   * Kullanıcı "bitirdim" dediği bölümü ertesi gün yine görüyordu; katalog
   * küçük olduğu için aynı başlık her gün kazanıyordu. Katalogdaki her şey
   * bitmişse baştan başlanıyor — tekrar izlemek, hiçbir şey önermemekten iyi.
   */
  const fresh = base.filter((i) => !done.has(i.title));
  return fresh.length > 0 ? fresh : base;
}

/**
 * **Zevke uyan içerik "bitirdim" yüzünden tükendiyse havuzu geri aç.**
 *
 * ⚠️ Bağımsız denetimin bulduğu hata, canlı olarak doğrulandı: kullanıcı
 * seçtiği türün bütün şarkılarını "bitirdim" işaretlerse o türe **bir daha
 * hiç** dönülmüyordu. Sebebi ince: `poolFor`'daki "hepsi bitmişse baştan
 * başla" kuralı **bütün şarkı havuzu** üzerinden çalışıyor. Elektronik
 * seçen birinin 4 elektronik parçası bitse bile katalogda 40 başka şarkı
 * duruyor, dolayısıyla `fresh` boşalmıyor ve kural tetiklenmiyor. Sonra
 * `pickBest` zevke uyan hiçbir şey bulamayıp tarafsız yedeğe düşüyor ve
 * orada kalıyordu — üstelik *"Zevklerine tam uyan bir parça bulamadım"*
 * diye **yalan bir gerekçeyle**; oysa kullanıcı türü seçmiş, sadece hepsini
 * bitirmiş.
 *
 * Kural artık zevk bazında: elenmemiş havuzda zevke değen hiçbir şey
 * kalmadıysa ama tam havuzda varsa, o türün parçaları yeniden dolaşıma
 * giriyor. Tekrar dinlemek, alakasız bir parça dinlemekten iyidir.
 */
function tasteAwarePool(
  filtreli: CatalogItem[],
  tam: CatalogItem[],
  keys: Map<string, number>
): CatalogItem[] {
  const deger = (liste: CatalogItem[]) =>
    liste.some((i) => tasteScore(i, keys) > 0);
  return !deger(filtreli) && deger(tam) ? tam : filtreli;
}

/**
 * Bugünün yerel içerik önerileri.
 *
 * Bir izleme (dizi/video) + bir dinleme (şarkı). Gün numarası tohum olduğu
 * için her gün başkası geliyor ama gün içinde sabit kalıyor.
 */
export function pickLocalContent(
  level: string,
  tastes: Tastes | undefined,
  date: string,
  /** Kullanıcının "bitirdim" dediği başlıklar — tekrar önerilmez */
  doneTitles: string[] = []
): ContentSuggestion[] {
  const keys = tasteKeys(tastes);
  /**
   * Tohuma **zevklerin kaydedilme anı** da giriyor.
   *
   * ⚠️ Kullanıcının bildirimi: *"bilimi seçtim SciShow verdi; çıktım girdim
   * yeniden bilim seçtim, yine aynısı."* Tohum yalnızca tarihe baktığı için
   * aynı gün içinde seçim ne olursa olsun aynı öğe kazanıyordu — havuz
   * büyütülse bile aynı şey olurdu.
   *
   * `updatedAt` zevkler her kaydedildiğinde değişiyor; yani kullanıcı
   * Zevklerim'e girip çıktığında havuzdan başka bir öğe geliyor. Sadece
   * gezinmek yetmiyor, **kaydetmek** gerekiyor — bu da doğrusu: ekranı
   * açıp kapatmak bir tercih değildir.
   *
   * Gün içinde hiçbir şey değişmezse seçim sabit kalıyor; "bitirdim"
   * işaretlemesinin ve günün temasının bozulmaması için bu şart.
   */
  const seed = daySeed(date + (tastes?.updatedAt ?? ''));
  const done = new Set(doneTitles);

  /**
   * Gün sırası: her ikisi de günden güne **yürüyor**, zar atmıyor. İzleme ve
   * dinleme farklı kaydırmalarla gidiyor ki ikisi aynı anda başa dönmesin.
   */
  const gun = dayNumber(new Date(date + 'T12:00:00'));
  /**
   * Sabit kaydırma: iki farklı kullanıcı aynı günde aynı sırayı görmesin,
   * ama sıra **gün içinde ve günden güne kaymasın**. Zevkler kaydedildiğinde
   * değişiyor — kullanıcının "girip çıkınca başka şey gelsin" isteği.
   */
  const kaydirma = daySeed(tastes?.updatedAt ?? 'x');
  const bos = new Set<string>();
  const picks = [
    pickBest(
      tasteAwarePool(poolFor(level, 'watch', done), poolFor(level, 'watch', bos), keys),
      keys, seed, gun + kaydirma
    ),
    /** İzleme ve dinleme farklı noktadan başlasın, ikisi birlikte dönmesin */
    pickBest(
      tasteAwarePool(poolFor(level, 'song', done), poolFor(level, 'song', bos), keys),
      keys, seed, gun + kaydirma + 3
    ),
  ].filter((i): i is CatalogItem => i !== null);

  /**
   * Tarafsız yedeğin gerekçesini duruma göre düzelt.
   *
   * ⚠️ Tarafsız şarkının metni "Zevklerine tam uyan bir parça bulamadım"
   * diyor. Bu, müzik türü seçmiş ama karşılığı bulunamamış biri için doğru;
   * **futbol seçip müzik türü seçmemiş** biri için yanlış — sistemin
   * beceriksiz olduğunu ima ediyor, oysa kullanıcı hiç müzik tercihi
   * bildirmemiş. Yalan gerekçe hatasının şarkı tarafındaki hâli.
   */
  const musicChosen = (tastes?.music ?? []).length > 0;

  /**
   * **Çıkarımı sakla ma.**
   *
   * ⚠️ Testte yakalandı: "Kendim yazmak istiyorum" kutusuna *tiyatro* yazan
   * kullanıcıya *Inside Out* öneriliyor ve gerekçede **"Dram seçtin"**
   * yazıyordu. Kullanıcı dram seçmedi — biz onun yazdığından çıkardık.
   * Seçilmemiş bir zevki seçilmiş gibi göstermek, projede iki kez düzelttiğimiz
   * "yalan gerekçe" hatasının üçüncü hâli olurdu.
   *
   * Doğrusu: eşleşme yalnızca serbest metinden geliyorsa gerekçe bunu açıkça
   * söylesin. Kullanıcı hem öneriyi hem de nereden çıktığını görür; yanlışsa
   * yazdığını değiştirebilir.
   */
  const dogrudan = new Set([
    ...(tastes?.areas ?? []),
    ...(tastes?.music ?? []),
    ...(tastes?.screen ?? []),
    ...(tastes?.sports ?? []),
    ...(tastes?.other ?? []),
  ]);
  const metinden = new Set(keysFromNote(tastes?.note));
  const yazdigi = tastes?.note?.trim();

  const gerekce = (item: CatalogItem): string => {
    if (item.tastes.length === 0 && item.type === 'song' && !musicChosen) {
      return 'Müzik türü seçmemişsin — Ayarlar → Zevklerim\'den seçersen şarkı sana göre gelir. Bu parça yavaş ve sözleri net, güvenli bir başlangıç.';
    }
    const dogrudanTutan = item.tastes.some((t) => dogrudan.has(t));
    const metindenTutan = item.tastes.some((t) => metinden.has(t));
    if (!dogrudanTutan && metindenTutan && yazdigi) {
      return `"${yazdigi}" yazmışsın; hazır listede tam karşılığı yok, en yakın eşleşme bu. Öğretmen çalıştığında sana daha uygun bir şey seçecek.`;
    }

    /**
     * **Gerekçe, seçilmemiş bir alt türü iddia etmesin.**
     *
     * ⚠️ Ölçümde çıktı: yalnızca "Dizi ve film" alanını seçen kullanıcıya
     * Goosebumps öneriliyor ve gerekçede *"Gerilim seçtin"* yazıyordu.
     * Kullanıcı gerilim seçmemişti — eşleşme `dizi` alan etiketinden
     * gelmişti. Bu, projede üç kez düzelttiğimiz "yalan gerekçe" hatasının
     * dördüncü hâli; her seferinde başka bir kapıdan giriyor.
     *
     * Kural: katalogda **`tastes[0]` gerekçenin yazıldığı anahtardır.**
     * O anahtar kullanıcının kendi seçimlerinde yoksa metin dürüst bir
     * genel gerekçeyle değiştirilir; öneri kalır, iddia kalkar.
     */
    const iddia = item.tastes[0];
    if (iddia && !dogrudan.has(iddia) && dogrudanTutan) {
      const tutan = item.tastes.find((t) => dogrudan.has(t));
      const alan = tutan ? labelOf(tutan) : 'seçtiğin alan';
      return `${alan} seçtin. Alt türünü de seçersen öneri sana daha çok yaklaşır; şimdilik bu alanda A1'de takip edebileceğin yapımlardan birini verdim.`;
    }

    return item.why;
  };

  /**
   * **İçeriğin öğrettiği kelimeler de seviye süzgecinden geçer.**
   *
   * ⚠️ `npm run gorev` ile ölçüldü: A1 kullanıcısına önerilen içeriğin
   * kelimeleri `to mean`, `actually`, `to end up` (B1-B2) olabiliyordu ve
   * bunlar sohbetin kelime turuna gömülüp *"Now use these words in your
   * sentences: to mean, actually, to end up"* diye karşısına çıkıyordu.
   *
   * Sebebi yapısal: bir katalog öğesi birden çok seviyede geçerli olabiliyor
   * (`levels: ['A1' … 'C2']`) ama kelime listesi **tek**. Aynı podcast A1'de
   * de B1'de de öneriliyor; kelimeleri B1'e göre yazılmışsa A1'de yanlış.
   * Kelimeyi seviyeye göre süzmek, her seviye için ayrı liste yazmadan
   * doğru olanı veriyor.
   */
  /**
   * ⚠️ **Burada "bilinmiyor" eleme sebebi DEĞİL** — kartlardakinin tersi.
   *
   * Kart tarafında A1 kapalı listedir: havuzda olmayan kelime gösterilmez.
   * İçerik kelimeleri başka bir iş yapıyor. Bunlar "ezberlenecek çekirdek"
   * değil, **o videoda kulak kabartılacak kelimeler**: F1 videosunda `lap`,
   * `to overtake`, `pit stop`. `lap` havuzda yok ama zor da değil — tek
   * heceli, somut, görüntüyle birlikte öğrenilir. Kapalı liste kuralını buraya
   * da uygulamak (ilk denemede uygulandı) içeriğin öğrettiği her şeyi siliyor
   * ve F1 videosunun kelime turu tek kelimeye düşüyordu.
   *
   * Doğru ölçü: **cetvel bir kelimenin üst seviye olduğunu biliyorsa** at
   * (`actually` B1, `to end up` B2 — bunlar ölçüldü ve A1'e geliyordu),
   * bilmiyorsa katalog yazarının seçimine güven.
   */
  const seviyeyeUygun = (kelimeler: CatalogItem['words']) =>
    (kelimeler ?? []).filter(
      (w) => levelOfWord(w.word) === null || !isTooHardFor(w.word, level)
    );

  return picks.map((item) => ({
    type: item.type,
    title: item.title,
    where: item.where,
    why: gerekce(item),
    instruction: item.instruction,
    skill: 'listening',
    words: seviyeyeUygun(item.words),
    watchFor: item.watchFor,
    noun: item.noun,
  }));
}

/* ------------------------------------------------------- yerel sohbet */

/**
 * İçeriğin üstüne konuşulacak sohbeti kurar.
 *
 * Turlar bilerek **içerikten bağımsız** sorular: uygulama bölümü izlemedi,
 * "üçüncü sahnede ne oldu" diye soramaz. Ama "ne oldu, kimi sevdin, neden,
 * sırada ne olur" soruları her bölümde çalışır ve üretim yaptırır.
 *
 * Öğretmenin yazdığı sohbet bundan iyidir — o bölümü bilir, kullanıcının
 * dünkü hatasına bağlar. Bu yüzden öğretmenin planı geldiğinde bu kullanılmaz.
 */
export function buildLocalConversation(
  content: ContentSuggestion | undefined,
  level: string,
  sizing: LevelSizing | undefined,
  date: string,
  /**
   * Kaçıncı sohbet — "başka bir sohbet ver" her basıldığında bir artıyor.
   * Aynı gün aynı içerikte bile bambaşka bir tur dizisi üretiyor.
   */
  variant = 0
): ConversationPlan {
  const spec = specOf(level, sizing);
  /** Tur başına beklenen kelime — seviyenin konuşma süresinin dörtte biri */
  const base = Math.max(6, Math.round(spec.speakingSeconds / 4));
  const words = (content?.words ?? []).map((w) => w.word);
  /**
   * İçeriğe doğru isimle hitap et. "Bu bölümde ne oldu" diye sorulan şey bir
   * podcast'se cümle saçmalıyor; testte tam olarak bu çıktı.
   *
   * ⚠️ Tür tek başına yetmiyor. Bir animasyon filmi de bir dizi bölümü de
   * `series` olarak işaretleniyor; katalog `noun` verdiyse ona uy, vermediyse
   * eski davranışa (türden tahmin) düş.
   */
  const noun =
    content?.noun ??
    (content?.type === 'song'
      ? 'song'
      : content?.type === 'series'
        ? 'episode'
        : 'video');
  const isSong = noun === 'song';
  const isSeries = noun === 'episode';
  const isFilm = noun === 'film';
  const thing = isSong ? 'song' : isSeries ? 'episode' : isFilm ? 'film' : 'video';
  /**
   * ⚠️ Türkçe ipucu da türe uymalı. İngilizce tarafı "the video" derken
   * Türkçesi "Bölümün neyi anlattığını anlat" diyordu — podcast'in bölümü
   * yok. İki dil ayrı ayrı düzeltilmezse biri doğru, öteki saçma kalıyor.
   */
  const seyTR = isSong
    ? 'Şarkının'
    : isSeries
      ? 'Bölümün'
      : isFilm
        ? 'Filmin'
        : 'İzlediğinin';
  const topic = content?.title ?? 'Günlük sohbet';

  /**
   * ⚠️ İpucu seviyeye uymak zorunda. Buraya sabit "Geçmiş zaman kullan"
   * yazılmıştı; A1 kullanıcısına verildiğinde `LEVEL_SPEC.A1.structures`
   * ile çelişiyordu (A1'in yapısı *present simple*). Uygulamanın bir yerinde
   * "sadece geniş zaman öğren" derken başka yerinde geçmiş zaman istemek,
   * öğrenciyi kilitleyen türden bir tutarsızlık.
   */
  const zamanIpucu =
    toLevel(level) === 'A1'
      ? 'Kısa cümleler kur, geniş zaman yeter.'
      : 'Geçmiş zaman kullan.';

  /**
   * İçeriğin kelimesi kalmadıysa (hepsi seviye süzgecinde elendi) sohbetin
   * kelime turu boş kalmasın. ⚠️ Yedek de seviyeye uymalı: buraya sabit
   * `because, really, still` yazılıydı ve `really`/`still` A1 havuzunda yok —
   * yedeğin kendisi seviye üstü kelime öğretiyordu.
   */
  const yedekKelimeler =
    toLevel(level) === 'A1' ? 'good, new, every day' : 'because, really, still';
  const kelimeler = words.slice(0, 3).join(', ') || yedekKelimeler;

  /**
   * **Tur bankası.** Altı yuva, her yuvada beş farklı soru: 5⁶ = 15.625
   * kombinasyon.
   *
   * Kullanıcının isteği: *"her tıklayana o bölümle alakalı farklı bir diyalog
   * gelmesi… hep sınırlı rol dönmesini istemiyorum."* Sabit altı turdu; aynı
   * altı soru her gün, her içerik için tekrarlanınca sohbet ezber oluyordu.
   *
   * Neden yerel banka, neden öğretmen değil: öğretmene her tıklamada yeni
   * sohbet yazdırmak bir çalıştırma (~12.000 jeton) **ve 1-2 dakika bekleme**
   * demek; "anında" hissi ölüyor ve bilgisayarın açık olmasını gerektiriyor.
   * Banka sıfır jeton, anında ve internetsiz çalışıyor. Öğretmenin yazdığı
   * sohbet geldiğinde yine o kazanıyor — banka yedek, karar verici öğretmen.
   *
   * Yuvaların işlevi sabit (anlat → yorum → zorluk → tarif → kelime → kapanış);
   * değişen soruların **dil işi** aynı kalıyor, sadece soruluş biçimi ve
   * açısı dönüyor. Yoksa çeşitlilik uğruna ölçüm bozulurdu.
   */
  /**
   * **A1 tur bankası — ayrı kurulmak zorundaydı.**
   *
   * ⚠️ Kullanıcının bildirimi: *"sporun altında araba sporlarını seçince
   * 'Formula 1 yarışını anlat' diyor; bunu A1 biri yapamaz. Oradaki tüm
   * olasılıkları kontrol edip A1'e getirelim."*
   *
   * Teşhis, tahmin edilenden geniş çıktı. Yapı doğruydu (konu zevkten,
   * zorluk seviyeden) ama **tur bankası seviyeyi hiç sormuyordu**: aşağıdaki
   * genel banka bütün seviyelere aynı soruları veriyordu. `npm run gorev` 50
   * zevk seçeneğinin hepsini gezdi ve A1'de **3805 ihlal** saydı. Örnekler:
   *
   *   "Give it a score out of ten, and explain your score."
   *   "If you watched it again, what would you understand better?"
   *   "Was there anything you did not understand?"
   *   "Who would like this, and who would not? Say why."
   *
   * Sırasıyla: soyut değerlendirme, ikinci tip koşul cümlesi, geçmiş zaman,
   * `would`. A1'de bunların hiçbiri yok — `LEVEL_SPEC.A1.structures` present
   * simple diyor. İçerik doğru seçilse bile soru cevaplanamıyordu.
   *
   * A1 turlarının ölçüsü: **present simple, tek yapılı cümle, somut cevap.**
   * "Beğendin mi" sorulur, "neden beğendin"in gerekçe zinciri sorulmaz;
   * "hangi kelimeyi biliyorsun" sorulur, "hangi kelime seni zorladı"
   * sorulmaz. Aynı dil işini yaptırır — anlatma, tarif, kelime kullanma —
   * ama öğrencinin elindeki dilbilgisiyle.
   */
  const YUVALAR_A1: ConversationPlan['turns'][] = [
    /* 1 — anlat */
    [
      {
        say: `Hi! You picked ${topic}. Tell me: what is it about?`,
        hint: `${seyTR} neyi anlattığını kısa cümlelerle söyle. Geniş zaman yeter.`,
        minWords: base + 3,
        followUp: 'That is short. Give me two more sentences.',
      },
      {
        say: `Hello! Tell me about the ${thing}. What do you see in it?`,
        hint: `İçinde ne görüyorsun? Kısa cümlelerle anlat.`,
        minWords: base + 3,
        followUp: 'Two more sentences, please.',
      },
      {
        say: `Hi! I do not know this ${thing}. Tell me three things about it.`,
        hint: `Hiç bilmeyen birine üç şey söyle. Her cümle kısa olsun.`,
        minWords: base + 3,
        followUp: 'One more thing, please.',
      },
      {
        say: `Hey! What is in the ${thing}? Say three sentences.`,
        hint: `İçinde ne var? Üç cümle kur.`,
        minWords: base + 3,
        followUp: 'Add two more sentences.',
      },
      {
        say: `Hi! Tell me about ${topic}. Start with "It is about ...".`,
        hint: `"It is about ..." diye başla ve devam et.`,
        minWords: base + 3,
        followUp: 'Keep going — two more sentences.',
      },
    ],
    /* 2 — beğeni (gerekçe zinciri değil, tek cümlelik yorum) */
    [
      {
        say: `Do you like it? Say one good thing about it.`,
        hint: 'Beğendin mi? İyi bulduğun bir şeyi tek cümleyle söyle.',
        minWords: base,
        followUp: 'One more sentence, please.',
      },
      {
        say: `Is it good or bad for you? Say one sentence.`,
        hint: 'Sence iyi mi kötü mü? Tek cümle yeter.',
        minWords: base,
        followUp: 'Add one more sentence.',
      },
      {
        say: `What is your favourite part? Tell me about it.`,
        hint: 'En sevdiğin kısım hangisi? Kısaca anlat.',
        minWords: base,
        followUp: 'Tell me a little more.',
      },
      {
        say: `Do you want to see it again? Say yes or no, and one sentence.`,
        hint: 'Tekrar izlemek/dinlemek ister misin? Evet ya da hayır, sonra bir cümle.',
        minWords: base,
        followUp: 'Now the sentence, please.',
      },
      {
        say: `Is it happy or sad? Tell me in one or two sentences.`,
        hint: 'Mutlu mu üzgün mü? Bir-iki cümleyle söyle.',
        minWords: base,
        followUp: 'One more sentence.',
      },
    ],
    /* 3 — kolaylık ve kelime fark etme */
    [
      {
        say: `Is it easy or hard for you? Say one sentence.`,
        hint: 'Kolay mı zor mu geldi? Tek cümle.',
        minWords: base,
        followUp: 'One more sentence, please.',
      },
      {
        say: `Tell me one word you know from it.`,
        hint: 'İçinden bildiğin bir kelimeyi söyle.',
        minWords: base,
        followUp: 'Use that word in a sentence.',
      },
      {
        say: `Do they speak fast or slow? Say one sentence.`,
        hint: 'Hızlı mı konuşuyorlar yavaş mı? Tek cümle.',
        minWords: base,
        followUp: 'Add one more sentence.',
      },
      {
        say: `Tell me one new word from it. Then make a sentence.`,
        hint: 'Yeni bir kelime söyle, sonra o kelimeyle bir cümle kur.',
        minWords: base,
        followUp: 'Now the sentence, please.',
      },
      {
        say: `Do you understand it? Tell me one part you understand.`,
        hint: 'Anlıyor musun? Anladığın bir kısmı söyle.',
        minWords: base,
        followUp: 'One more sentence about that part.',
      },
    ],
    /* 4 — tarif */
    [
      {
        say: isSong
          ? `Is the song fast or slow? Say two things about it.`
          : isSeries || isFilm
            ? `Tell me about one person in it. Is he or she young or old?`
            : `Tell me the main thing in it. Use one or two sentences.`,
        hint: isSong
          ? 'Şarkı hızlı mı yavaş mı? İki şey söyle.'
          : isSeries || isFilm
            ? 'Bir kişiyi anlat: genç mi yaşlı mı, nasıl biri?'
            : 'En önemli şeyi bir-iki cümleyle söyle.',
        useWords: words.slice(1, 2),
        minWords: base,
        followUp: 'Give me one more detail.',
      },
      {
        say: isSong
          ? `What is the song about? Say two sentences.`
          : isSeries || isFilm
            ? `Where is it? Tell me about the place.`
            : `What do you see in the video? Say two sentences.`,
        hint: isSong
          ? 'Şarkı neyi anlatıyor? İki cümle.'
          : isSeries || isFilm
            ? 'Nerede geçiyor? Yeri anlat.'
            : 'Videoda ne görüyorsun? İki cümle.',
        useWords: words.slice(1, 2),
        minWords: base,
        followUp: 'One more sentence, please.',
      },
      {
        say: isSong
          ? `Do you listen to this song at home or in the car?`
          : isSeries || isFilm
            ? `Is the story happy or sad? Say two sentences.`
            : `Tell a friend about it in two sentences.`,
        hint: isSong
          ? 'Bu şarkıyı nerede dinliyorsun? Evde mi, arabada mı?'
          : isSeries || isFilm
            ? 'Hikâye mutlu mu üzgün mü? İki cümle.'
            : 'Bir arkadaşına iki cümleyle anlat.',
        useWords: words.slice(1, 2),
        minWords: base,
        followUp: 'Add one more sentence.',
      },
      {
        say: isSong
          ? `Is the music loud or quiet? Use two adjectives.`
          : isSeries || isFilm
            ? `Describe one person: tall or short, happy or sad?`
            : `Is it about people or about things? Tell me more.`,
        hint: isSong
          ? 'Müzik sesli mi sakin mi? İki sıfat kullan.'
          : isSeries || isFilm
            ? 'Bir kişiyi tarif et: uzun mu kısa mı, mutlu mu üzgün mü?'
            : 'İnsanlarla mı ilgili, şeylerle mi? Biraz daha anlat.',
        useWords: words.slice(1, 2),
        minWords: base,
        followUp: 'Use one more adjective.',
      },
      {
        say: isSong
          ? `Is the singer a man or a woman? Say two more sentences.`
          : isSeries || isFilm
            ? `What do you see in it? Say two sentences.`
            : `What is new for you in it? Say two sentences.`,
        hint: isSong
          ? 'Söyleyen kadın mı erkek mi? İki cümle daha ekle.'
          : isSeries || isFilm
            ? 'Ne görüyorsun? İki cümle.'
            : 'Senin için yeni olan ne? İki cümle.',
        useWords: words.slice(1, 2),
        minWords: base,
        followUp: 'Add one more sentence.',
      },
    ],
    /* 5 — kelime kullanımı */
    [
      {
        say: `Now use these words in your sentences: ${kelimeler}.`,
        hint: 'Bugünün kelimelerini kendi cümlende kullan — kelime ancak kullanınca oturur.',
        useWords: words.slice(0, 3),
        minWords: base,
        followUp: 'One more sentence with another word, please.',
      },
      {
        say: `Make one sentence for every word: ${kelimeler}.`,
        hint: 'Her kelime için bir cümle kur.',
        useWords: words.slice(0, 3),
        minWords: base,
        followUp: 'You need one more word.',
      },
      {
        say: `Use these words to talk about the ${thing}: ${kelimeler}.`,
        hint: `Bu kelimelerle ${seyTR.toLowerCase()} hakkında konuş.`,
        useWords: words.slice(0, 3),
        minWords: base,
        followUp: 'Add one more sentence.',
      },
      {
        /**
         * ⚠️ Burada bir zamanlar "kendi gününü / aileni anlat" vardı.
         * Kelimeler içerikten geliyor; tarihi bir belgeselde `king`, `war`,
         * `century` çıkıyor ve öğrenciden bunlarla **kendi gününü** anlatması
         * isteniyordu — "My day has a war". Kelime kaynağıyla kalıbın
         * bağlamı çakışıyordu; kalıp artık içeriğe bağlı.
         */
        say: `Say each word, then use it in a short sentence: ${kelimeler}.`,
        hint: 'Her kelimeyi söyle, sonra kısa bir cümlede kullan.',
        useWords: words.slice(0, 3),
        minWords: base,
        followUp: 'One more, with another word.',
      },
      {
        say: `Make two sentences with these words: ${kelimeler}.`,
        hint: 'Bu kelimelerle iki cümle kur.',
        useWords: words.slice(0, 3),
        minWords: base,
        followUp: 'Now use the third word too.',
      },
    ],
    /* 6 — kapanış */
    [
      {
        say: `Do you like this ${thing}? Say yes or no, and one sentence.`,
        hint: 'Beğendin mi? Evet ya da hayır, sonra bir cümle.',
        minWords: base,
        followUp: 'Now the sentence, please.',
      },
      {
        say: `Is this good for a friend? Say one sentence.`,
        hint: 'Bir arkadaşına uygun mu? Tek cümle.',
        minWords: base,
        followUp: 'One more sentence.',
      },
      {
        say: `What do you want next — the same thing or a new thing?`,
        hint: 'Sırada ne olsun? Aynısı mı, yenisi mi?',
        minWords: base,
        followUp: 'Add one more sentence.',
      },
      {
        say: `Tell me one thing you know now.`,
        hint: 'Şimdi bildiğin bir şeyi söyle.',
        minWords: base,
        followUp: 'One more sentence about it.',
      },
      {
        say: `Do you want more of this? Say one or two sentences.`,
        hint: 'Bundan daha çok ister misin? Bir-iki cümle.',
        minWords: base,
        followUp: 'One more sentence, please.',
      },
    ],
  ];

  const YUVALAR_GENEL: ConversationPlan['turns'][] = [
    /* 1 — anlat */
    [
      {
        say: `Hi! Let's talk about the ${thing} you picked: ${topic}. First, tell me what it is about.`,
        hint: `${seyTR} neyi anlattığını 3-4 cümleyle anlat. ${zamanIpucu}`,
        minWords: base + 6,
        followUp: 'That was short. Give me two more sentences — what happened next?',
      },
      {
        say: `Hello! You picked ${topic}. Tell me the story in your own words.`,
        hint: `${seyTR} konusunu kendi cümlelerinle anlat. ${zamanIpucu}`,
        minWords: base + 6,
        followUp: 'Keep going — two more sentences, please.',
      },
      {
        say: `Hi! Imagine I know nothing about ${topic}. Explain it to me.`,
        hint: `Hiç bilmeyen birine anlatır gibi anlat. ${zamanIpucu}`,
        minWords: base + 6,
        followUp: 'I still do not have the picture. Add two sentences.',
      },
      {
        say: `Hey! What happens in ${topic}? Start from the beginning.`,
        hint: `Baştan başlayarak anlat, sıra önemli. ${zamanIpucu}`,
        minWords: base + 6,
        followUp: 'And then? Two more sentences.',
      },
      {
        say: `Hi! Give me a short summary of ${topic} — three or four sentences.`,
        hint: `Kısa bir özet çıkar, 3-4 cümle. ${zamanIpucu}`,
        minWords: base + 6,
        followUp: 'A summary needs a little more. Two more sentences.',
      },
    ],
    /* 2 — yorum ve sebep */
    [
      {
        say: `Which part did you like the most, and why?`,
        hint: 'Beğendiğin kısmı söyle ve sebebini "because" ile bağla.',
        minWords: base,
        followUp: 'Tell me the reason. Start with "I liked it because…".',
      },
      {
        say: `What was the best moment for you? Say why.`,
        hint: 'En iyi anı seç ve nedenini söyle.',
        minWords: base,
        followUp: 'Why was it the best? One sentence with "because".',
      },
      {
        say: `Was there anything you did not like? Tell me why.`,
        hint: 'Beğenmediğin bir şey varsa söyle, sebebiyle birlikte.',
        minWords: base,
        followUp: 'Give me the reason, not just the thing.',
      },
      {
        say: `How would you describe it to a friend — good or boring? Why?`,
        hint: 'Bir arkadaşına nasıl anlatırdın? Sebebini de ekle.',
        minWords: base,
        followUp: 'Add the reason. "I think it is … because …".',
      },
      {
        say: `Give it a score out of ten, and explain your score.`,
        hint: 'On üzerinden puan ver ve puanı açıkla.',
        minWords: base,
        followUp: 'The number is not enough — why that number?',
      },
    ],
    /* 3 — zorluk ve anlamama */
    [
      {
        say: `Was there anything you did not understand? Tell me about it.`,
        hint: `${seyTR} anlamadığın bir kelimesini veya cümlesini anlat — bilmediğini anlatmak da bir beceri.`,
        minWords: base,
        followUp: 'Try again: was it a word, or was it too fast?',
      },
      {
        say: `Which word was new for you? Where did you hear it?`,
        hint: 'Yeni duyduğun bir kelimeyi ve geçtiği yeri anlat.',
        minWords: base,
        followUp: 'Say the sentence where you heard it.',
      },
      {
        say: `Was it easy or hard to follow? Tell me what made it hard.`,
        hint: 'Takip etmek kolay mıydı zor muydu, neden?',
        minWords: base,
        followUp: 'What exactly was hard — the speed, or the words?',
      },
      {
        say: `Did you need subtitles? Tell me when you needed them.`,
        hint: 'Altyazıya baktın mı, hangi anda?',
        minWords: base,
        followUp: 'Describe that moment in one more sentence.',
      },
      {
        say: `If you watched it again, what would you understand better?`,
        hint: 'Tekrar izlesen neyi daha iyi anlardın?',
        minWords: base,
        followUp: 'Say why you would understand it better.',
      },
    ],
    /* 4 — tarif */
    [
      {
        say: isSong
          ? `How does this song make you feel? Describe it in your own words.`
          : isSeries || isFilm
            ? `Describe one character. What kind of person are they?`
            : `Explain the main idea to a friend who did not watch it.`,
        hint: isSong
          ? 'Şarkının sende bıraktığı hissi anlat, iki sıfat kullan.'
          : isSeries || isFilm
            ? 'Bir karakteri tarif et, iki sıfat kullan.'
            : 'İzlemeyen birine ana fikri anlat — kendi cümlelerinle.',
        useWords: words.slice(1, 2),
        minWords: base,
        followUp: 'Give me one more detail.',
      },
      {
        say: isSong
          ? `What is the song about? Say it in two or three sentences.`
          : isSeries || isFilm
            ? `Describe the place where it happens. What can you see?`
            : `What is the most important thing in it? Describe it.`,
        hint: isSong
          ? 'Şarkı neyi anlatıyor? İki-üç cümle.'
          : isSeries || isFilm
            ? 'Geçtiği yeri tarif et — ne görüyorsun?'
            : 'En önemli kısmı tarif et.',
        useWords: words.slice(1, 2),
        minWords: base,
        followUp: 'One more sentence — add a detail.',
      },
      {
        say: isSong
          ? `Is the singer happy or sad? How can you tell?`
          : isSeries || isFilm
            ? `Which person would you like to meet? Say why.`
            : `Who is speaking, and what do they want you to know?`,
        hint: isSong
          ? 'Şarkıcı mutlu mu üzgün mü, nereden anladın?'
          : isSeries || isFilm
            ? 'Hangi karakterle tanışmak isterdin, neden?'
            : 'Kim konuşuyor ve ne anlatmak istiyor?',
        useWords: words.slice(1, 2),
        minWords: base,
        followUp: 'Explain how you know that.',
      },
      {
        say: isSong
          ? `Describe the music itself — fast, slow, loud, quiet?`
          : isSeries || isFilm
            ? `Describe what one person looks like and how they act.`
            : `Describe one thing you saw that you did not expect.`,
        hint: isSong
          ? 'Müziğin kendisini tarif et: hızlı mı yavaş mı?'
          : isSeries || isFilm
            ? 'Bir kişinin görünüşünü ve davranışını anlat.'
            : 'Beklemediğin bir şeyi anlat.',
        useWords: words.slice(1, 2),
        minWords: base,
        followUp: 'Use one more adjective.',
      },
      {
        say: isSong
          ? `Where would you listen to this song — at home, in the car, at work?`
          : isSeries || isFilm
            ? `What happens at the end? Describe it.`
            : `Describe the part you would show to a friend.`,
        hint: isSong
          ? 'Bu şarkıyı nerede dinlerdin, neden?'
          : isSeries || isFilm
            ? 'Sonunda ne oluyor, anlat.'
            : 'Bir arkadaşına göstereceğin kısmı anlat.',
        useWords: words.slice(1, 2),
        minWords: base,
        followUp: 'Add one more sentence.',
      },
    ],
    /* 5 — kelime kullanımı */
    [
      {
        say: `Now use these words in your own sentences: ${kelimeler}.`,
        hint: 'Bugünün kelimelerini kendi cümlende kullan — kelime ancak kullanınca oturur.',
        useWords: words.slice(0, 3),
        minWords: base,
        followUp: 'One more sentence with a different word, please.',
      },
      {
        say: `Make one sentence for each of these words: ${kelimeler}.`,
        hint: 'Her kelime için bir cümle kur.',
        useWords: words.slice(0, 3),
        minWords: base,
        followUp: 'You missed one — use it in a sentence.',
      },
      {
        say: `Tell me about your own day using these words: ${kelimeler}.`,
        hint: 'Bu kelimelerle kendi gününü anlat.',
        useWords: words.slice(0, 3),
        minWords: base,
        followUp: 'Add one more sentence with another word.',
      },
      {
        say: `Use these words to talk about your family or your job: ${kelimeler}.`,
        hint: 'Bu kelimelerle kendi hayatından bir şey anlat.',
        useWords: words.slice(0, 3),
        minWords: base,
        followUp: 'One more, with a different word.',
      },
      {
        say: `Write two sentences with these words, one true and one false: ${kelimeler}.`,
        hint: 'Bu kelimelerle biri doğru biri yanlış iki cümle kur.',
        useWords: words.slice(0, 3),
        minWords: base,
        followUp: 'Now use the third word too.',
      },
    ],
    /* 6 — kapanış */
    [
      {
        say: isSong
          ? `Would you recommend this song to a friend? Why or why not?`
          : isSeries
            ? `Will you watch the next episode? Why?`
            : isFilm
              ? `Would you recommend this film to a friend? Why or why not?`
              : `Would you recommend it to a friend? Why or why not?`,
        hint: 'Cevabını sebebiyle birlikte söyle; tek kelimelik cevap sayılmaz.',
        minWords: base,
        followUp: 'Tell me why — one sentence is enough.',
      },
      {
        say: `Who would like this, and who would not? Say why.`,
        hint: 'Kim sever kim sevmez? Sebebini söyle.',
        minWords: base,
        followUp: 'Give the reason for one of them.',
      },
      {
        say: `What will you do next — more of this, or something different?`,
        hint: 'Sırada ne var? Aynısından mı, başka bir şey mi?',
        minWords: base,
        followUp: 'Say why you chose that.',
      },
      {
        say: `Did it change anything for you? Even a small thing.`,
        hint: 'Sende bir şey değiştirdi mi, küçük bir şey bile olsa.',
        minWords: base,
        followUp: 'Explain that in one more sentence.',
      },
      {
        say: `Tell me one thing you learned today — in English or about the topic.`,
        hint: 'Bugün öğrendiğin bir şeyi söyle — İngilizce ya da konu hakkında.',
        minWords: base,
        followUp: 'Say why that one stayed with you.',
      },
    ],
  ];

  /**
   * Yuvalar birbirinden bağımsız dönsün diye her yuvaya farklı bir kaydırma
   * uygulanıyor. Aynı gün + aynı içerik + aynı varyant her zaman aynı sohbeti
   * verir (kararlılık şart: kullanıcı ekranı kapatıp açınca soru değişmemeli),
   * `variant` artınca hepsi birden başka bir bileşime geçer.
   */
  const tohum = daySeed(date + (content?.title ?? ''));
  /**
   * Seviye bankayı seçiyor. Şimdilik iki banka var: A1 ve gerisi. Bir üst
   * seviyenin fazı gelince kendi bankası buraya eklenir — faz kuralı.
   */
  const YUVALAR = toLevel(level) === 'A1' ? YUVALAR_A1 : YUVALAR_GENEL;

  /**
   * ⚠️ **Yuvalar birbirinden bağımsız seçilmeli.**
   *
   * Eski formül `(tohum + variant * 7 + i * 31) % 5` idi ve "5⁶ = 15.625
   * bileşim" diye yazılmıştı. Doğru değildi: `31 mod 5 = 1`, yani yuva
   * indeksi her adımda **tam olarak bir** kayıyordu. Altı yuva, beş seçenek —
   * 6. yuva (kapanış) her zaman 1. yuvayla (anlat) aynı indeksi alıyor ve
   * bütün sohbet tek bir sayıya bağlı kalıyordu. Bağımsız denetim ölçtü:
   * 30 farklı `variant` denendi, ortaya **5 farklı sohbet** çıktı.
   *
   * Her yuva kendi tohumundan seçilince bağımsızlık gerçekten kuruluyor.
   * Kararlılık korunuyor: aynı gün + aynı içerik + aynı varyant her zaman
   * aynı sohbeti verir (kullanıcı ekranı kapatıp açınca soru değişmemeli).
   */
  const turns = YUVALAR.map(
    (yuva, i) =>
      yuva[karisikTohum(`${date}|${content?.title ?? ''}|${variant}|${i}`) % yuva.length]
  );

  return {
    date,
    topic,
    contentTitle: content?.title,
    intro:
      'Bu sohbeti uygulama hazırladı — öğretmen paketi geldiğinde yerini ona bırakacak. Cevaplarını mikrofonla vermeye çalış; yazmak her zaman daha kolay, konuşmak seni asıl geliştiren.',
    turns,
    closing: 'Good work. You kept going even when it was hard — that is the part that matters.',
    closingNote:
      'Cümlelerinin tek tek düzeltmesi öğretmen çalıştığında gelecek; buradaki uyarılar yalnızca yazım ve noktalama.',
    targetWords: words.slice(0, 3),
  };
}

/**
 * Zevk üstüne sohbet — **içeriği izlemeyen günün sohbeti.**
 *
 * ## Neden ayrı bir motor
 *
 * Kullanıcının koyduğu kural: *"diziyi izleyip çalışan onunla ilgili
 * konuşmaya hak kazansın, diğerleri zevkleriyle ilgili konuşmaya hak
 * kazansın."*
 *
 * Yukarıdaki banka baştan sona **içeriği** soruyor: "içinde ne var", "hızlı
 * mı konuşuyorlar", "tekrar izler misin". İzlemediği bir bölüm için bunlar
 * cevaplanamaz; kullanıcı ya uydurur ya sıkılıp bırakır. Bu yüzden konu
 * değişince soruların da değişmesi gerekiyordu — aynı bankayı başka bir
 * başlıkla sunmak sohbeti kurtarmaz.
 *
 * Buradaki turlar **present simple** üstüne kurulu ve kişinin kendi
 * hayatını soruyor; A1'in gerçekten yapabildiği iş bu. Özne
 * `tasteFocusFor`'dan geliyor, yani görev üretimiyle aynı zevk mantığından —
 * iki yer ayrı konu seçip kullanıcıyı bölmesin.
 *
 * ⚠️ Bu sohbet bir **teselli ödülü değil, ikinci bir yol.** Ekranda
 * "izlersen sohbet bölümün üstüne döner" yazıyor; ödevi yapmak sohbeti
 * değiştiriyor, bu da ödevin karşılığı oluyor.
 */
export function buildTasteConversation(
  tastes: Tastes | undefined,
  level: string,
  sizing: LevelSizing | undefined,
  date: string,
  /** Günün ders kelimeleri — sohbet onları çalıştırsın diye */
  lessonWords: string[] = [],
  variant = 0
): ConversationPlan {
  const spec = specOf(level, sizing);
  const base = Math.max(6, Math.round(spec.speakingSeconds / 4));
  const odak = tasteFocusFor(tastes, level, new Date(date + 'T12:00:00'), variant);

  /**
   * Zevk hiç doldurulmamışsa bile sohbetsiz gün olmasın. Konu kullanıcının
   * kendi günü olur — A1'de zaten en sağlam malzeme bu.
   */
  const subject = odak?.subject ?? 'your day today';
  const etiket = odak?.labelTR ?? 'günlük hayat';

  const kelimeler =
    lessonWords.length > 0
      ? lessonWords
      : toLevel(level) === 'A1'
        ? ['good', 'new', 'every day']
        : ['because', 'really', 'still'];

  const YUVALAR: ConversationPlan['turns'][] = [
    /* 1 — anlat */
    [
      {
        say: `Hi! Let's talk about ${subject}. Tell me about it.`,
        hint: 'Kısa cümlelerle anlat. Geniş zaman yeter.',
        minWords: base + 3,
        followUp: 'That is short. Give me two more sentences.',
      },
      {
        say: `Hello! Tell me three things about ${subject}.`,
        hint: 'Üç şey söyle. Her cümle kısa olsun.',
        minWords: base + 3,
        followUp: 'One more thing, please.',
      },
      {
        say: `Hi! I do not know about ${subject}. Explain it to me.`,
        hint: 'Hiç bilmeyen birine anlat.',
        minWords: base + 3,
        followUp: 'Two more sentences, please.',
      },
      {
        say: `Hey! Start with "I like ..." and tell me about ${subject}.`,
        hint: '"I like ..." diye başla, sonra devam et.',
        minWords: base + 3,
        followUp: 'Keep going — two more sentences.',
      },
    ],
    /* 2 — ne zaman / ne sıklıkta (present simple çalışması) */
    [
      {
        say: `When do you do this? Say the days or the time.`,
        hint: 'Hangi gün ya da saat? "On Sunday", "in the evening" gibi.',
        minWords: base,
        followUp: 'Add one more sentence about the time.',
      },
      {
        say: `How often is it? Every day, every week?`,
        hint: 'Ne sıklıkta? "Every day", "two times a week" gibi.',
        minWords: base,
        followUp: 'Say it again in a full sentence.',
      },
      {
        say: `Do you do this in the morning or in the evening? Tell me.`,
        hint: 'Sabah mı akşam mı? Tek cümle kur.',
        minWords: base,
        followUp: 'One more sentence, please.',
      },
      {
        say: `Is it a weekday thing or a weekend thing? Say why.`,
        hint: 'Hafta içi mi hafta sonu mu? Sebebini de söyle.',
        minWords: base,
        followUp: 'Tell me a little more.',
      },
    ],
    /* 3 — kimle / nerede */
    [
      {
        say: `Who is with you? Tell me about that person.`,
        hint: 'Yanında kim var? O kişiyi kısaca anlat.',
        minWords: base,
        followUp: 'Say one more thing about them.',
      },
      {
        say: `Where are you when you do this? Describe the place.`,
        hint: 'Neredesin? Orayı tarif et.',
        minWords: base,
        followUp: 'Two more sentences about the place.',
      },
      {
        say: `Do you do this alone or with people? Say one sentence.`,
        hint: 'Yalnız mı, insanlarla mı? Tek cümle.',
        minWords: base,
        followUp: 'Add one more sentence.',
      },
      {
        say: `Is your family in this too? Tell me.`,
        hint: 'Ailen de var mı bu işin içinde? Anlat.',
        minWords: base,
        followUp: 'One more sentence, please.',
      },
    ],
    /* 4 — beğeni (tek cümlelik yorum, gerekçe zinciri değil) */
    [
      {
        say: `Do you like it? Say one good thing about it.`,
        hint: 'Beğeniyor musun? İyi bulduğun bir şeyi söyle.',
        minWords: base,
        followUp: 'One more sentence, please.',
      },
      {
        say: `Is it easy or hard for you? One sentence.`,
        hint: 'Kolay mı zor mu? Tek cümle.',
        minWords: base,
        followUp: 'Add one more sentence.',
      },
      {
        say: `What is the best part for you? Tell me.`,
        hint: 'En iyi kısmı ne? Kısaca söyle.',
        minWords: base,
        followUp: 'Tell me a little more.',
      },
      {
        say: `Do you want to do it more? Say yes or no, and one sentence.`,
        hint: 'Daha çok yapmak ister misin? Evet/hayır, sonra bir cümle.',
        minWords: base,
        followUp: 'Now the sentence, please.',
      },
    ],
    /* 5 — kelime kullandır */
    [
      {
        say: `Now use this word in a sentence: "${kelimeler[0]}".`,
        hint: `"${kelimeler[0]}" kelimesiyle bir cümle kur.`,
        useWords: [kelimeler[0]],
        minWords: base,
        followUp: 'Try one more sentence with that word.',
      },
      {
        say: `Say a sentence with "${kelimeler[Math.min(1, kelimeler.length - 1)]}".`,
        hint: `"${kelimeler[Math.min(1, kelimeler.length - 1)]}" kelimesini kullan.`,
        useWords: [kelimeler[Math.min(1, kelimeler.length - 1)]],
        minWords: base,
        followUp: 'One more sentence with it.',
      },
      {
        say: `Tell me one English word you know about this. Use it in a sentence.`,
        hint: 'Bu konuyla ilgili bildiğin bir kelimeyi cümle içinde kullan.',
        minWords: base,
        followUp: 'Use it one more time.',
      },
      {
        say: `Use these two words together: "${kelimeler[0]}" and "${kelimeler[Math.min(1, kelimeler.length - 1)]}".`,
        hint: 'İki kelimeyi aynı cümlede kullanmayı dene.',
        useWords: kelimeler.slice(0, 2),
        minWords: base,
        followUp: 'Try again with a shorter sentence.',
      },
    ],
    /* 6 — kapanış köprüsü */
    [
      {
        say: `Last one: what do you want to do next about this?`,
        hint: 'Bundan sonra ne yapmak istiyorsun? Tek cümle.',
        minWords: base,
        followUp: 'One more sentence, please.',
      },
      {
        say: `Last question: tell me one new thing you want to try.`,
        hint: 'Denemek istediğin yeni bir şey söyle.',
        minWords: base,
        followUp: 'Say why you want to try it.',
      },
      {
        say: `Finally: is this important for you? Say one sentence.`,
        hint: 'Senin için önemli mi? Tek cümle.',
        minWords: base,
        followUp: 'Add one more sentence.',
      },
      {
        say: `Last one: tell me one thing you learned in English today.`,
        hint: 'Bugün İngilizcede öğrendiğin bir şeyi söyle.',
        minWords: base,
        followUp: 'Say why that one stayed with you.',
      },
    ],
  ];

  /** Yuvalar bağımsız seçiliyor — gerekçesi içerikli bankanın yanında yazılı */
  const turns = YUVALAR.map(
    (yuva, i) => yuva[karisikTohum(`${date}|zevk|${subject}|${variant}|${i}`) % yuva.length]
  );

  return {
    date,
    topic: `${etiket.charAt(0).toLocaleUpperCase('tr')}${etiket.slice(1)} — senin hayatın`,
    /**
     * ⚠️ `contentTitle` bilerek **boş.** Bu sohbetin bir içerik ödevi yok;
     * doldurmak "şu bölüm üstüne konuştuk" yalanı olurdu ve ekran da o
     * başlığı gösterirdi.
     */
    /**
     * ⚠️ Giriş **sohbet ekranında** okunuyor; oradaki tek açıklama bu.
     * "Bitirirsen döner" cümlesi bilerek burada değil, Öğretmen ekranındaki
     * bağ kutusunda — ikisi de yazınca aynı şey alt alta iki kez görünüyordu.
     */
    intro:
      'Bugün izleme ödevini bitirmediğin için sohbet senin ilgi alanların üstüne. Cevaplarını mikrofonla vermeye çalış; yazmak her zaman daha kolay, konuşmak seni asıl geliştiren.',
    turns,
    closing: 'Good work. You talked about your own life in English — that is real practice.',
    closingNote:
      'Cümlelerinin tek tek düzeltmesi öğretmen çalıştığında gelecek; buradaki uyarılar yalnızca yazım ve noktalama.',
    targetWords: kelimeler.slice(0, 3),
  };
}

/** Seviye adının bir üstü — ekranda "hedef" göstermek için (level.ts ile aynı) */
export function levelAbove(level: string): string | null {
  const index = LEVELS.indexOf(toLevel(level));
  return index >= 0 && index < LEVELS.length - 1 ? LEVELS[index + 1] : null;
}
