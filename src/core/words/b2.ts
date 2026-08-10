/**
 * B2 kelime deposu — **sadece veri.**
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

export const B2_WORDS: Group = {
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
