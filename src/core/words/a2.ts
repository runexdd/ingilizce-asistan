/**
 * A2 kelime deposu — **sadece veri.**
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

export const A2_WORDS: Group = {
  isim: [
    ['holiday', 'tatil', 'We are going on holiday in July.'],
    ['airport', 'havaalanı', 'The airport is far from the city.'],
    ['journey', 'yolculuk', 'The journey took four hours.'],
    ['luggage', 'bagaj, valiz', 'My luggage is still at the airport.'],
    ['meeting', 'toplantı', 'The meeting starts at ten.'],
    ['company', 'şirket', 'She works for a big company.'],
    ['customer', 'müşteri', 'A customer called this morning.'],
    ['price', 'fiyat', 'The price went up again.'],
    ['bill', 'hesap, fatura', 'Can we have the bill, please?'],
    ['salary', 'maaş', 'He is happy with his salary.'],
    ['manager', 'müdür, yönetici', 'My manager is on holiday.'],
    ['news', 'haber', 'I watch the news every evening.'],
    ['problem', 'sorun', 'We had a problem with the car.'],
    ['reason', 'sebep, neden', 'What is the reason for this?'],
    ['mistake', 'hata', 'I made a small mistake.'],
    ['health', 'sağlık', 'Her health is much better now.'],
    ['medicine', 'ilaç', 'Take this medicine after food.'],
    ['hospital', 'hastane', 'He stayed in hospital for a week.'],
    ['exercise', 'egzersiz, alıştırma', 'I do exercise three times a week.'],
    ['neighbour', 'komşu', 'Our neighbour is very quiet.'],
    ['noise', 'gürültü', 'The noise from the street is awful.'],
    ['traffic', 'trafik', 'The traffic was very bad today.'],
    ['wallet', 'cüzdan', 'My wallet was in my bag.'],
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
    ['arrive', 'varmak, ulaşmak', 'The train arrives at six.'],
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
  ],
  sıfat: [
    ['useful', 'faydalı, işe yarar', 'This app is really useful.'],
    ['boring', 'sıkıcı', 'The film was long and boring.'],
    ['interesting', 'ilginç', 'She told an interesting story.'],
    ['safe', 'güvenli', 'This area is safe at night.'],
    ['dangerous', 'tehlikeli', 'Driving here is dangerous.'],
    ['clean', 'temiz', 'The room was clean and bright.'],
    ['dirty', 'kirli', 'My shoes are very dirty.'],
    ['expensive', 'pahalı', 'This restaurant is too expensive.'],
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
    ['on time', 'zamanında', 'The train left on time.'],
    ['at least', 'en azından', 'It will take at least two hours.'],
    ['of course', 'tabii ki, elbette', 'Of course you can borrow it.'],
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
