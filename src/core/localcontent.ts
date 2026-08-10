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
import { keysFromNote } from './tastematch';

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
const CATALOG: CatalogItem[] = [...SHARED_CATALOG, ...A1_CATALOG];

/**
 * Tüm zevk seçimlerini tek bir anahtar kümesine indirir.
 *
 * Serbest metin de burada: "Kendim yazmak istiyorum" deyip *tiyatro* yazan
 * kullanıcı hiçbir anahtar taşımıyordu ve tarafsız yedeğe düşüyordu.
 * `keysFromNote` yazdığını en yakın anahtarlara bağlıyor (tiyatro →
 * dizi + dram); bağlayamazsa hiçbir şey uydurmuyor.
 */
function tasteKeys(tastes: Tastes | undefined): Set<string> {
  if (!tastes) return new Set();
  return new Set([
    ...tastes.areas,
    ...tastes.music,
    ...tastes.screen,
    ...tastes.sports,
    ...tastes.other,
    ...keysFromNote(tastes.note),
  ]);
}

/** Tarihten türetilen kararlı sayı — aynı gün aynı öneri, ertesi gün başkası */
function daySeed(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) hash = (hash * 31 + date.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/** Bir içeriğin kullanıcının zevkleriyle kaç noktada kesiştiği */
function tasteScore(item: CatalogItem, keys: Set<string>): number {
  return item.tastes.filter((t) => keys.has(t)).length;
}

/**
 * **İsabet oranı** — eşleşme sayısı değil, eşleşmenin ne kadar yerinde olduğu.
 *
 * ⚠️ Bu ölçü olmadan **geniş etiketli içerik her şeyi eziyor.** Ölçülen örnek:
 * "sözlü şarkı videosu" 11 zevk anahtarı taşıyordu; metal + süper kahraman
 * seçen kullanıcıda 2 puan alıp, süper kahraman çizgi dizisinin 1 puanını
 * geçiyordu. Sonuç: süper kahraman seçen adam süper kahraman göremiyordu.
 * Aynı hatayı daha önce sıralama tarafında yakalamıştık; etiket sayısı
 * tarafında geri geldi.
 *
 * Oran = eşleşen / öğenin toplam etiketi. Dar ve tam isabet eden içerik,
 * her şeye biraz değen içeriği yener.
 */
function tasteRatio(item: CatalogItem, keys: Set<string>): number {
  if (item.tastes.length === 0) return 0;
  return tasteScore(item, keys) / item.tastes.length;
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
function pickBest(
  pool: CatalogItem[],
  keys: Set<string>,
  seed: number
): CatalogItem | null {
  if (pool.length === 0) return null;

  /**
   * Önce isabet oranı, eşitlikte eşleşme sayısı. Sıra önemli: yalnızca
   * sayıya bakmak geniş etiketli içeriği kazandırıyor, yalnızca orana
   * bakmak da iki etiketten ikisini de tutturan içeriği tek etiketliyle
   * eşitliyor. İkisi birlikte doğru sonucu veriyor.
   */
  const bestRatio = Math.max(...pool.map((i) => tasteRatio(i, keys)));
  if (bestRatio > 0) {
    const byRatio = pool.filter((i) => tasteRatio(i, keys) === bestRatio);
    const bestCount = Math.max(...byRatio.map((i) => tasteScore(i, keys)));
    const winners = byRatio.filter((i) => tasteScore(i, keys) === bestCount);
    return winners[seed % winners.length];
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
  if (neutral.length > 0) return neutral[seed % neutral.length];

  const sameType = new Set(pool.map((i) => i.type));
  const anyNeutral = CATALOG.filter(
    (i) => i.tastes.length === 0 && sameType.has(i.type)
  );
  if (anyNeutral.length > 0) return anyNeutral[seed % anyNeutral.length];

  return pool[seed % pool.length];
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
  const seed = daySeed(date);
  const done = new Set(doneTitles);

  const picks = [
    pickBest(poolFor(level, 'watch', done), keys, seed),
    pickBest(poolFor(level, 'song', done), keys, seed),
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
    return item.why;
  };

  return picks.map((item) => ({
    type: item.type,
    title: item.title,
    where: item.where,
    why: gerekce(item),
    instruction: item.instruction,
    skill: 'listening',
    words: item.words,
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

  const kelimeler = words.slice(0, 3).join(', ') || 'because, really, still';

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
  const YUVALAR: ConversationPlan['turns'][] = [
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
  const turns = YUVALAR.map((yuva, i) => yuva[(tohum + variant * 7 + i * 31) % yuva.length]);

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

/** Seviye adının bir üstü — ekranda "hedef" göstermek için (level.ts ile aynı) */
export function levelAbove(level: string): string | null {
  const index = LEVELS.indexOf(toLevel(level));
  return index >= 0 && index < LEVELS.length - 1 ? LEVELS[index + 1] : null;
}
