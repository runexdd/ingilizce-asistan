/**
 * Serbest metni zevk anahtarlarına bağlar.
 *
 * ## Neden var
 *
 * Zevk sihirbazında her listenin sonunda **"✏️ Kendim yazmak istiyorum"**
 * var. Kullanıcının sorusu: *"orayı kullanan insanın yazdığını bizim öğretmen
 * anlayıp onun için bir diyalog oluşturabilir mi? Örnek: orada tiyatro yok,
 * tiyatro yazıyor — o kelimeye uygun bir seçenek verebilir mi?"*
 *
 * İki katman var ve ikisi de gerekli:
 *
 * 1. **Öğretmen katmanı.** Yazılan metin zaten pakete giriyor
 *    (`describeTastes` → "Kendi yazdığı: tiyatro"). Öğretmen tiyatro üzerine
 *    içerik seçip sohbet yazabilir. Ama cevabı 1-2 dakika sonra gelir ve
 *    bilgisayarın açık olmasını ister.
 *
 * 2. **Yerel katman — bu dosya.** Ekran anında dolsun diye. Yazılan kelimeyi
 *    en yakın zevk anahtarına bağlıyor; bağlayamazsa kelimenin kendisini
 *    göreve gömüyor.
 *
 * ## Sınırı dürüstçe
 *
 * Bu bir anlam çözümleyici değil, bir eşanlam tablosu. Tabloda olmayan bir
 * kelime eşleşmez — o zaman `noteSubject` devreye girer ve **kullanıcının
 * kendi kelimesiyle** bir görev kurulur ("Talk about tiyatro…"). Uydurma
 * eşleşme yapmaktansa kelimeyi olduğu gibi kullanmak dürüst: yanlış eşleşme
 * "bunu ben seçmedim" hissi verir, projede iki kez yaşandı.
 *
 * Saf TypeScript — ağ yok, node ile sınanabilir.
 */

/**
 * Türkçe küçültme + aksan sadeleştirme.
 *
 * ⚠️ `toLowerCase()` tek başına yetmiyor: JavaScript'in varsayılan
 * küçültmesi Türkçe "I" harfini "i" yapar ama "İ" ile "i" ayrımını da
 * bozar. Ayrıca kullanıcı "muzik" da yazabilir "müzik" de. Karşılaştırmayı
 * aksansız yapmak ikisini de yakalar.
 */
function normalize(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Eşanlam tablosu: yazılabilecek Türkçe kelime → `tastes.ts` anahtarları.
 *
 * Tek bir kelime birden çok anahtara bağlanabilir; tiyatro hem dizi/film
 * dünyasına hem drama değiyor, ikisini de vermek daha isabetli öneri üretiyor.
 * Anahtarlar `src/core/tastes.ts` içindeki değerlerle birebir aynı olmalı.
 */
const SYNONYMS: Array<{ words: string[]; keys: string[] }> = [
  /* sahne ve gösteri */
  { words: ['tiyatro', 'sahne', 'oyunculuk', 'oyuncu', 'drama', 'muzikal'], keys: ['dizi', 'dram'] },
  { words: ['sinema', 'film', 'yonetmen'], keys: ['dizi'] },
  { words: ['stand up', 'standup', 'komedyen', 'mizah'], keys: ['komedi'] },
  { words: ['anime', 'manga', 'cizgi film', 'cizgi'], keys: ['animasyon'] },
  { words: ['korku', 'korku filmi'], keys: ['gerilim'] },

  /* müzik çevresi */
  { words: ['gitar', 'piyano', 'bateri', 'davul', 'bas gitar', 'enstruman'], keys: ['muzik', 'rock'] },
  { words: ['konser', 'festival', 'sarki', 'sarki soylemek', 'koro'], keys: ['muzik'] },
  { words: ['arabesk', 'turk halk muzigi', 'thm', 'tsm'], keys: ['muzik', 'akustik'] },

  /* spor */
  { words: ['yuzme', 'yuzucu', 'havuz'], keys: ['fitness', 'spor'] },
  { words: ['bisiklet', 'bisiklete binmek'], keys: ['dogaspor', 'spor'] },
  { words: ['voleybol', 'hentbol', 'masa tenisi'], keys: ['spor'] },
  { words: ['satranc', 'briç', 'okey'], keys: ['oyun'] },
  { words: ['yoga', 'pilates', 'meditasyon'], keys: ['fitness'] },
  { words: ['dag', 'kamp', 'doga', 'trekking', 'yuruyus'], keys: ['dogaspor', 'seyahat'] },
  { words: ['balik', 'balikcilik', 'olta'], keys: ['dogaspor'] },
  { words: ['kayak', 'snowboard'], keys: ['dogaspor', 'spor'] },

  /* yaratıcı işler */
  { words: ['fotograf', 'fotografcilik', 'kamera'], keys: ['teknoloji', 'seyahat'] },
  { words: ['resim', 'cizim', 'boyama', 'sanat', 'muze', 'sergi'], keys: ['tarih', 'kitap'] },
  { words: ['yazmak', 'yazarlik', 'siir', 'roman', 'oyku'], keys: ['kitap'] },
  { words: ['dans', 'bale'], keys: ['muzik'] },

  /* teknoloji ve iş */
  { words: ['yazilim', 'kodlama', 'programlama', 'bilgisayar', 'yapay zeka'], keys: ['teknoloji'] },
  { words: ['borsa', 'hisse', 'yatirim', 'kripto', 'finans', 'ekonomi', 'bankacilik'], keys: ['is'] },
  { words: ['girisimcilik', 'pazarlama', 'satis', 'muhasebe'], keys: ['is', 'ofis'] },
  { words: ['telefon', 'oyun konsolu', 'playstation', 'xbox', 'pc'], keys: ['oyun', 'teknoloji'] },

  /* günlük hayat */
  /**
   * ⚠️ Tekil "yemek" de burada olmalı. Testte "lahmacun yemek" hiçbir şeye
   * bağlanmadı; tabloda yalnızca "yemek yapmak" vardı. Serbest metinde
   * insanlar kök kelimeyi yazıyor, tam öbeği değil.
   */
  { words: ['yemek', 'kahve', 'tatli', 'pasta', 'firin', 'yemek yapmak', 'mutfak', 'tarif', 'restoran', 'lokanta'], keys: ['yemek'] },
  { words: ['bahce', 'bitki', 'cicek'], keys: ['bilim'] },
  { words: ['kedi', 'kopek', 'hayvan', 'evcil hayvan'], keys: ['belgesel'] },
  { words: ['araba', 'motosiklet', 'motor', 'modifiye'], keys: ['otomobil'] },
  { words: ['tarih', 'osmanli', 'arkeoloji', 'antik'], keys: ['tarih', 'tarihi'] },
  { words: ['uzay', 'astronomi', 'gezegen', 'fizik', 'kimya', 'biyoloji'], keys: ['bilim'] },
  { words: ['gezmek', 'gezi', 'tatil', 'ulke', 'sehir gezisi', 'seyahat etmek'], keys: ['seyahat'] },
  { words: ['spor', 'spor yapmak', 'antrenman', 'egzersiz', 'salon'], keys: ['spor', 'fitness'] },
  { words: ['kitap okumak', 'okumak'], keys: ['kitap'] },
  { words: ['dizi izlemek', 'film izlemek', 'izlemek'], keys: ['dizi'] },
  { words: ['podcast', 'youtube', 'sosyal medya', 'instagram'], keys: ['sosyal'] },
  { words: ['felsefe', 'psikoloji', 'sosyoloji'], keys: ['kitap', 'akademik'] },
  { words: ['din', 'tasavvuf', 'mitoloji'], keys: ['kitap', 'tarih'] },
];

/**
 * Serbest metinden çıkarılan zevk anahtarları.
 *
 * Kelime sınırına bakıyor: "motor" yazan biri `otomobil` alsın ama
 * "motorsiklet" içinde geçen "motor" iki kez saymasın diye eşleşme
 * boşlukla çevrelenmiş metin üzerinde yapılıyor.
 */
export function keysFromNote(note: string | undefined): string[] {
  if (!note?.trim()) return [];
  const text = ` ${normalize(note)} `;
  const found = new Set<string>();

  for (const entry of SYNONYMS) {
    if (entry.words.some((w) => text.includes(` ${normalize(w)} `))) {
      for (const k of entry.keys) found.add(k);
    }
  }
  return [...found];
}

/**
 * Eşleşme bulunamadığında göreve gömülecek konu.
 *
 * *"Talk about tiyatro. What do you like about it?"* — kullanıcının kendi
 * kelimesiyle. Her kelimede çalışır ve hiçbir şey uydurmaz.
 *
 * `null` dönerse çağıran genel havuza düşer.
 */
export function noteSubject(note: string | undefined): string | null {
  const clean = note?.trim();
  if (!clean) return null;

  /**
   * Uzun metni göreve gömmek cümleyi bozuyor ("Talk about ben aslında
   * biraz tiyatro ve biraz da…"). İlk anlamlı öbeği alıyoruz: virgül veya
   * "ve" ile ayrılmış ilk parça, en fazla 4 kelime.
   */
  const first = clean.split(/[,;/]|\bve\b/i)[0].trim();
  const words = first.split(/\s+/).slice(0, 4).join(' ');
  return words.length >= 2 ? words : null;
}
