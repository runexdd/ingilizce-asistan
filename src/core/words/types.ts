/**
 * Kelime deposunun ortak tipleri.
 *
 * `src/core/words/` klasörü havuzun **veri merkezi**: her seviyenin listesi
 * kendi dosyasında, hiç mantık içermeden durur. Mantık (cetvel, arama, günün
 * seçimi) `../wordbank.ts` içinde.
 *
 * **Neden ayrıldı:** kelime havuzu üç kez temizlendi, üç kez sızıntı geri
 * geldi. Kullanıcının teşhisi: *"burası karışık, burayı 0'dan düzenleyelim,
 * bir veri merkezi de kurabiliriz, ileride de problem çıkarabilir."* Veri ile
 * mantık aynı dosyada durunca liste büyüdükçe her düzenleme mantığın içinden
 * geçiyordu. Ayrıldıklarında iki şey mümkün oldu: listeyi tek başına denetlemek
 * (`npm run kelime`) ve seviye listesini tek başına büyütmek.
 */

/**
 * Sözcük türü — günün listesinin dengesi buna göre kuruluyor.
 *
 * `sayı` ayrı bir tür: bağımsız denetimin (2026-08-11) bulduğu en büyük
 * eksik A1 havuzunda **tek bir sayının bile olmamasıydı.** Yaş, saat, fiyat,
 * telefon numarası — hepsi sayı ister; sayısız bir A1 kendini tanıtamaz.
 *
 * Neden `isim` altına konmadılar: on altı sayıyı isimlerin arasına atmak
 * günün dört kelimesinden ikisini sayı yapabilirdi. Ayrı tür olunca `MIX`
 * onlara küçük ve sabit bir pay veriyor — birkaç günde bir, tek tek gelirler.
 */
export type WordKind = 'isim' | 'fiil' | 'sıfat' | 'zarf' | 'kalıp' | 'sayı';

/** `[kelime, türkçe, örnek]` — tür, içinde bulunduğu gruptan gelir. */
export type Row = [string, string, string];

/** Bir seviyenin türlere ayrılmış listesi */
export type Group = Partial<Record<WordKind, Row[]>>;
