/**
 * Seviyeye göre kelime havuzu — hem **cetvel** hem **kaynak**.
 *
 * Neden var: 2026-08-09'da kullanıcı A2 seçiliyken kartlara "to be worth it",
 * "to come up with", "to run out of", "eventually", "genius" gibi kelimeler
 * geldi. Sebebi şuydu: öğretmene "seviyeye uygun kelime seç" deniyordu ama
 * ölçecek bir cetvel yoktu — ne öğretmen ne uygulama "worth A2 mi B1 mi"
 * sorusuna bakabileceği bir yere sahipti. Bu dosya o boşluğu kapatıyor.
 *
 * İki işi birden görür:
 *
 *   1. **Cetvel** — `levelOfWord('worth')` → 'B1'. `isTooHardFor(w, 'A2')`
 *      öğretmenin ve uygulamanın seçtiği kelimeyi denetler.
 *   2. **Kaynak** — `wordsForLevel('A2', 5, ...)` günün kelimelerini verir.
 *      Öğretmen henüz ders göndermemişken kartlar boş kalmasın diye.
 *
 * Öğretmenden ders geldiği anda 2. iş devre dışı kalır: kelimeye asıl karar
 * veren hep öğretmendir, burası yedektir. Cetvel ise her zaman geçerli.
 *
 * **Neden sözcük türüne göre gruplanmış:** İlk sürümde kelimeler tek bir düz
 * liste hâlindeydi ve seçim rastgele oluyordu; kullanıcı sonucu görüp *"bir
 * sürü fiil eklemişsin, kelime-fiil kısmını oransal dağıt"* dedi. Haklıydı:
 * sadece fiil öğrenen biri cümle kuramaz, sadece isim öğrenen de. Gruplar
 * ayrı durunca oran **seçim anında** zorlanabiliyor (`MIX`), depodaki sayılar
 * ne olursa olsun günün listesi dengeli çıkıyor.
 *
 * **Neden Tureng/sözlük servisi değil:** Tureng'in açık bir API'si yok, sayfayı
 * kazımak hem CORS'a takılır hem her tasarım değişiminde kırılır. Üstelik
 * Tureng bir *çeviri* sözlüğü — bir kelimenin **hangi seviyeye ait olduğunu**
 * söylemez, ki burada asıl ihtiyacımız o. Liste CEFR sınıflandırmasına göre
 * elle derlendi: çevrimdışı çalışır, ücretsizdir ve kimseye bağımlı değildir.
 *
 * Saf TypeScript — ağ yok, bu yüzden `node --experimental-strip-types` ile
 * doğrudan çalıştırılıp test edilebilir.
 */

import { LEVELS, levelIndex, type CEFRLevel } from './level';

/** Sözcük türü — günün listesinin dengesi buna göre kuruluyor */
export type WordKind = 'isim' | 'fiil' | 'sıfat' | 'zarf' | 'kalıp';

export interface BankWord {
  word: string;
  level: CEFRLevel;
  kind: WordKind;
  /** Türkçe karşılık — kartın ön yüzü */
  meaning: string;
  /** Seviyeye uygun kısa örnek; kart tanıştırma ekranı bunu gösterir */
  example: string;
}

/** `[kelime, türkçe, örnek]` — tür, içinde bulunduğu gruptan gelir. */
type Row = [string, string, string];
type Group = Partial<Record<WordKind, Row[]>>;

/* ------------------------------------------------------------------ A1 */

const A1: Group = {
  isim: [
    ['water', 'su', 'I drink water every morning.'],
    ['book', 'kitap', 'This book is very good.'],
    ['house', 'ev', 'Their house is near the park.'],
    ['school', 'okul', 'The school opens at eight.'],
    ['friend', 'arkadaş', 'My friend lives in Ankara.'],
    ['family', 'aile', 'I visit my family on Sunday.'],
    ['food', 'yemek', 'The food here is cheap.'],
    ['morning', 'sabah', 'I run every morning.'],
    ['night', 'gece', 'She works at night.'],
    ['city', 'şehir', 'Istanbul is a big city.'],
    ['car', 'araba', 'My car is very old.'],
    ['door', 'kapı', 'Please close the door.'],
    ['window', 'pencere', 'Open the window, it is hot.'],
    ['table', 'masa', 'Your keys are on the table.'],
    ['room', 'oda', 'My room is small but nice.'],
    ['street', 'sokak', 'We live on a quiet street.'],
    ['money', 'para', 'I need money for the bus.'],
    ['name', 'isim, ad', 'What is your name?'],
    ['day', 'gün', 'It was a long day.'],
    ['week', 'hafta', 'I work five days a week.'],
    ['month', 'ay', 'We moved here last month.'],
    ['year', 'yıl', 'She studied here for a year.'],
    ['time', 'zaman, vakit', 'I have no time today.'],
    ['hand', 'el', 'Wash your hands, please.'],
    ['eye', 'göz', 'Her eyes are green.'],
    ['child', 'çocuk', 'The child is sleeping.'],
    ['man', 'adam', 'That man is my teacher.'],
    ['woman', 'kadın', 'A woman called you.'],
    ['teacher', 'öğretmen', 'Our teacher is very kind.'],
    ['student', 'öğrenci', 'I am a student here.'],
    ['doctor', 'doktor', 'You should see a doctor.'],
    ['shop', 'dükkân, mağaza', 'The shop closes at nine.'],
    ['bread', 'ekmek', 'We need bread and milk.'],
    ['milk', 'süt', 'I put milk in my tea.'],
    ['apple', 'elma', 'She eats an apple every day.'],
    ['tea', 'çay', 'Would you like some tea?'],
    ['coffee', 'kahve', 'I drink coffee after lunch.'],
    ['dog', 'köpek', 'Their dog is very friendly.'],
    ['cat', 'kedi', 'The cat is under the chair.'],
    ['tree', 'ağaç', 'There is a tree in the garden.'],
    ['sun', 'güneş', 'The sun is very strong today.'],
    ['rain', 'yağmur', 'The rain started at noon.'],
  ],
  fiil: [
    ['eat', 'yemek yemek', 'We eat dinner at seven.'],
    ['drink', 'içmek', 'I drink a lot of water.'],
    ['sleep', 'uyumak', 'I sleep seven hours.'],
    ['walk', 'yürümek', 'I walk to work.'],
    ['run', 'koşmak', 'She runs every weekend.'],
    ['read', 'okumak', 'I read before bed.'],
    ['write', 'yazmak', 'Write your name here.'],
    ['speak', 'konuşmak', 'I speak a little English.'],
    ['listen', 'dinlemek', 'Listen to me, please.'],
    ['watch', 'izlemek', 'We watch films on Friday.'],
    ['buy', 'satın almak', 'I want to buy a ticket.'],
    ['give', 'vermek', 'Give me your phone.'],
    ['take', 'almak', 'Take an umbrella with you.'],
    ['come', 'gelmek', 'Come with us tonight.'],
    ['help', 'yardım etmek', 'Can you help me?'],
    ['learn', 'öğrenmek', 'I want to learn English.'],
    ['live', 'yaşamak, oturmak', 'They live in Izmir.'],
    ['love', 'sevmek', 'I love this song.'],
    ['want', 'istemek', 'I want a coffee.'],
    ['need', 'ihtiyacı olmak', 'We need more time.'],
    ['know', 'bilmek, tanımak', 'I know that man.'],
    ['think', 'düşünmek', 'I think you are right.'],
    ['ask', 'sormak', 'Ask the teacher.'],
    ['start', 'başlamak', 'The film starts at eight.'],
    ['finish', 'bitirmek', 'I finish work at six.'],
    ['play', 'oynamak', 'The children play outside.'],
    ['open', 'açmak', 'Open your books, please.'],
    ['close', 'kapatmak', 'Close the door, please.'],
    ['work', 'çalışmak', 'I work in a bank.'],
    ['go', 'gitmek', 'We go to school by bus.'],
  ],
  sıfat: [
    ['cold', 'soğuk', 'The water is too cold.'],
    ['hot', 'sıcak', 'Be careful, the plate is hot.'],
    ['big', 'büyük', 'They live in a big house.'],
    ['small', 'küçük', 'My office is very small.'],
    ['new', 'yeni', 'I bought a new phone.'],
    ['old', 'eski, yaşlı', 'This building is very old.'],
    ['good', 'iyi', 'That is a good idea.'],
    ['bad', 'kötü', 'The weather was bad.'],
    ['happy', 'mutlu', 'I am happy to see you.'],
    ['sad', 'üzgün', 'She looks sad today.'],
    ['easy', 'kolay', 'The test was easy.'],
    ['difficult', 'zor', 'This question is difficult.'],
    ['fast', 'hızlı', 'He speaks very fast.'],
    ['slow', 'yavaş', 'The bus is slow today.'],
    ['young', 'genç', 'She is very young.'],
    ['tall', 'uzun boylu', 'My brother is tall.'],
    ['hungry', 'aç', 'I am hungry now.'],
    ['tired', 'yorgun', 'The children are tired.'],
  ],
  zarf: [
    ['early', 'erken', 'I woke up early.'],
    ['late', 'geç', 'Sorry, I am late.'],
    ['always', 'her zaman', 'She always drinks tea.'],
    ['never', 'asla, hiç', 'I never eat breakfast.'],
    ['sometimes', 'bazen', 'Sometimes we walk home.'],
    ['very', 'çok', 'This book is very good.'],
    ['now', 'şimdi', 'I am busy now.'],
    ['today', 'bugün', 'Today is my birthday.'],
  ],
};

/**
 * A1 — **ek havuz.**
 *
 * Ölçüm (2026-08-10): A1'de 98 kelime vardı, günde 4 yeni kelimeyle
 * **24 günde tükeniyordu.** Havuz bitince kart tarafı ya tekrara düşer ya
 * seviyenin üstüne taşar; ikisi de A1'de öğrenciyi durdurur.
 *
 * Bu blok havuzu ~300'e çıkarıyor, yani **~75 günlük** malzeme. Seçim ölçütü
 * CEFR A1 çekirdeği: aile, ev, yemek, zaman, vücut, yer, iş/okul, kıyafet,
 * doğa ve günlük fiiller — kişinin ilk cümlelerini kurabilmesi için gereken
 * kelimeler.
 *
 * Kurallar:
 *  - Örnek cümleler `LEVEL_SPEC.A1.maxExampleWords` (8) sınırına uyar.
 *  - Kısaltma yok ("do not", "cannot"): A1'de kısaltmalar okumayı zorlaştırır
 *    ve kart telaffuz aşamasında yanlış okunuyor.
 *  - Üst seviyelerdeki kelimelerle çakışma yok. Aynı kelime iki seviyede
 *    olursa `levelOfWord` ilkini döndürür ve cetvel bozulur — bu dosyanın
 *    asıl işi cetvel olmak.
 *  - Tür dağılımı `MIX` hedefine yakın tutuldu.
 */
const A1_EK: Group = {
  isim: [
    ['mother', 'anne', 'My mother works at a school.'],
    ['father', 'baba', 'His father drives a bus.'],
    ['brother', 'erkek kardeş', 'My brother is ten years old.'],
    ['sister', 'kız kardeş', 'Her sister lives in Ankara.'],
    ['baby', 'bebek', 'The baby is sleeping now.'],
    ['boy', 'erkek çocuk', 'That boy is my student.'],
    ['girl', 'kız çocuk', 'The girl has a red bag.'],
    ['people', 'insanlar', 'Many people work here.'],
    ['husband', 'koca, eş', 'Her husband is a teacher.'],
    ['wife', 'karı, eş', 'His wife works in a bank.'],
    ['son', 'oğul', 'Their son goes to school.'],
    ['daughter', 'kız evlat', 'My daughter likes music.'],
    ['bed', 'yatak', 'The bed is very big.'],
    ['chair', 'sandalye', 'Please sit on this chair.'],
    ['bedroom', 'yatak odası', 'My bedroom is small.'],
    ['bathroom', 'banyo', 'The bathroom is upstairs.'],
    ['wall', 'duvar', 'There is a picture on the wall.'],
    ['phone', 'telefon', 'My phone is on the table.'],
    ['computer', 'bilgisayar', 'I use a computer at work.'],
    ['television', 'televizyon', 'We watch television at night.'],
    ['clock', 'saat (duvar)', 'The clock says three.'],
    ['picture', 'resim', 'This picture is beautiful.'],
    ['bag', 'çanta', 'Her bag is very heavy.'],
    ['letter', 'mektup', 'I wrote a letter to him.'],
    ['rice', 'pirinç', 'We eat rice every day.'],
    ['meat', 'et', 'He does not eat meat.'],
    ['egg', 'yumurta', 'I eat two eggs for breakfast.'],
    ['cheese', 'peynir', 'This cheese is very salty.'],
    ['fruit', 'meyve', 'Fruit is good for you.'],
    ['vegetable', 'sebze', 'She buys fresh vegetables.'],
    ['sugar', 'şeker', 'No sugar in my tea, please.'],
    ['salt', 'tuz', 'Put a little salt in it.'],
    ['juice', 'meyve suyu', 'I drink orange juice.'],
    ['cake', 'pasta', 'The cake is on the table.'],
    ['soup', 'çorba', 'This soup is very hot.'],
    ['chicken', 'tavuk', 'We had chicken for dinner.'],
    ['breakfast', 'kahvaltı', 'I have breakfast at eight.'],
    ['lunch', 'öğle yemeği', 'Lunch is at one.'],
    ['dinner', 'akşam yemeği', 'Dinner is ready now.'],
    ['hour', 'saat (süre)', 'I waited for one hour.'],
    ['minute', 'dakika', 'Wait five minutes, please.'],
    ['weekend', 'hafta sonu', 'We rest at the weekend.'],
    ['birthday', 'doğum günü', 'Her birthday is in May.'],
    ['summer', 'yaz', 'Summer is very hot here.'],
    ['winter', 'kış', 'Winter is cold in Ankara.'],
    ['head', 'kafa, baş', 'My head hurts today.'],
    ['face', 'yüz', 'She has a happy face.'],
    ['hair', 'saç', 'Her hair is very long.'],
    ['foot', 'ayak', 'My foot is cold.'],
    ['leg', 'bacak', 'He hurt his leg.'],
    ['arm', 'kol', 'She broke her arm.'],
    ['mouth', 'ağız', 'Open your mouth, please.'],
    ['nose', 'burun', 'The baby has a small nose.'],
    ['ear', 'kulak', 'My ears are cold.'],
    ['park', 'park', 'We walk in the park.'],
    ['market', 'pazar, market', 'The market opens at nine.'],
    ['station', 'istasyon', 'The station is near here.'],
    ['bank', 'banka', 'The bank closes at five.'],
    ['restaurant', 'restoran', 'This restaurant is very good.'],
    ['hotel', 'otel', 'Our hotel is near the sea.'],
    ['village', 'köy', 'My family lives in a village.'],
    ['country', 'ülke', 'I want to visit that country.'],
    ['road', 'yol', 'This road goes to the city.'],
    ['bus', 'otobüs', 'I take the bus to work.'],
    ['train', 'tren', 'The train leaves at six.'],
    ['plane', 'uçak', 'The plane is very fast.'],
    ['job', 'iş', 'She has a new job.'],
    ['class', 'sınıf, ders', 'Our class starts at nine.'],
    ['lesson', 'ders', 'The lesson was very easy.'],
    ['homework', 'ödev', 'I do my homework at night.'],
    ['pen', 'kalem', 'Can I use your pen?'],
    ['paper', 'kâğıt', 'Write it on this paper.'],
    ['question', 'soru', 'I have one question.'],
    ['answer', 'cevap', 'Your answer is correct.'],
    ['word', 'kelime', 'I learned five new words.'],
    ['number', 'sayı, numara', 'What is your phone number?'],
    ['colour', 'renk', 'My favourite colour is blue.'],
    ['shirt', 'gömlek', 'His shirt is white.'],
    ['shoes', 'ayakkabı', 'These shoes are very small.'],
    ['dress', 'elbise', 'She wears a red dress.'],
    ['hat', 'şapka', 'He never wears a hat.'],
    ['coat', 'palto, mont', 'Take your coat, it is cold.'],
    ['snow', 'kar', 'There is snow on the road.'],
    ['wind', 'rüzgâr', 'The wind is very strong.'],
    ['cloud', 'bulut', 'There are no clouds today.'],
    ['sky', 'gökyüzü', 'The sky is blue.'],
    ['sea', 'deniz', 'The sea is warm in summer.'],
    ['mountain', 'dağ', 'We climbed a big mountain.'],
    ['river', 'nehir', 'The river is very long.'],
    ['flower', 'çiçek', 'She gave me a flower.'],
    ['bird', 'kuş', 'A bird is on the tree.'],
    ['horse', 'at', 'The horse runs very fast.'],
    ['music', 'müzik', 'I listen to music every day.'],
    ['film', 'film', 'We watched a good film.'],
    ['game', 'oyun', 'This game is very easy.'],
    ['story', 'hikâye', 'Tell me a short story.'],
    ['party', 'parti', 'The party starts at eight.'],
    ['gift', 'hediye', 'This gift is for you.'],
  ],
  fiil: [
    ['have', 'sahip olmak', 'I have two brothers.'],
    ['do', 'yapmak', 'What do you do at work?'],
    ['make', 'yapmak, imal etmek', 'She makes very good coffee.'],
    ['say', 'söylemek', 'Say your name, please.'],
    ['tell', 'anlatmak', 'Tell me about your day.'],
    ['see', 'görmek', 'I see a big house.'],
    ['look', 'bakmak', 'Look at this picture.'],
    ['hear', 'duymak', 'I hear a strange noise.'],
    ['feel', 'hissetmek', 'I feel very happy today.'],
    ['put', 'koymak', 'Put the book on the table.'],
    ['get', 'almak, edinmek', 'I get a letter every week.'],
    ['find', 'bulmak', 'I cannot find my keys.'],
    ['keep', 'saklamak, tutmak', 'Keep this pen, please.'],
    ['let', 'izin vermek', 'Let me help you.'],
    ['call', 'aramak, seslenmek', 'Call me at seven.'],
    ['stand', 'ayakta durmak', 'Please stand here.'],
    ['sit', 'oturmak', 'Sit next to me.'],
    ['stop', 'durmak', 'The bus stops here.'],
    ['turn', 'dönmek, çevirmek', 'Turn left at the shop.'],
    ['use', 'kullanmak', 'I use this every day.'],
    ['show', 'göstermek', 'Show me your homework.'],
    ['bring', 'getirmek', 'Bring your book tomorrow.'],
    ['send', 'göndermek', 'Send me a message.'],
    ['meet', 'buluşmak, tanışmak', 'We meet every Friday.'],
    ['pay', 'ödemek', 'I pay for my coffee.'],
    ['cook', 'yemek pişirmek', 'She cooks very well.'],
    ['wash', 'yıkamak', 'Wash your hands, please.'],
    ['drive', 'araba sürmek', 'He drives to work.'],
    ['fly', 'uçmak', 'Birds fly very high.'],
    ['swim', 'yüzmek', 'I swim in summer.'],
    ['sing', 'şarkı söylemek', 'She sings very well.'],
    ['dance', 'dans etmek', 'They dance every weekend.'],
    ['draw', 'çizmek', 'The child draws a house.'],
    ['cut', 'kesmek', 'Cut the bread, please.'],
    ['wear', 'giymek', 'I wear a coat in winter.'],
    ['win', 'kazanmak', 'Our team won the game.'],
    ['lose', 'kaybetmek', 'I always lose my pen.'],
    ['try', 'denemek', 'Try this food.'],
    ['hope', 'ummak', 'I hope you are well.'],
    ['believe', 'inanmak', 'I believe you.'],
    ['understand', 'anlamak', 'I do not understand this word.'],
    ['mean', 'anlamına gelmek', 'What does this word mean?'],
    ['happen', 'olmak, gerçekleşmek', 'What happened yesterday?'],
    ['become', 'olmak, dönüşmek', 'He became a teacher.'],
    ['begin', 'başlamak', 'The film begins at eight.'],
    ['build', 'inşa etmek', 'They build houses.'],
    ['catch', 'yakalamak', 'Catch the ball, please.'],
    ['count', 'saymak', 'Count to ten.'],
    ['cry', 'ağlamak', 'The baby cries at night.'],
    ['laugh', 'gülmek', 'We laughed a lot.'],
    ['miss', 'kaçırmak, özlemek', 'I miss my family.'],
    ['pass', 'geçmek, uzatmak', 'Pass me the salt.'],
    ['push', 'itmek', 'Push the door, please.'],
    ['pull', 'çekmek', 'Pull this door to open.'],
    ['ride', 'binmek (bisiklet, at)', 'I ride my bike to school.'],
    ['sell', 'satmak', 'They sell fresh bread.'],
    ['share', 'paylaşmak', 'We share a room.'],
    ['shout', 'bağırmak', 'Do not shout, please.'],
    ['smile', 'gülümsemek', 'She smiles all the time.'],
    ['stay', 'kalmak', 'We stay at home on Sunday.'],
    ['study', 'çalışmak (ders)', 'I study English every night.'],
    ['talk', 'konuşmak', 'We talk on the phone.'],
    ['teach', 'öğretmek', 'She teaches maths.'],
    ['throw', 'atmak', 'Throw the ball to me.'],
    ['touch', 'dokunmak', 'Do not touch that.'],
    ['visit', 'ziyaret etmek', 'We visit my aunt on Sunday.'],
    ['wake up', 'uyanmak', 'I wake up at six.'],
    ['enter', 'girmek', 'Enter the room quietly.'],
    ['hurt', 'acımak, incitmek', 'My leg hurts today.'],
  ],
  'sıfat': [
    ['beautiful', 'güzel', 'This city is very beautiful.'],
    ['ugly', 'çirkin', 'That building is ugly.'],
    ['long', 'uzun', 'This film is very long.'],
    ['short', 'kısa', 'The story is short.'],
    ['high', 'yüksek', 'The mountain is very high.'],
    ['low', 'alçak, düşük', 'The table is too low.'],
    ['heavy', 'ağır', 'This bag is very heavy.'],
    ['light', 'hafif', 'My coat is light.'],
    ['full', 'dolu', 'The bus is full.'],
    ['thirsty', 'susamış', 'I am very thirsty.'],
    ['sick', 'hasta', 'My son is sick today.'],
    ['well', 'iyi (sağlıkça)', 'I feel well now.'],
    ['ready', 'hazır', 'Dinner is ready.'],
    ['free', 'boş, ücretsiz', 'Are you free tomorrow?'],
    ['rich', 'zengin', 'His family is rich.'],
    ['poor', 'fakir', 'The village is poor.'],
    ['right', 'doğru', 'Your answer is right.'],
    ['wrong', 'yanlış', 'This number is wrong.'],
    ['same', 'aynı', 'We have the same book.'],
    ['different', 'farklı', 'Their houses are different.'],
    ['nice', 'hoş, güzel', 'She is a nice person.'],
    ['kind', 'nazik, iyi kalpli', 'He is very kind to me.'],
    ['funny', 'komik', 'This film is very funny.'],
    ['loud', 'gürültülü', 'The music is too loud.'],
    ['soft', 'yumuşak', 'This bed is very soft.'],
    ['hard', 'sert, zor', 'The chair is too hard.'],
    ['warm', 'ılık, sıcak', 'The water is warm.'],
    ['cool', 'serin', 'The evening is cool.'],
    ['wet', 'ıslak', 'My shoes are wet.'],
    ['dry', 'kuru', 'The towel is dry.'],
    ['dark', 'karanlık', 'The room is dark.'],
    ['bright', 'parlak, aydınlık', 'The kitchen is bright.'],
    ['sweet', 'tatlı', 'This tea is too sweet.'],
    ['favourite', 'en sevdiği', 'Blue is my favourite colour.'],
    ['important', 'önemli', 'This lesson is important.'],
    ['real', 'gerçek', 'Is this a real story?'],
    ['true', 'doğru, gerçek', 'Your story is true.'],
    ['next', 'sonraki', 'See you next week.'],
    ['last', 'son, geçen', 'I saw him last night.'],
    ['first', 'ilk, birinci', 'This is my first day.'],
  ],
  zarf: [
    ['tomorrow', 'yarın', 'I will call you tomorrow.'],
    ['yesterday', 'dün', 'We met yesterday.'],
    ['here', 'burada', 'Please wait here.'],
    ['there', 'orada', 'Your bag is over there.'],
    ['again', 'tekrar', 'Say it again, please.'],
    ['too', 'de, çok fazla', 'This coffee is too hot.'],
    ['also', 'ayrıca, da', 'She also speaks German.'],
    ['only', 'sadece', 'I have only one pen.'],
    ['soon', 'yakında', 'The bus comes soon.'],
    ['still', 'hâlâ', 'He is still at work.'],
    ['then', 'sonra, o zaman', 'We ate, then we walked.'],
    ['often', 'sık sık', 'I often read at night.'],
    ['slowly', 'yavaşça', 'Please speak slowly.'],
    ['really', 'gerçekten', 'This is really good.'],
    ['just', 'az önce, sadece', 'I just finished my work.'],
    ['ever', 'hiç', 'Have you ever been there?'],
    ['away', 'uzağa, uzakta', 'The school is far away.'],
    ['outside', 'dışarıda', 'The children play outside.'],
    ['inside', 'içeride', 'We stayed inside all day.'],
    ['before', 'önce', 'Wash your hands before dinner.'],
  ],
};

/* ------------------------------------------------------------------ A2 */

const A2: Group = {
  isim: [
    ['weather', 'hava durumu', 'The weather was terrible all week.'],
    ['holiday', 'tatil', 'We are going on holiday in July.'],
    ['ticket', 'bilet', 'I bought two tickets online.'],
    ['airport', 'havaalanı', 'The airport is far from the city.'],
    ['journey', 'yolculuk', 'The journey took four hours.'],
    ['luggage', 'bagaj, valiz', 'My luggage is still at the airport.'],
    ['meeting', 'toplantı', 'The meeting starts at ten.'],
    ['office', 'ofis', 'Our office is on the third floor.'],
    ['company', 'şirket', 'She works for a big company.'],
    ['customer', 'müşteri', 'A customer called this morning.'],
    ['price', 'fiyat', 'The price went up again.'],
    ['bill', 'hesap, fatura', 'Can we have the bill, please?'],
    ['salary', 'maaş', 'He is happy with his salary.'],
    ['manager', 'müdür, yönetici', 'My manager is on holiday.'],
    ['message', 'mesaj', 'I left a message for you.'],
    ['news', 'haber', 'I watch the news every evening.'],
    ['problem', 'sorun', 'We had a problem with the car.'],
    ['reason', 'sebep, neden', 'What is the reason for this?'],
    ['idea', 'fikir', 'That is a really good idea.'],
    ['mistake', 'hata', 'I made a small mistake.'],
    ['health', 'sağlık', 'Her health is much better now.'],
    ['medicine', 'ilaç', 'Take this medicine after food.'],
    ['hospital', 'hastane', 'He stayed in hospital for a week.'],
    ['exercise', 'egzersiz, alıştırma', 'I do exercise three times a week.'],
    ['neighbour', 'komşu', 'Our neighbour is very quiet.'],
    ['noise', 'gürültü', 'The noise from the street is awful.'],
    ['traffic', 'trafik', 'The traffic was very bad today.'],
    ['kitchen', 'mutfak', 'She is cooking in the kitchen.'],
    ['garden', 'bahçe', 'We have a small garden.'],
    ['floor', 'kat, zemin', 'They live on the fifth floor.'],
    ['key', 'anahtar', 'I lost my keys again.'],
    ['wallet', 'cüzdan', 'My wallet was in my bag.'],
    ['umbrella', 'şemsiye', 'Take an umbrella, it will rain.'],
    ['bottle', 'şişe', 'I always carry a water bottle.'],
    ['towel', 'havlu', 'There is a clean towel for you.'],
  ],
  fiil: [
    ['choose', 'seçmek', 'You can choose any colour.'],
    ['decide', 'karar vermek', 'We decided to stay at home.'],
    ['explain', 'açıklamak', 'Can you explain this again?'],
    ['describe', 'tarif etmek, betimlemek', 'Describe your last holiday.'],
    ['improve', 'geliştirmek, iyileşmek', 'I want to improve my English.'],
    ['practise', 'pratik yapmak', 'I practise speaking every evening.'],
    ['repeat', 'tekrarlamak', 'Could you repeat that, please?'],
    ['remember', 'hatırlamak', 'I cannot remember his name.'],
    ['forget', 'unutmak', "Don't forget your passport."],
    ['borrow', 'ödünç almak', 'Can I borrow your pen?'],
    ['lend', 'ödünç vermek', 'She lent me her car.'],
    ['save', 'biriktirmek, kurtarmak', 'We are saving money for a house.'],
    ['spend', 'harcamak, geçirmek', 'I spend too much on coffee.'],
    ['wait', 'beklemek', 'Wait for me outside.'],
    ['arrive', 'varmak, ulaşmak', 'The train arrives at six.'],
    ['leave', 'ayrılmak, bırakmak', 'We leave the office at five.'],
    ['return', 'dönmek, geri vermek', 'I will return the book tomorrow.'],
    ['travel', 'seyahat etmek', 'They travel a lot for work.'],
    ['carry', 'taşımak', 'Can you carry this bag?'],
    ['change', 'değiştirmek', 'I changed my plans.'],
    ['prepare', 'hazırlamak', 'I am preparing dinner now.'],
    ['invite', 'davet etmek', 'They invited us to the wedding.'],
    ['promise', 'söz vermek', 'He promised to call me.'],
    ['agree', 'katılmak, hemfikir olmak', 'I agree with you.'],
    ['book a table', 'masa ayırtmak', 'I booked a table for two.'],
    ['order', 'sipariş vermek', 'We ordered pizza last night.'],
    ['cost', 'mal olmak, tutmak', 'The repair cost a lot.'],
    ['rent', 'kiralamak', 'They rented a car for the weekend.'],
    ['move', 'taşınmak, hareket etmek', 'We moved to a new flat.'],
  ],
  sıfat: [
    ['useful', 'faydalı, işe yarar', 'This app is really useful.'],
    ['boring', 'sıkıcı', 'The film was long and boring.'],
    ['interesting', 'ilginç', 'She told an interesting story.'],
    ['busy', 'meşgul, yoğun', 'I am busy until Friday.'],
    ['quiet', 'sessiz, sakin', 'It is a quiet neighbourhood.'],
    ['safe', 'güvenli', 'This area is safe at night.'],
    ['dangerous', 'tehlikeli', 'Driving here is dangerous.'],
    ['clean', 'temiz', 'The room was clean and bright.'],
    ['dirty', 'kirli', 'My shoes are very dirty.'],
    ['cheap', 'ucuz', 'The hotel was cheap but clean.'],
    ['expensive', 'pahalı', 'This restaurant is too expensive.'],
    ['strong', 'güçlü, sert', 'He is strong enough to carry it.'],
    ['weak', 'zayıf, güçsüz', 'I felt weak after the flu.'],
    ['polite', 'kibar, nazik', 'The waiter was very polite.'],
    ['friendly', 'cana yakın', 'Our new colleague is friendly.'],
    ['lucky', 'şanslı', 'You are lucky to have this job.'],
    ['afraid', 'korkmuş, korkan', 'She is afraid of dogs.'],
    ['angry', 'kızgın, öfkeli', 'He was angry about the delay.'],
    ['excited', 'heyecanlı', 'The children are excited about the trip.'],
    ['worried', 'endişeli', 'I am worried about the exam.'],
    ['empty', 'boş', 'The bottle is empty.'],
    ['crowded', 'kalabalık', 'The bus was very crowded.'],
    ['comfortable', 'rahat', 'These shoes are comfortable.'],
    ['famous', 'ünlü', 'He is a famous singer.'],
  ],
  /**
   * A2 seviyesinde de kalıp vardır — hepsi B2 değil. Cetvel bunları
   * tanımazsa "bilmiyorum" deyip serbest bırakıyor ve seviye denetimi o
   * kelimelerde hiç çalışmıyor.
   */
  kalıp: [
    ['on time', 'zamanında', 'The train left exactly on time.'],
    ['at least', 'en azından', 'It will take at least two hours.'],
    ['of course', 'tabii ki, elbette', 'Of course you can borrow it.'],
    ['a lot of', 'bir sürü, çok', 'There were a lot of people.'],
    ['at the moment', 'şu anda', 'She is busy at the moment.'],
    ['in the end', 'sonunda', 'In the end we stayed at home.'],
  ],
  zarf: [
    ['enough', 'yeterli, yeterince', 'We do not have enough chairs.'],
    ['together', 'birlikte', 'We studied together last night.'],
    ['already', 'çoktan, zaten', 'I have already eaten.'],
    ['almost', 'neredeyse', 'I almost missed the bus.'],
    ['usually', 'genellikle', 'I usually walk to work.'],
    ['quickly', 'çabucak, hızlıca', 'She answered quickly.'],
    ['carefully', 'dikkatlice', 'Read the question carefully.'],
    ['maybe', 'belki', 'Maybe we can meet tomorrow.'],
  ],
};

/* ------------------------------------------------------------------ B1 */

const B1: Group = {
  isim: [
    ['advice', 'tavsiye, öğüt', 'She gave me some useful advice about the job.'],
    ['opinion', 'görüş, fikir', 'In my opinion, the plan is too risky.'],
    ['experience', 'deneyim, tecrübe', 'He has ten years of experience in finance.'],
    ['opportunity', 'fırsat', 'This is a good opportunity to practise.'],
    ['progress', 'ilerleme', 'You have made real progress this month.'],
    ['effort', 'çaba', 'It took a lot of effort to finish.'],
    ['purpose', 'amaç', 'What is the purpose of this meeting?'],
    ['attitude', 'tutum, tavır', 'Her attitude to work has changed.'],
    ['behaviour', 'davranış', 'His behaviour surprised everyone.'],
    ['relationship', 'ilişki', 'They have a good working relationship.'],
    ['responsibility', 'sorumluluk', 'Taking responsibility is not always easy.'],
    ['confidence', 'özgüven, güven', 'Speaking every day builds confidence.'],
    ['pressure', 'baskı', 'There is a lot of pressure before the deadline.'],
    ['deadline', 'son teslim tarihi', 'We missed the deadline by two days.'],
    ['budget', 'bütçe', 'The project went over budget.'],
    ['income', 'gelir', 'Most of his income comes from teaching.'],
    ['benefit', 'fayda, yarar', 'The main benefit is saving time.'],
    ['advantage', 'avantaj, üstünlük', 'Living near the office is a big advantage.'],
    ['solution', 'çözüm', 'We finally found a simple solution.'],
    ['detail', 'ayrıntı', 'He explained the plan in detail.'],
    ['skill', 'beceri', 'Listening is a skill you can train.'],
    ['knowledge', 'bilgi, birikim', 'Her knowledge of the market is useful.'],
    ['research', 'araştırma', 'The research took almost a year.'],
    ['society', 'toplum', 'These changes affect the whole society.'],
    ['government', 'hükümet', 'The government announced a new rule.'],
    ['environment', 'çevre, ortam', 'We work in a relaxed environment.'],
    ['population', 'nüfus', 'The population of the city is growing.'],
  ],
  fiil: [
    ['achieve', 'başarmak, elde etmek', 'She achieved her goal in six months.'],
    ['avoid', 'kaçınmak, sakınmak', 'I try to avoid arguments at work.'],
    ['suggest', 'önermek', 'I suggest starting with the easy part.'],
    ['require', 'gerektirmek', 'This job requires a lot of patience.'],
    ['consider', 'göz önünde bulundurmak', 'Consider the cost before you decide.'],
    ['prevent', 'engellemek, önlemek', 'A short break prevents mistakes.'],
    ['increase', 'artmak, artırmak', 'Prices increased again this year.'],
    ['reduce', 'azaltmak', 'We need to reduce our expenses.'],
    ['affect', 'etkilemek', 'The delay affected the whole plan.'],
    ['depend', 'bağlı olmak', 'It depends on the weather.'],
    ['realise', 'fark etmek, anlamak', 'I did not realise how late it was.'],
    ['notice', 'fark etmek', 'I did not notice the mistake at first.'],
    ['admit', 'kabul etmek, itiraf etmek', 'He admitted that he was wrong.'],
    ['refuse', 'reddetmek', 'She refused to change her mind.'],
    ['complain', 'şikâyet etmek', 'Several customers complained about the delay.'],
    ['apologise', 'özür dilemek', 'He apologised for being late.'],
    ['encourage', 'teşvik etmek', 'My teacher encouraged me to try again.'],
    ['recommend', 'tavsiye etmek', 'I recommend this book to everyone.'],
    ['deserve', 'hak etmek', 'After that week, you deserve a rest.'],
    ['expect', 'beklemek, ummak', 'I did not expect such a good result.'],
    ['allow', 'izin vermek', 'They do not allow phones in the exam.'],
    ['succeed', 'başarılı olmak', 'She succeeded after three attempts.'],
    ['accept', 'kabul etmek', 'He accepted the offer immediately.'],
    ['apply', 'başvurmak, uygulamak', 'I applied for the job last week.'],
    ['provide', 'sağlamak', 'The company provides free lunch.'],
    ['prefer', 'tercih etmek', 'I prefer working in the morning.'],
    ['manage', 'becermek, üstesinden gelmek', 'I managed to finish before lunch.'],
    ['discuss', 'tartışmak, görüşmek', 'We discussed the problem for an hour.'],
    ['compare', 'kıyaslamak', 'Compare last year with this year.'],
  ],
  sıfat: [
    ['worth', 'değer, değmek', 'The trip was long, but it was worth it.'],
    ['reliable', 'güvenilir', 'He is the most reliable person on the team.'],
    ['aware', 'farkında', 'I was not aware of the new rule.'],
    ['common', 'yaygın, ortak', 'This mistake is very common.'],
    ['confident', 'kendine güvenen', 'She sounded confident in the meeting.'],
    ['curious', 'meraklı', 'I am curious about your new job.'],
    ['disappointed', 'hayal kırıklığına uğramış', 'He was disappointed with the result.'],
    ['embarrassed', 'utanmış, mahcup', 'I felt embarrassed after my mistake.'],
    ['essential', 'gerekli, şart', 'Practice is essential for progress.'],
    ['familiar', 'tanıdık, aşina', 'This street looks familiar to me.'],
    ['honest', 'dürüst', 'To be honest, I did not like it.'],
    ['obvious', 'apaçık, belli', 'The answer was obvious to everyone.'],
    ['ordinary', 'sıradan, olağan', 'It was an ordinary Tuesday morning.'],
    ['patient', 'sabırlı', 'You must be patient with beginners.'],
    ['proud', 'gururlu', 'I am proud of your progress.'],
    ['serious', 'ciddi', 'This is a serious problem.'],
    ['similar', 'benzer', 'Our situations are quite similar.'],
    ['suitable', 'uygun', 'This film is not suitable for children.'],
    ['typical', 'tipik', 'That is typical of him.'],
    ['unusual', 'alışılmadık', 'It is unusual for her to be late.'],
    ['valuable', 'değerli', 'Your advice was really valuable.'],
  ],
  zarf: [
    ['probably', 'muhtemelen', 'He will probably arrive late.'],
    ['actually', 'aslında', 'Actually, I have never been there.'],
    ['especially', 'özellikle', 'I like Sundays, especially the mornings.'],
    ['recently', 'son zamanlarda', 'I have recently started running.'],
    ['suddenly', 'aniden', 'Suddenly, the lights went out.'],
    ['hardly', 'neredeyse hiç', 'I hardly know him.'],
    ['instead', 'onun yerine', 'We stayed home instead.'],
    ['exactly', 'tam olarak', 'That is exactly what I meant.'],
  ],
};

/* ------------------------------------------------------------------ B2 */

const B2: Group = {
  isim: [
    ['consequence', 'sonuç, netice', 'Nobody thought about the consequences.'],
    ['approach', 'yaklaşım', 'We need a completely different approach.'],
    ['attempt', 'girişim', 'His first attempt was unsuccessful.'],
    ['evidence', 'kanıt', 'There is no evidence for that claim.'],
    ['factor', 'etken, faktör', 'Cost was the deciding factor.'],
    ['impact', 'etki', 'The decision had a huge impact on the team.'],
    ['concept', 'kavram', 'The concept is simple but hard to apply.'],
    ['genius', 'dahi, deha', 'You do not need to be a genius to learn this.'],
    ['range', 'aralık, yelpaze', 'The shop offers a wide range of products.'],
  ],
  fiil: [
    ['assume', 'varsaymak', 'I assumed you already knew about the change.'],
    ['maintain', 'sürdürmek, korumak', 'It is hard to maintain that pace.'],
    ['obtain', 'elde etmek', 'You must obtain permission first.'],
    ['tend', 'eğiliminde olmak', 'People tend to overestimate their level.'],
    ['struggle', 'zorlanmak, mücadele etmek', 'I still struggle with pronunciation.'],
    ['emphasise', 'vurgulamak', 'She emphasised the importance of practice.'],
    ['establish', 'kurmak, oturtmak', 'They established the company in 2010.'],
  ],
  sıfat: [
    ['significant', 'önemli, kayda değer', 'There was a significant drop in sales.'],
    ['sufficient', 'yeterli', 'Two days is not sufficient for this.'],
    ['various', 'çeşitli', 'We tried various methods before this one.'],
    ['previous', 'önceki', 'This contradicts our previous decision.'],
    ['overwhelming', 'bunaltıcı, ezici', 'The response was overwhelming.'],
    ['reluctant', 'isteksiz, gönülsüz', 'She was reluctant to speak in public.'],
    ['inevitable', 'kaçınılmaz', 'A delay at this stage was inevitable.'],
    ['genuine', 'gerçek, samimi', 'He showed genuine interest in the project.'],
    ['subtle', 'ince, göze çarpmayan', 'There is a subtle difference between the two.'],
    ['crucial', 'çok önemli, kritik', 'The first ten minutes are crucial.'],
    ['efficient', 'verimli', 'This is a much more efficient method.'],
    ['sustainable', 'sürdürülebilir', 'That pace is not sustainable for long.'],
    ['controversial', 'tartışmalı', 'The decision proved highly controversial.'],
    ['exhausted', 'bitkin, çok yorgun', 'After the trip I was completely exhausted.'],
    ['impressive', 'etkileyici', 'Her progress this year has been impressive.'],
  ],
  zarf: [
    ['whereas', 'oysa, halbuki', 'He is patient, whereas I am not.'],
    ['despite', '-e rağmen', 'Despite the delay, we finished on time.'],
    ['nevertheless', 'yine de, buna rağmen', 'It was expensive; nevertheless, we bought it.'],
    ['therefore', 'bu yüzden, dolayısıyla', 'The data was wrong; therefore the report is useless.'],
    ['furthermore', 'ayrıca, üstelik', 'Furthermore, the cost would double.'],
    ['eventually', 'sonunda, eninde sonunda', 'Eventually, she agreed to help us.'],
  ],
  kalıp: [
    ['figure out', 'çözmek, anlamak', 'It took me a while to figure out the problem.'],
    ['come up with', 'bulmak, ortaya atmak', 'She came up with a brilliant idea.'],
    ['run out of', 'tükenmek, bitmek', 'We ran out of time before the last question.'],
    ['keep up with', 'ayak uydurmak, yetişmek', 'It is hard to keep up with the news.'],
    ['look forward to', 'sabırsızlıkla beklemek', 'I look forward to hearing from you.'],
    ['get used to', 'alışmak', 'You will get used to the new system.'],
    ['end up', 'sonunda ... olmak', 'We ended up staying an extra night.'],
    ['be about to', 'üzere olmak', 'I was about to call you.'],
    ['make sense', 'mantıklı olmak', 'That explanation makes sense now.'],
    ['on purpose', 'bilerek, kasten', 'He did not do it on purpose.'],
    ['so far', 'şimdiye kadar', 'So far, everything has gone well.'],
    ['be worth it', 'değmek, zahmetine değmek', 'The extra effort was worth it.'],
  ],
};

/* ----------------------------------------------------------- düzleştirme */

function build(group: Group, level: CEFRLevel): BankWord[] {
  const out: BankWord[] = [];
  for (const [kind, rows] of Object.entries(group) as Array<[WordKind, Row[]]>) {
    for (const [word, meaning, example] of rows) {
      out.push({ word, level, kind, meaning, example });
    }
  }
  return out;
}

export const WORD_BANK: BankWord[] = [
  ...build(A1, 'A1'),
  ...build(A1_EK, 'A1'),
  ...build(A2, 'A2'),
  ...build(B1, 'B1'),
  ...build(B2, 'B2'),
];

/**
 * Arama anahtarı. Kelime kartlara farklı biçimlerde giriyor: öğretmen
 * "to figure out" yazıyor, okuma ekranı "Figure" diye büyük harfle
 * gönderebiliyor. Hepsi aynı kutuya düşsün.
 */
function key(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/^(to|a|an|the)\s+/, '')
    .replace(/^be\s+/, '')
    .replace(/[^a-z\s'-]/g, '')
    .replace(/\s+/g, ' ');
}

const BY_KEY = new Map<string, BankWord>();
for (const entry of WORD_BANK) {
  // Aynı kelime iki türde geçebiliyor ("change" isim ve fiil) — ilki kalır
  if (!BY_KEY.has(key(entry.word))) BY_KEY.set(key(entry.word), entry);
}

/** Havuzdaki kayıt — kelime hangi biçimde yazılmış olursa olsun. */
export function lookupWord(word: string): BankWord | null {
  return BY_KEY.get(key(word)) ?? null;
}

/**
 * Kelimenin CEFR seviyesi. Havuzda yoksa `null` — "bilmiyorum" demektir,
 * "kolay" demek değildir. Çağıran taraf buna göre karar vermeli.
 */
export function levelOfWord(word: string): CEFRLevel | null {
  return lookupWord(word)?.level ?? null;
}

/**
 * Kelime bu seviyedeki biri için fazla ağır mı?
 *
 * `tolerance` kadar üst bandı serbest bırakır: öğrenme biraz zorlanmayı
 * gerektirir, A2'ye sadece A2 kelimesi vermek ilerlemeyi durdurur. Ama iki
 * band yukarısı (A2 öğrencisine B2 kelimesi) kullanıcının haklı olarak
 * şikâyet ettiği durumdur — "a2 biri bunu bilemez".
 *
 * Havuzda olmayan kelime "fazla ağır" sayılmaz; hüküm vermek için elimizde
 * veri yok, kararı öğretmene bırakıyoruz.
 */
export function isTooHardFor(
  word: string,
  level: string,
  tolerance = 1
): boolean {
  const found = levelOfWord(word);
  if (!found) return false;
  return LEVELS.indexOf(found) - levelIndex(level) > tolerance;
}

/**
 * Kelime bu seviyedeki biri için fazla **kolay** mı?
 *
 * ⚠️ Bu ölçü, kullanıcının *"B2'ye aldığımda kelime kısmı hâlâ değişmiyor"*
 * şikâyetinin çekirdeğinde duruyor.
 *
 * `isTooHardFor` yalnızca **yukarı** bakıyor ve havuzun tavanı B2 olduğu için
 * B1 ve üstünde hiçbir şeyi elemiyor (ölçüldü: A1'de 134, A2'de 49, B1/B2/C1/C2'de
 * **0** kelime eleniyor). Süzgeç kapanınca destede biriken eski A1/A2 kartları
 * "sırada bekleyen" sayılıp günün kotasını dolduruyor, yeni seviyenin kelimesi
 * hiç eklenmiyordu.
 *
 * İki band aşağısı — B2 öğrencisine "water", "book" — artık öğretmiyor;
 * o kartlar silinmiyor ama günün bütçesini de yemiyor.
 */
export function isTooEasyFor(
  word: string,
  level: string,
  tolerance = 1
): boolean {
  const found = levelOfWord(word);
  if (!found) return false;
  return levelIndex(level) - LEVELS.indexOf(found) > tolerance;
}

/**
 * Kelime bu seviye için **uygun** mu — ne fazla ağır ne fazla kolay.
 * Havuzda olmayan kelime uygun sayılır; hüküm vermek için veri yok.
 */
export function fitsLevel(word: string, level: string): boolean {
  return !isTooHardFor(word, level) && !isTooEasyFor(word, level);
}

/**
 * Kelimenin seviyeye uzaklığı — sıralama için. Küçük olan öne gelir.
 * Havuzda olmayan kelime ortada bir yerde durur (2).
 */
export function levelDistance(word: string, level: string): number {
  const found = levelOfWord(word);
  if (!found) return 2;
  return Math.abs(LEVELS.indexOf(found) - levelIndex(level));
}

/**
 * Tohumdan türeyen sayı üreteci.
 *
 * Neden rastgele değil: aynı gün uygulamayı iki kez açınca aynı beş kelime
 * gelmeli. `Math.random()` her açılışta listeyi değiştirir, kullanıcı yarım
 * bıraktığı günü bambaşka kelimelerle bulur. Tohum tarih olduğu için **her
 * gün kendiliğinden yenilenir.**
 */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Günün listesindeki tür dağılımı.
 *
 * Kullanıcının kuralı: *"kelime-fiil kısmını oransal dağıt."* Sadece fiil
 * öğrenen cümle kuramaz, sadece isim öğrenen de. Zarf ve kalıplar küçük pay
 * alır; onlar cümleyi süsler, taşımaz.
 */
const MIX: Array<[WordKind, number]> = [
  ['isim', 0.34],
  ['fiil', 0.34],
  ['sıfat', 0.2],
  ['zarf', 0.07],
  ['kalıp', 0.05],
];

/** En büyük kalan yöntemiyle tam sayı paylaştırma — toplam tam `count` eder. */
function allocate(count: number): Map<WordKind, number> {
  const raw = MIX.map(([kind, share]) => ({ kind, exact: share * count }));
  const out = new Map<WordKind, number>(
    raw.map((r) => [r.kind, Math.floor(r.exact)])
  );

  let left = count - [...out.values()].reduce((a, b) => a + b, 0);
  const byRemainder = [...raw].sort(
    (a, b) => (b.exact % 1) - (a.exact % 1)
  );
  for (let i = 0; left > 0; i++, left--) {
    const kind = byRemainder[i % byRemainder.length].kind;
    out.set(kind, (out.get(kind) ?? 0) + 1);
  }
  return out;
}

/**
 * Günün kelimelerini seçer.
 *
 * Öncelik sırası: **kendi seviyesi → bir üst seviye → bir alt seviye.**
 * Kendi seviyesi çekirdek; bir üst seviye ilerlemeyi sağlar; alt seviye ise
 * yalnızca havuz tükendiğinde devreye girer, çünkü zaten bildiği kelimeyi
 * çalışmak zaman kaybıdır. **Üstü kesinlikle karışmaz** — kullanıcının
 * şikâyeti tam olarak buydu.
 *
 * Tür dağılımı `MIX`'e göre kurulur; bir türde yeterli kelime kalmamışsa
 * boşluk diğer türlerden doldurulur — liste eksik kalmaz.
 */
export function wordsForLevel(
  level: string,
  count: number,
  exclude: string[] = [],
  seed = 'x'
): BankWord[] {
  if (count <= 0) return [];

  const skip = new Set(exclude.map(key));
  const idx = levelIndex(level);
  const rank = (w: BankWord) => {
    const d = LEVELS.indexOf(w.level) - idx;
    if (d === 0) return 0;
    if (d === 1) return 1;
    if (d < 0) return 2 - d; // en yakın alt seviye önce
    return 99; // iki band üstü — hiç kullanılmaz
  };

  const random = seeded(seed);
  const usable = WORD_BANK.filter((w) => !skip.has(key(w.word)) && rank(w) < 99)
    .map((w) => ({ w, r: rank(w), j: random() }))
    .sort((a, b) => a.r - b.r || a.j - b.j)
    .map((x) => x.w);

  const byKind = new Map<WordKind, BankWord[]>();
  for (const w of usable) {
    const list = byKind.get(w.kind);
    if (list) list.push(w);
    else byKind.set(w.kind, [w]);
  }

  const quota = allocate(count);
  const picked: BankWord[] = [];
  const taken = new Set<string>();

  for (const [kind, n] of quota) {
    for (const w of (byKind.get(kind) ?? []).slice(0, n)) {
      picked.push(w);
      taken.add(key(w.word));
    }
  }

  // Bir türde kelime bittiyse eksiği sıradaki en uygun kelimelerle tamamla
  for (const w of usable) {
    if (picked.length >= count) break;
    if (!taken.has(key(w.word))) {
      picked.push(w);
      taken.add(key(w.word));
    }
  }

  /**
   * Türe göre gruplanmış hâlde bırakma: kullanıcı arka arkaya beş isim
   * görmesin, gün karışık ilerlesin.
   */
  return picked
    .map((w) => ({ w, j: random() }))
    .sort((a, b) => a.j - b.j)
    .map((x) => x.w)
    .slice(0, count);
}
