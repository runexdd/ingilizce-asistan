/**
 * A1 fazı — içerik kataloğu.
 *
 * ## Bu dosyanın kuralı
 *
 * Kullanıcının kararı (2026-08-10): *"A1 seviyesine uygun küçük animasyonlar,
 * öğretici şeyler önersin; seviyeye uygun dizi yok, A2'den itibaren dizi
 * kısmına bakarız."*
 *
 * Bu karar keyfî değil, ölçüme dayanıyor. Native dizi tanımı gereği B1+
 * hızında konuşur (sitcom ~160-180 kelime/dk, Sherlock 200+). A1'de gerçekten
 * çalışan üç şey var:
 *
 *   1. Öğrenci için üretilmiş içerik (Extra English, Easy English)
 *   2. Animasyon — cümleler kısa, anlamı görüntü taşıyor
 *   3. Olayın ekranda geçtiği kısa videolar (maç özeti, yemek tarifi)
 *
 * Bu yüzden burada **gerçek dizi yok.** A1'de dizi ana yemek değil; ağırlığı
 * A2 fazında artacak.
 *
 * ## Kapsam ölçütü
 *
 * `src/core/tastes.ts` içinde 45 zevk anahtarı var. Bu fazın kabul ölçütü:
 * **hiçbiri tarafsız yedeğe düşmeyecek.** Düşerse kullanıcı hobisini
 * değiştirdiğinde ekranda hiçbir şey değişmiyor — projedeki en eski
 * şikâyetin kaynağı buydu.
 *
 * Ölçüm (düzeltmeden önce): A1'de izleme 2/45, dinleme 4/45.
 *
 * ## Bağlantı yok, bilerek
 *
 * Uydurma bağlantı vermektense arama terimi veriyoruz. Kullanıcı kendi
 * servisinde arayıp buluyor; yanlış bağlantı, aramaktan kötüdür.
 */

import type { CatalogItem } from './types';

export const A1_CATALOG: CatalogItem[] = [
  /* ═══════════════════════════════════════════════════ ÖĞRENCİ İÇERİĞİ
   * A1'in omurgası. Extra English öğrenciler için çekilmiş 30 bölümlük bir
   * sitcom: oyuncular bilerek yavaş konuşuyor, şakalar görsel, her bölüm
   * tek bir dil konusunu işliyor. "Sabit ray" için en uygun aday.
   */
  {
    id: 'a1-extra-english',
    type: 'series',
    title: 'Extra English · 1. bölüm',
    where: 'YouTube — "Extra English episode 1" ara',
    levels: ['A1'],
    tastes: ['dizi', 'komedi', 'gunluk'],
    why: 'Dizi izlemeyi seviyorsun ama A1\'de gerçek dizinin hızı erken. Bu, İngilizce öğrenenler için çekilmiş bir komedi dizisi: oyuncular yavaş konuşuyor, espriler görsel.',
    instruction: 'Bir bölüm 25 dakika. Önce altyazısız izle, sonra İngilizce altyazıyla tekrar et. Anlamadığın 3 kelimeyi not al.',
    words: [
      { word: 'flat', meaning: 'daire (ev)' },
      { word: 'to share', meaning: 'paylaşmak' },
      { word: 'neighbour', meaning: 'komşu' },
      { word: 'to move in', meaning: 'taşınmak' },
    ],
    watchFor: [
      'Karakterler birbirini tanıştırırken hangi kalıbı kullanıyor?',
      '"This is…" cümlesi kaç kez geçiyor?',
    ],
    noun: 'episode',
  },
  {
    id: 'a1-easy-english-street',
    type: 'youtube',
    title: 'Easy English · sokak röportajları',
    where: 'YouTube — "Easy English street interview" ara',
    levels: ['A1'],
    tastes: ['gunluk'],
    why: 'Günlük sohbet ortamını seçtin. Bu videolarda sokakta sıradan insanlara basit sorular soruluyor ve ekranda hem İngilizce hem yavaş altyazı akıyor.',
    instruction: '5-10 dakikalık bir video seç. Sorulan soruyu anlamaya çalış — cevapları anlamasan da olur, soru kalıplarını yakala.',
    words: [
      { word: 'What do you think about…', meaning: '… hakkında ne düşünüyorsun' },
      { word: 'usually', meaning: 'genellikle' },
      { word: 'maybe', meaning: 'belki' },
      { word: 'I guess', meaning: 'sanırım' },
    ],
    watchFor: [
      'Röportajcı soruyu nasıl başlatıyor?',
      'İnsanlar düşünürken hangi kelimeyi kullanıyor?',
    ],
    noun: 'video',
  },

  /* ═══════════════════════════════════════════════════════ ANİMASYON
   * Ekran türü zevkleri (superhero, scifi, polisiye…) A1'de animasyon
   * karşılığıyla doldurulmuş. Gerekçelerde bunu saklamıyoruz — kullanıcı
   * neyin neden önerildiğini bilmeli.
   */
  {
    id: 'a1-superhero-jla',
    type: 'series',
    title: 'Justice League Action · kısa bölümler',
    where: 'YouTube / dijital platformlar — "Justice League Action" ara',
    levels: ['A1'],
    tastes: ['superhero', 'dizi'],
    why: 'Süper kahraman seviyorsun. Gerçek dizilerin hızı A1\'de erken; bunlar 11 dakikalık çizgi bölümler — aynı dünya, çok daha yavaş İngilizce.',
    instruction: 'Bir bölüm 11 dakika. İngilizce altyazıyla izle. Kahramanların birbirine verdiği emirleri not al.',
    words: [
      { word: 'to save', meaning: 'kurtarmak' },
      { word: 'danger', meaning: 'tehlike' },
      { word: 'to fight', meaning: 'dövüşmek, savaşmak' },
      { word: 'power', meaning: 'güç' },
    ],
    watchFor: [
      'Emir cümleleri nasıl kuruluyor — "Stop!", "Come here!" gibi kaç tane sayabildin?',
      '"help" kelimesi kaç kez geçiyor?',
    ],
    noun: 'episode',
  },
  {
    id: 'a1-scifi-walle',
    type: 'series',
    title: 'WALL·E',
    where: 'Disney+ / dijital platformlar',
    levels: ['A1'],
    tastes: ['scifi', 'dizi'],
    why: 'Bilim kurgu seçtin. Bu filmin ilk yarısında neredeyse hiç konuşma yok — hikâyeyi görüntü anlatıyor. A1 için en rahat başlangıçlardan biri.',
    instruction: 'İlk 20 dakikayı izle. Konuşma az; sen de olayı İngilizce anlatmayı dene, 3-4 cümle yeter.',
    words: [
      { word: 'robot', meaning: 'robot' },
      { word: 'to clean', meaning: 'temizlemek' },
      { word: 'lonely', meaning: 'yalnız' },
      { word: 'rubbish / trash', meaning: 'çöp' },
    ],
    watchFor: [
      'WALL·E hangi iki kelimeyi tekrar ediyor?',
      'Konuşma olmadan hikâyeyi anlayabildin mi?',
    ],
    noun: 'film',
  },
  {
    id: 'a1-polisiye-scooby',
    type: 'series',
    title: 'Scooby-Doo, Where Are You! · 1. bölüm',
    where: 'YouTube / dijital platformlar',
    levels: ['A1'],
    tastes: ['polisiye', 'gerilim', 'dizi'],
    why: 'Polisiye/gerilim seviyorsun. A1\'de gerçek polisiye dizinin hızı çok yüksek; bu çizgi dizide her bölüm bir gizem çözülüyor ama cümleler kısa.',
    instruction: 'Bir bölüm 22 dakika. İngilizce altyazıyla izle. Gizemi çözerken kullandıkları soru cümlelerini yakala.',
    words: [
      { word: 'ghost', meaning: 'hayalet' },
      { word: 'to hide', meaning: 'saklanmak' },
      { word: 'clue', meaning: 'ipucu' },
      { word: 'to be afraid', meaning: 'korkmak' },
    ],
    watchFor: [
      '"Who is it?" gibi soru cümlelerinden kaç tane duydun?',
      'Korktuklarını nasıl söylüyorlar?',
    ],
    noun: 'episode',
  },
  {
    id: 'a1-dram-insideout',
    type: 'series',
    title: 'Inside Out',
    where: 'Disney+ / dijital platformlar',
    levels: ['A1'],
    tastes: ['dram', 'dizi'],
    why: 'Dram seçtin. Bu film duyguların üzerine kurulu, yani konuşmalar duygu kelimeleriyle dolu — A1\'de en çok işine yarayacak kelime grubu bu.',
    instruction: 'İlk 25 dakikayı İngilizce altyazıyla izle. Duygu kelimelerini topla, en az 5 tane.',
    words: [
      { word: 'happy', meaning: 'mutlu' },
      { word: 'sad', meaning: 'üzgün' },
      { word: 'angry', meaning: 'kızgın' },
      { word: 'afraid', meaning: 'korkmuş' },
    ],
    watchFor: [
      'Kaç farklı duygu kelimesi duydun?',
      '"I feel…" kalıbı geçiyor mu?',
    ],
    noun: 'film',
  },
  {
    id: 'a1-animasyon-bluey',
    type: 'series',
    title: 'Bluey · kısa bölümler',
    where: 'Disney+ / YouTube',
    levels: ['A1'],
    tastes: ['animasyon', 'dizi'],
    why: 'Animasyon seçtin. Bölümler 7 dakika, cümleler kısa ve hepsi günlük hayattan — kahvaltı, oyun, alışveriş. A1 için birebir.',
    instruction: 'İki bölüm izle, toplam 15 dakika. Aile içinde geçen günlük cümleleri not al.',
    words: [
      { word: 'to play', meaning: 'oynamak' },
      { word: 'game', meaning: 'oyun' },
      { word: 'dad / mum', meaning: 'baba / anne' },
      { word: 'Let\'s…', meaning: 'Hadi… (öneri kalıbı)' },
    ],
    watchFor: [
      '"Let\'s" ile başlayan kaç cümle duydun?',
      'Bir şey isterken hangi kalıbı kullanıyorlar?',
    ],
    noun: 'episode',
  },
  {
    id: 'a1-fantastik-dragon',
    type: 'series',
    title: 'How to Train Your Dragon',
    where: 'Netflix / dijital platformlar',
    levels: ['A1'],
    tastes: ['fantastik', 'dizi'],
    why: 'Fantastik seçtin. Animasyon olduğu için konuşma temposu yavaş ve olayın çoğu ekranda geçiyor; anlamadığın cümleyi görüntüden tamamlayabiliyorsun.',
    instruction: 'İlk 20 dakikayı İngilizce altyazıyla izle. Anlatıcının kendini tanıttığı kısmı iki kez dinle.',
    words: [
      { word: 'dragon', meaning: 'ejderha' },
      { word: 'village', meaning: 'köy' },
      { word: 'to train', meaning: 'eğitmek' },
      { word: 'brave', meaning: 'cesur' },
    ],
    watchFor: [
      'Anlatıcı kendini tanıtırken hangi zamanı kullanıyor?',
      '"This is…" ile kaç şey tanıtıyor?',
    ],
    noun: 'film',
  },
  {
    id: 'a1-tarihi-horrible',
    type: 'series',
    title: 'Horrible Histories · kısa skeçler',
    where: 'YouTube — "Horrible Histories sketch" ara',
    levels: ['A1'],
    tastes: ['tarihi', 'tarih', 'dizi'],
    why: 'Tarih seviyorsun. Bunlar 2-4 dakikalık komik tarih skeçleri; çocuklar için çekildiği için dil basit ama konu gerçek tarih.',
    instruction: 'İki-üç skeç izle, toplam 10 dakika. Geçmiş zaman cümlelerini yakala.',
    words: [
      { word: 'king / queen', meaning: 'kral / kraliçe' },
      { word: 'war', meaning: 'savaş' },
      { word: 'century', meaning: 'yüzyıl' },
      { word: 'to die', meaning: 'ölmek' },
    ],
    watchFor: [
      'Geçmiş zamanda kaç fiil duydun — "was", "had", "went"?',
      'Tarih söylerken hangi kalıbı kullanıyorlar?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-belgesel-bbcearth',
    type: 'youtube',
    title: 'BBC Earth · kısa hayvan klipleri',
    where: 'YouTube — "BBC Earth short clip" ara',
    levels: ['A1'],
    tastes: ['belgesel', 'bilim', 'tarih'],
    why: 'Belgesel seçtin. Anlatım yavaş ve net, üstelik ne anlatıldığı ekranda görünüyor — A1\'de dinleme çalışması için en güvenli tür.',
    instruction: '5 dakikalık bir klip seç. Önce altyazısız izle, sonra altyazıyla. Kaç kelime yakaladığını karşılaştır.',
    words: [
      { word: 'animal', meaning: 'hayvan' },
      { word: 'to hunt', meaning: 'avlanmak' },
      { word: 'food', meaning: 'yiyecek' },
      { word: 'water', meaning: 'su' },
    ],
    watchFor: [
      'Anlatıcı hangi zamanı kullanıyor?',
      'Hayvanı tarif ederken hangi sıfatları kullandı?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-akademik-scishow',
    type: 'youtube',
    title: 'SciShow Kids · basit bilim anlatımı',
    where: 'YouTube — "SciShow Kids" ara',
    levels: ['A1'],
    tastes: ['akademik', 'bilim'],
    why: 'Akademik/teknik metin seçtin ama A1\'de gerçek akademik dil çok erken. Bunlar bilimsel konuları en basit İngilizceyle anlatan 4 dakikalık videolar — doğru başlangıç noktası.',
    instruction: 'Bir video izle, 4-5 dakika. Sunucunun soruyu nasıl sorup nasıl cevapladığını takip et.',
    words: [
      { word: 'why', meaning: 'neden' },
      { word: 'because', meaning: 'çünkü' },
      { word: 'to happen', meaning: 'olmak, gerçekleşmek' },
      { word: 'example', meaning: 'örnek' },
    ],
    watchFor: [
      '"because" kaç kez geçiyor?',
      'Bir şeyi açıklarken hangi kalıpla başlıyor?',
    ],
    noun: 'video',
  },

  /* ═════════════════════════════════════════════════════════════ SPOR
   * Spor özetleri A1'de beklenmedik biçimde iyi çalışıyor: olay ekranda
   * geçtiği için kelimeyi bilmesen de bağlamdan çıkarıyorsun, üstelik
   * spiker aynı kelimeleri sürekli tekrar ediyor.
   */
  {
    id: 'a1-futbol',
    type: 'youtube',
    title: 'Premier League maç özeti · İngilizce anlatım',
    where: 'YouTube — "Premier League highlights" ara',
    levels: ['A1'],
    tastes: ['futbol', 'spor'],
    why: 'Futbol seçtin. Maç özetinde olay ekranda olduğu için kelimeyi bilmesen de anlıyorsun; spiker de aynı 20-30 kelimeyi sürekli tekrar ediyor.',
    instruction: '5-10 dakikalık bir özet izle. Spikerin en çok tekrar ettiği 5 kelimeyi yaz.',
    words: [
      { word: 'to score', meaning: 'gol atmak' },
      { word: 'goal', meaning: 'gol' },
      { word: 'player', meaning: 'oyuncu' },
      { word: 'to win', meaning: 'kazanmak' },
    ],
    watchFor: [
      'Gol anında spiker ne diyor?',
      'Takım isimlerinden sonra hangi fiil geliyor?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-basketbol',
    type: 'youtube',
    title: 'NBA maç özeti · İngilizce anlatım',
    where: 'YouTube — "NBA highlights" ara',
    levels: ['A1'],
    tastes: ['basketbol', 'spor'],
    why: 'Basketbol seçtin. Sayı ve skor sürekli tekrarlandığı için A1\'de sayı dinleme pratiği olarak da çalışıyor.',
    instruction: '5-10 dakikalık bir özet izle. Duyduğun sayıları yaz, sonra skoru kontrol et.',
    words: [
      { word: 'point', meaning: 'sayı' },
      { word: 'to shoot', meaning: 'şut atmak' },
      { word: 'team', meaning: 'takım' },
      { word: 'quarter', meaning: 'periyot, çeyrek' },
    ],
    watchFor: [
      'Kaç farklı sayı duydun?',
      'Sayı olduğunda spiker hangi kelimeyi kullanıyor?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-fitness',
    type: 'youtube',
    title: 'Başlangıç seviyesi antrenman videosu · İngilizce',
    where: 'YouTube — "beginner workout at home english" ara',
    levels: ['A1'],
    tastes: ['fitness', 'spor'],
    why: 'Fitness seçtin. Antrenman videoları baştan sona emir cümlesinden oluşur — "lift", "hold", "breathe" — ve A1\'de öğrenmen gereken ilk yapı tam olarak bu.',
    instruction: '10 dakikalık bir video seç ve gerçekten yap. Söylenen emirleri anlamaya çalış, altyazıya bakma.',
    words: [
      { word: 'to lift', meaning: 'kaldırmak' },
      { word: 'to hold', meaning: 'tutmak' },
      { word: 'to breathe', meaning: 'nefes almak' },
      { word: 'rest', meaning: 'dinlenme' },
    ],
    watchFor: [
      'Kaç farklı emir cümlesi duydun?',
      '"Keep going" ne demek — hareketten anlayabildin mi?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-dovus',
    type: 'youtube',
    title: 'Boks / UFC maç özeti · İngilizce anlatım',
    where: 'YouTube — "boxing highlights" veya "UFC highlights" ara',
    levels: ['A1'],
    tastes: ['dovus', 'spor'],
    why: 'Dövüş sporu seçtin. Anlatım kısa ve tekrarlı; hareket ekranda olduğu için fiilleri görerek öğreniyorsun.',
    instruction: '5-10 dakikalık bir özet izle. Vuruş anlatan fiilleri topla.',
    words: [
      { word: 'to hit', meaning: 'vurmak' },
      { word: 'round', meaning: 'raunt' },
      { word: 'to knock down', meaning: 'yere sermek' },
      { word: 'winner', meaning: 'kazanan' },
    ],
    watchFor: [
      'Kaç farklı vuruş fiili duydun?',
      'Kazananı açıklarken hangi kalıp kullanılıyor?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-motor',
    type: 'youtube',
    title: 'Formula 1 yarış özeti · İngilizce anlatım',
    where: 'YouTube — "F1 race highlights" ara',
    levels: ['A1'],
    tastes: ['motor', 'spor', 'otomobil'],
    why: 'Motor sporları seçtin. Yarış anlatımı hızlı ama kelime dağarcığı dar — aynı 20 kelime dönüyor, bu da A1 için aslında avantaj.',
    instruction: '5-10 dakikalık bir özet izle. Sıralamayı anlatan kelimeleri yakala.',
    words: [
      { word: 'lap', meaning: 'tur' },
      { word: 'fast', meaning: 'hızlı' },
      { word: 'to overtake', meaning: 'geçmek (öne geçmek)' },
      { word: 'first / second', meaning: 'birinci / ikinci' },
    ],
    watchFor: [
      'Sıra sayıları (first, second, third) kaç kez geçti?',
      '"pit stop" ne demek — görüntüden çıkarabildin mi?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-kosu',
    type: 'youtube',
    title: 'Koşu vlogu · "my first 5K"',
    where: 'YouTube — "beginner running vlog 5k" ara',
    levels: ['A1'],
    tastes: ['kosu', 'spor'],
    why: 'Koşu seçtin. Vlog\'larda kişi kendi kendine konuşur — yavaş, günlük ve tekrarlı bir İngilizce. A1 için dinlemesi rahat.',
    instruction: '10 dakikalık bir vlog izle. Kişinin kendi hislerini anlattığı cümleleri not al.',
    words: [
      { word: 'to run', meaning: 'koşmak' },
      { word: 'tired', meaning: 'yorgun' },
      { word: 'distance', meaning: 'mesafe' },
      { word: 'to feel', meaning: 'hissetmek' },
    ],
    watchFor: [
      '"I feel…" ile kaç cümle kurdu?',
      'Yorulduğunu nasıl anlattı?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-tenis',
    type: 'youtube',
    title: 'Tenis maç özeti · İngilizce anlatım',
    where: 'YouTube — "ATP tennis highlights" ara',
    levels: ['A1'],
    tastes: ['tenis', 'spor'],
    why: 'Tenis seçtin. Tenis anlatımı sessiz ve seyrek konuşur — cümleler arasında boşluk olduğu için A1\'de takip etmesi kolay.',
    instruction: '5-10 dakikalık bir özet izle. Skor anonslarını dinle, sayıları yaz.',
    words: [
      { word: 'point', meaning: 'sayı' },
      { word: 'serve', meaning: 'servis' },
      { word: 'game', meaning: 'oyun' },
      { word: 'match', meaning: 'maç' },
    ],
    watchFor: [
      'Skor nasıl söyleniyor?',
      '"out" ve "in" ne zaman deniyor?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-dogaspor',
    type: 'youtube',
    title: 'Doğa yürüyüşü vlogu · İngilizce',
    where: 'YouTube — "hiking vlog english" ara',
    levels: ['A1'],
    tastes: ['dogaspor', 'spor', 'seyahat'],
    why: 'Doğa sporları seçtin. Yürüyüş vlog\'ları yavaş tempoludur; kişi gördüğü şeyi tarif eder, bu da A1\'de sıfat ve yer kelimeleri için ideal.',
    instruction: '10 dakikalık bir vlog izle. Manzarayı tarif ederken kullandığı sıfatları topla.',
    words: [
      { word: 'mountain', meaning: 'dağ' },
      { word: 'to walk', meaning: 'yürümek' },
      { word: 'view', meaning: 'manzara' },
      { word: 'beautiful', meaning: 'güzel' },
    ],
    watchFor: [
      'Kaç farklı sıfat duydun?',
      'Yer tarif ederken hangi edatları kullandı — "on", "in", "next to"?',
    ],
    noun: 'video',
  },

  /* ═══════════════════════════════════════════════ İLGİ ALANLARI
   * Kısa, olayın ekranda geçtiği videolar. Hepsinin ortak özelliği: dil
   * anlamı tek başına taşımıyor, görüntü destekliyor.
   */
  {
    id: 'a1-oyun',
    type: 'youtube',
    title: 'Oyun anlatımı (let\'s play) · İngilizce',
    where: 'YouTube — "minecraft lets play english" gibi, sevdiğin oyunu ara',
    levels: ['A1'],
    tastes: ['oyun'],
    why: 'Oyun seçtin. Oyuncular ne yaptıklarını anlatarak oynar — "I\'m going here", "I need wood" gibi. Ekranda ne olduğunu gördüğün için cümleyi eşleştiriyorsun.',
    instruction: '10 dakika izle. Oyuncunun o an ne yaptığını anlattığı cümleleri yakala.',
    words: [
      { word: 'to build', meaning: 'inşa etmek' },
      { word: 'to need', meaning: 'ihtiyacı olmak' },
      { word: 'let\'s go', meaning: 'hadi gidelim' },
      { word: 'careful', meaning: 'dikkatli' },
    ],
    watchFor: [
      '"I\'m…ing" kalıbıyla kaç cümle kurdu?',
      'Bir şeye ihtiyacı olduğunu nasıl söylüyor?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-teknoloji',
    type: 'youtube',
    title: 'Telefon / cihaz kutu açılımı · İngilizce',
    where: 'YouTube — "phone unboxing english" ara',
    levels: ['A1'],
    tastes: ['teknoloji'],
    why: 'Teknoloji seçtin. Kutu açılımı videolarında konuşulan her şey elde tutuluyor — kelimeyi nesneyle birlikte gördüğün için A1\'de en hızlı öğreten format.',
    instruction: '5-10 dakikalık bir video izle. Gördüğün nesnelerin İngilizce adlarını yaz.',
    words: [
      { word: 'box', meaning: 'kutu' },
      { word: 'screen', meaning: 'ekran' },
      { word: 'charger', meaning: 'şarj aleti' },
      { word: 'to open', meaning: 'açmak' },
    ],
    watchFor: [
      'Kaç nesne adı öğrendin?',
      'Bir şeyi tarif ederken hangi sıfatları kullanıyor?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-yemek',
    type: 'youtube',
    title: 'Basit yemek tarifi videosu · İngilizce',
    where: 'YouTube — "easy recipe english" ara',
    levels: ['A1'],
    tastes: ['yemek'],
    why: 'Yemek seçtin. Tarif videoları baştan sona emir cümlesidir — "cut", "add", "mix" — ve her cümlenin karşılığı ekranda yapılıyor. A1 için kusursuz eşleşme.',
    instruction: 'Bir tarif izle, 5-10 dakika. Adımları İngilizce yaz, sonra gerçekten yapmayı dene.',
    words: [
      { word: 'to cut', meaning: 'kesmek' },
      { word: 'to add', meaning: 'eklemek' },
      { word: 'to mix', meaning: 'karıştırmak' },
      { word: 'salt', meaning: 'tuz' },
    ],
    watchFor: [
      'Kaç farklı emir fiili duydun?',
      'Miktar söylerken hangi kelimeleri kullanıyor?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-seyahat',
    type: 'youtube',
    title: 'Seyahat vlogu · yavaş İngilizce',
    where: 'YouTube — "slow english travel vlog" ara',
    levels: ['A1'],
    tastes: ['seyahat'],
    why: 'Seyahat seçtin. Vlog\'cular gördükleri şeyi anlatır, yani konuşma hep ekrandakiyle eşleşir. Ayrıca yer ve yön kelimeleri sürekli tekrarlanır.',
    instruction: '10 dakika izle. Şehri tarif ederken kullandığı cümleleri not al.',
    words: [
      { word: 'city', meaning: 'şehir' },
      { word: 'street', meaning: 'sokak' },
      { word: 'to visit', meaning: 'ziyaret etmek' },
      { word: 'expensive', meaning: 'pahalı' },
    ],
    watchFor: [
      'Yer tarif ederken hangi edatları kullandı?',
      '"There is / There are" kaç kez geçti?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-havaalani',
    type: 'youtube',
    title: 'Havaalanı ve otel İngilizcesi · rol yapma videosu',
    where: 'YouTube — "english at the airport conversation" ara',
    levels: ['A1'],
    tastes: ['seyahat-ortam'],
    why: 'Seyahat ortamını seçtin. Bu videolarda check-in, pasaport ve otel konuşmaları tek tek canlandırılıyor — ezberlediğin an gerçek hayatta kullanabileceğin kalıplar.',
    instruction: 'Bir video izle, 5-10 dakika. Kalıpları sesli tekrar et; ezberlemeye çalış, anlamaya değil.',
    words: [
      { word: 'passport', meaning: 'pasaport' },
      { word: 'luggage', meaning: 'bagaj' },
      { word: 'gate', meaning: 'kapı (uçuş)' },
      { word: 'Could I have…', meaning: '… alabilir miyim' },
    ],
    watchFor: [
      'Kibar istek kalıbı hangisi?',
      'Görevli hangi soruları soruyor?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-kitap',
    type: 'podcast',
    title: 'Oxford Bookworms · Starter seviyesi sesli kitap',
    where: 'YouTube / Spotify — "Oxford Bookworms starter audiobook" ara',
    levels: ['A1'],
    tastes: ['kitap'],
    why: 'Kitap seçtin. Bunlar A1 için sadeleştirilmiş hikâyeler — 250 kelimelik bir dağarcıkla yazılmış, yavaş okunuyor. Gerçek kitap A1\'de erken, bu tam kıvamında.',
    instruction: '10-15 dakika dinle. Metni de bulup gözle takip et — okuma ve dinlemeyi birleştirmek A1\'de en hızlı yöntem.',
    words: [
      { word: 'story', meaning: 'hikâye' },
      { word: 'to happen', meaning: 'olmak' },
      { word: 'then', meaning: 'sonra' },
      { word: 'suddenly', meaning: 'aniden' },
    ],
    watchFor: [
      'Hikâye hangi zamanda anlatılıyor?',
      'Olaylar arasında hangi bağlaçlar kullanılıyor?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-is',
    type: 'youtube',
    title: 'İş İngilizcesi temelleri · kısa dersler',
    where: 'YouTube — "business english for beginners" ara',
    levels: ['A1'],
    tastes: ['is', 'ofis'],
    why: 'İş ortamını seçtin. Bunlar başlangıç seviyesi iş İngilizcesi dersleri: kendini tanıtma, telefon açma, e-posta kalıpları. Finansta çalıştığın için doğrudan işine yarayan kısım.',
    instruction: 'Bir ders izle, 10 dakika. Öğrendiğin kalıbı kendi işinden bir örnekle yaz.',
    words: [
      { word: 'meeting', meaning: 'toplantı' },
      { word: 'to send', meaning: 'göndermek' },
      { word: 'colleague', meaning: 'iş arkadaşı' },
      { word: 'Could you please…', meaning: '… rica edebilir miyim' },
    ],
    watchFor: [
      'Kendini tanıtma kalıbı nasıl kuruluyor?',
      'Kibar rica ederken hangi kelime kullanılıyor?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-otomobil',
    type: 'youtube',
    title: 'Araba inceleme videosu · İngilizce',
    where: 'YouTube — "car review english" ara',
    levels: ['A1'],
    tastes: ['otomobil'],
    why: 'Otomobil seçtin. İnceleme videolarında her söylenen şey ekranda gösteriliyor — parça adları ve sıfatlar görüntüyle eşleşiyor.',
    instruction: '10 dakikalık bir inceleme izle. Arabayı tarif ederken kullandığı sıfatları topla.',
    words: [
      { word: 'engine', meaning: 'motor' },
      { word: 'wheel', meaning: 'tekerlek' },
      { word: 'fast', meaning: 'hızlı' },
      { word: 'comfortable', meaning: 'rahat' },
    ],
    watchFor: [
      'Kaç farklı sıfat kullandı?',
      'İki arabayı karşılaştırırken hangi kalıbı kullanıyor?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-sosyal',
    type: 'youtube',
    title: 'Kısa İngilizce videolar (shorts / reels)',
    where: 'YouTube — "english shorts daily phrases" ara',
    levels: ['A1'],
    tastes: ['sosyal'],
    why: 'Sosyal medya ortamını seçtin. 30-60 saniyelik videolar günlük bir kalıbı tek seferde öğretiyor; A1\'de dikkat süresi kısa olduğu için bu format iyi çalışıyor.',
    instruction: '5 kısa video izle, toplam 5 dakika. Her birinden bir kalıp yaz ve sesli tekrar et.',
    words: [
      { word: 'What\'s up?', meaning: 'Naber?' },
      { word: 'No worries', meaning: 'Sorun değil' },
      { word: 'to be into', meaning: '… ile ilgilenmek' },
      { word: 'kind of', meaning: 'biraz, bir bakıma' },
    ],
    watchFor: [
      'Öğrendiğin kalıbı bugün kullanabilir misin?',
      'Kalıp resmi mi, samimi mi?',
    ],
    noun: 'video',
  },
  {
    id: 'a1-muzik-lyrics',
    type: 'youtube',
    title: 'Sözlü (lyrics) video · sevdiğin şarkı',
    where: 'YouTube — şarkı adının yanına "lyrics" yazarak ara',
    levels: ['A1'],
    tastes: [
      'muzik', 'rock', 'metal', 'pop', 'rap', 'elektronik',
      'caz', 'blues', 'klasik', 'country', 'akustik',
    ],
    why: 'Müzik seviyorsun. Sözlü video, şarkıyı okuyarak dinlemeni sağlıyor — A1\'de duyduğunu yazıya bağlamak en hızlı ilerleten alıştırmalardan biri.',
    instruction: 'Bugünün şarkısını önce sözsüz dinle, sonra sözlü videoyla bir kez daha. Tanıdığın kelimeleri işaretle.',
    words: [
      { word: 'to sing', meaning: 'şarkı söylemek' },
      { word: 'word', meaning: 'kelime, söz' },
      { word: 'to repeat', meaning: 'tekrar etmek' },
      { word: 'line', meaning: 'dize, satır' },
    ],
    watchFor: [
      'Sözleri görmeden kaç kelime yakalayabildin?',
      'En çok tekrar eden dize hangisi?',
    ],
    noun: 'video',
  },

  /* ═══════════════════════════════════════════════════════════ ŞARKI
   * Müzik türlerinin A1 karşılıkları. Ölçüt: yavaş tempo, net telaffuz,
   * kısa ve tekrarlı sözler. Rock/metal/pop/akustik zaten kataloğun ortak
   * bölümünde A1'e açık — burada eksik kalan altı tür var.
   */
  {
    id: 'a1-song-rap',
    type: 'song',
    title: 'Will Smith — Summertime',
    where: 'Spotify / YouTube',
    levels: ['A1'],
    tastes: ['rap'],
    why: 'Rap dinliyorsun. Rap A1\'de genelde çok hızlı gelir; bu parça yavaş tempolu ve kelimeler tek tek anlaşılıyor — rap\'e başlamak için doğru yer.',
    instruction: 'Önce sözlere bakmadan dinle. Sonra sözleriyle bir kez daha; nakaratı ezberlemeyi dene.',
    words: [
      { word: 'summer', meaning: 'yaz' },
      { word: 'to chill', meaning: 'takılmak, rahatlamak' },
      { word: 'street', meaning: 'sokak' },
      { word: 'to remember', meaning: 'hatırlamak' },
    ],
    watchFor: [
      'Nakaratta kaç kelime anlayabildin?',
      '"summertime" kaç kez geçiyor?',
    ],
    noun: 'song',
  },
  {
    id: 'a1-song-elektronik',
    type: 'song',
    title: 'Avicii — Wake Me Up',
    where: 'Spotify / YouTube',
    levels: ['A1'],
    tastes: ['elektronik'],
    why: 'Elektronik seçtin. Bu parçanın sözleri yavaş söyleniyor ve nakarat sürekli tekrar ediyor — tekrar, A1\'de en iyi öğretmendir.',
    instruction: 'Önce sözsüz dinle. Nakaratı yakalamaya çalış, sonra sözleriyle kontrol et.',
    words: [
      { word: 'to wake up', meaning: 'uyanmak' },
      { word: 'to find', meaning: 'bulmak' },
      { word: 'young', meaning: 'genç' },
      { word: 'way', meaning: 'yol' },
    ],
    watchFor: [
      'Nakarat kaç kez tekrarlanıyor?',
      '"wake me up" nasıl bir cümle — emir mi, rica mı?',
    ],
    noun: 'song',
  },
  {
    id: 'a1-song-caz',
    type: 'song',
    title: 'Louis Armstrong — What a Wonderful World',
    where: 'Spotify / YouTube',
    levels: ['A1'],
    /**
     * ⚠️ Buraya bir ara `muzik` etiketi de eklenmişti — "Müzik" alanını
     * seçip tür seçmeyen kullanıcı tarafsız yedeğe düşmesin diye. Test
     * gösterdi ki bu ters tepiyor: metal seçen kullanıcı hem `metal` hem
     * `muzik` anahtarı taşıdığı için **caz parçası** alıyordu. Genel alan
     * etiketi tür etiketiyle yarışmamalı; "müzik sever ama tür seçmemiş"
     * durumunu tarafsız şarkının dürüst gerekçesi karşılıyor.
     */
    tastes: ['caz'],
    why: 'Caz seçtin. Bu parça çok yavaş ve sözleri baştan sona basit isim-sıfat eşleşmesi — "green trees", "red roses". A1 için neredeyse ders gibi.',
    instruction: 'Sözlere bakmadan dinle, duyduğun renkleri ve nesneleri yaz. Sonra sözleriyle karşılaştır.',
    words: [
      { word: 'tree', meaning: 'ağaç' },
      { word: 'sky', meaning: 'gökyüzü' },
      { word: 'wonderful', meaning: 'harika' },
      { word: 'world', meaning: 'dünya' },
    ],
    watchFor: [
      'Kaç renk adı duydun?',
      'Sıfat isimden önce mi geliyor, sonra mı?',
    ],
    noun: 'song',
  },
  {
    id: 'a1-song-blues',
    type: 'song',
    title: 'Eric Clapton — Tears in Heaven',
    where: 'Spotify / YouTube',
    levels: ['A1'],
    tastes: ['blues'],
    why: 'Blues seçtin. Yavaş, akustik ve sözleri kısa sorulardan oluşuyor — soru kalıbı çalışmak için elverişli.',
    instruction: 'Önce sözsüz dinle, kaç soru cümlesi duyduğunu say. Sonra sözleriyle kontrol et.',
    words: [
      { word: 'tears', meaning: 'gözyaşları' },
      { word: 'heaven', meaning: 'cennet' },
      { word: 'to know', meaning: 'bilmek' },
      { word: 'strong', meaning: 'güçlü' },
    ],
    watchFor: [
      'Soru cümleleri nasıl başlıyor?',
      '"Would you…" kalıbını duyabildin mi?',
    ],
    noun: 'song',
  },
  {
    id: 'a1-song-klasik',
    type: 'song',
    title: 'Judy Garland — Over the Rainbow',
    where: 'Spotify / YouTube',
    levels: ['A1'],
    tastes: ['klasik'],
    why: 'Klasik müzik seçtin. Enstrümantal parçalarda söz olmadığı için dinleme çalışması olmaz; bu orkestralı klasik parçanın sözleri var ve çok yavaş söyleniyor.',
    instruction: 'Sözlere bakmadan dinle, sonra sözleriyle. Tekrar eden dizeyi ezberlemeyi dene.',
    words: [
      { word: 'rainbow', meaning: 'gökkuşağı' },
      { word: 'dream', meaning: 'rüya, hayal' },
      { word: 'to fly', meaning: 'uçmak' },
      { word: 'somewhere', meaning: 'bir yerde' },
    ],
    watchFor: [
      '"somewhere over the rainbow" ne anlatıyor?',
      'Şarkıda kaç kez "why" geçiyor?',
    ],
    noun: 'song',
  },
  {
    id: 'a1-song-country',
    type: 'song',
    title: 'John Denver — Take Me Home, Country Roads',
    where: 'Spotify / YouTube',
    levels: ['A1'],
    tastes: ['country'],
    why: 'Country seçtin. Bu parça tempolu ama telaffuz çok net ve nakarat kısa — A1\'de birlikte söyleyebileceğin ilk şarkılardan biri.',
    instruction: 'Nakaratı ezberleyip şarkıyla birlikte söyle. Telaffuz çalışması olarak da işe yarar.',
    words: [
      { word: 'road', meaning: 'yol' },
      { word: 'home', meaning: 'ev, memleket' },
      { word: 'mountain', meaning: 'dağ' },
      { word: 'to belong', meaning: 'ait olmak' },
    ],
    watchFor: [
      'Nakaratta kaç yer adı geçiyor?',
      '"take me home" hangi kip — emir mi?',
    ],
    noun: 'song',
  },
];
