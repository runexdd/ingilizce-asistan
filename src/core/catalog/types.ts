/**
 * İçerik kataloğunun ortak tipi.
 *
 * Katalog **seviye seviye** büyütülüyor (`a1.ts`, `a2.ts`, …). Sebebi ölçülmüş
 * bir hataydı: katalog yatay büyütülünce her seviyede zevklerin çoğu boşta
 * kalıyordu ve uygulama sessizce tarafsız yedeğe düşüyordu. Kullanıcı bunu
 * "hobimi değiştirdim ama ekran değişmedi" diye görüyordu — kod doğruydu,
 * seçecek malzeme yoktu.
 *
 * Ölçüm (2026-08-10, düzeltmeden önce, 45 zevk anahtarı üzerinden):
 *
 *     seviye | izleme | dinleme
 *       A1   |  2/45  |  4/45
 *       A2   | 19/45  |  7/45
 *       B1   | 22/45  |  8/45
 *       B2   | 21/45  |  3/45
 *       C1   |  2/45  |  3/45
 *       C2   |  0/45  |  0/45
 *
 * Bir fazın kabul ölçütü: **o seviyede hiçbir zevk tarafsız yedeğe düşmemeli.**
 */

import type { ContentSuggestion } from '../../db/types';
import type { CEFRLevel } from '../level';

export interface CatalogItem {
  id: string;
  type: ContentSuggestion['type'];
  title: string;
  where: string;
  /** Gerçekten uygun olduğu seviyeler — zorlama yok */
  levels: CEFRLevel[];
  /** Hangi zevk anahtarlarına hitap ediyor (`src/core/tastes.ts`) */
  tastes: string[];
  /**
   * Tek cümlelik Türkçe gerekçe — "niye sana verildi".
   *
   * ⚠️ **Seçilmemiş bir zevki iddia etme.** Bir kez "Polisiye seviyorsun"
   * yazan öneri, polisiye seçmemiş kullanıcıya çıktı. Tarafsız yedeklerin
   * gerekçesi hiçbir zevk iddia etmez ve "bulamadım" der; kapsam ölçümü de
   * bu kelimeye bakarak boşluğu sayıyor.
   */
  why: string;
  instruction: string;
  /** İçeriğe girmeden önce bilinmesi iyi olan kelimeler */
  words: Array<{ word: string; meaning: string }>;
  watchFor: string[];
  /** Sohbette konuşulacak şeyin adı — "bölüm" / "şarkı" / "film" */
  noun: 'episode' | 'song' | 'video' | 'film';
}
