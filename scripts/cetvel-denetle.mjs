/** Sertleştirilmiş cetvelin denetimi — kullanıcının bildirdiği kelimelerle. */
import { isTooHardFor, fitsLevel, wordsForLevel, phraseLevel, lookupWord }
  from '../src/core/wordbank.ts';
import { WORD_BANK } from '../src/core/words/index.ts';

let hata = 0;
const bekle = (ad, olan, beklenen) => {
  const ok = olan === beklenen;
  if (!ok) hata++;
  console.log(`${ok ? 'OK  ' : 'HATA'} ${ad.padEnd(42)} ${olan} (beklenen ${beklenen})`);
};

console.log('— Kullanıcının bildirdiği kelimeler, A1 profili —');
for (const w of ['to be excited', 'excited', 'to struggle with', 'overwhelming',
                 'to be worth it', 'to come up with', 'eventually', 'genius',
                 'to run out of', 'make a decision', 'to notice', 'exhausted',
                 /**
                  * Öbek fiiller: parçaları A1 ama kendileri değil. Bağımsız
                  * denetimin bulduğu açık — parçacık atlanınca "give up"
                  * çekirdek fiilin (give, A1) seviyesine iniyordu.
                  */
                 'give up', 'put up with', 'look after', 'get over', 'take off']) {
  bekle(`"${w}" A1'de eleniyor mu`, isTooHardFor(w, 'A1'), true);
}

console.log('\n— A1 çekirdek kelimeleri geçmeli —');
for (const w of ['cold', 'think', 'water', 'friend', 'to eat', 'the house', 'Book']) {
  bekle(`"${w}" A1'de geçiyor mu`, isTooHardFor(w, 'A1'), false);
}

console.log('\n— Üst seviyelerde eski davranış korunuyor mu —');
bekle('bilinmeyen kelime B1de serbest', isTooHardFor('zxqwerty', 'B1'), false);
bekle('B2 kelimesi B1de serbest (tolerans 1)', isTooHardFor('overwhelming', 'B1'), false);
bekle('B2 kelimesi A2de eleniyor', isTooHardFor('overwhelming', 'A2'), true);
bekle('A2 kelimesi A2de geçiyor', isTooHardFor('excited', 'A2'), false);

console.log('\n— Öbek denetimi —');
// Havuzda yazılı öbek varsa son söz onun: "be worth it" B2 kaydı
bekle('"to be worth it" seviyesi', phraseLevel('to be worth it').level, 'B2');
// Havuzda olmayan parça varsa öbek "bilinmiyor" sayılır — A1'de elenir
bekle('"make a decision" bilinmeyen parça', phraseLevel('make a decision').bilinmeyenVar, true);
// Bütün parçaları bilinen öbek en zor parçasının seviyesini alır
bekle('"read a book" seviyesi', phraseLevel('read a book').level, 'A1');
bekle('"a difficult question" seviyesi', phraseLevel('a difficult question').level, 'A1');

console.log('\n— Havuzdaki her kelime kendi seviyesinde geçmeli —');
let sizinti = 0;
for (const w of WORD_BANK) {
  if (isTooHardFor(w.word, w.level)) {
    if (sizinti < 8) console.log(`   ELENDI ${w.level} ${w.word}`);
    sizinti++;
  }
}
bekle('kendi seviyesinde elenen kelime', sizinti, 0);

console.log('\n— A1 tohumlayıcısı sadece A1 veriyor mu —');
const disari = new Set();
for (let g = 0; g < 120; g++) {
  for (const w of wordsForLevel('A1', 4, [], `gun-${g}`)) {
    if (w.level !== 'A1') disari.add(`${w.word}/${w.level}`);
  }
}
bekle('A1 destesine giren üst seviye', disari.size, 0);
if (disari.size) console.log([...disari].slice(0, 10).join(', '));

console.log('\n— A2 tohumlayıcısı hâlâ bir üst bandı kullanabiliyor —');
// A2 havuzu tükendiğinde B1'e uzanabilmeli — kapalı liste sadece A1'de
const a2Hepsi = WORD_BANK.filter((w) => w.level === 'A2').map((w) => w.word);
const tasma = wordsForLevel('A2', 5, a2Hepsi, 'tuk');
bekle('A2 havuzu bitince üst banda uzanıyor', tasma.some((w) => w.level === 'B1'), true);
// A1'de aynı durumda üst banda uzanmamalı, alt seviye de yok — boş kalır
const a1Hepsi = WORD_BANK.filter((w) => w.level === 'A1').map((w) => w.word);
const a1Tasma = wordsForLevel('A1', 5, a1Hepsi, 'tuk');
bekle('A1 havuzu bitince üst banda uzanmıyor', a1Tasma.length, 0);

console.log(`\n${hata === 0 ? 'HEPSİ GEÇTİ' : hata + ' HATA'}`);
process.exit(hata ? 1 : 0);
