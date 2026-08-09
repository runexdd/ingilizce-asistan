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

import { LEVELS, specOf, toLevel, type CEFRLevel, type LevelSizing } from './level';
import type { ContentSuggestion, ConversationPlan, Tastes } from '../db/types';

interface CatalogItem {
  id: string;
  type: ContentSuggestion['type'];
  title: string;
  where: string;
  /** Uygun olduğu seviyeler */
  levels: CEFRLevel[];
  /** Hangi zevk anahtarlarına hitap ediyor (`src/core/tastes.ts`) */
  tastes: string[];
  /** Tek cümlelik Türkçe gerekçe — "niye sana verildi" */
  why: string;
  instruction: string;
  /** İçeriğe girmeden önce bilinmesi iyi olan kelimeler */
  words: Array<{ word: string; meaning: string }>;
  watchFor: string[];
  /** Sohbette konuşulacak şeyin adı — "bölüm" / "şarkı" */
  noun: 'episode' | 'song' | 'video';
}

/**
 * Katalog.
 *
 * ⚠️ **Bağlantı ve video kimliği yok, bilerek.** Projenin kuralı: emin
 * olmadığın bağlantıyı uydurma. Burada yalnızca herkesin bulabileceği,
 * yaygın olarak bilinen yapımlar var; kullanıcı kendi servisinde arayıp
 * buluyor. Ölçüt: kullanıcı içeriğin **yarısından fazlasını** anlayabilmeli.
 */
const CATALOG: CatalogItem[] = [
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
    levels: ['A1', 'A2', 'B1'],
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
  /* --------------------------------------------- zevk seçilmemişse yedek */
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

/** Tüm zevk seçimlerini tek bir anahtar kümesine indirir */
function tasteKeys(tastes: Tastes | undefined): Set<string> {
  if (!tastes) return new Set();
  return new Set([
    ...tastes.areas,
    ...tastes.music,
    ...tastes.screen,
    ...tastes.sports,
    ...tastes.other,
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

  const best = Math.max(...pool.map((i) => tasteScore(i, keys)));
  const winners =
    best > 0
      ? pool.filter((i) => tasteScore(i, keys) === best)
      : // Zevke değen yok: yalan gerekçe vermektense tarafsız içerik ver
        (pool.filter((i) => i.tastes.length === 0).length > 0
          ? pool.filter((i) => i.tastes.length === 0)
          : pool);

  return winners[seed % winners.length];
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

  return picks.map((item) => ({
    type: item.type,
    title: item.title,
    where: item.where,
    why: item.why,
    instruction: item.instruction,
    skill: 'listening',
    words: item.words,
    watchFor: item.watchFor,
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
  date: string
): ConversationPlan {
  const spec = specOf(level, sizing);
  /** Tur başına beklenen kelime — seviyenin konuşma süresinin dörtte biri */
  const base = Math.max(6, Math.round(spec.speakingSeconds / 4));
  const words = (content?.words ?? []).map((w) => w.word);
  const isSong = content?.type === 'song';
  const isSeries = content?.type === 'series';
  /**
   * İçeriğe doğru isimle hitap et. "Bu bölümde ne oldu" diye sorulan şey bir
   * podcast'se cümle saçmalıyor; testte tam olarak bu çıktı.
   */
  const thing = isSong ? 'song' : isSeries ? 'episode' : 'video';
  const topic = content?.title ?? 'Günlük sohbet';

  const turns: ConversationPlan['turns'] = [
    {
      say: `Hi! Let's talk about the ${thing} you picked: ${topic}. First, tell me what it is about.`,
      hint: `${isSong ? 'Şarkının' : 'Bölümün'} neyi anlattığını 3-4 cümleyle anlat. Geçmiş zaman kullan.`,
      useWords: words.slice(0, 1),
      minWords: base + 6,
      followUp: 'That was short. Give me two more sentences — what happened next?',
    },
    {
      say: `Which part did you like the most, and why?`,
      hint: 'Beğendiğin kısmı söyle ve sebebini "because" ile bağla.',
      minWords: base,
      followUp: 'Tell me the reason. Start with "I liked it because…".',
    },
    {
      say: `Was there anything you did not understand? Tell me about it.`,
      hint: 'Anlamadığın bir kelime veya cümleyi anlat — bilmediğini anlatmak da bir beceri.',
      minWords: base,
      followUp: 'Try again: was it a word, or was it too fast?',
    },
    {
      say: isSong
        ? `How does this song make you feel? Describe it in your own words.`
        : isSeries
          ? `Describe one character. What kind of person are they?`
          : `Explain the main idea to a friend who did not watch it.`,
      hint: isSong
        ? 'Şarkının sende bıraktığı hissi anlat, iki sıfat kullan.'
        : isSeries
          ? 'Bir karakteri tarif et, iki sıfat kullan.'
          : 'İzlemeyen birine ana fikri anlat — kendi cümlelerinle.',
      useWords: words.slice(1, 2),
      minWords: base,
      followUp: 'Give me one more detail.',
    },
    {
      say: `Now use these words in your own sentences: ${words.slice(0, 3).join(', ') || 'because, really, still'}.`,
      hint: 'Bugünün kelimelerini kendi cümlende kullan — kelime ancak kullanınca oturur.',
      useWords: words.slice(0, 3),
      minWords: base,
      followUp: 'One more sentence with a different word, please.',
    },
    {
      say: isSong
        ? `Would you recommend this song to a friend? Why or why not?`
        : isSeries
          ? `Will you watch the next episode? Why?`
          : `Would you recommend it to a friend? Why or why not?`,
      hint: 'Cevabını sebebiyle birlikte söyle; tek kelimelik cevap sayılmaz.',
      minWords: base,
      followUp: 'Tell me why — one sentence is enough.',
    },
  ];

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
