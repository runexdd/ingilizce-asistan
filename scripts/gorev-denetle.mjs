/**
 * Zevke bağlı görevlerin seviye denetimi.
 *
 * Neden var: kullanıcının bildirimi — *"sporun altında araba sporlarını
 * seçince 'Formula 1 yarışını anlat' diyor, bunu A1 biri yapamaz. Oradaki tüm
 * olasılıkları kontrol edip A1'e getirelim."*
 *
 * Teşhis: yapı doğru kurulmuştu (konu zevkten, zorluk seviyeden) ama **iki
 * yerde seviye hiç sorulmuyordu**: sohbet tur bankası ve içerik başlığının
 * göreve gömülmesi. Kullanıcı 45 seçeneğin hepsini tek tek deneyemez; bu
 * betik deniyor.
 *
 * Ne yapar: `tastes.ts` içindeki **her seçeneği** tek tek işaretleyip, o
 * profil için üretilen bütün İngilizce metni toplar — konuşma görevi, yazma
 * görevi ve altı turluk sohbetin her turu — ve seviyenin kurallarına vurur.
 *
 * Çalıştırma:
 *   npm run gorev            → özet + ihlaller
 *   npm run gorev -- --hepsi → üretilen bütün metni dök
 */

import { LEVEL_SPEC } from '../src/core/level.ts';
import { buildLocalConversation, pickLocalContent } from '../src/core/localcontent.ts';
import { speakingPromptFor, writingPromptFor, taskTopicLabel } from '../src/core/prompts.ts';
import { TASTE_STEPS } from '../src/core/tastes.ts';
import { isTooHardFor, lookupWord } from '../src/core/wordbank.ts';

const SEVIYE = 'A1';
const GUN_SAYISI = 12; // konu havuzları gün gün döndüğü için birkaç gün gez

/**
 * A1'de yasak yapılar.
 *
 * `LEVEL_SPEC.A1.structures` = "present simple, temel isim-fiil, tek yapılı
 * kısa cümle". Aşağıdakiler bu çerçevenin dışında kalıyor ve hepsi gerçekten
 * bankada bulundu: koşul cümlesi ("If you watched it again, what **would**
 * you understand better?"), present perfect ("the hardest workout you **have
 * done**"), geçmiş zaman ("the last match you **watched**").
 */
const YASAK = [
  { ad: 'koşul/would', kalip: /\bwould\b/i },
  { ad: 'gelecek/will', kalip: /\bwill\b/i },
  { ad: 'geçmiş yardımcı', kalip: /\b(did|was|were|been)\b/i },
  { ad: 'present perfect', kalip: /\b(have|has)\s+\w+(ed|en)\b/i },
  /**
   * "read" bilerek listede yok: geniş zaman ile geçmiş zamanı aynı yazılıyor
   * ve *"Talk about when you read"* doğru bir A1 görevi. Yazılışa bakan bir
   * denetim burada ayrım yapamaz; yanlış alarm vermektense kaçırıyoruz.
   */
  { ad: 'geçmiş çekim', kalip: /\b(watched|listened|played|cooked|travelled|visited|learned|bought|went|saw|made|took|gave|had|felt)\b/i },
  { ad: 'ikinci koşul', kalip: /\bif you\b/i },
  { ad: 'soyut sorgu', kalip: /\b(why do people|what makes|how much should|to what extent)\b/i },
];

/** A1'de sorun olmayan, sohbetin kendi çatısına ait kelimeler */
const SERBEST = new Set(
  `hi hello hey ok okay please thanks sentence sentences word words english
   score ten more another different detail adjective adjectives subtitles
   summary character characters singer song episode film video topic
   recommend explain describe imagine picture beginning moment part
   understand follow learned learn nothing anything something everyone
   friend friends family job home car work school music sport game food
   week day today good bad easy hard fast slow big small new old happy sad
   quiet loud true false yes no one two three four
   about with from your you me my it is are do does can will would`
    .split(/\s+/)
    .filter(Boolean)
);

const sorunlar = [];
const uyar = (secenek, nerede, metin, sebep) =>
  sorunlar.push({ secenek, nerede, metin, sebep });

/** Bir İngilizce metni A1 ölçüsüne vurur */
function denetle(secenek, nerede, metin) {
  if (!metin) return;

  /**
   * Yapı denetimi **sorunun kendisine** uygulanır, öğretilen kelime listesine
   * değil. Kelime turu şöyle bitiyor: "Use these words: I would like…, room".
   * Buradaki `would` bir koşul cümlesi değil, A1'de kalıp olarak öğretilen
   * bir parça ("I would like a room" — otel, restoran). Kalıbı yapı ihlali
   * saymak, A1'in en işe yarar malzemesini yasaklardı.
   */
  const yapi = metin.includes(':') ? metin.slice(0, metin.indexOf(':')) : metin;

  for (const { ad, kalip } of YASAK) {
    const bulunan = yapi.match(kalip);
    if (bulunan) {
      uyar(secenek, nerede, metin, `${ad} → "${bulunan[0]}"`);
      return; // bir metin için tek uyarı yeter
    }
  }

  /**
   * Kelime denetimi: metindeki her sözcük ya sohbetin çatı kelimesi ya da
   * A1 havuzundan olmalı. Havuz artık A1'in tanımı (`KAPALI_SEVIYELER`),
   * yani buradaki ölçü kartlardakiyle **aynı** cetvel.
   */
  for (const ham of metin.split(/\s+/)) {
    const t = ham.toLowerCase().replace(/[^a-z']/g, '');
    if (!t || SERBEST.has(t)) continue;
    /** Büyük harfle başlayan öbekler içerik başlığı — Türkçe olabilir */
    if (/[^\x00-\x7F]/.test(ham)) continue;
    const bulunan = lookupWord(t);
    if (bulunan && isTooHardFor(t, SEVIYE)) {
      uyar(secenek, nerede, metin, `seviye üstü kelime → "${t}" (${bulunan.level})`);
      return;
    }
  }
}

/** Tek bir seçenek işaretlenmiş zevk profili */
function profilYap(alan, deger) {
  const t = { areas: [], music: [], screen: [], sports: [], other: [], updatedAt: '2026-08-11T10:00:00Z' };
  t[alan] = [deger];
  /** Alt seçenekler üst alanı gerektiriyor — gerçek uygulamadaki gibi kur */
  if (alan === 'screen') t.areas = ['dizi'];
  if (alan === 'sports') t.areas = ['spor'];
  return t;
}

const secenekler = [];
for (const step of TASTE_STEPS) {
  for (const o of step.options) {
    if (o.value === 'custom') continue;
    secenekler.push({ alan: step.field, deger: o.value, etiket: o.label });
  }
}

/**
 * **Seçilen alt dal hangi konu etiketini almalı.**
 *
 * ⚠️ Bu denetim sonradan eklendi ve eklenir eklenmez bir hata buldu — üstelik
 * kullanıcının bildirdiği hatanın ta kendisini. İlk sürüm yalnızca **yapı** ve
 * **kelime seviyesi** ölçüyordu; "Talk about your favourite team" cümlesi
 * dilbilgisi olarak kusursuz A1 olduğu için sıfır ihlal veriyordu. Oysa motor
 * sporları seçen birine sorulan yanlış soruydu.
 *
 * Ders: *"doğru dilbilgisi, yanlış konu"* bir kural listesiyle yakalanmaz;
 * beklenen eşleşme ayrıca yazılmalı.
 */
const BEKLENEN_ETIKET = {
  'sports:futbol': 'spor',
  'sports:basketbol': 'spor',
  'sports:tenis': 'spor',
  'sports:dovus': 'spor',
  'sports:motor': 'motor sporları',
  'sports:fitness': 'spor ve hareket',
  'sports:kosu': 'spor ve hareket',
  'sports:dogaspor': 'spor ve hareket',
  'areas:muzik': 'müzik',
  'areas:dizi': 'dizi ve film',
  'areas:oyun': 'oyun',
  'areas:teknoloji': 'teknoloji',
  'areas:yemek': 'yemek',
  'areas:seyahat': 'seyahat',
  'areas:kitap': 'kitap',
  'areas:is': 'iş',
  'areas:otomobil': 'otomobil',
  'other:ofis': 'iş',
  'other:seyahat-ortam': 'seyahat',
  'other:akademik': 'kitap',
  'other:gunluk': 'günlük hayat',
  'other:sosyal': 'günlük hayat',
};

const hepsi = process.argv.includes('--hepsi');
console.log(`ZEVKE BAĞLI GÖREV DENETİMİ · seviye ${SEVIYE} · ${secenekler.length} seçenek\n`);

for (const s of secenekler) {
  const tastes = profilYap(s.alan, s.deger);
  const ad = `${s.alan}:${s.deger}`;

  for (let g = 0; g < GUN_SAYISI; g++) {
    const gun = new Date(2026, 7, 11 + g);
    const iso = gun.toISOString().slice(0, 10);

    denetle(ad, 'konuşma', speakingPromptFor(SEVIYE, gun, tastes));
    denetle(ad, 'yazma', writingPromptFor(SEVIYE, gun, tastes));

    const beklenen = BEKLENEN_ETIKET[ad];
    if (beklenen) {
      const gercek = taskTopicLabel(tastes, gun);
      if (gercek !== beklenen) {
        uyar(
          ad,
          'konu eşleşmesi',
          `${iso}: "${gercek}" geldi`,
          `seçim "${s.deger}" ise konu "${beklenen}" olmalı`
        );
      }
    }

    const icerik = pickLocalContent(SEVIYE, tastes, iso)[0];
    const sohbet = buildLocalConversation(icerik, SEVIYE, undefined, iso, g % 3);
    for (const [i, tur] of sohbet.turns.entries()) {
      denetle(ad, `sohbet ${i + 1}`, tur.say);
      if (tur.followUp) denetle(ad, `sohbet ${i + 1} üsteleme`, tur.followUp);
    }

    if (hepsi && g === 0) {
      console.log(`── ${s.etiket} (${ad}) · ${taskTopicLabel(tastes, gun)}`);
      console.log(`   konuşma : ${speakingPromptFor(SEVIYE, gun, tastes)}`);
      console.log(`   yazma   : ${writingPromptFor(SEVIYE, gun, tastes)}`);
      console.log(`   içerik  : ${icerik?.title ?? '—'}`);
      for (const [i, tur] of sohbet.turns.entries()) {
        console.log(`   tur ${i + 1}   : ${tur.say}`);
      }
      console.log('');
    }
  }
}

/* --------------------------------------------- sohbet çeşitliliği ölçümü */

/**
 * "Başka bir sohbet ver" gerçekten başka bir sohbet veriyor mu?
 *
 * ⚠️ Bağımsız denetim ölçtü ve iddia tutmadı: kodda "5⁶ = 15.625 bileşim"
 * yazıyordu ama tur seçim formülü `i * 31 % 5` olduğu için indeks her yuvada
 * yalnızca bir kayıyordu — 30 varyant denendiğinde **5 farklı sohbet**
 * çıkıyordu. Sayının kendisi kritik değil ama "her tıklamada yeni sohbet"
 * sözü tutulmuyordu. Ölçmeyen iddia, iddia değildir.
 */
{
  const tastes = profilYap('sports', 'motor');
  const icerik = pickLocalContent(SEVIYE, tastes, '2026-08-11')[0];
  const gorulen = new Set();
  for (let v = 0; v < 30; v++) {
    const s = buildLocalConversation(icerik, SEVIYE, undefined, '2026-08-11', v);
    gorulen.add(s.turns.map((t) => t.say).join('||'));
  }
  console.log(`Sohbet çeşitliliği: 30 varyantta ${gorulen.size} farklı sohbet`);
  if (gorulen.size < 20) {
    uyar('sohbet', 'çeşitlilik', `30 varyant → ${gorulen.size} sohbet`, 'yuvalar bağımsız dönmüyor');
  }
}

/* ------------------------------------------------------------------ rapor */

const yerler = new Map();
for (const s of sorunlar) yerler.set(s.nerede, (yerler.get(s.nerede) ?? 0) + 1);

console.log(`Toplam ihlal: ${sorunlar.length}`);
for (const [yer, n] of [...yerler].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${yer.padEnd(22)} ${n}`);
}

/** Aynı cümle onlarca seçenekte tekrar ediyor — tekilleştirip göster */
const tekil = new Map();
for (const s of sorunlar) {
  const k = `${s.nerede}|${s.metin}`;
  if (!tekil.has(k)) tekil.set(k, { ...s, kac: 0 });
  tekil.get(k).kac++;
}

console.log(`\nFarklı cümle: ${tekil.size}\n`);
for (const s of [...tekil.values()].sort((a, b) => b.kac - a.kac)) {
  console.log(`  [${s.nerede}] ${s.sebep}`);
  console.log(`     "${s.metin}"`);
  console.log(`     ${s.kac} yerde · örn. ${s.secenek}`);
}

console.log(
  `\nA1 ölçüsü: ${LEVEL_SPEC.A1.structures}`
);
process.exit(sorunlar.length > 0 ? 1 : 0);
