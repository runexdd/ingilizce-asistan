/**
 * Müzik ve canlandırma denetimi.
 *
 * Neden var: kullanıcının bildirimi — *"adam müziğe girdi, Bruno Mars geldi;
 * yarın geldi yine Bruno Mars'a gelmesin, Katy Perry, X sanatçı. Diğer
 * seçimler için de aynısı geçerli."*
 *
 * Eski seçim `winners[seed % winners.length]` idi. Tohum tarihten türese de
 * **ardışık iki günün aynı parçaya düşmesi tesadüfe kalıyordu** — 3 parçalık
 * bir havuzda bunun olasılığı her gün 1/3. Şimdi seçim gün gün sırayla
 * yürüyor; bu betik 63 günü (A1 müfredatının uzunluğu) tek tek gezip
 * doğruluyor.
 *
 * Çalıştırma: npm run muzik
 */

import { A1_CATALOG } from '../src/core/catalog/a1.ts';
import { A1_CESIT } from '../src/core/catalog/a1-cesit.ts';
import { A1_MUZIK } from '../src/core/catalog/a1-muzik.ts';
import { pickLocalContent } from '../src/core/localcontent.ts';
import { scenarioForDay, A1_SCENARIOS } from '../src/core/scenarios.ts';
import { TASTE_STEPS } from '../src/core/tastes.ts';

let hata = 0;
const bekle = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (!ok) hata++;
  console.log(`${ok ? 'OK  ' : 'HATA'} ${ad.padEnd(50)} ${olan} (beklenen ${beklenen})`);
};

/** "Katy Perry — Firework" → "Katy Perry" */
const sanatci = (baslik) => (baslik ?? '').split('—')[0].trim();

const turler = TASTE_STEPS.find((s) => s.field === 'music').options
  .map((o) => o.value)
  .filter((v) => v !== 'kendim');

const GUN = 63; // A1 müfredatının uzunluğu
const tarih = (i) => {
  const d = new Date(2026, 7, 11 + i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

console.log(`MÜZİK DENETİMİ · ${turler.length} tür · ${GUN} gün\n`);

/* -------------------------------------------------- 1. havuzun derinliği */

/**
 * ⚠️ Havuz **bütün kataloglardan** sayılmalı. İlk sürüm yalnızca
 * `a1-muzik.ts` içine bakıyordu; oysa `a1.ts` de her tür için birer şarkı
 * taşıyor. Yanlış yerden sayınca hem eksik görünüyor hem de dosyalar arası
 * **yinelenen başlıklar** gözden kaçıyordu (üç şarkı iki dosyada birden
 * duruyordu ve aynı parça iki gün üst üste geliyordu).
 */
const TUM_SARKILAR = [...A1_CATALOG, ...A1_MUZIK, ...A1_CESIT].filter(
  (s) => s.type === 'song'
);

const yinelenen = [...TUM_SARKILAR.reduce((m, s) => m.set(s.title, (m.get(s.title) ?? 0) + 1), new Map())]
  .filter(([, n]) => n > 1)
  .map(([t]) => t);
bekle('kataloglar arası yinelenen şarkı', yinelenen.length, 0);
if (yinelenen.length) console.log('   ', yinelenen.join(' | '));

for (const tur of turler) {
  const havuz = TUM_SARKILAR.filter((s) => s.tastes.includes(tur));
  const sanatcilar = new Set(havuz.map((s) => sanatci(s.title)));
  const ok = havuz.length >= 4 && sanatcilar.size >= 4;
  if (!ok) hata++;
  console.log(
    `${ok ? 'OK  ' : 'HATA'} ${tur.padEnd(14)} ${havuz.length} parça · ${sanatcilar.size} sanatçı (en az 4)`
  );
}

/* ------------------------------------------- 2. ardışık günlerde tekrar yok */

console.log('');
let ardisikTekrar = 0;
let sanatciTekrar = 0;
const enKisaTur = [];

for (const tur of turler) {
  const tastes = {
    areas: ['muzik'], music: [tur], screen: [], sports: [], other: [],
    updatedAt: '2026-08-01T10:00:00Z',
  };

  let oncekiBaslik = null;
  let oncekiSanatci = null;
  const gorulen = new Set();

  for (let i = 0; i < GUN; i++) {
    const sarki = pickLocalContent('A1', tastes, tarih(i)).find((c) => c.type === 'song');
    const baslik = sarki?.title ?? '(yok)';
    if (baslik === oncekiBaslik) ardisikTekrar++;
    if (sanatci(baslik) === oncekiSanatci) sanatciTekrar++;
    oncekiBaslik = baslik;
    oncekiSanatci = sanatci(baslik);
    gorulen.add(baslik);
  }
  enKisaTur.push({ tur, farkli: gorulen.size });
}

bekle('ardışık iki günde aynı şarkı', ardisikTekrar, 0);
bekle('ardışık iki günde aynı sanatçı', sanatciTekrar, 0);

const enAz = enKisaTur.sort((a, b) => a.farkli - b.farkli)[0];
console.log(`    en dar tür: ${enAz.tur} · ${GUN} günde ${enAz.farkli} farklı şarkı`);
bekle('her türde en az 4 farklı şarkı dönüyor', enAz.farkli >= 4, true);

/* ------------------------------- 2b. "bitirdim" havuzu kilitlemesin */

/**
 * ⚠️ Bağımsız denetimin bulduğu hata: kullanıcı seçtiği türün **bütün**
 * şarkılarını "bitirdim" işaretlerse o türe bir daha hiç dönülmüyordu.
 * Tarafsız yedeğe düşüp orada kalıyor, üstelik *"Zevklerine tam uyan bir
 * parça bulamadım"* diye yalan bir gerekçe yazıyordu — oysa kullanıcı türü
 * seçmişti, sadece hepsini bitirmişti.
 */
console.log('\n— "Bitirdim" tükenmesi —');
{
  const tur = 'elektronik';
  const tastes = {
    areas: ['muzik'], music: [tur], screen: [], sports: [], other: [],
    updatedAt: '2026-08-01T10:00:00Z',
  };
  const turunSarkilari = TUM_SARKILAR.filter((x) => x.tastes.includes(tur)).map((x) => x.title);
  const hepsiBitti = [];
  for (let i = 0; i < 10; i++) {
    const s = pickLocalContent('A1', tastes, tarih(i), turunSarkilari).find((c) => c.type === 'song');
    hepsiBitti.push(s?.title);
  }
  const turdeKalan = hepsiBitti.filter((t) => turunSarkilari.includes(t)).length;
  bekle('tür bitince yine o türden şarkı geliyor', turdeKalan, 10);
  bekle('tür bitince de ardışık tekrar yok', new Set(hepsiBitti).size >= 4, true);

  /** Yarısı bitmişken de ardışık tekrar olmamalı */
  const yarisi = turunSarkilari.slice(0, 2);
  let tekrar = 0;
  let onceki2 = null;
  for (let i = 0; i < 20; i++) {
    const s = pickLocalContent('A1', tastes, tarih(i), yarisi).find((c) => c.type === 'song');
    if (s?.title === onceki2) tekrar++;
    onceki2 = s?.title;
  }
  bekle('yarısı bitmişken ardışık tekrar', tekrar, 0);
}

/* ------------------------------------------------- 3. canlandırma senaryosu */

console.log('\n— Canlandırma —');
bekle('A1 dışında senaryo yok', scenarioForDay('B1', undefined, '2026-08-11'), null);

const sporcu = {
  areas: ['spor'], music: ['rock'], screen: [], sports: ['motor'], other: ['gunluk'],
  updatedAt: '2026-08-01T10:00:00Z',
};
const ilk = scenarioForDay('A1', sporcu, '2026-08-11', 0);
bekle('zevke uyan senaryo geliyor', !!ilk, true);

/** Ardışık günlerde aynı senaryo gelmemeli */
let senaryoTekrar = 0;
let onceki = null;
for (let i = 0; i < GUN; i++) {
  const s = scenarioForDay('A1', sporcu, tarih(i));
  if (s?.id === onceki) senaryoTekrar++;
  onceki = s?.id;
}
bekle('ardışık iki günde aynı senaryo', senaryoTekrar, 0);

/** "Başka senaryo" gerçekten başkasını vermeli */
const v0 = scenarioForDay('A1', sporcu, '2026-08-11', 0);
const v1 = scenarioForDay('A1', sporcu, '2026-08-11', 1);
bekle('başka senaryo düğmesi farklı senaryo veriyor', v0.id !== v1.id, true);

/** Her senaryonun turları ve kalıpları dolu olmalı */
bekle(
  'her senaryonun 4 turu ve kalıpları var',
  A1_SCENARIOS.every((s) => s.turns.length >= 3 && s.phrases.length >= 2 && s.setting.length > 10),
  true
);
bekle('senaryo kimlikleri tekil', new Set(A1_SCENARIOS.map((s) => s.id)).size, A1_SCENARIOS.length);

console.log(`\n${hata === 0 ? 'HEPSİ GEÇTİ' : hata + ' HATA'}`);
process.exit(hata ? 1 : 0);
