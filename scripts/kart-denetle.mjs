/**
 * Kart akışının denetimi — kuyruk, günlük kota ve "devam et" payı.
 *
 * Neden var: bu üç şey birbirine bağlı ve ayrı ayrı doğru olup birlikte yanlış
 * olabiliyorlar. Ölçülen örnek: kota sayacı iki yerde ayrı hesaplanınca kart
 * ekleniyor ama kuyrukta görünmüyordu. Tarayıcıda ancak elle fark edilen bu tür
 * hatalar burada saniyeler içinde çıkıyor.
 *
 * Çalıştırma: npm run kart
 */

import { toISODate } from '../src/core/srs.ts';
import { answerCard, extendWordStudy, seedDailyWords } from '../src/db/mutations.ts';
import { getStudyQueue } from '../src/db/selectors.ts';
import { isTooHardFor } from '../src/core/wordbank.ts';

const BUGUN = new Date('2026-08-11T09:00:00');
const GUNLUK = 4; // LEVEL_SPEC.A1.maxNewWordsPerDay

let hata = 0;
const bekle = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (!ok) hata++;
  console.log(`${ok ? 'OK  ' : 'HATA'} ${ad.padEnd(46)} ${olan} (beklenen ${beklenen})`);
};

/** Sıfırdan A1 kullanıcısı — hiç kartı yok */
function bosVeri() {
  return {
    version: 1,
    profile: { level: 'A1', goals: '', weekdayMinutes: 6, weekendMinutes: 25, placementDone: true },
    cards: [],
    errors: [], tasks: [], sessions: [], sync: {}, suggestedTasks: [],
    content: [], scores: [], contentDone: [], conversations: [], targetHistory: [],
  };
}

/* ------------------------------------------------- 1. günün kelimeleri */

let d = seedDailyWords(bosVeri(), GUNLUK, BUGUN);
bekle('tohumlama günlük kota kadar kart ekliyor', d.cards.length, GUNLUK);

/** Aynı gün ikinci kez çağrılmak kartı çoğaltmamalı */
d = seedDailyWords(d, GUNLUK, BUGUN);
bekle('ikinci tohumlama kart eklemiyor', d.cards.length, GUNLUK);

bekle('kuyruk günün kartlarını gösteriyor', getStudyQueue(d, GUNLUK, BUGUN).length, GUNLUK);

/* --------------------------------------------- 2. A1 sızıntısı var mı */

const sizan = d.cards.filter((c) => isTooHardFor(c.word, 'A1'));
bekle('A1 destesinde seviye üstü kelime', sizan.length, 0);
if (sizan.length) console.log('   ', sizan.map((c) => c.word).join(', '));

/* ------------------------------------ 3. kota dolunca kuyruk kapanıyor */

/** Kelimeleri üç basamaktan da geçir — kart kuyruktan çıksın */
for (let tur = 0; tur < 3; tur++) {
  for (const kart of getStudyQueue(d, GUNLUK, BUGUN)) {
    d = answerCard(d, kart.id, 'correct', BUGUN);
  }
}
const bittiKuyruk = getStudyQueue(d, GUNLUK, BUGUN);
bekle('bütün kartlar bitince kuyruk boşalıyor', bittiKuyruk.length, 0);

/** Kota dolduğu için tohumlama yeni kelime eklememeli — eski davranış */
const oncekiSayi = d.cards.length;
d = seedDailyWords(d, GUNLUK, BUGUN);
bekle('kota doluyken tohumlama kart eklemiyor', d.cards.length, oncekiSayi);

/* ------------------------------------------ 4. "devam et" payı çalışıyor */

d = extendWordStudy(d, GUNLUK, BUGUN);
bekle('devam et yeni kart ekliyor', d.cards.length, oncekiSayi + GUNLUK);
bekle('devam et payı kayıtlı', d.extraWords.count, GUNLUK);

const yeniKuyruk = getStudyQueue(d, GUNLUK, BUGUN);
bekle('EKLENEN KARTLAR KUYRUKTA GÖRÜNÜYOR', yeniKuyruk.length, GUNLUK);

/** Yeni gelenler de A1 olmalı ve öncekilerle aynı olmamalı */
const yeniKelimeler = yeniKuyruk.map((c) => c.word);
bekle('yeni kelimeler A1', yeniKelimeler.filter((w) => isTooHardFor(w, 'A1')).length, 0);
console.log('    gelen kelimeler:', yeniKelimeler.join(', '));

/** İkinci kez basılınca yine yenisi gelmeli */
d = extendWordStudy(d, GUNLUK, BUGUN);
bekle('ikinci devam et de ekliyor', d.cards.length, oncekiSayi + GUNLUK * 2);

/* ------------------------------------------------ 5. pay ertesi gün biter */

const YARIN = new Date('2026-08-12T09:00:00');
bekle(
  'pay yarına taşınmıyor',
  d.extraWords.date === toISODate(YARIN),
  false
);

console.log(`\n${hata === 0 ? 'HEPSİ GEÇTİ' : hata + ' HATA'}`);
process.exit(hata ? 1 : 0);
