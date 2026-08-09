/**
 * Yerleştirme sınavı — seviye ölçümü.
 *
 * Saf TypeScript: ağ, veritabanı ve AI çağrısı YOK. İnternetsiz çalışır.
 *
 * Dört soru tipi var. Bu önemli: sadece şık seçtirmek "tanıma"yı ölçer,
 * yazdırmak ise "üretme"yi. Çoğu öğrencide bu ikisi arasında ciddi fark
 * vardır (özellikle dili konuşarak öğrenenlerde), o yüzden ikisini ayrı
 * ayrı raporluyoruz.
 */

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type QuestionSkill = 'grammar' | 'vocabulary' | 'reading';

/** Soru biçimi. `choice` tanımayı, diğerleri üretmeyi ölçer. */
export type QuestionFormat = 'choice' | 'fill' | 'order' | 'spot';

interface BaseQuestion {
  id: string;
  level: CEFRLevel;
  skill: QuestionSkill;
  passage?: string;
  prompt: string;
}

/** Şıklı soru — tanıma ölçer */
export interface ChoiceQuestion extends BaseQuestion {
  format: 'choice';
  options: string[];
  answerIndex: number;
}

/** Boşluk doldurma — cevabı kullanıcı yazar, üretme ölçer */
export interface FillQuestion extends BaseQuestion {
  format: 'fill';
  /** Kabul edilen cevaplar; karşılaştırma küçük harf + kısaltma toleranslı */
  accept: string[];
  hint?: string;
}

/** Kelimeleri doğru sıraya dizme — cümle kurma becerisi */
export interface OrderQuestion extends BaseQuestion {
  format: 'order';
  /** Doğru sıradaki kelimeler; arayüz karıştırıp gösterir */
  words: string[];
}

/** Hatalı parçayı bulma — hata fark etme becerisi */
export interface SpotQuestion extends BaseQuestion {
  format: 'spot';
  segments: string[];
  answerIndex: number;
}

export type PlacementQuestion =
  | ChoiceQuestion
  | FillQuestion
  | OrderQuestion
  | SpotQuestion;

export const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const TEST_LENGTH = 25;
const START_INDEX = 2; // B1'den başla

export const SKILL_LABELS: Record<QuestionSkill, string> = {
  grammar: 'Gramer',
  vocabulary: 'Kelime',
  reading: 'Okuma',
};

export const LEVEL_DESCRIPTIONS: Record<CEFRLevel, string> = {
  A1: 'Başlangıç — temel kalıplar ve günlük kelimeler',
  A2: 'Temel — tanıdık konularda basit iletişim',
  B1: 'Orta — günlük durumlarda kendini ifade edebiliyorsun',
  B2: 'Orta-üstü — akıcı konuşuyor, karmaşık metinleri anlıyorsun',
  C1: 'İleri — esnek ve etkili dil kullanımı',
  C2: 'Ustalık — neredeyse ana dili düzeyinde',
};

/** Kendi seviyesini seçmek isteyenler için açıklamalar */
export const LEVEL_SELF_HINTS: Record<CEFRLevel, string> = {
  A1: 'Yeni başlıyorum, temel cümleler kurabiliyorum',
  A2: 'Basit sohbetleri anlıyorum, kendimi zorlanarak anlatıyorum',
  B1: 'Günlük konularda konuşabiliyorum, hata yapıyorum',
  B2: 'Rahat konuşuyorum, film/dizi çoğunlukla anlaşılıyor',
  C1: 'Karmaşık konularda tartışabiliyorum',
  C2: 'Neredeyse ana dilim gibi',
};

/* ------------------------------------------------------------------ havuz */

export const QUESTION_BANK: PlacementQuestion[] = [
  /* ================================ A1 ================================ */
  { id: 'a1c1', level: 'A1', skill: 'grammar', format: 'choice', prompt: 'She ___ a doctor.', options: ['is', 'are', 'am', 'be'], answerIndex: 0 },
  { id: 'a1c2', level: 'A1', skill: 'grammar', format: 'choice', prompt: 'I ___ coffee every morning.', options: ['drinks', 'drink', 'drinking', 'to drink'], answerIndex: 1 },
  { id: 'a1c3', level: 'A1', skill: 'vocabulary', format: 'choice', prompt: "The opposite of 'big' is ___.", options: ['long', 'small', 'wide', 'heavy'], answerIndex: 1 },
  { id: 'a1c4', level: 'A1', skill: 'grammar', format: 'choice', prompt: '___ you like pizza?', options: ['Do', 'Does', 'Are', 'Is'], answerIndex: 0 },
  { id: 'a1c5', level: 'A1', skill: 'vocabulary', format: 'choice', prompt: 'We eat breakfast in the ___.', options: ['evening', 'night', 'afternoon', 'morning'], answerIndex: 3 },
  { id: 'a1f1', level: 'A1', skill: 'grammar', format: 'fill', prompt: 'My name ___ Omer.', accept: ['is'], hint: 'tek kelime' },
  { id: 'a1f2', level: 'A1', skill: 'grammar', format: 'fill', prompt: 'They ___ from Turkey.', accept: ['are'], hint: 'tek kelime' },
  { id: 'a1f3', level: 'A1', skill: 'vocabulary', format: 'fill', prompt: 'Türkçe: "Ben bir öğrenciyim." → İngilizce:', accept: ['i am a student', "i'm a student", 'im a student'] },
  { id: 'a1o1', level: 'A1', skill: 'grammar', format: 'order', prompt: 'Kelimeleri doğru sıraya diz:', words: ['I', 'go', 'to', 'school', 'every', 'day'] },
  { id: 'a1o2', level: 'A1', skill: 'grammar', format: 'order', prompt: 'Kelimeleri doğru sıraya diz:', words: ['She', 'does', 'not', 'like', 'coffee'] },
  { id: 'a1s1', level: 'A1', skill: 'grammar', format: 'spot', prompt: 'Hangi parça yanlış?', segments: ['He', 'are', 'my friend'], answerIndex: 1 },
  { id: 'a1s2', level: 'A1', skill: 'grammar', format: 'spot', prompt: 'Hangi parça yanlış?', segments: ['I', 'no like', 'this song'], answerIndex: 1 },
  { id: 'a1r1', level: 'A1', skill: 'reading', format: 'choice', passage: 'Tom is a student. He gets up at seven. He goes to school by bus.', prompt: 'How does Tom go to school?', options: ['By car', 'By bus', 'On foot', 'By train'], answerIndex: 1 },

  /* ================================ A2 ================================ */
  { id: 'a2c1', level: 'A2', skill: 'grammar', format: 'choice', prompt: 'Yesterday I ___ to the cinema.', options: ['go', 'goes', 'went', 'gone'], answerIndex: 2 },
  { id: 'a2c2', level: 'A2', skill: 'grammar', format: 'choice', prompt: 'This car is ___ than mine.', options: ['fast', 'faster', 'fastest', 'more fast'], answerIndex: 1 },
  { id: 'a2c3', level: 'A2', skill: 'grammar', format: 'choice', prompt: 'She is good ___ playing the guitar.', options: ['in', 'on', 'at', 'for'], answerIndex: 2 },
  { id: 'a2c4', level: 'A2', skill: 'vocabulary', format: 'choice', prompt: 'A person who works in a hospital and helps patients is a ___.', options: ['nurse', 'lawyer', 'driver', 'waiter'], answerIndex: 0 },
  { id: 'a2c5', level: 'A2', skill: 'grammar', format: 'choice', prompt: "There isn't ___ milk in the fridge.", options: ['some', 'many', 'any', 'a'], answerIndex: 2 },
  { id: 'a2f1', level: 'A2', skill: 'grammar', format: 'fill', prompt: 'Last night we ___ (watch) a film.', accept: ['watched'], hint: 'geçmiş zaman' },
  { id: 'a2f2', level: 'A2', skill: 'grammar', format: 'fill', prompt: 'I am ___ to call her tomorrow.', accept: ['going'], hint: 'tek kelime' },
  { id: 'a2f3', level: 'A2', skill: 'vocabulary', format: 'fill', prompt: 'Türkçe: "Hava çok soğuk." → İngilizce:', accept: ['the weather is very cold', "it's very cold", 'it is very cold'] },
  { id: 'a2o1', level: 'A2', skill: 'grammar', format: 'order', prompt: 'Kelimeleri doğru sıraya diz:', words: ['I', 'have', 'never', 'been', 'to', 'London'] },
  { id: 'a2o2', level: 'A2', skill: 'grammar', format: 'order', prompt: 'Kelimeleri doğru sıraya diz:', words: ['We', 'are', 'going', 'to', 'move', 'next', 'month'] },
  { id: 'a2s1', level: 'A2', skill: 'grammar', format: 'spot', prompt: 'Hangi parça yanlış?', segments: ['She', 'did not went', 'to the party'], answerIndex: 1 },
  { id: 'a2s2', level: 'A2', skill: 'grammar', format: 'spot', prompt: 'Hangi parça yanlış?', segments: ['There is', 'many people', 'in the room'], answerIndex: 1 },
  { id: 'a2r1', level: 'A2', skill: 'reading', format: 'choice', passage: 'The museum opens at 10 a.m. and closes at 6 p.m. It is closed on Mondays. Tickets cost 8 euros, but students pay only 4 euros.', prompt: 'How much does a student pay?', options: ['8 euros', '4 euros', 'Nothing', '10 euros'], answerIndex: 1 },

  /* ================================ B1 ================================ */
  { id: 'b1c1', level: 'B1', skill: 'grammar', format: 'choice', prompt: 'I ___ in this city since 2019.', options: ['live', 'lived', 'have lived', 'am living'], answerIndex: 2 },
  { id: 'b1c2', level: 'B1', skill: 'grammar', format: 'choice', prompt: 'If it rains tomorrow, we ___ at home.', options: ['stay', 'will stay', 'stayed', 'would stay'], answerIndex: 1 },
  { id: 'b1c3', level: 'B1', skill: 'grammar', format: 'choice', prompt: 'The report ___ by the team last week.', options: ['wrote', 'was written', 'has written', 'writes'], answerIndex: 1 },
  { id: 'b1c4', level: 'B1', skill: 'vocabulary', format: 'choice', prompt: 'We had to ___ the meeting because two people were ill.', options: ['put off', 'put on', 'put up', 'put down'], answerIndex: 0 },
  { id: 'b1c5', level: 'B1', skill: 'grammar', format: 'choice', prompt: 'He is used to ___ early.', options: ['get', 'gets', 'getting', 'got'], answerIndex: 2 },
  { id: 'b1f1', level: 'B1', skill: 'grammar', format: 'fill', prompt: "I've been waiting ___ two hours.", accept: ['for'], hint: 'tek kelime' },
  { id: 'b1f2', level: 'B1', skill: 'vocabulary', format: 'fill', prompt: "I couldn't ___ out why the machine stopped. (çözmek)", accept: ['figure', 'work'], hint: 'tek kelime' },
  { id: 'b1f3', level: 'B1', skill: 'vocabulary', format: 'fill', prompt: 'Türkçe: "Onu görmeyi dört gözle bekliyorum." → İngilizce:', accept: ['i am looking forward to seeing him', "i'm looking forward to seeing him", 'i am looking forward to seeing her', "i'm looking forward to seeing her"] },
  { id: 'b1o1', level: 'B1', skill: 'grammar', format: 'order', prompt: 'Kelimeleri doğru sıraya diz:', words: ['She', 'asked', 'me', 'where', 'I', 'was', 'going'] },
  { id: 'b1o2', level: 'B1', skill: 'grammar', format: 'order', prompt: 'Kelimeleri doğru sıraya diz:', words: ['The', 'book', 'was', 'given', 'to', 'me', 'by', 'my', 'teacher'] },
  { id: 'b1s1', level: 'B1', skill: 'grammar', format: 'spot', prompt: 'Hangi parça yanlış?', segments: ['I have seen', 'him', 'yesterday'], answerIndex: 2 },
  { id: 'b1s2', level: 'B1', skill: 'grammar', format: 'spot', prompt: 'Hangi parça yanlış?', segments: ['She suggested', 'to go', 'to the beach'], answerIndex: 1 },
  { id: 'b1r1', level: 'B1', skill: 'reading', format: 'choice', passage: 'Although the company had planned to launch the product in March, several delays in testing meant it finally reached customers in June.', prompt: 'When did customers actually get the product?', options: ['In March', 'In June', 'During testing', 'It was cancelled'], answerIndex: 1 },

  /* ================================ B2 ================================ */
  { id: 'b2c1', level: 'B2', skill: 'grammar', format: 'choice', prompt: 'If I ___ more time, I would learn another language.', options: ['have', 'had', 'will have', 'would have'], answerIndex: 1 },
  { id: 'b2c2', level: 'B2', skill: 'grammar', format: 'choice', prompt: 'The man ___ car was stolen called the police.', options: ['who', 'which', 'whose', 'whom'], answerIndex: 2 },
  { id: 'b2c3', level: 'B2', skill: 'grammar', format: 'choice', prompt: 'By the time we arrived, the film ___.', options: ['started', 'has started', 'had started', 'was starting'], answerIndex: 2 },
  { id: 'b2c4', level: 'B2', skill: 'vocabulary', format: 'choice', prompt: 'The two reports ___ each other; one says profits rose, the other says they fell.', options: ['complement', 'contradict', 'confirm', 'convey'], answerIndex: 1 },
  { id: 'b2c5', level: 'B2', skill: 'vocabulary', format: 'choice', prompt: 'She decided to ___ down the offer because the salary was too low.', options: ['turn', 'take', 'bring', 'call'], answerIndex: 0 },
  { id: 'b2f1', level: 'B2', skill: 'grammar', format: 'fill', prompt: 'I would rather you ___ tell anyone about this.', accept: ["didn't", 'did not'], hint: 'olumsuz' },
  { id: 'b2f2', level: 'B2', skill: 'grammar', format: 'fill', prompt: 'He denied ___ (take) the money.', accept: ['taking'], hint: 'tek kelime' },
  { id: 'b2f3', level: 'B2', skill: 'vocabulary', format: 'fill', prompt: 'Türkçe: "Keşke ona söylemeseydim." → İngilizce:', accept: ["i wish i hadn't told him", 'i wish i had not told him', "i wish i hadn't told her", 'i wish i had not told her'] },
  { id: 'b2o1', level: 'B2', skill: 'grammar', format: 'order', prompt: 'Kelimeleri doğru sıraya diz:', words: ['Not', 'until', 'later', 'did', 'we', 'realise', 'the', 'mistake'] },
  { id: 'b2o2', level: 'B2', skill: 'grammar', format: 'order', prompt: 'Kelimeleri doğru sıraya diz:', words: ['The', 'more', 'you', 'practise', 'the', 'better', 'you', 'get'] },
  { id: 'b2s1', level: 'B2', skill: 'grammar', format: 'spot', prompt: 'Hangi parça yanlış?', segments: ['If I would have known', 'about the meeting', 'I would have come'], answerIndex: 0 },
  { id: 'b2s2', level: 'B2', skill: 'grammar', format: 'spot', prompt: 'Hangi parça yanlış?', segments: ['Despite of', 'the rain', 'we went out'], answerIndex: 0 },
  { id: 'b2r1', level: 'B2', skill: 'reading', format: 'choice', passage: 'While remote work has reduced commuting time for many employees, critics argue that it has blurred the boundary between professional and private life, leaving some workers effectively on call at all hours.', prompt: 'What concern do critics raise?', options: ['Commuting takes longer', 'Work and personal life overlap too much', 'Employees are less productive', 'Offices are becoming empty'], answerIndex: 1 },

  /* ================================ C1 ================================ */
  { id: 'c1c1', level: 'C1', skill: 'grammar', format: 'choice', prompt: 'Not only ___ the deadline, but he also exceeded expectations.', options: ['he met', 'did he meet', 'he did meet', 'met he'], answerIndex: 1 },
  { id: 'c1c2', level: 'C1', skill: 'grammar', format: 'choice', prompt: 'It is essential that every application ___ by Friday.', options: ['is submitted', 'be submitted', 'will be submitted', 'submits'], answerIndex: 1 },
  { id: 'c1c3', level: 'C1', skill: 'vocabulary', format: 'choice', prompt: 'The evidence was ___ at best — hardly enough to support such a bold claim.', options: ['tenuous', 'robust', 'exhaustive', 'blatant'], answerIndex: 0 },
  { id: 'c1c4', level: 'C1', skill: 'vocabulary', format: 'choice', prompt: 'His remarks were widely seen as an attempt to ___ responsibility.', options: ['shoulder', 'deflect', 'undertake', 'endorse'], answerIndex: 1 },
  { id: 'c1c5', level: 'C1', skill: 'vocabulary', format: 'choice', prompt: 'The policy had the ___ effect of increasing the very costs it aimed to reduce.', options: ['deliberate', 'inevitable', 'paradoxical', 'marginal'], answerIndex: 2 },
  { id: 'c1f1', level: 'C1', skill: 'grammar', format: 'fill', prompt: 'Had we known about the risk, we ___ have acted differently.', accept: ['would'], hint: 'tek kelime' },
  { id: 'c1f2', level: 'C1', skill: 'grammar', format: 'fill', prompt: '___ the weather, the event will take place as planned. (Ne olursa olsun)', accept: ['regardless of', 'irrespective of', 'whatever'], hint: 'iki kelime olabilir' },
  { id: 'c1f3', level: 'C1', skill: 'vocabulary', format: 'fill', prompt: 'Türkçe: "Söylediklerini hafife almalısın." → İngilizce (deyim):', accept: ['you should take what he says with a pinch of salt', 'you should take what he says with a grain of salt', 'take what he says with a pinch of salt', 'take what he says with a grain of salt'] },
  { id: 'c1o1', level: 'C1', skill: 'grammar', format: 'order', prompt: 'Kelimeleri doğru sıraya diz:', words: ['Rarely', 'have', 'I', 'seen', 'such', 'a', 'convincing', 'argument'] },
  { id: 'c1o2', level: 'C1', skill: 'grammar', format: 'order', prompt: 'Kelimeleri doğru sıraya diz:', words: ['It', 'was', 'not', 'until', 'much', 'later', 'that', 'she', 'understood'] },
  { id: 'c1s1', level: 'C1', skill: 'grammar', format: 'spot', prompt: 'Hangi parça yanlış?', segments: ['Scarcely had we sat down', 'than', 'the phone rang'], answerIndex: 1 },
  { id: 'c1s2', level: 'C1', skill: 'grammar', format: 'spot', prompt: 'Hangi parça yanlış?', segments: ['The committee recommended', 'that the rule is changed', 'immediately'], answerIndex: 1 },
  { id: 'c1r1', level: 'C1', skill: 'reading', format: 'choice', passage: 'The author concedes that the reform delivered short-term gains, yet maintains that these were achieved at the cost of long-term stability — a trade-off she considers indefensible.', prompt: "What is the author's overall position?", options: ['Fully supportive of the reform', 'Critical, despite acknowledging some benefits', 'Neutral and undecided', 'Supportive only of the long-term effects'], answerIndex: 1 },

  /* ================================ C2 ================================ */
  { id: 'c2c1', level: 'C2', skill: 'vocabulary', format: 'choice', prompt: 'His apology struck many as ___ — polished, but entirely hollow.', options: ['perfunctory', 'heartfelt', 'candid', 'impromptu'], answerIndex: 0 },
  { id: 'c2c2', level: 'C2', skill: 'vocabulary', format: 'choice', prompt: 'The committee was accused of ___ the issue rather than confronting it.', options: ['tackling', 'obfuscating', 'clarifying', 'resolving'], answerIndex: 1 },
  { id: 'c2c3', level: 'C2', skill: 'grammar', format: 'choice', prompt: 'Little ___ that the decision would define the rest of his career.', options: ['he realised', 'did he realise', 'he did realise', 'realised he'], answerIndex: 1 },
  { id: 'c2c4', level: 'C2', skill: 'vocabulary', format: 'choice', prompt: 'Her prose is admired for its ___: not a single word is wasted.', options: ['verbosity', 'economy', 'ambiguity', 'ornamentation'], answerIndex: 1 },
  { id: 'c2c5', level: 'C2', skill: 'vocabulary', format: 'choice', prompt: 'The report was criticised for its ___ tone, which alienated the very readers it targeted.', options: ['condescending', 'accessible', 'measured', 'engaging'], answerIndex: 0 },
  { id: 'c2f1', level: 'C2', skill: 'grammar', format: 'fill', prompt: '___ it not for his intervention, the project would have collapsed.', accept: ['were'], hint: 'tek kelime' },
  { id: 'c2f2', level: 'C2', skill: 'vocabulary', format: 'fill', prompt: 'The argument, ___ compelling, ultimately rests on a false premise. (görünüşte)', accept: ['seemingly', 'ostensibly', 'apparently'], hint: 'tek kelime' },
  { id: 'c2f3', level: 'C2', skill: 'vocabulary', format: 'fill', prompt: 'Türkçe: "Bu iş bana hiç uygun değil." → İngilizce (doğal söyleyiş):', accept: ['this job is not for me', "this job isn't for me", 'this is not my cup of tea', "this isn't my cup of tea"] },
  { id: 'c2o1', level: 'C2', skill: 'grammar', format: 'order', prompt: 'Kelimeleri doğru sıraya diz:', words: ['Seldom', 'has', 'a', 'decision', 'provoked', 'such', 'fierce', 'debate'] },
  { id: 'c2o2', level: 'C2', skill: 'grammar', format: 'order', prompt: 'Kelimeleri doğru sıraya diz:', words: ['So', 'convincing', 'was', 'her', 'argument', 'that', 'nobody', 'objected'] },
  { id: 'c2s1', level: 'C2', skill: 'grammar', format: 'spot', prompt: 'Hangi parça yanlış?', segments: ['Under no circumstances', 'you should', 'share this file'], answerIndex: 1 },
  { id: 'c2s2', level: 'C2', skill: 'vocabulary', format: 'spot', prompt: 'Hangi parça yanlış?', segments: ['He made', 'a big mistake', 'in purpose'], answerIndex: 2 },
  { id: 'c2r1', level: 'C2', skill: 'reading', format: 'choice', passage: 'For all its rhetorical flourish, the speech offered little in the way of substance; those hoping for concrete commitments left the hall much as they had entered it.', prompt: 'What does the writer imply about the speech?', options: ['It was both eloquent and substantial', 'It was well delivered but lacked real content', 'It was poorly written and badly received', "It exceeded the audience's expectations"], answerIndex: 1 },
];

/* ------------------------------------------------------- cevap kontrolü */

/** Yazılan cevabı normalize eder: küçük harf, fazla boşluk ve noktalama temizliği. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function checkAnswer(
  question: PlacementQuestion,
  answer: { index?: number; text?: string; words?: string[] }
): boolean {
  switch (question.format) {
    case 'choice':
    case 'spot':
      return answer.index === question.answerIndex;

    case 'fill': {
      const given = normalize(answer.text ?? '');
      if (!given) return false;
      return question.accept.some((a) => normalize(a) === given);
    }

    case 'order': {
      const given = (answer.words ?? []).join(' ');
      return normalize(given) === normalize(question.words.join(' '));
    }
  }
}

/* ----------------------------------------------------------------- durum */

export interface PlacementAnswer {
  questionId: string;
  level: CEFRLevel;
  skill: QuestionSkill;
  format: QuestionFormat;
  correct: boolean;
}

export interface PlacementState {
  currentLevelIndex: number;
  askedIds: string[];
  answers: PlacementAnswer[];
}

export function startPlacement(): PlacementState {
  return { currentLevelIndex: START_INDEX, askedIds: [], answers: [] };
}

export function isFinished(state: PlacementState): boolean {
  return state.answers.length >= TEST_LENGTH;
}

export function progress(state: PlacementState): { current: number; total: number } {
  return { current: state.answers.length, total: TEST_LENGTH };
}

/**
 * Sıradaki soruyu seçer. Hedef seviyeden başlayıp dışa doğru tarar; ayrıca
 * aynı biçimin arka arkaya gelmemesine çalışır (çeşitlilik için).
 */
export function nextQuestion(state: PlacementState): PlacementQuestion | null {
  if (isFinished(state)) return null;

  const used = new Set(state.askedIds);
  const lastFormat = state.answers[state.answers.length - 1]?.format;
  const target = state.currentLevelIndex;

  for (let distance = 0; distance < LEVELS.length; distance++) {
    for (const direction of distance === 0 ? [0] : [1, -1]) {
      const index = target + distance * direction;
      if (index < 0 || index >= LEVELS.length) continue;

      const pool = QUESTION_BANK.filter(
        (q) => q.level === LEVELS[index] && !used.has(q.id)
      );
      if (pool.length === 0) continue;

      // Mümkünse bir önceki soruyla aynı biçimi tekrarlama
      const varied = pool.filter((q) => q.format !== lastFormat);
      const chosen = varied.length > 0 ? varied : pool;
      return chosen[Math.floor(Math.random() * chosen.length)];
    }
  }

  return null;
}

export function answerQuestion(
  state: PlacementState,
  question: PlacementQuestion,
  answer: { index?: number; text?: string; words?: string[] }
): PlacementState {
  const correct = checkAnswer(question, answer);
  const levelIndex = LEVELS.indexOf(question.level);

  return {
    currentLevelIndex: correct
      ? Math.min(LEVELS.length - 1, levelIndex + 1)
      : Math.max(0, levelIndex - 1),
    askedIds: [...state.askedIds, question.id],
    answers: [
      ...state.answers,
      {
        questionId: question.id,
        level: question.level,
        skill: question.skill,
        format: question.format,
        correct,
      },
    ],
  };
}

/* ---------------------------------------------------------------- sonuç */

export interface SkillScore {
  skill: QuestionSkill;
  correct: number;
  total: number;
  accuracy: number;
}

export interface PlacementResult {
  level: CEFRLevel;
  correctCount: number;
  total: number;
  skills: SkillScore[];
  weakestSkill: QuestionSkill | null;
  /** Şıklı sorularda başarı — kelimeyi/kalıbı TANIMA */
  recognitionAccuracy: number;
  /** Yazma/dizme sorularında başarı — ÜRETME */
  productionAccuracy: number;
  description: string;
}

export function computeResult(state: PlacementState): PlacementResult {
  const answers = state.answers;
  const total = answers.length;
  const correctCount = answers.filter((a) => a.correct).length;

  const skills: SkillScore[] = (['grammar', 'vocabulary', 'reading'] as QuestionSkill[])
    .map((skill) => {
      const subset = answers.filter((a) => a.skill === skill);
      const c = subset.filter((a) => a.correct).length;
      return {
        skill,
        correct: c,
        total: subset.length,
        accuracy: subset.length === 0 ? 0 : Math.round((c / subset.length) * 100),
      };
    })
    .filter((s) => s.total > 0);

  const weakestSkill =
    skills.length === 0
      ? null
      : skills.reduce((min, s) => (s.accuracy < min.accuracy ? s : min)).skill;

  const rate = (subset: PlacementAnswer[]) =>
    subset.length === 0
      ? 0
      : Math.round((subset.filter((a) => a.correct).length / subset.length) * 100);

  const recognitionAccuracy = rate(answers.filter((a) => a.format === 'choice'));
  const productionAccuracy = rate(answers.filter((a) => a.format !== 'choice'));

  if (total === 0) {
    return {
      level: 'A1',
      correctCount: 0,
      total: 0,
      skills,
      weakestSkill,
      recognitionAccuracy: 0,
      productionAccuracy: 0,
      description: LEVEL_DESCRIPTIONS.A1,
    };
  }

  const secondHalf = answers.slice(Math.floor(total / 2));
  const meanIndex =
    secondHalf.reduce((sum, a) => sum + LEVELS.indexOf(a.level), 0) / secondHalf.length;

  const ratio = correctCount / total;
  const adjustment = ratio >= 0.8 ? 0.4 : ratio <= 0.4 ? -0.4 : 0;

  const index = Math.max(
    0,
    Math.min(LEVELS.length - 1, Math.round(meanIndex + adjustment))
  );
  const level = LEVELS[index];

  return {
    level,
    correctCount,
    total,
    skills,
    weakestSkill,
    recognitionAccuracy,
    productionAccuracy,
    description: LEVEL_DESCRIPTIONS[level],
  };
}
