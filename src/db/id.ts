/**
 * Kimlik üretici.
 *
 * `store.tsx` içindeydi ama orası React Native'e bağlı; kimlik üretmek için
 * bütün depoyu yüklemek gerekiyordu ve `mutations.ts` bu yüzden `node` ile
 * test edilemiyordu. Saf olan parçayı ayırmak, kart kuyruğu gibi mantığın
 * gerçek kodla sınanabilmesini sağlıyor.
 */

let counter = 0;

export function newId(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}
