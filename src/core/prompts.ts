/**
 * Yedek konuşma ve yazma görevleri — **seviyeye göre, her gün değişen.**
 *
 * Asıl görevleri öğretmen gönderir (`suggestedTasks`); burası senkron
 * yapılmamışken devreye giren yedek. Önce her ikisi de tek bir sabit cümleydi:
 * *"Talk for about 45 seconds: What did you do today?"* — hem her gün aynıydı
 * hem seviyeyi hiç dikkate almıyordu. Kullanıcının isteği: *"her gün
 * yenilenecek şekilde seviyeye uygun reading, speaking, kelimeler kısmı
 * oluştur ki B1'e çekince B1'e uygun gelsin."*
 *
 * Soruların zorluğu seviyeyle birlikte **düşünce olarak** da artıyor: A1'de
 * somut ve şimdiki zaman, A2'de geçmiş anlatımı, B1'de sebep-sonuç ve görüş,
 * B2'de soyutlama ve karşı argüman, C1'de nüans.
 *
 * Saf TypeScript — ağ yok.
 */

import { dayNumber } from './reading';
import { LEVELS, levelIndex, type CEFRLevel } from './level';

type PromptSet = Record<CEFRLevel, string[]>;

/** Konuşma görevleri — süre çağıran tarafta `LEVEL_SPEC`'ten eklenir. */
const SPEAKING: PromptSet = {
  A1: [
    'Describe your morning today. What did you eat and drink?',
    'Talk about your family. Who lives with you?',
    'Describe the room you are in right now.',
    'What do you do every Saturday? Say three things.',
    'Talk about your favourite food. Why do you like it?',
    'Describe your way to work or school.',
    'Talk about a person you see every day.',
    'What is the weather like today? Do you like it?',
  ],
  A2: [
    'Tell me about the last time you travelled somewhere. Where did you go and what happened?',
    'Describe a problem you had this week and how you solved it.',
    'Talk about a person who helped you recently. What did they do?',
    'Describe your last holiday. What was the best part?',
    'What did you do last weekend? Say what you enjoyed and what you did not.',
    'Talk about something you bought recently. Was it worth the money?',
    'Describe a place in your city that you like. Why do you go there?',
    'Tell me about a day when everything went wrong.',
  ],
  B1: [
    'Do you prefer working alone or in a team? Explain your reasons.',
    'Some people say social media wastes time. What do you think, and why?',
    'Describe a decision you made this year. Would you make it again?',
    'What is the hardest part of your job, and how do you deal with it?',
    'Is it better to save money or to spend it on experiences? Explain.',
    'Describe a habit you would like to change. Why is it difficult?',
    'Talk about a piece of advice you were given. Did you follow it?',
    'How has the way people work changed in the last few years?',
  ],
  B2: [
    'Some companies now measure everything their employees do. What are the risks of this?',
    'Is it possible to be genuinely objective about a subject you care about? Explain.',
    'Argue against a position you personally agree with. Make the strongest case you can.',
    'Should financial education be compulsory in schools? Defend your view.',
    'Describe a situation where the obvious solution turned out to be wrong.',
    'How much should convenience cost us? Use an example from your own life.',
    'Talk about a widely held belief in your field that you think is mistaken.',
    'When is it better to change your mind slowly rather than all at once?',
  ],
  C1: [
    'To what extent do the numbers an organisation measures end up shaping its behaviour?',
    'Discuss the difference between being understood and being precise. Which matters more, and when?',
    'Some argue expertise is overrated because confidence and accuracy are unrelated. Respond.',
    'Explain a complex idea from your work to someone outside it, without simplifying it dishonestly.',
    'Is cultural change in an organisation possible without changing incentives? Argue your case.',
    'Describe a trade-off that most people in your field refuse to acknowledge.',
  ],
  C2: [
    'Defend a position you find intellectually convincing but emotionally unappealing.',
    'Discuss where the language of economics helps thinking and where it quietly distorts it.',
    'Explore the idea that fluency is mainly tolerance of imperfection under time pressure.',
    'What is lost when a difficult idea is made accessible? Use concrete examples.',
    'Argue that a familiar virtue in your profession is, in practice, often a vice.',
    'Discuss whether judgement can survive in a system that rewards only what it can count.',
  ],
};

/** Yazma görevleri — cümle sayısı çağıran tarafta ekleniyor. */
const WRITING: PromptSet = {
  A1: [
    'Write about your day today.',
    'Write about your best friend.',
    'Write about the food you eat in the morning.',
    'Write about your home.',
    'Write about what you do after work.',
    'Write about a person in your family.',
    'Write about your favourite day of the week.',
    'Write about the weather this week.',
  ],
  A2: [
    'Write about one thing that happened to you this week.',
    'Write about a place you visited and what you did there.',
    'Write about a small problem you had and how you fixed it.',
    'Write about something you learned recently.',
    'Write about your last weekend. Use past simple.',
    'Write about a plan you have for next month. Use "going to".',
    'Compare two places you know. Which one do you prefer, and why?',
    'Write about a purchase you regret.',
  ],
  B1: [
    'Write about a decision you made this year and what happened afterwards.',
    'Describe a habit you are trying to change, and explain why it is difficult.',
    'Write about how your work has changed in the last two years.',
    'Do you think people spend money more carefully than they used to? Explain your view.',
    'Write about the most useful advice you have ever received.',
    'Describe a time when you were wrong about something important.',
    'Write about the advantages and disadvantages of working from home.',
    'Explain a small thing that quietly costs you a lot of money or time.',
  ],
  B2: [
    'Write about a widely accepted idea in your field that you believe is mistaken. Support your argument.',
    'Discuss the hidden costs of a service you use every day.',
    'Write about a situation where measuring something changed the thing being measured.',
    'Argue for a position you disagree with, as convincingly as you can.',
    'Describe a professional mistake and what it revealed about your assumptions.',
    'Discuss whether confidence is a useful signal of competence.',
    'Write about a trade-off you have accepted, and what you gave up.',
    'Explain why an obvious solution in your work often fails.',
  ],
  C1: [
    'Analyse how incentives shape behaviour in an organisation you know well.',
    'Write about the limits of measurement in judging quality.',
    'Discuss a case where being precise and being understood pulled in opposite directions.',
    'Examine an idea you changed your mind about, and reconstruct why the old view was persuasive.',
    'Write about the difference between a shared mistake and an individual one.',
    'Discuss what expertise is actually good for, given its poor forecasting record.',
  ],
  C2: [
    'Construct the strongest possible objection to your own professional judgement.',
    'Write about a virtue that becomes a vice when institutionalised.',
    'Examine how a technical vocabulary can conceal the assumptions it carries.',
    'Discuss whether accessibility and rigour are genuinely in tension, or only appear to be.',
    'Write about something in your field that everyone knows and nobody says.',
    'Analyse a decision that was correct for reasons other than the ones given at the time.',
  ],
};

/**
 * Seviye için görev havuzu. Boşsa en yakın dolu seviyeye düşülür — yeni bir
 * seviye eklenip listesi yazılmadan kalırsa ekran boş kalmasın.
 */
function poolFor(set: PromptSet, level: string): string[] {
  const target = levelIndex(level);
  for (let d = 0; d < LEVELS.length; d++) {
    for (const lv of LEVELS) {
      if (Math.abs(LEVELS.indexOf(lv) - target) === d && set[lv]?.length) {
        return set[lv];
      }
    }
  }
  return [];
}

/**
 * Günün görevi. Gün numarasına göre sırayla dönüyor; `salt` ile konuşma ve
 * yazma aynı gün aynı sırada olmasın diye kaydırma yapılıyor — ikisi de aynı
 * konuyu sormasın.
 */
function pick(set: PromptSet, level: string, today: Date, salt: number): string {
  const pool = poolFor(set, level);
  if (pool.length === 0) return '';
  return pool[(dayNumber(today) + salt) % pool.length];
}

export function speakingPromptFor(level: string, today: Date = new Date()): string {
  return pick(SPEAKING, level, today, 0);
}

export function writingPromptFor(level: string, today: Date = new Date()): string {
  return pick(WRITING, level, today, 3);
}
