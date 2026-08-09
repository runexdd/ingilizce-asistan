# Bu proje Expo SDK 56 kullanıyor

`package.json` → `expo: ~56.0.19`, `expo-router: ~56.2.18`, `react-native: 0.85.3`.

Kod yazmadan önce **sürüme uygun** dokümana bak:
https://docs.expo.dev/versions/v56.0.0/

> Daha önce burada v57 yazıyordu; proje 56'da olduğu için yanlış sürümün
> dokümanına bakılmasına yol açıyordu. Sürümü yükseltirsen bu satırı da güncelle.

## Tekrarlanmaması gereken kararlar

- **Expo Go kullanılamıyor.** Kullanıcının iPhone'undaki sürüm SDK 56'yı
  desteklemiyor. Ana yol web/PWA (GitHub Pages).
- **expo-sqlite yok.** Web'de tarayıcıyı donduruyordu. Tüm veri AsyncStorage
  üzerinde tek bir JSON belgesi: `src/db/store.tsx`.
- **Gist API'sine PowerShell'den gidilmez.** Türkçe karakterleri bozup 422
  aldırıyor. Her zaman `node scripts/sync.mjs pull|push|status`.
- **Ağ erişimi sadece `src/sync/` ve `src/core/dictionary.ts` içinde olur.**
  `planner.ts`, `srs.ts`, `placement.ts` saf TypeScript kalmalı ki uygulama
  internetsiz de çalışsın.
- Yeni rota eklendiğinde `npx expo start`'ı kısa süre çalıştır, yoksa
  `.expo/types/router.d.ts` eskiyip `tsc` hata verir.
