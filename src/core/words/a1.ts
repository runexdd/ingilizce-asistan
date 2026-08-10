/**
 * A1 kelime deposu — **sadece veri.**
 *
 * Bu klasör kelime havuzunun "veri merkezi": mantık `../wordbank.ts` içinde,
 * kelimeler burada. Ayrı durmalarının sebebi kullanıcının şikâyeti:
 * *"burası karışık, havuzu 0'dan düzenleyelim, bir model oluşturmamız lazım."*
 * Veri ile mantık aynı dosyadayken havuzu büyütmek her seferinde 1000 satırlık
 * bir dosyayı kurcalamak demekti; şimdi seviyenin listesi tek başına duruyor.
 *
 * Buraya kelime eklemeden önce `npm run kelime` kurallarını oku — denetçi
 * seviyeyi, örnek cümledeki kelimeleri ve tür dengesini kontrol ediyor.
 */

import type { Group } from './types';

const A1_TEMEL: Group = {
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
    ['day', 'gün', 'We have a long day today.'],
    ['week', 'hafta', 'I work five days a week.'],
    ['month', 'ay', 'We come here every month.'],
    ['year', 'yıl', 'My son is five years old.'],
    ['time', 'zaman, vakit', 'I have no time today.'],
    ['hand', 'el', 'Wash your hands, please.'],
    ['eye', 'göz', 'Her eyes are green.'],
    ['child', 'çocuk', 'The child is sleeping.'],
    ['man', 'adam', 'That man is my teacher.'],
    ['woman', 'kadın', 'That woman is my teacher.'],
    ['teacher', 'öğretmen', 'Our teacher is very kind.'],
    ['student', 'öğrenci', 'I am a student here.'],
    ['doctor', 'doktor', 'You should see a doctor.'],
    ['shop', 'dükkân, mağaza', 'The shop closes at nine.'],
    ['bread', 'ekmek', 'We need bread and milk.'],
    ['milk', 'süt', 'I put milk in my tea.'],
    ['apple', 'elma', 'She eats an apple every day.'],
    ['tea', 'çay', 'Do you like tea or coffee?'],
    ['coffee', 'kahve', 'I drink coffee after lunch.'],
    ['dog', 'köpek', 'Their dog sleeps under the table.'],
    ['cat', 'kedi', 'The cat is under the chair.'],
    ['tree', 'ağaç', 'There is a tree in the garden.'],
    ['sun', 'güneş', 'The sun is very strong today.'],
    ['rain', 'yağmur', 'I do not like the rain.'],
  ],
  fiil: [
    ['eat', 'yemek yemek', 'We eat dinner at seven.'],
    ['drink', 'içmek', 'I drink milk in the morning.'],
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
    ['new', 'yeni', 'My phone is very new.'],
    ['old', 'eski, yaşlı', 'This building is very old.'],
    ['good', 'iyi', 'That is a good idea.'],
    ['bad', 'kötü', 'The weather is bad today.'],
    ['happy', 'mutlu', 'I am happy to see you.'],
    ['sad', 'üzgün', 'She looks sad today.'],
    ['easy', 'kolay', 'This question is very easy.'],
    ['difficult', 'zor', 'This question is difficult.'],
    ['fast', 'hızlı', 'He speaks very fast.'],
    ['slow', 'yavaş', 'The bus is slow today.'],
    ['young', 'genç', 'She is very young.'],
    ['tall', 'uzun boylu', 'My brother is tall.'],
    ['hungry', 'aç', 'I am hungry now.'],
    ['tired', 'yorgun', 'The children are tired.'],
  ],
  zarf: [
    ['early', 'erken', 'I go to work early.'],
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
    ['letter', 'mektup', 'I write a letter to my father.'],
    ['rice', 'pirinç', 'We eat rice every day.'],
    ['meat', 'et', 'He does not eat meat.'],
    ['egg', 'yumurta', 'I eat two eggs for breakfast.'],
    ['cheese', 'peynir', 'I eat bread and cheese.'],
    ['fruit', 'meyve', 'Fruit is good for you.'],
    ['vegetable', 'sebze', 'She buys fresh vegetables.'],
    ['sugar', 'şeker', 'No sugar in my tea, please.'],
    ['salt', 'tuz', 'Put a little salt in it.'],
    ['juice', 'meyve suyu', 'I drink orange juice.'],
    ['cake', 'pasta', 'The cake is on the table.'],
    ['soup', 'çorba', 'This soup is very hot.'],
    ['chicken', 'tavuk', 'We eat chicken for dinner.'],
    ['breakfast', 'kahvaltı', 'I have breakfast at eight.'],
    ['lunch', 'öğle yemeği', 'Lunch is at one.'],
    ['dinner', 'akşam yemeği', 'Dinner is ready now.'],
    ['hour', 'saat (süre)', 'I wait here for one hour.'],
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
    ['arm', 'kol', 'The baby has small arms.'],
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
    ['lesson', 'ders', 'The lesson is very easy.'],
    ['homework', 'ödev', 'I do my homework at night.'],
    ['pen', 'kalem', 'Can I use your pen?'],
    ['paper', 'kâğıt', 'Write it on this paper.'],
    ['question', 'soru', 'I have one question.'],
    ['answer', 'cevap', 'Your answer is correct.'],
    ['word', 'kelime', 'I learn five new words every day.'],
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
    ['mountain', 'dağ', 'The mountain is very big.'],
    ['river', 'nehir', 'The river is very long.'],
    ['flower', 'çiçek', 'She gives me a flower.'],
    ['bird', 'kuş', 'A bird is on the tree.'],
    ['horse', 'at', 'The horse runs very fast.'],
    ['music', 'müzik', 'I listen to music every day.'],
    ['film', 'film', 'This film is very good.'],
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
    ['hear', 'duymak', 'I hear a bird in the tree.'],
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
    ['turn', 'dönmek, çevirmek', 'Turn right at the shop.'],
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
    ['win', 'kazanmak', 'Our team wins every game.'],
    ['lose', 'kaybetmek', 'I always lose my pen.'],
    ['try', 'denemek', 'Try this food.'],
    ['hope', 'ummak', 'I hope you are well.'],
    ['believe', 'inanmak', 'I believe you.'],
    ['understand', 'anlamak', 'I do not understand this word.'],
    ['mean', 'anlamına gelmek', 'What does this word mean?'],
    ['happen', 'olmak, gerçekleşmek', 'What happens after the lesson?'],
    ['become', 'olmak, dönüşmek', 'He wants to become a teacher.'],
    ['begin', 'başlamak', 'The film begins at eight.'],
    ['build', 'inşa etmek', 'They build houses.'],
    ['catch', 'yakalamak', 'Catch the ball, please.'],
    ['count', 'saymak', 'Count to ten.'],
    ['cry', 'ağlamak', 'The baby cries at night.'],
    ['laugh', 'gülmek', 'We laugh at this film.'],
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
    ['teach', 'öğretmek', 'She teaches at a school.'],
    ['throw', 'atmak', 'Throw the ball to me.'],
    ['touch', 'dokunmak', 'Do not touch that.'],
    ['visit', 'ziyaret etmek', 'We visit my aunt on Sunday.'],
    ['wake up', 'uyanmak', 'I wake up at six.'],
    ['enter', 'girmek', 'Enter the room, please.'],
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
    ['dry', 'kuru', 'My hands are dry.'],
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
    ['just', 'az önce, sadece', 'I am just a student here.'],
    ['away', 'uzağa, uzakta', 'The school is far away.'],
    ['outside', 'dışarıda', 'The children play outside.'],
    ['inside', 'içeride', 'The cat is inside the house.'],
    ['before', 'önce', 'Wash your hands before dinner.'],
  ],
};

/**
 * A1 — **üçüncü blok: kendi kendine yeten havuz.**
 *
 * Bu blok iki farklı sızıntıyı birden kapatıyor.
 *
 * **1. A2'de durup aslında A1 olan kelimeler.** Denetçi (`npm run kelime`)
 * A1 örnek cümlelerinde 25 kez "seviye üstü kelime" saydı ve hepsi aynı
 * yerden geliyordu: `key`, `kitchen`, `wait`, `weather`, `idea`, `garden`
 * gibi kelimeler A2 listesinde duruyordu. Sonuç saçmaydı — A1 öğrencisi
 * "anahtar" ve "mutfak" kelimelerini öğrenemiyor, ama örnek cümlelerde
 * onları okuyordu. Bu kelimeler A2'den **çıkarılıp** buraya alındı.
 *
 * **2. Örnek cümlelerin kendi havuzundan beslenmemesi.** Bir A1 kartının
 * örnek cümlesi A1 dışında bir kelime içeriyorsa, öğrenci kartı açtığında
 * anlamadığı bir kelimeyle karşılaşıyor. Denetçinin kuralı artık şu:
 * **A1 örnek cümlelerindeki her kelime ya dilbilgisi kelimesi ya da yine
 * A1 havuzundan olmalı.** Havuz böylece kendi kendine yeter hâle geldi.
 *
 * Kural, `KAPALI_SEVIYELER` kararıyla birlikte anlam kazanıyor: A1'de artık
 * havuzda olmayan kelime gösterilmiyor. Yani havuz "bir kaynak" değil,
 * **A1'in tanımı.** Eksik bıraktığımız her kelime öğrencinin göremeyeceği
 * bir kelimedir — bu yüzden liste dar değil, geniş tutuldu.
 */
const A1_EK2: Group = {
  isim: [
    ['home', 'ev, yuva', 'I go home at six.'],
    ['ball', 'top', 'The ball is under the chair.'],
    ['team', 'takım', 'Our team is very good.'],
    ['person', 'kişi', 'That person is my teacher.'],
    ['song', 'şarkı', 'This song is very old.'],
    ['evening', 'akşam', 'We watch television in the evening.'],
    ['trip', 'gezi, yolculuk', 'Our trip is very long.'],
    ['plan', 'plan', 'My plan is very simple.'],
    ['test', 'sınav, test', 'I have a test today.'],
    ['bike', 'bisiklet', 'I go to school by bike.'],
    ['aunt', 'teyze, hala', 'My aunt lives in Ankara.'],
    ['uncle', 'amca, dayı', 'My uncle works in a bank.'],
    ['plate', 'tabak', 'The plate is on the table.'],
    ['orange', 'portakal', 'I eat an orange every morning.'],
    ['sport', 'spor', 'I like this sport very much.'],
    /* — A2'den taşınanlar — */
    ['weather', 'hava durumu', 'The weather is very good today.'],
    ['ticket', 'bilet', 'I need a ticket for the bus.'],
    ['office', 'ofis', 'My office is near the park.'],
    ['message', 'mesaj', 'She sends me a message every day.'],
    ['idea', 'fikir', 'That is a very good idea.'],
    ['kitchen', 'mutfak', 'My mother is in the kitchen.'],
    ['garden', 'bahçe', 'There is a tree in the garden.'],
    ['floor', 'kat, zemin', 'My room is on the first floor.'],
    ['key', 'anahtar', 'I cannot find my key.'],
    ['umbrella', 'şemsiye', 'Take your umbrella, please.'],
  ],
  fiil: [
    ['like', 'sevmek, hoşlanmak', 'I like tea and coffee.'],
    ['break', 'kırmak', 'Do not break the window.'],
    ['climb', 'tırmanmak', 'We climb the mountain in summer.'],
    ['wake', 'uyanmak', 'I wake up early every day.'],
    ['jump', 'zıplamak', 'The cat jumps on the chair.'],
    ['rest', 'dinlenmek', 'We rest at the weekend.'],
    ['hold', 'tutmak', 'Hold my bag, please.'],
    ['fall', 'düşmek', 'The apple falls from the tree.'],
    /* — A2'den taşınanlar — */
    ['wait', 'beklemek', 'Wait for me here, please.'],
    ['leave', 'ayrılmak, bırakmak', 'We leave the house at eight.'],
    ['move', 'taşınmak, hareket etmek', 'We move to a new house.'],
  ],
  sıfat: [
    ['blue', 'mavi', 'The sky is blue today.'],
    ['red', 'kırmızı', 'She has a red bag.'],
    ['green', 'yeşil', 'Her eyes are green.'],
    ['white', 'beyaz', 'His shirt is white.'],
    ['black', 'siyah', 'I have a black coat.'],
    ['yellow', 'sarı', 'The flower is yellow.'],
    ['fresh', 'taze', 'This bread is very fresh.'],
    ['correct', 'doğru', 'Your answer is correct.'],
    ['careful', 'dikkatli', 'Be careful, the plate is hot.'],
    ['simple', 'basit', 'This question is very simple.'],
    ['sorry', 'üzgün, pişman', 'I am sorry, I am late.'],
    /* — A2'den taşınanlar — */
    ['busy', 'meşgul, yoğun', 'I am very busy today.'],
    ['quiet', 'sessiz, sakin', 'This street is very quiet.'],
    ['cheap', 'ucuz', 'This shop is very cheap.'],
    ['strong', 'güçlü, sert', 'My brother is very strong.'],
  ],
  zarf: [
    ['tonight', 'bu gece', 'Come with us tonight.'],
    ['upstairs', 'üst katta', 'The bathroom is upstairs.'],
    ['far', 'uzak, uzağa', 'The station is not far.'],
  ],
  /**
   * A1'de **kalıp** vardı ama havuzda hiç yoktu (%0).
   *
   * Oysa yeni başlayan biri önce kalıp konuşur: "good morning", "thank you",
   * "excuse me". Bunlar dilbilgisi bilmeden kullanılabilen hazır parçalar ve
   * ilk günden işe yarıyorlar — tam da A1'in ihtiyacı.
   */
  kalıp: [
    ['good morning', 'günaydın', 'Good morning, how are you?'],
    ['thank you', 'teşekkür ederim', 'Thank you for your help.'],
    ['excuse me', 'affedersiniz', 'Excuse me, where is the station?'],
    ['how are you', 'nasılsın', 'How are you today?'],
    ['see you', 'görüşürüz', 'See you at school.'],
    ['at home', 'evde', 'I am at home now.'],
    ['at work', 'işte', 'My father is at work.'],
    ['every day', 'her gün', 'I drink tea every day.'],
    ['how much', 'ne kadar', 'How much is this bag?'],
    ['in the morning', 'sabahleyin', 'I run in the morning.'],
    ['you are welcome', 'rica ederim', 'You are welcome, my friend.'],
    /* — A2'den taşınan — */
    ['a lot of', 'bir sürü, çok', 'There are a lot of people here.'],
  ],
};

/**
 * A1 — **dördüncü blok: ilk gün konuşulanlar.**
 *
 * Bağımsız bir denetim (ikinci göz, 2026-08-11) havuza "eksik olan ne" diye
 * baktı ve iki kör nokta buldu. İkisi de aynı sebepten görünmezdi: denetçi
 * havuzun **iç tutarlılığını** ölçüyor, yani "havuzda olmayan bir şeyin
 * eksikliğini" göremez.
 *
 * **1. Tek bir sayı yoktu.** Yaş, saat, fiyat, telefon numarası, "kaç tane" —
 * hepsi sayı ister. Sayısız bir A1 kendini tanıtamaz. En öncelikli boşluk
 * buydu.
 *
 * **2. Günler ve selamlaşma kalıpları yoktu.** Günler örnek cümlelerde
 * *kullanılıyordu* ("I visit my family on Sunday") ama hiç öğretilmiyordu;
 * denetçi onları özel isim sayıp geçiyordu. Selamlaşma ve kendini tanıtma
 * kalıpları da yoktu — oysa yeni başlayan biri dilbilgisi kurmadan önce bu
 * hazır parçalarla konuşur.
 */
const A1_EK3: Group = {
  sayı: [
    ['one', 'bir', 'I have one brother.'],
    ['two', 'iki', 'She has two children.'],
    ['three', 'üç', 'The lesson is at three.'],
    ['four', 'dört', 'My son is four years old.'],
    ['five', 'beş', 'We have five minutes.'],
    ['six', 'altı', 'The shop opens at six.'],
    ['seven', 'yedi', 'Seven days make one week.'],
    ['eight', 'sekiz', 'My daughter is eight years old.'],
    ['nine', 'dokuz', 'I start work at nine.'],
    ['ten', 'on', 'Ten students are in the class.'],
    ['eleven', 'on bir', 'The train comes at eleven.'],
    ['twelve', 'on iki', 'We have lunch at twelve.'],
    ['twenty', 'yirmi', 'Twenty people are here.'],
    ['thirty', 'otuz', 'My sister is thirty years old.'],
    ['hundred', 'yüz (sayı)', 'A hundred people work here.'],
  ],
  isim: [
    ['Monday', 'pazartesi', 'Our class starts on Monday.'],
    ['Tuesday', 'salı', 'I have a test on Tuesday.'],
    ['Wednesday', 'çarşamba', 'We meet on Wednesday.'],
    ['Thursday', 'perşembe', 'My mother works on Thursday.'],
    ['Friday', 'cuma', 'I finish early on Friday.'],
    ['Saturday', 'cumartesi', 'We rest on Saturday.'],
    ['Sunday', 'pazar', 'On Sunday I stay at home.'],
    ['grandmother', 'büyükanne', 'My grandmother lives in a village.'],
    ['grandfather', 'büyükbaba', 'My grandfather is very old.'],
  ],
  kalıp: [
    ['hello', 'merhaba', 'Hello, my name is Omer.'],
    ['my name is', 'benim adım ...', 'My name is Omer.'],
    ['nice to meet you', 'memnun oldum', 'Nice to meet you, teacher.'],
    ['how old are you', 'kaç yaşındasın', 'How old are you, Ali?'],
    ['where are you from', 'nerelisin', 'Where are you from, Ayse?'],
    ['I do not know', 'bilmiyorum', 'I do not know this word.'],
    ['good evening', 'iyi akşamlar', 'Good evening, how are you?'],
    ['good night', 'iyi geceler', 'Good night, sleep well.'],
    ['goodbye', 'hoşça kal', 'Goodbye, see you at school.'],
  ],
};

/** A1'in tamamı — temel çekirdek + ek havuzlar. */
export const A1_WORDS: Group[] = [A1_TEMEL, A1_EK, A1_EK2, A1_EK3];
