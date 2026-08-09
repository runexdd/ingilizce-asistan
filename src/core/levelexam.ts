/**
 * Seviye içi puanlama sınavı — **ikinci sınav**.
 *
 * ## Yerleştirme sınavından farkı
 *
 * `placement.ts` **hangi seviyede** olduğunu bulur: adaptiftir, bütün
 * seviyelerden soru sorar, cevaba göre yukarı-aşağı gezer.
 *
 * Bu dosya ise seviyeyi **bilerek** girer ve *o seviyenin içinde nerede
 * durduğunu* ölçer. Kullanıcının kuralı: *"ilk sınav seviye tespit, 2. sınav o
 * seviye için puanlama sistemi olmalı — A2 ama A2'de kaç puan? A2 80 puan,
 * B1'e yakın; veya A2 30 puan."*
 *
 * CEFR etiketi bir **aralıktır**, bir nokta değil. "B1" diyip iki kişiye aynı
 * içeriği vermek ikisini de yanlış yerden çalıştırmaktır: biri sıkılır, öteki
 * boğulur. Çıkan 0-100 puan (`profile.levelScore`) öğretmenin içerik, kelime
 * sayısı ve görev boyu seçerken baktığı asıl sayı olur.
 *
 * ## Beş beceri
 *
 * Kullanıcının istediği kapsam: *"o seviyenin kelimeleri, sıfat-fiil,
 * speaking, listening, writing."* Sınavda hepsi var:
 *
 * | Beceri | Nasıl ölçülür | Ağırlık |
 * |---|---|---|
 * | kelime | şık + boşluk doldurma | %25 |
 * | gramer | şık + boşluk (o seviyenin yapıları) | %25 |
 * | dinleme | cihaz cümleyi okur, metin görünmez, soru sorulur | %20 |
 * | yazma | kısa üretim, belirli kelimeler kullanılacak | %15 |
 * | konuşma | biri tekrar, biri serbest üretim (mikrofon) | %15 |
 *
 * ⚠️ **Yazma ve konuşma puanı kabadır.** Uygulama uzunluk, hedef kelime
 * kullanımı ve yerel hata kontrolüne bakabilir; üslup ve doğallık yargısı
 * öğretmenindir. Cevaplar ham hâlde öğretmene gider, o puanı düzeltir. Ürünün
 * baştan beri koyduğu ayrım burada da geçerli: **uygulama ölçer, öğretmen
 * yargılar.**
 *
 * Saf TypeScript: ağ ve React yok, node ile sınanabilir.
 */

import { checkInstant } from './instantcheck';
import { LEVELS, toLevel, type CEFRLevel } from './level';
import type { LevelExamSkill, LevelExamSkillScore } from '../db/types';

export type LevelExamFormat = 'choice' | 'fill' | 'listen' | 'write' | 'speak';

interface BaseItem {
  id: string;
  level: CEFRLevel;
  skill: LevelExamSkill;
  /** Ekranda görünen soru/talimat */
  prompt: string;
}

export interface ChoiceItem extends BaseItem {
  format: 'choice';
  options: string[];
  answerIndex: number;
}

export interface FillItem extends BaseItem {
  format: 'fill';
  accept: string[];
  hint?: string;
}

/** Dinleme — cihaz `audio`'yu okur, kullanıcı metni GÖRMEZ */
export interface ListenItem extends BaseItem {
  format: 'listen';
  audio: string;
  options: string[];
  answerIndex: number;
}

/** Yazma — kısa üretim */
export interface WriteItem extends BaseItem {
  format: 'write';
  /** Cevapta geçmesi istenen kelimeler */
  mustUse: string[];
  minWords: number;
}

/**
 * Konuşma. İki türü var:
 *  - `target` varsa **tekrar**: cümleyi sesli oku, tanınan metinle karşılaştır.
 *  - `target` yoksa **üretim**: soruya kendi cümlelerinle cevap ver.
 */
export interface SpeakItem extends BaseItem {
  format: 'speak';
  target?: string;
  mustUse?: string[];
  minWords?: number;
}

export type LevelExamItem =
  | ChoiceItem
  | FillItem
  | ListenItem
  | WriteItem
  | SpeakItem;

export const SKILL_LABELS: Record<LevelExamSkill, string> = {
  vocabulary: 'Kelime',
  grammar: 'Gramer',
  listening: 'Dinleme',
  writing: 'Yazma',
  speaking: 'Konuşma',
};

/** Beceri ağırlıkları — toplamı 1 */
const WEIGHTS: Record<LevelExamSkill, number> = {
  vocabulary: 0.25,
  grammar: 0.25,
  listening: 0.2,
  writing: 0.15,
  speaking: 0.15,
};

/* ==================================================================== havuz
 *
 * Her seviyede 12 soru. Kelime ve gramer o seviyenin **kendi** malzemesinden
 * seçildi (Cambridge English Vocabulary Profile seviye etiketleri esas alındı);
 * bir üst seviyenin yapısı bilerek konmadı — burada ölçülen şey "bu seviyeyi
 * ne kadar iyi biliyorsun", "bir üstünü kaldırıyor musun" değil.
 */
export const LEVEL_EXAM_BANK: LevelExamItem[] = [
  /* ================================ A1 ================================ */
  { id: 'xa1v1', level: 'A1', skill: 'vocabulary', format: 'choice', prompt: 'We keep milk in the ___.', options: ['oven', 'fridge', 'sink', 'shelf'], answerIndex: 1 },
  { id: 'xa1v2', level: 'A1', skill: 'vocabulary', format: 'choice', prompt: 'My brother is very ___. He never sits down.', options: ['busy', 'slow', 'quiet', 'tired'], answerIndex: 0 },
  { id: 'xa1v3', level: 'A1', skill: 'vocabulary', format: 'fill', prompt: 'Türkçe: "Kız kardeşim öğretmen." → İngilizce:', accept: ['my sister is a teacher'] },
  { id: 'xa1v4', level: 'A1', skill: 'vocabulary', format: 'choice', prompt: "The opposite of 'cheap' is ___.", options: ['expensive', 'small', 'old', 'easy'], answerIndex: 0 },
  { id: 'xa1g1', level: 'A1', skill: 'grammar', format: 'choice', prompt: 'There ___ two chairs in the room.', options: ['is', 'are', 'be', 'am'], answerIndex: 1 },
  { id: 'xa1g2', level: 'A1', skill: 'grammar', format: 'fill', prompt: 'He ___ (not / like) fish.', accept: ["doesn't like", 'does not like'], hint: 'iki kelime' },
  { id: 'xa1g3', level: 'A1', skill: 'grammar', format: 'choice', prompt: 'This is ___ book.', options: ['I', 'me', 'my', 'mine'], answerIndex: 2 },
  { id: 'xa1l1', level: 'A1', skill: 'listening', format: 'listen', audio: 'My name is Anna. I live in a small house near the park.', prompt: 'Where does she live?', options: ['Near the park', 'Near the school', 'In a big city', 'Near the sea'], answerIndex: 0 },
  { id: 'xa1l2', level: 'A1', skill: 'listening', format: 'listen', audio: 'The shop opens at nine and closes at six.', prompt: 'When does the shop close?', options: ['At nine', 'At six', 'At five', 'At ten'], answerIndex: 1 },
  { id: 'xa1w1', level: 'A1', skill: 'writing', format: 'write', prompt: 'Kendini tanıt: adın, nerede yaşadığın ve ne yaptığın. 2-3 cümle.', mustUse: ['live', 'work'], minWords: 12 },
  { id: 'xa1s1', level: 'A1', skill: 'speaking', format: 'speak', prompt: 'Bu cümleyi sesli oku:', target: 'I get up at seven every morning.' },
  { id: 'xa1s2', level: 'A1', skill: 'speaking', format: 'speak', prompt: 'Sesli cevapla: What do you do on Sunday?', mustUse: ['I'], minWords: 8 },

  /* ================================ A2 ================================ */
  { id: 'xa2v1', level: 'A2', skill: 'vocabulary', format: 'choice', prompt: 'I was very ___ after the long flight.', options: ['exhausted', 'excited', 'careful', 'polite'], answerIndex: 0 },
  { id: 'xa2v2', level: 'A2', skill: 'vocabulary', format: 'choice', prompt: 'We ___ up staying at home because of the rain.', options: ['ended', 'finished', 'closed', 'stopped'], answerIndex: 0 },
  { id: 'xa2v3', level: 'A2', skill: 'vocabulary', format: 'fill', prompt: 'Türkçe: "Toplantıya geç kaldım." → İngilizce:', accept: ['i was late for the meeting', "i'm late for the meeting", 'i am late for the meeting'] },
  { id: 'xa2v4', level: 'A2', skill: 'vocabulary', format: 'choice', prompt: 'She ___ that something was wrong.', options: ['noticed', 'looked', 'watched', 'searched'], answerIndex: 0 },
  { id: 'xa2g1', level: 'A2', skill: 'grammar', format: 'choice', prompt: 'This is the ___ film I have ever seen.', options: ['good', 'better', 'best', 'well'], answerIndex: 2 },
  { id: 'xa2g2', level: 'A2', skill: 'grammar', format: 'fill', prompt: 'While I ___ (walk) home, I met an old friend.', accept: ['was walking'], hint: 'iki kelime' },
  { id: 'xa2g3', level: 'A2', skill: 'grammar', format: 'choice', prompt: 'We arrived ___ the airport at six.', options: ['to', 'at', 'in', 'on'], answerIndex: 1 },
  { id: 'xa2l1', level: 'A2', skill: 'listening', format: 'listen', audio: 'I usually take the bus to work, but yesterday I walked because the weather was nice.', prompt: 'How did the speaker go to work yesterday?', options: ['By bus', 'On foot', 'By car', 'By train'], answerIndex: 1 },
  { id: 'xa2l2', level: 'A2', skill: 'listening', format: 'listen', audio: 'The concert starts at eight, but we should get there by half past seven to find good seats.', prompt: 'When should they arrive?', options: ['At eight', 'At half past seven', 'At seven', 'At half past eight'], answerIndex: 1 },
  { id: 'xa2w1', level: 'A2', skill: 'writing', format: 'write', prompt: 'Geçen hafta sonu ne yaptığını anlat. Geçmiş zaman kullan, 3-4 cümle.', mustUse: ['went', 'because'], minWords: 25 },
  { id: 'xa2s1', level: 'A2', skill: 'speaking', format: 'speak', prompt: 'Bu cümleyi sesli oku:', target: 'I ended up staying at home because I was exhausted.' },
  { id: 'xa2s2', level: 'A2', skill: 'speaking', format: 'speak', prompt: 'Sesli cevapla: What did you do yesterday evening?', mustUse: ['I'], minWords: 15 },

  /* ================================ B1 ================================ */
  { id: 'xb1v1', level: 'B1', skill: 'vocabulary', format: 'choice', prompt: 'The company decided to ___ the launch until next year.', options: ['put off', 'put on', 'take off', 'give up'], answerIndex: 0 },
  { id: 'xb1v2', level: 'B1', skill: 'vocabulary', format: 'choice', prompt: 'His explanation was ___; nobody understood it.', options: ['confusing', 'confused', 'confidence', 'confuse'], answerIndex: 0 },
  { id: 'xb1v3', level: 'B1', skill: 'vocabulary', format: 'fill', prompt: 'I need to ___ out how this system works. (çözmek)', accept: ['figure', 'work'], hint: 'tek kelime' },
  { id: 'xb1v4', level: 'B1', skill: 'vocabulary', format: 'fill', prompt: 'Türkçe: "Buna değdi." → İngilizce:', accept: ['it was worth it', 'it was worth it.'] },
  { id: 'xb1g1', level: 'B1', skill: 'grammar', format: 'choice', prompt: 'She told me that she ___ the report already.', options: ['finishes', 'had finished', 'finish', 'will finish'], answerIndex: 1 },
  { id: 'xb1g2', level: 'B1', skill: 'grammar', format: 'fill', prompt: 'The email ___ (send) yesterday afternoon.', accept: ['was sent'], hint: 'edilgen, iki kelime' },
  { id: 'xb1g3', level: 'B1', skill: 'grammar', format: 'choice', prompt: 'I would call him if I ___ his number.', options: ['know', 'knew', 'have known', 'will know'], answerIndex: 1 },
  { id: 'xb1l1', level: 'B1', skill: 'listening', format: 'listen', audio: 'We had planned to meet on Friday, but since Tom was away on business, we moved it to Monday morning.', prompt: 'When will they meet?', options: ['Friday', 'Monday morning', 'Monday evening', 'They cancelled it'], answerIndex: 1 },
  { id: 'xb1l2', level: 'B1', skill: 'listening', format: 'listen', audio: 'The training was useful, although it lasted much longer than I had expected.', prompt: 'What does the speaker think about the training?', options: ['It was useful but too long', 'It was useless', 'It was short and useful', 'It was cancelled'], answerIndex: 0 },
  { id: 'xb1w1', level: 'B1', skill: 'writing', format: 'write', prompt: 'Bir arkadaşına, bu hafta çok yoğun olduğun için buluşmayı erteleme mesajı yaz. Kibar ol, sebebini açıkla. 5-6 cümle.', mustUse: ['because', 'would'], minWords: 45 },
  { id: 'xb1s1', level: 'B1', skill: 'speaking', format: 'speak', prompt: 'Bu cümleyi sesli oku:', target: 'I have been working on this project since March.' },
  { id: 'xb1s2', level: 'B1', skill: 'speaking', format: 'speak', prompt: 'Sesli cevapla: Describe a film or series you watched recently and say why you liked it.', mustUse: ['because'], minWords: 25 },

  /* ================================ B2 ================================ */
  { id: 'xb2v1', level: 'B2', skill: 'vocabulary', format: 'choice', prompt: 'The two studies ___ each other, so we cannot draw a firm conclusion.', options: ['contradict', 'complement', 'confirm', 'convey'], answerIndex: 0 },
  { id: 'xb2v2', level: 'B2', skill: 'vocabulary', format: 'choice', prompt: 'He was reluctant to ___ responsibility for the failure.', options: ['take on', 'take off', 'take up', 'take in'], answerIndex: 0 },
  { id: 'xb2v3', level: 'B2', skill: 'vocabulary', format: 'fill', prompt: 'The results were ___ (misleading) — they suggested a trend that did not exist.', accept: ['misleading'], hint: 'tek kelime' },
  { id: 'xb2v4', level: 'B2', skill: 'vocabulary', format: 'fill', prompt: 'Türkçe: "Uzun vadede işe yaramadı." → İngilizce:', accept: ["it didn't work in the long run", 'it did not work in the long run', "in the long run it didn't work"] },
  { id: 'xb2g1', level: 'B2', skill: 'grammar', format: 'choice', prompt: 'Had we known about the delay, we ___ differently.', options: ['would act', 'would have acted', 'had acted', 'will act'], answerIndex: 1 },
  { id: 'xb2g2', level: 'B2', skill: 'grammar', format: 'fill', prompt: 'The candidate ___ (whose / who) references we checked withdrew her application.', accept: ['whose'], hint: 'tek kelime' },
  { id: 'xb2g3', level: 'B2', skill: 'grammar', format: 'choice', prompt: 'She insisted on ___ the bill herself.', options: ['pay', 'to pay', 'paying', 'paid'], answerIndex: 2 },
  { id: 'xb2l1', level: 'B2', skill: 'listening', format: 'listen', audio: 'While the proposal looks attractive on paper, its main weakness is that it assumes funding will continue at the current level.', prompt: 'What is the weakness of the proposal?', options: ['It costs too much', 'It assumes funding stays the same', 'It is too short', 'It has no budget'], answerIndex: 1 },
  { id: 'xb2l2', level: 'B2', skill: 'listening', format: 'listen', audio: 'I would not go so far as to say the campaign failed, but it certainly fell short of what we had hoped for.', prompt: "What is the speaker's view?", options: ['The campaign completely failed', 'The campaign was a full success', 'It did less well than hoped', 'The campaign has not started'], answerIndex: 2 },
  { id: 'xb2w1', level: 'B2', skill: 'writing', format: 'write', prompt: 'Uzaktan çalışmanın bir avantajını ve bir dezavantajını anlat, sonra kendi görüşünü söyle. 7-9 cümle.', mustUse: ['however', 'although'], minWords: 80 },
  { id: 'xb2s1', level: 'B2', skill: 'speaking', format: 'speak', prompt: 'Bu cümleyi sesli oku:', target: 'Although the results were promising, the sample was far too small.' },
  { id: 'xb2s2', level: 'B2', skill: 'speaking', format: 'speak', prompt: 'Sesli cevapla: Some people say social media does more harm than good. What do you think?', mustUse: ['however'], minWords: 40 },

  /* ================================ C1 ================================ */
  { id: 'xc1v1', level: 'C1', skill: 'vocabulary', format: 'choice', prompt: 'The evidence was ___ at best — hardly enough for such a claim.', options: ['tenuous', 'robust', 'exhaustive', 'blatant'], answerIndex: 0 },
  { id: 'xc1v2', level: 'C1', skill: 'vocabulary', format: 'choice', prompt: 'The policy had the ___ effect of raising the very costs it aimed to cut.', options: ['deliberate', 'paradoxical', 'marginal', 'inevitable'], answerIndex: 1 },
  { id: 'xc1v3', level: 'C1', skill: 'vocabulary', format: 'fill', prompt: 'His answer was deliberately ___ (belirsiz), leaving room for several readings.', accept: ['ambiguous', 'vague'], hint: 'tek kelime' },
  { id: 'xc1v4', level: 'C1', skill: 'vocabulary', format: 'fill', prompt: 'Türkçe: "Söylediklerini biraz şüpheyle karşıla." → İngilizce (deyim):', accept: ['take what he says with a pinch of salt', 'take what he says with a grain of salt', 'take it with a pinch of salt', 'take it with a grain of salt'] },
  { id: 'xc1g1', level: 'C1', skill: 'grammar', format: 'choice', prompt: 'It is essential that every form ___ before Friday.', options: ['is submitted', 'be submitted', 'will be submitted', 'submits'], answerIndex: 1 },
  { id: 'xc1g2', level: 'C1', skill: 'grammar', format: 'fill', prompt: 'Not only ___ he apologise, but he also offered to pay.', accept: ['did'], hint: 'tek kelime' },
  { id: 'xc1g3', level: 'C1', skill: 'grammar', format: 'choice', prompt: '___ having been warned twice, he carried on.', options: ['Despite', 'Although', 'However', 'In spite'], answerIndex: 0 },
  { id: 'xc1l1', level: 'C1', skill: 'listening', format: 'listen', audio: 'The author concedes that the reform brought short-term gains, yet insists these came at the cost of long-term stability.', prompt: "What is the author's position?", options: ['Fully supportive', 'Critical, while admitting some benefits', 'Neutral', 'Only interested in the short term'], answerIndex: 1 },
  { id: 'xc1l2', level: 'C1', skill: 'listening', format: 'listen', audio: 'Far from settling the debate, the new figures have if anything made both camps more entrenched.', prompt: 'What effect did the new figures have?', options: ['They ended the debate', 'They hardened both sides', 'They changed everyone\'s mind', 'They were ignored'], answerIndex: 1 },
  { id: 'xc1w1', level: 'C1', skill: 'writing', format: 'write', prompt: 'Bir kararın kısa vadede işe yarayıp uzun vadede zarar verdiği bir durumu anlat ve değerlendir. 10-12 cümle.', mustUse: ['whereas', 'arguably'], minWords: 110 },
  { id: 'xc1s1', level: 'C1', skill: 'speaking', format: 'speak', prompt: 'Bu cümleyi sesli oku:', target: 'Rarely have I seen an argument put so persuasively.' },
  { id: 'xc1s2', level: 'C1', skill: 'speaking', format: 'speak', prompt: 'Sesli cevapla: To what extent should companies be responsible for their employees\' wellbeing?', mustUse: ['whereas'], minWords: 55 },

  /* ================================ C2 ================================ */
  { id: 'xc2v1', level: 'C2', skill: 'vocabulary', format: 'choice', prompt: 'His apology struck many as ___ — polished, but hollow.', options: ['perfunctory', 'heartfelt', 'candid', 'impromptu'], answerIndex: 0 },
  { id: 'xc2v2', level: 'C2', skill: 'vocabulary', format: 'choice', prompt: 'Her prose is admired for its ___: not a word is wasted.', options: ['verbosity', 'economy', 'ambiguity', 'ornamentation'], answerIndex: 1 },
  { id: 'xc2v3', level: 'C2', skill: 'vocabulary', format: 'fill', prompt: 'The committee was accused of ___ (bulandırmak) the issue rather than confronting it.', accept: ['obfuscating', 'muddying'], hint: 'tek kelime' },
  { id: 'xc2v4', level: 'C2', skill: 'vocabulary', format: 'fill', prompt: 'Türkçe: "Bu iş bana hiç uygun değil." → İngilizce (doğal söyleyiş):', accept: ['this is not my cup of tea', "this isn't my cup of tea", 'this job is not for me', "this job isn't for me"] },
  { id: 'xc2g1', level: 'C2', skill: 'grammar', format: 'choice', prompt: '___ it not for her intervention, the project would have collapsed.', options: ['Was', 'Were', 'Had', 'Is'], answerIndex: 1 },
  { id: 'xc2g2', level: 'C2', skill: 'grammar', format: 'fill', prompt: 'Under no circumstances ___ you share this file.', accept: ['should', 'must'], hint: 'tek kelime' },
  { id: 'xc2g3', level: 'C2', skill: 'grammar', format: 'choice', prompt: 'So ___ was her argument that nobody objected.', options: ['convincing', 'convinced', 'convince', 'convincingly'], answerIndex: 0 },
  { id: 'xc2l1', level: 'C2', skill: 'listening', format: 'listen', audio: 'For all its rhetorical flourish, the speech offered little in the way of substance; those hoping for firm commitments left much as they had arrived.', prompt: 'What does the speaker imply?', options: ['It was eloquent but empty', 'It was badly delivered', 'It exceeded expectations', 'It was full of detail'], answerIndex: 0 },
  { id: 'xc2l2', level: 'C2', skill: 'listening', format: 'listen', audio: 'It would be disingenuous to present the outcome as a triumph when the original targets were quietly abandoned halfway through.', prompt: 'Why does the speaker object to calling it a triumph?', options: ['The targets were dropped along the way', 'Nobody measured the outcome', 'The project never started', 'It cost too much'], answerIndex: 0 },
  { id: 'xc2w1', level: 'C2', skill: 'writing', format: 'write', prompt: 'Yaygın kabul gören bir görüşü ele al ve nüanslı biçimde çürüt. 10-14 cümle.', mustUse: ['ostensibly', 'notwithstanding'], minWords: 130 },
  { id: 'xc2s1', level: 'C2', skill: 'speaking', format: 'speak', prompt: 'Bu cümleyi sesli oku:', target: 'Seldom has a decision provoked such fierce and sustained debate.' },
  { id: 'xc2s2', level: 'C2', skill: 'speaking', format: 'speak', prompt: 'Sesli cevapla: Is objectivity in journalism possible, or merely an ideal?', mustUse: ['notwithstanding'], minWords: 65 },
];

/** Bir seviyenin soruları — sınav ekranı bunu kullanır */
export function itemsForLevel(level: string): LevelExamItem[] {
  const target = toLevel(level);
  const items = LEVEL_EXAM_BANK.filter((i) => i.level === target);
  /**
   * Sıra sabit tutuluyor: kelime → gramer → dinleme → yazma → konuşma.
   * Zor olanı (üretim) sona bırakmak, sınavı yarıda bıraktırmıyor; en kolay
   * sorularla başlamak da ısınma sağlıyor.
   */
  const order: LevelExamSkill[] = [
    'vocabulary',
    'grammar',
    'listening',
    'writing',
    'speaking',
  ];
  return [...items].sort(
    (a, b) => order.indexOf(a.skill) - order.indexOf(b.skill)
  );
}

export function hasExamFor(level: string): boolean {
  return itemsForLevel(level).length > 0;
}

/* ------------------------------------------------------------ puanlama */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

/** Hedef kelimelerden kaçı cevapta geçmiş — 0..1 */
function coverage(answer: string, mustUse: string[]): number {
  if (mustUse.length === 0) return 1;
  const text = ` ${normalize(answer)} `;
  const hit = mustUse.filter((w) => text.includes(` ${normalize(w)} `)).length;
  return hit / mustUse.length;
}

/**
 * Tekrar sorusunun puanı: söylenen cümle hedefe ne kadar yakın.
 *
 * Kelime kesişimi kullanılıyor, birebir eşleşme değil — konuşma tanıma
 * noktalama koymuyor ve bazı kelimeleri kaçırıyor. Birebir istemek herkesi
 * sıfırlardı.
 */
export function repeatScore(transcript: string, target: string): number {
  const said = new Set(words(transcript));
  const want = words(target);
  if (want.length === 0) return 0;
  const hit = want.filter((w) => said.has(w)).length;
  return Math.round((hit / want.length) * 100);
}

/**
 * Yazma/serbest konuşma cevabının **kaba** puanı.
 *
 * Üç şeye bakar: yeterince uzun mu, istenen kelimeler geçmiş mi, yerel
 * kurallarla yakalanan kesin hata var mı. Üslup ve doğallık **ölçülmez** —
 * onu öğretmen puanlar ve `levelScore`'u günceller.
 *
 * `spoken: true` ise noktalama ve büyük harf cezası uygulanmaz; konuşma
 * tanıma zaten nokta koymuyor, koymadı diye puan kırmak haksızlık olur.
 */
export function productionScore(
  answer: string,
  options: { mustUse?: string[]; minWords?: number; spoken?: boolean }
): number {
  const text = answer.trim();
  if (!text) return 0;

  const count = words(text).length;
  const min = options.minWords ?? 10;

  // Uzunluk: hedefin altındaysa oransal, üstündeyse tam puan
  const lengthRatio = Math.min(1, count / min);

  const cover = coverage(text, options.mustUse ?? []);

  const notes = checkInstant(text, {}).filter((n) => {
    if (n.severity !== 'sure') return false;
    if (options.spoken && (n.kind === 'punctuation' || n.kind === 'spelling')) {
      return false;
    }
    return true;
  });
  // 100 kelimede kaç kesin hata — yoğunluğa bak, sayıya değil
  const density = (notes.length / Math.max(count, 1)) * 100;
  const errorPenalty = Math.min(35, Math.round(density * 4));

  const base = lengthRatio * 60 + cover * 40;
  return Math.max(0, Math.min(100, Math.round(base - errorPenalty)));
}

export interface ExamAnswer {
  item: LevelExamItem;
  /** Şıklı sorularda seçilen sıra */
  index?: number;
  /** Yazılan/söylenen metin */
  text?: string;
  via?: 'mic' | 'text';
}

export interface LevelExamScoring {
  score: number;
  skills: LevelExamSkillScore[];
  weakest: LevelExamSkill | null;
}

/** Tek bir cevabın 0-100 puanı */
export function scoreAnswer(answer: ExamAnswer): number {
  const { item } = answer;
  switch (item.format) {
    case 'choice':
    case 'listen':
      return answer.index === item.answerIndex ? 100 : 0;

    case 'fill': {
      const given = normalize(answer.text ?? '');
      if (!given) return 0;
      if (item.accept.some((a) => normalize(a) === given)) return 100;
      // Tek harf farkı (yazım hatası) yarım puan alsın — bilgi var, parmak kaymış
      const close = item.accept.some((a) => {
        const target = normalize(a);
        return (
          Math.abs(target.length - given.length) <= 1 &&
          target.length > 3 &&
          [...target].filter((c, i) => c !== given[i]).length <= 1
        );
      });
      return close ? 50 : 0;
    }

    case 'write':
      return productionScore(answer.text ?? '', {
        mustUse: item.mustUse,
        minWords: item.minWords,
      });

    case 'speak':
      if (item.target) return repeatScore(answer.text ?? '', item.target);
      return productionScore(answer.text ?? '', {
        mustUse: item.mustUse,
        minWords: item.minWords,
        spoken: true,
      });
  }
}

/**
 * Sınavın tamamını puanlar.
 *
 * Beceri başına ortalama alınır, sonra ağırlıklarla toplanır. Sorulmayan bir
 * beceri varsa (havuzda yoksa) ağırlığı kalanlara dağıtılır — yoksa o beceri
 * sıfır sayılıp puan haksız yere düşerdi.
 */
export function scoreExam(answers: ExamAnswer[]): LevelExamScoring {
  const skills: LevelExamSkillScore[] = [];

  for (const skill of Object.keys(WEIGHTS) as LevelExamSkill[]) {
    const subset = answers.filter((a) => a.item.skill === skill);
    if (subset.length === 0) continue;
    const total = subset.reduce((sum, a) => sum + scoreAnswer(a), 0);
    skills.push({
      skill,
      score: Math.round(total / subset.length),
      total: subset.length,
    });
  }

  const weightSum = skills.reduce((sum, s) => sum + WEIGHTS[s.skill], 0);
  const score =
    weightSum === 0
      ? 0
      : Math.round(
          skills.reduce((sum, s) => sum + s.score * WEIGHTS[s.skill], 0) / weightSum
        );

  /**
   * "En zayıf beceri" ancak **gerçekten ayrışıyorsa** söylenir.
   *
   * Hepsi 100 alan birine "en zayıfın kelime" demek yanlış bilgi olur;
   * `reduce` eşitlikte ilk sıradakini seçtiği için tam da bu oluyordu.
   * 10 puandan az fark gürültüdür, isim verilmez.
   */
  const lowest = skills.reduce(
    (min, s) => (s.score < min.score ? s : min),
    skills[0]
  );
  const highest = skills.reduce(
    (max, s) => (s.score > max.score ? s : max),
    skills[0]
  );
  const weakest =
    skills.length === 0 || highest.score - lowest.score < 10 ? null : lowest.skill;

  return { score, skills, weakest };
}

/**
 * Puanın Türkçe karşılığı.
 *
 * Kullanıcının istediği ifade tam olarak buydu: *"A2 80 puan, B1'e yakın."*
 * Çıplak sayı bir şey anlatmıyor; sayının **ne demek olduğu** yazılmalı.
 */
export function describeLevelScore(level: string, score: number | undefined): string {
  if (score === undefined) return 'Seviye içi puanın henüz ölçülmedi';

  const current = toLevel(level);
  const index = LEVELS.indexOf(current);
  const next = index < LEVELS.length - 1 ? LEVELS[index + 1] : null;

  if (score >= 80) {
    return next
      ? `${current} seviyesinin üst ucundasın — ${next}'e yakınsın`
      : `${current} seviyesini sağlam kullanıyorsun`;
  }
  if (score >= 60) return `${current} seviyesinin üst yarısındasın`;
  if (score >= 40) return `${current} seviyesinin ortasındasın`;
  if (score >= 20) return `${current} seviyesinin başındasın`;
  return `${current} seviyesine yeni giriyorsun`;
}
