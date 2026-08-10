/**
 * Kelime havuzunun denetçisi — havuzun "kabul testi".
 *
 * Neden var: havuz üç kez elle temizlendi ve üç kez seviyeye ait olmayan
 * kelime geri sızdı. Kullanıcının teşhisi doğruydu: *"burası karışık, bir
 * model oluşturmamız lazım, ileride de problem çıkaracak."* Elle bakmak
 * ölçeklenmiyor — 600 kelime × örnek cümlelerdeki 3000 kelimeyi göz ile
 * denetlemek mümkün değil. Kural yazılınca havuz her büyüdüğünde kendini
 * denetliyor.
 *
 * Çalıştırma:
 *   npm run kelime
 *
 * Bulduğu her ihlal bir satır; ihlal varsa çıkış kodu 1 olur, yani havuzu
 * bozan bir değişiklik sessizce geçmez.
 *
 * ── Kurallar ─────────────────────────────────────────────────────────────
 *
 *  1. **Tek seviye.** Aynı kelime iki seviyede olamaz. Olursa cetvel bozulur:
 *     `levelOfWord` ilk bulduğunu döndürür ve kelime hem "kolay" hem "zor"
 *     sayılabilir.
 *  2. **Tekrar yok.** Aynı kelime aynı seviyede iki kez geçemez — günün
 *     listesinde aynı kart iki kez çıkar.
 *  3. **Cetvel kelimeyi görebiliyor.** `lookupWord(kelime)` kaydın kendisini
 *     bulmalı. Bulamıyorsa o kelime süzgeçten "bilinmiyor" diye geçer;
 *     kullanıcının üç kez bildirdiği hata tam olarak buydu.
 *  4. **Örnek cümle sınırı.** `LEVEL_SPEC[seviye].maxExampleWords`.
 *  5. **Örnek cümlede seviye üstü kelime yok.** En sinsi sızıntı bu: kelimenin
 *     kendisi A1 ama örnek cümlesi B1 kelimesi içeriyor. Öğrenci kartı açıyor
 *     ve anlamadığı bir cümleyle karşılaşıyor. Cümledeki her içerik kelimesi
 *     ya dilbilgisi kelimesi ya da aynı seviyeden/altından olmalı.
 *  6. **A1'de kısaltma yok.** "don't", "it's" — okumayı zorlaştırıyor ve
 *     telaffuz aşaması yanlış okuyor.
 *  7. **Türkçe karşılık dolu ve gerçekten Türkçe.**
 *  8. **Tür dengesi.** Sadece isim ya da sadece fiil öğrenen cümle kuramaz.
 *  9. **Havuz derinliği.** Seviye kaç günlük malzeme veriyor.
 */

import { IRREGULAR_FORMS } from '../src/core/irregular.ts';
import { LEVELS, LEVEL_SPEC } from '../src/core/level.ts';
import { WORD_BANK, lookupWord } from '../src/core/wordbank.ts';

/**
 * **Denetimin bağlayıcı olduğu seviyeler.**
 *
 * Kullanıcının kuralı: *"a1den c2ye kadar tek tek gideceğiz, biri bitmeden
 * ötekine geçmeyeceğiz."* Denetçi bütün seviyeleri **raporlar** ama sadece
 * fazı tamamlanmış seviyelerde **hata verir** (çıkış kodu 1). Böylece A1
 * temiz kalırken B2'nin bilinen eksikleri işi durdurmuyor, ama görünmez de
 * olmuyor — her çalıştırmada sayıları görüyoruz.
 *
 * Bir seviyenin fazı bitince buraya eklenir; `KAPALI_SEVIYELER`
 * (`src/core/wordbank.ts`) ile aynı listeyi takip etmeli.
 */
const TEMIZ_SEVIYELER = new Set(['A1']);

/**
 * Dilbilgisi kelimeleri — seviyesi olmayan, taşıyıcı sözcükler.
 *
 * Bunlar havuza girmez çünkü ezberlenecek kelime değil, cümlenin iskeleti.
 * A1 öğrencisi bunları ilk haftada yapı olarak öğrenir (`LEVEL_SPEC.A1
 * .structures`: present simple, temel isim-fiil). Örnek cümle denetiminde
 * "bilinmiyor" sayılmazlar.
 */
const DILBILGISI = new Set(
  `a an the this that these those
   i you he she it we they me him her us them
   my your his hers its our their mine yours ours theirs
   am is are was were be been being
   do does did done doing
   have has had having
   will would can could shall should may might must
   not no nor
   and or but so because if when while as than then
   of to in on at from by for with without about into over under
   up down out off after before between near next here there
   who what which where why how whose whom
   some any all both each every other another
   very too much many more most little less least
   one two three four five six seven eight nine ten
   first second last
   yes please thanks cannot
   let s t re ll ve m d
   also just only still even again
   good morning
   his own`
    .split(/\s+/)
    .filter(Boolean)
);

/**
 * Özel isimler — seviyesi yok, çevrilmez. Örnek cümlelerde geçmesi serbest.
 */
const OZEL = new Set(
  `istanbul ankara izmir london england turkey english turkish
   german french spanish italian arabic
   ali ayse mehmet omer
   monday tuesday wednesday thursday friday saturday sunday
   january february march april may june july august september october
   november december`
    .split(/\s+/)
    .filter(Boolean)
);

const sorunlar = [];
const uyar = (kod, seviye, kelime, mesaj) =>
  sorunlar.push({ kod, seviye, kelime, mesaj });

/* ------------------------------------------------- 1-2: tekillik denetimi */

const gorulen = new Map();
for (const w of WORD_BANK) {
  const k = w.word.trim().toLowerCase();
  const onceki = gorulen.get(k);
  if (!onceki) {
    gorulen.set(k, w);
  } else if (onceki.level !== w.level) {
    uyar('ÇİFT-SEVİYE', w.level, w.word, `${onceki.level} listesinde de var`);
  } else {
    uyar('TEKRAR', w.level, w.word, `${w.level} içinde iki kez geçiyor`);
  }
}

/* ------------------------------------------- 3: cetvel kelimeyi görüyor mu */

for (const w of WORD_BANK) {
  const bulunan = lookupWord(w.word);
  if (!bulunan) {
    uyar('GÖRÜNMEZ', w.level, w.word, 'lookupWord bulamıyor — süzgeçten kaçar');
  } else if (bulunan.level !== w.level) {
    uyar(
      'YANLIŞ-EŞLEŞME',
      w.level,
      w.word,
      `lookupWord "${bulunan.word}" (${bulunan.level}) döndürüyor`
    );
  }
}

/* --------------------------------------------------- 4-6: örnek cümle denetimi */

/** Kelimenin olası çekimli hâlleri — örnek cümlede kendi kelimesi serbest. */
function bicimler(word) {
  const kok = word
    .toLowerCase()
    .replace(/^(to|a|an|the)\s+/, '')
    .replace(/^be\s+/, '');
  const parcalar = kok.split(/\s+/);
  const out = new Set([kok, ...parcalar]);
  for (const p of parcalar) {
    out.add(p + 's');
    out.add(p + 'es');
    out.add(p + 'd');
    out.add(p + 'ed');
    out.add(p + 'ing');
    if (p.endsWith('e')) {
      out.add(p.slice(0, -1) + 'ing');
      out.add(p.slice(0, -1) + 'ed');
    }
    if (p.endsWith('y')) {
      out.add(p.slice(0, -1) + 'ies');
      out.add(p.slice(0, -1) + 'ied');
    }
  }
  return out;
}

/** Kelimenin kendi çekimi mi — "cook" kaydında "cooked" ihlal sayılmasın */
function kendiEk(kayit, token) {
  return bicimler(kayit.word).has(token);
}

const seviyeSirasi = (s) => LEVELS.indexOf(s);
/** Örnek cümlelerde geçip havuzda karşılığı olmayan kelimeler — rapor için */
const eksikler = new Map();

for (const w of WORD_BANK) {
  const spec = LEVEL_SPEC[w.level];
  const kelimeler = w.example.trim().split(/\s+/).filter(Boolean);

  if (kelimeler.length > spec.maxExampleWords) {
    uyar(
      'UZUN-ÖRNEK',
      w.level,
      w.word,
      `${kelimeler.length} kelime, sınır ${spec.maxExampleWords}`
    );
  }

  if (w.level === 'A1' && /\b\w+n't\b|\b\w+'(re|ll|ve|m|d)\b/i.test(w.example)) {
    uyar('KISALTMA', w.level, w.word, `örnekte kısaltma: "${w.example}"`);
  }

  /**
   * **A1 örneği yalnızca present simple kullanabilir.**
   *
   * `LEVEL_SPEC.A1.structures` = "present simple, temel isim-fiil, tek yapılı
   * kısa cümle". Buna rağmen havuzda 20'den fazla örnek geçmiş zaman, gelecek
   * zaman ya da present perfect kullanıyordu: *"She gave me a flower"*,
   * *"I will call you tomorrow"*, *"Have you ever been there?"*
   *
   * Bağımsız denetimin (2026-08-11) bulgusu. Sinsi olmasının sebebi: bütün
   * kelimeler A1, cümle de kısa — eski kurallar hiçbir şey görmüyordu. Ama
   * öğrenci "-ed" ve "was/were" yapısını daha görmeden bu cümlelerle
   * karşılaşıyor. Kelime tanıdık, cümle yabancı.
   *
   * Örnekleri geçmişe kaydıran şey çoğu zaman kelimenin kendisi ("yesterday",
   * "last") — o kelimelerin örneği zorunlu olarak geçmiş zamandır. Onlar
   * `ZAMAN_MUAF` ile ayrı tutuluyor: kelimenin öğrettiği şey zaten o yapı.
   */
  const ZAMAN_MUAF = new Set(['yesterday', 'last', 'then', 'ago', 'tomorrow']);
  if (w.level === 'A1' && !ZAMAN_MUAF.has(w.word.toLowerCase())) {
    for (const ham of kelimeler) {
      const t = ham.toLowerCase().replace(/[^a-z']/g, '');
      if (!t) continue;
      const gecmisYardimci = ['was', 'were', 'been', 'did', 'had', 'will', 'would'].includes(t);
      const duzensizCekim = Object.hasOwn(IRREGULAR_FORMS, t);
      /**
       * "-ed" ekli geçmiş zaman. İki tuzak var:
       *  · `need`, `red`, `bed`, `tired` kendileri birer kelime — çekim değil.
       *    Bu yüzden aranan kaydın **kendisi** o kelimeyse atlanıyor.
       *  · İlk sürüm `{4,}` yazdığı için "moved" (5 harf) hiç yakalanmıyordu;
       *    geri izleme yüzünden kalıp en az 6 harf istiyordu.
       */
      const bulunanEd = /^[a-z]{3,}ed$/.test(t) ? lookupWord(t) : null;
      const edEki = bulunanEd?.kind === 'fiil' && bulunanEd.word !== t;
      if (gecmisYardimci || duzensizCekim || edEki) {
        uyar(
          'A1-ZAMAN',
          w.level,
          w.word,
          `"${t}" present simple değil → "${w.example}"`
        );
        break;
      }
    }
  }

  if (!w.meaning || !w.meaning.trim()) {
    uyar('KARŞILIK-YOK', w.level, w.word, 'Türkçe karşılık boş');
  }

  const kendi = bicimler(w.word);
  for (const ham of kelimeler) {
    const t = ham.toLowerCase().replace(/[^a-z']/g, '').replace(/^'|'$/g, '');
    if (!t) continue;
    if (DILBILGISI.has(t) || OZEL.has(t) || kendi.has(t)) continue;

    const bulunan = lookupWord(t);
    if (!bulunan) {
      const kayit = eksikler.get(t) ?? { sayi: 0, ornek: [] };
      kayit.sayi++;
      if (kayit.ornek.length < 3) kayit.ornek.push(`${w.word} (${w.level})`);
      eksikler.set(t, kayit);
      uyar('ÖRNEKTE-BİLİNMEYEN', w.level, w.word, `"${t}" havuzda yok`);
    } else if (seviyeSirasi(bulunan.level) > seviyeSirasi(w.level)) {
      uyar(
        'ÖRNEKTE-ÜST-SEVİYE',
        w.level,
        w.word,
        `"${t}" ${bulunan.level} — örnek cümle öğrencinin seviyesinin üstünde`
      );
    }
  }
}

/* ------------------------------------------------------- 8-9: denge ve derinlik */

const HEDEF = {
  isim: 0.32,
  fiil: 0.32,
  sıfat: 0.19,
  zarf: 0.07,
  kalıp: 0.05,
  sayı: 0.05,
};
const ozet = [];

for (const seviye of LEVELS) {
  const liste = WORD_BANK.filter((w) => w.level === seviye);
  if (liste.length === 0) continue;

  const sayim = {};
  for (const w of liste) sayim[w.kind] = (sayim[w.kind] ?? 0) + 1;

  const gunluk = LEVEL_SPEC[seviye].maxNewWordsPerDay;
  ozet.push({
    seviye,
    toplam: liste.length,
    gun: Math.floor(liste.length / gunluk),
    dagilim: Object.entries(sayim)
      .map(([k, n]) => `${k} ${n} (%${Math.round((n / liste.length) * 100)})`)
      .join(', '),
  });

  for (const [tur, hedef] of Object.entries(HEDEF)) {
    const oran = (sayim[tur] ?? 0) / liste.length;
    // Zarf ve kalıp payı küçük; sapma toleransı da orantılı olsun
    const tolerans = Math.max(0.08, hedef * 0.6);
    if (Math.abs(oran - hedef) > tolerans) {
      uyar(
        'TÜR-DENGESİ',
        seviye,
        tur,
        `%${Math.round(oran * 100)}, hedef %${Math.round(hedef * 100)}`
      );
    }
  }
}

/* ------------------------------------------------------------------ rapor */

console.log('KELİME HAVUZU DENETİMİ\n');
for (const o of ozet) {
  console.log(
    `  ${o.seviye}: ${String(o.toplam).padStart(4)} kelime · ~${o.gun} gün · ${o.dagilim}`
  );
}

const kodlar = new Map();
for (const s of sorunlar) kodlar.set(s.kod, (kodlar.get(s.kod) ?? 0) + 1);

const baglayici = sorunlar.filter((s) => TEMIZ_SEVIYELER.has(s.seviye));

console.log(`\nToplam ihlal: ${sorunlar.length}`);
for (const [kod, n] of [...kodlar].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${kod.padEnd(22)} ${n}`);
}
console.log(
  `\nFazı biten seviyeler (${[...TEMIZ_SEVIYELER].join(', ')}): ` +
    `${baglayici.length} ihlal — ${baglayici.length === 0 ? 'TEMİZ' : 'DÜZELTİLMELİ'}`
);
console.log('Diğer seviyeler raporlanır ama işi durdurmaz; sırası gelince temizlenecek.');

const detay = process.argv.includes('--detay');
const suz = process.argv.find((a) => a.startsWith('--kod='))?.slice(6);

if (detay || suz) {
  console.log('');
  for (const s of sorunlar) {
    if (suz && s.kod !== suz) continue;
    console.log(`  [${s.kod}] ${s.seviye} · ${s.kelime} → ${s.mesaj}`);
  }
}

if (process.argv.includes('--eksik')) {
  console.log('\nÖrnek cümlelerde geçip havuzda olmayan kelimeler:');
  const sirali = [...eksikler].sort((a, b) => b[1].sayi - a[1].sayi);
  for (const [kelime, k] of sirali) {
    console.log(`  ${kelime.padEnd(16)} ${String(k.sayi).padStart(3)}× · ${k.ornek.join(', ')}`);
  }
  console.log(`  (${sirali.length} farklı kelime)`);
}

process.exit(baglayici.length > 0 ? 1 : 0);
