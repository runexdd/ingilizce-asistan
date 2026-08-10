/**
 * Uzantısız göreli `import`'ları `.ts`e çevirir.
 *
 * Neden var: `src/core/*` saf TypeScript ve ağa çıkmıyor, yani Node ile
 * doğrudan çalıştırılıp denetlenebilir — tarayıcı ya da Expo başlatmaya gerek
 * yok. Node'un `--experimental-strip-types` bayrağı TypeScript'i çalıştırıyor
 * ama `from './level'` gibi uzantısız yolları çözemiyor; bu kanca o boşluğu
 * kapatıyor.
 */
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (!specifier.startsWith('.')) throw error;
    try {
      return await next(specifier + '.ts', context);
    } catch {
      /** Klasör importu: `from './words'` → `./words/index.ts` */
      return next(specifier + '/index.ts', context);
    }
  }
}
