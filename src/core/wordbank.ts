/**
 * Seviyeye göre kelime havuzunun **mantığı** — cetvel, arama ve günün seçimi.
 *
 * Kelimelerin kendisi burada değil: `src/core/words/` klasöründe, her seviye
 * kendi dosyasında duruyor. Ayrılmalarının sebebi kullanıcının şikâyeti —
 * *"burası karışık, burayı 0'dan düzenleyelim, bir veri merkezi kuralım."*
 *
 * Neden var: kullanıcı A2 seçiliyken kartlara "to be worth it", "to come up
 * with", "eventually" gibi kelimeler geldi. Öğretmene "seviyeye uygun kelime
 * seç" deniyordu ama ölçecek bir cetvel yoktu. Bu dosya o cetvel.
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
 * **Neden Tureng/sözlük servisi değil:** Tureng'in açık bir API'si yok, sayfayı
 * kazımak hem CORS'a takılır hem her tasarım değişiminde kırılır. Üstelik
 * Tureng bir *çeviri* sözlüğü — bir kelimenin **hangi seviyeye ait olduğunu**
 * söylemez, ki burada asıl ihtiyacımız o. Liste CEFR sınıflandırmasına göre
 * elle derlendi: çevrimdışı çalışır, ücretsizdir ve kimseye bağımlı değildir.
 *
 * Saf TypeScript — ağ yok, bu yüzden `node --experimental-strip-types` ile
 * doğrudan çalıştırılıp test edilebilir (`npm run kelime`).
 */

import { IRREGULAR_FORMS } from './irregular';
import { LEVELS, levelIndex, toLevel, type CEFRLevel } from './level';
import { WORD_BANK, type BankWord, type WordKind } from './words';

export { WORD_BANK };
export type { BankWord, WordKind };

/* -------------------------------------------------------------- arama */

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
    .replace(/\s+/g, ' ')
    .trim();
}

const BY_KEY = new Map<string, BankWord>();
for (const entry of WORD_BANK) {
  // Aynı kelime iki türde geçebiliyor ("change" isim ve fiil) — ilki kalır
  if (!BY_KEY.has(key(entry.word))) BY_KEY.set(key(entry.word), entry);
}

/**
 * Öbek fiillerin kuyruğundaki edatlar.
 *
 * "struggle with", "look forward to", "run out of" — havuzda bazen tam öbek
 * yazılı, bazen yalnız çekirdek fiil. Kuyruğu kırparak ikisini de yakalıyoruz.
 */
const PARTICLES = new Set([
  'with', 'to', 'of', 'up', 'out', 'for', 'on', 'in', 'at',
  'about', 'off', 'over', 'through', 'down', 'away', 'it',
]);

/**
 * Düzensiz çoğullar — ek kuralıyla çözülemeyen tek isim grubu.
 * ("children" → "child"; `stemForms` bunu "childre" sanıyordu.)
 */
const IRREGULAR_PLURALS: Record<string, string> = {
  children: 'child',
  men: 'man',
  women: 'woman',
  people: 'person',
  feet: 'foot',
  teeth: 'tooth',
  mice: 'mouse',
  geese: 'goose',
  lives: 'life',
  knives: 'knife',
  wives: 'wife',
  leaves: 'leaf',
  shelves: 'shelf',
};

/**
 * Havuzdaki kayıt — kelime hangi biçimde yazılmış olursa olsun.
 *
 * ⚠️ **Bu fonksiyonun bulamaması sessiz bir hataya dönüşüyor.** Ölçülen
 * örnek: A1 kullanıcısının kartlarına *"to struggle with"* geliyordu.
 * Havuzda `struggle` (B2) var ama arama anahtarı `struggle with` oluyor,
 * eşleşme olmuyor, `levelOfWord` `null` dönüyor ve `isTooHardFor` — veri
 * yokken hüküm vermemek için — **false** diyordu. Yani kelime süzgeçten
 * "bilinmiyor" diye geçiyordu. Kullanıcı bunu üç kez bildirdi.
 *
 * Çözüm aramayı derinleştirmek: tam eşleşme yoksa sırayla
 *   1. kuyruktaki edatları kırp  ("struggle with" → "struggle")
 *   2. düzensiz biçimi çöz       ("thought" → "think", "children" → "child")
 *   3. çekimi sadeleştir          ("struggling"   → "struggle")
 *   4. ilk kelimeye düş           ("figure out"   → "figure")
 * denenir. Hepsi başarısızsa yine `null` — o zaman gerçekten bilmiyoruz.
 */
export function lookupWord(word: string): BankWord | null {
  const k = key(word);
  const tam = BY_KEY.get(k);
  if (tam) return tam;

  const parcalar = k.split(' ').filter(Boolean);
  if (parcalar.length === 0) return null;

  /** 1 — kuyruktaki edatları teker teker at */
  const kirpik = [...parcalar];
  while (kirpik.length > 1 && PARTICLES.has(kirpik[kirpik.length - 1])) {
    kirpik.pop();
    const bulunan = BY_KEY.get(kirpik.join(' '));
    if (bulunan) return bulunan;
  }

  /** 2-3 — düzensiz biçim ve çekim ekleri (kırpılmış hâl üzerinde) */
  const govde = kirpik.join(' ');
  for (const sade of stemForms(govde)) {
    const bulunan = BY_KEY.get(sade);
    if (bulunan) return bulunan;
  }

  /** 4 — son çare: öbeğin ilk kelimesi */
  if (parcalar.length > 1) {
    const ilk = BY_KEY.get(parcalar[0]);
    if (ilk) return ilk;
    for (const sade of stemForms(parcalar[0])) {
      const bulunan = BY_KEY.get(sade);
      if (bulunan) return bulunan;
    }
  }

  return null;
}

/**
 * Bir kelimenin olası sade biçimleri: "studies" → "study", "went" → "go".
 *
 * Önce düzensiz tablolara bakılır (`IRREGULAR_FORMS`, `IRREGULAR_PLURALS`),
 * sonra ek kuralları denenir. Kural tabanlı kısım kabadır; amaç sözlük
 * doğruluğu değil, **cetvelin gözünden kaçmayı zorlaştırmak.** Yanlış bir
 * sadeleştirme havuzda karşılık bulmazsa zaten bir şey değişmiyor.
 */
function stemForms(w: string): string[] {
  const out: string[] = [];
  const ek = (s: string) => {
    if (s && s !== w && !out.includes(s)) out.push(s);
  };

  ek(IRREGULAR_FORMS[w]);
  ek(IRREGULAR_PLURALS[w]);

  if (w.endsWith('ies')) ek(w.slice(0, -3) + 'y');
  /** "studied" → "study", "tried" → "try" */
  if (w.endsWith('ied')) ek(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) ek(w.slice(0, -2));
  if (w.endsWith('s')) ek(w.slice(0, -1));
  if (w.endsWith('ing')) {
    ek(w.slice(0, -3));
    ek(w.slice(0, -3) + 'e');
    /** "running" → "run": ikizlenen sessiz harf */
    const govde = w.slice(0, -3);
    if (govde.length > 2 && govde.at(-1) === govde.at(-2)) ek(govde.slice(0, -1));
  }
  if (w.endsWith('ed')) {
    ek(w.slice(0, -2));
    ek(w.slice(0, -1));
    const govde = w.slice(0, -2);
    if (govde.length > 2 && govde.at(-1) === govde.at(-2)) ek(govde.slice(0, -1));
  }
  if (w.endsWith('ily')) ek(w.slice(0, -3) + 'y');
  if (w.endsWith('ly')) ek(w.slice(0, -2));
  return out;
}

/* -------------------------------------------------------------- cetvel */

/**
 * **Kapalı listeli seviyeler.**
 *
 * Bu seviyelerde kural tersine döner: havuzda olmayan kelime "bilmiyoruz"
 * değil, **"bu seviyeye ait değil"** sayılır ve gösterilmez.
 *
 * ⚠️ Neden gerekli: kullanıcı dördüncü kez *"hâlâ A1 olmayan kelimeler var,
 * to be excited gibi"* dedi. İki ayrı sızıntı vardı:
 *
 *  - **Tolerans.** `isTooHardFor` bir üst bandı serbest bırakıyordu; "excited"
 *    havuzda A2 olduğu için A1 öğrencisine gösterilmesi *kurala uygundu.*
 *    Üst banda uzanmak A2'den sonra öğretici, ama A1'de dayanacak bir taban
 *    yok — sıfırdan başlayan biri "bir üst seviye" ile beslenemez.
 *  - **Bilinmeyen kelime.** Havuz ~600 kelime; öğretmenin yazdığı ya da
 *    okumadan gelen her kelime havuzda değil. "Bilmiyorsak karışmayalım"
 *    kuralı yüzünden bunların **hepsi** süzgeçten geçiyordu. Havuzu ne kadar
 *    temizlersek temizleyelim bu kapı açık kaldığı sürece sızıntı sürer.
 *
 * A1'de kapalı liste savunulabilir çünkü A1 zaten kapalı bir kümedir: birkaç
 * yüz kelimelik bir çekirdek. Üst seviyelerde kelime dağarcığı açık uçlu, o
 * yüzden orada eski kural (bilinmeyen serbest) geçerli kalıyor.
 *
 * Bir seviyenin fazı bitip listesi doldukça buraya eklenir. Sıradaki: A2.
 */
export const KAPALI_SEVIYELER = new Set<CEFRLevel>(['A1']);

/** Öbeklerde seviyesi olmayan taşıyıcı kelimeler — "to be worth it" → worth */
const TASIYICI = new Set([
  'to', 'be', 'a', 'an', 'the', 'it', 'is', 'are', 'am', 'was', 'were',
  'get', 'got', 'one', 'your', 'my', 'his', 'her', 'their', 'our',
]);

/**
 * Bir öbeğin seviyesi = **içindeki en zor kelimenin** seviyesi.
 *
 * ⚠️ Tek kelimeye bakmak yetmiyordu: "to be worth it" aranırken baştaki
 * "to be" atılıp "worth" bulunuyordu (doğru), ama "make a decision" gibi
 * öbeklerde arama ilk kelimeye düşüp "make" (A1) diyordu — oysa öbeği zor
 * yapan "decision". Öğrenci bir öbeği ancak bütün parçalarını biliyorsa
 * okuyabilir; ölçü de en zor parça olmalı.
 *
 * Dönüş: seviye, ya da hiçbir parçası tanınmadıysa `null`.
 * `bilinmeyenVar` çağırana "içinde tanımadığım kelime var" der.
 */
export function phraseLevel(word: string): {
  level: CEFRLevel | null;
  bilinmeyenVar: boolean;
} {
  /** Tam öbek havuzda yazılıysa son söz onundur */
  const k = key(word);
  const tam = BY_KEY.get(k);
  if (tam) return { level: tam.level, bilinmeyenVar: false };

  const parcalar = k.split(' ').filter(Boolean);
  const icerik = parcalar.filter((p) => !TASIYICI.has(p));
  const bakilacak = icerik.length > 0 ? icerik : parcalar;

  let enZor: CEFRLevel | null = null;
  let bilinmeyenVar = false;

  for (const p of bakilacak) {
    /**
     * ⚠️ **Parçacık atlanamaz — atlanınca öbek olduğundan kolay görünür.**
     *
     * İkinci gözün (bağımsız denetim, 2026-08-11) bulduğu açık: parçacıklar
     * sessizce atlanıyordu ve `[A1 fiil] + [parçacık]` biçimindeki her öbek
     * çekirdek fiilin seviyesine iniyordu. `give up` → `give` (A1) + `up`
     * (atlandı) = A1. Oysa "give up" vazgeçmek demek; parçalarının anlamıyla
     * hiç ilgisi yok ve B1/B2'dir. Aynısı `put up with`, `look after`,
     * `get over` için de geçerliydi.
     *
     * Doğru kural: **öbek fiilin zorluğu parçalarından hesaplanamaz.** Tam
     * öbek havuzda yazılıysa (yukarıda) seviyesi bellidir; yazılı değilse
     * bilmiyoruz demektir. Kapalı seviyede (A1) "bilmiyorum" = gösterme.
     */
    if (PARTICLES.has(p) && bakilacak.length > 1) {
      bilinmeyenVar = true;
      continue;
    }
    const bulunan = lookupWord(p);
    if (!bulunan) {
      bilinmeyenVar = true;
      continue;
    }
    if (!enZor || LEVELS.indexOf(bulunan.level) > LEVELS.indexOf(enZor)) {
      enZor = bulunan.level;
    }
  }

  /** Parça parça bulunamadıysa bütünü aramanın derin yollarını dene */
  if (!enZor && !bilinmeyenVar) {
    const bulunan = lookupWord(word);
    if (bulunan) return { level: bulunan.level, bilinmeyenVar: false };
  }

  return { level: enZor, bilinmeyenVar };
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
 * gerektirir, B1'e sadece B1 kelimesi vermek ilerlemeyi durdurur. Ama iki
 * band yukarısı (A2 öğrencisine B2 kelimesi) kullanıcının haklı olarak
 * şikâyet ettiği durumdur — "a2 biri bunu bilemez".
 *
 * **Kapalı seviyelerde (A1) kural sertleşir:** tolerans sıfırdır ve havuzda
 * olmayan kelime de "fazla ağır" sayılır. Gerekçesi `KAPALI_SEVIYELER`
 * açıklamasında.
 */
export function isTooHardFor(
  word: string,
  level: string,
  tolerance = 1
): boolean {
  const hedef = toLevel(level);
  const kapali = KAPALI_SEVIYELER.has(hedef);
  const { level: found, bilinmeyenVar } = phraseLevel(word);

  if (kapali && (bilinmeyenVar || !found)) return true;
  if (!found) return false;

  const tol = kapali ? 0 : tolerance;
  return LEVELS.indexOf(found) - levelIndex(hedef) > tol;
}

/**
 * **Öğretmenin kefaletiyle** seviye denetimi.
 *
 * Kullanıcının kuralı: *"havuzla öğretmeni entegre etmemiz lazım, havuz
 * öğretmenden ayrı hareket etmesin."* Kapalı liste (A1) sızıntıyı kesti ama
 * öğretmenin elini de bağladı: havuzda olmayan her kelime eleniyordu, oysa
 * öğretmen içeriğe özel doğru bir kelime seçmiş olabilir (`lap`, `pit stop`).
 *
 * Kefalet **dar**: yalnızca cetvelin tanımadığı kelimeler için geçer.
 * Cetvel kelimenin üst seviye olduğunu biliyorsa kefalet işlemez — öğretmen
 * *"to be excited A1'dir"* diyemez, çünkü havuzda A2 olarak yazılı. Yani
 * öğretmen havuzu **genişletebilir, çiğneyemez.**
 *
 * `vouchedLevel` öğretmenin o kelime için yazdığı seviye; yoksa kefalet yok.
 */
export function isTooHardForWithVouch(
  word: string,
  level: string,
  vouchedLevel: string | undefined
): boolean {
  const zor = isTooHardFor(word, level);
  if (!zor || !vouchedLevel) return zor;

  /** Cetvel biliyorsa kefalet geçmez */
  const { level: bilinen } = phraseLevel(word);
  if (bilinen) return zor;

  /** Kefalet ancak kullanıcının seviyesini aşmıyorsa geçerli */
  return levelIndex(vouchedLevel) > levelIndex(level);
}

/**
 * Kelime bu seviyedeki biri için fazla **kolay** mı?
 *
 * ⚠️ Bu ölçü, kullanıcının *"B2'ye aldığımda kelime kısmı hâlâ değişmiyor"*
 * şikâyetinin çekirdeğinde duruyor.
 *
 * `isTooHardFor` yalnızca **yukarı** bakıyor ve havuzun tavanı B2 olduğu için
 * B1 ve üstünde hiçbir şeyi elemiyordu. Süzgeç kapanınca destede biriken eski
 * A1/A2 kartları "sırada bekleyen" sayılıp günün kotasını dolduruyor, yeni
 * seviyenin kelimesi hiç eklenmiyordu.
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

/* ------------------------------------------------------ günün seçimi */

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
export const MIX: Array<[WordKind, number]> = [
  ['isim', 0.32],
  ['fiil', 0.32],
  ['sıfat', 0.19],
  ['zarf', 0.07],
  ['kalıp', 0.05],
  ['sayı', 0.05],
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
 * çalışmak zaman kaybıdır. **İki band üstü kesinlikle karışmaz.**
 *
 * ⚠️ **Kapalı seviyede (A1) üst band da karışmaz.** Bu, kullanıcının
 * *"to be excited"* şikâyetinin ikinci kaynağıydı: tohumlayıcının kendisi
 * A1 destesine A2 kelimesi çekiyordu. Süzgeci sertleştirip kaynağı olduğu
 * gibi bırakmak hatayı sadece yer değiştirtirdi.
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
  const hedef = toLevel(level);
  const kapali = KAPALI_SEVIYELER.has(hedef);
  const idx = levelIndex(hedef);
  const rank = (w: BankWord) => {
    const d = LEVELS.indexOf(w.level) - idx;
    if (d === 0) return 0;
    if (d === 1) return kapali ? 99 : 1;
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
