/**
 * Kelime deposunun kapısı — bütün seviyeler tek listede.
 *
 * Seviye dosyaları saf veri; burası onları düz bir `BankWord[]` hâline
 * getiriyor. Cetvel ve seçim mantığı `../wordbank.ts` içinde.
 */

import type { CEFRLevel } from '../level';
import { A1_WORDS } from './a1';
import { A2_WORDS } from './a2';
import { B1_WORDS } from './b1';
import { B2_WORDS } from './b2';
import type { Group, Row, WordKind } from './types';

export type { Group, Row, WordKind } from './types';

export interface BankWord {
  word: string;
  level: CEFRLevel;
  kind: WordKind;
  /** Türkçe karşılık — kartın ön yüzü */
  meaning: string;
  /** Seviyeye uygun kısa örnek; kart tanıştırma ekranı bunu gösterir */
  example: string;
}

function build(group: Group, level: CEFRLevel): BankWord[] {
  const out: BankWord[] = [];
  for (const [kind, rows] of Object.entries(group) as Array<[WordKind, Row[]]>) {
    for (const [word, meaning, example] of rows) {
      out.push({ word, level, kind, meaning, example });
    }
  }
  return out;
}

/** Bir seviyenin birden çok bloğu olabiliyor (A1: çekirdek + ek havuz). */
function buildAll(groups: Group | Group[], level: CEFRLevel): BankWord[] {
  return (Array.isArray(groups) ? groups : [groups]).flatMap((g) => build(g, level));
}

export const WORD_BANK: BankWord[] = [
  ...buildAll(A1_WORDS, 'A1'),
  ...buildAll(A2_WORDS, 'A2'),
  ...buildAll(B1_WORDS, 'B1'),
  ...buildAll(B2_WORDS, 'B2'),
];
