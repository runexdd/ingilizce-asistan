/**
 * Yerleştirme sınavı — seviye ölçümü.
 *
 * Saf TypeScript: ağ, veritabanı ve AI çağrısı YOK. İnternetsiz çalışır,
 * sonuç anında çıkar.
 *
 * Uyarlanabilir mantık: B1'den başlar. Doğru cevapta bir üst seviyeye,
 * yanlışta bir alta geçer. Sınavın ikinci yarısında sorulan seviyeler
 * kullanıcının gerçek seviyesi etrafında toplanır; sonuç oradan hesaplanır.
 */

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type QuestionSkill = 'grammar' | 'vocabulary' | 'reading';

export interface PlacementQuestion {
  id: string;
  level: CEFRLevel;
  skill: QuestionSkill;
  /** Okuma sorularında kısa metin */
  passage?: string;
  prompt: string;
  options: string[];
  answerIndex: number;
}

export const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** Sınavda sorulacak soru sayısı */
export const TEST_LENGTH = 25;

/** Başlangıç seviyesi: B1 (ortadan başla, iki yöne de gidebilsin) */
const START_INDEX = 2;

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

/* ------------------------------------------------------------------ havuz */

export const QUESTION_BANK: PlacementQuestion[] = [
  // ---------------------------------------------------------------- A1
  { id: 'a1-1', level: 'A1', skill: 'grammar', prompt: 'She ___ a doctor.', options: ['is', 'are', 'am', 'be'], answerIndex: 0 },
  { id: 'a1-2', level: 'A1', skill: 'grammar', prompt: 'I ___ coffee every morning.', options: ['drinks', 'drink', 'drinking', 'to drink'], answerIndex: 1 },
  { id: 'a1-3', level: 'A1', skill: 'vocabulary', prompt: "The opposite of 'big' is ___.", options: ['long', 'small', 'wide', 'heavy'], answerIndex: 1 },
  { id: 'a1-4', level: 'A1', skill: 'grammar', prompt: '___ you like pizza?', options: ['Do', 'Does', 'Are', 'Is'], answerIndex: 0 },
  { id: 'a1-5', level: 'A1', skill: 'vocabulary', prompt: 'You usually sleep in a ___.', options: ['chair', 'table', 'bed', 'door'], answerIndex: 2 },
  { id: 'a1-6', level: 'A1', skill: 'grammar', prompt: 'There ___ two books on the table.', options: ['is', 'are', 'be', 'am'], answerIndex: 1 },
  { id: 'a1-7', level: 'A1', skill: 'vocabulary', prompt: 'We eat breakfast in the ___.', options: ['evening', 'night', 'afternoon', 'morning'], answerIndex: 3 },
  {
    id: 'a1-8', level: 'A1', skill: 'reading',
    passage: 'Tom is a student. He gets up at seven o\'clock. He goes to school by bus.',
    prompt: 'How does Tom go to school?', options: ['By car', 'By bus', 'On foot', 'By train'], answerIndex: 1,
  },

  // ---------------------------------------------------------------- A2
  { id: 'a2-1', level: 'A2', skill: 'grammar', prompt: 'Yesterday I ___ to the cinema.', options: ['go', 'goes', 'went', 'gone'], answerIndex: 2 },
  { id: 'a2-2', level: 'A2', skill: 'grammar', prompt: 'This car is ___ than mine.', options: ['fast', 'faster', 'fastest', 'more fast'], answerIndex: 1 },
  { id: 'a2-3', level: 'A2', skill: 'grammar', prompt: "I'm tired. I ___ go to bed early tonight.", options: ['am going to', 'go', 'went', 'have gone'], answerIndex: 0 },
  { id: 'a2-4', level: 'A2', skill: 'vocabulary', prompt: "If something is 'cheap', it does not cost ___.", options: ['much', 'many', 'few', 'little'], answerIndex: 0 },
  { id: 'a2-5', level: 'A2', skill: 'grammar', prompt: 'She is good ___ playing the guitar.', options: ['in', 'on', 'at', 'for'], answerIndex: 2 },
  { id: 'a2-6', level: 'A2', skill: 'vocabulary', prompt: 'A person who works in a hospital and helps patients is a ___.', options: ['nurse', 'lawyer', 'driver', 'waiter'], answerIndex: 0 },
  { id: 'a2-7', level: 'A2', skill: 'grammar', prompt: 'There isn\'t ___ milk in the fridge.', options: ['some', 'many', 'any', 'a'], answerIndex: 2 },
  {
    id: 'a2-8', level: 'A2', skill: 'reading',
    passage: 'The museum opens at 10 a.m. and closes at 6 p.m. It is closed on Mondays. Tickets cost 8 euros, but students pay only 4 euros.',
    prompt: 'How much does a student pay?', options: ['8 euros', '4 euros', 'Nothing', '10 euros'], answerIndex: 1,
  },

  // ---------------------------------------------------------------- B1
  { id: 'b1-1', level: 'B1', skill: 'grammar', prompt: 'I ___ in this city since 2019.', options: ['live', 'lived', 'have lived', 'am living'], answerIndex: 2 },
  { id: 'b1-2', level: 'B1', skill: 'grammar', prompt: 'If it rains tomorrow, we ___ at home.', options: ['stay', 'will stay', 'stayed', 'would stay'], answerIndex: 1 },
  { id: 'b1-3', level: 'B1', skill: 'grammar', prompt: 'The report ___ by the team last week.', options: ['wrote', 'was written', 'has written', 'writes'], answerIndex: 1 },
  { id: 'b1-4', level: 'B1', skill: 'vocabulary', prompt: 'I could not ___ out why the machine stopped working.', options: ['find', 'figure', 'take', 'give'], answerIndex: 1 },
  { id: 'b1-5', level: 'B1', skill: 'grammar', prompt: 'She asked me where I ___ from.', options: ['come', 'came', 'coming', 'have come'], answerIndex: 1 },
  { id: 'b1-6', level: 'B1', skill: 'vocabulary', prompt: 'We had to ___ the meeting because two people were ill.', options: ['put off', 'put on', 'put up', 'put down'], answerIndex: 0 },
  { id: 'b1-7', level: 'B1', skill: 'grammar', prompt: 'He is used to ___ early.', options: ['get', 'gets', 'getting', 'got'], answerIndex: 2 },
  {
    id: 'b1-8', level: 'B1', skill: 'reading',
    passage: 'Although the company had planned to launch the product in March, several delays in testing meant it finally reached customers in June.',
    prompt: 'When did customers actually get the product?', options: ['In March', 'In June', 'During testing', 'It was cancelled'], answerIndex: 1,
  },

  // ---------------------------------------------------------------- B2
  { id: 'b2-1', level: 'B2', skill: 'grammar', prompt: 'If I ___ more time, I would learn another language.', options: ['have', 'had', 'will have', 'would have'], answerIndex: 1 },
  { id: 'b2-2', level: 'B2', skill: 'grammar', prompt: 'The man ___ car was stolen called the police.', options: ['who', 'which', 'whose', 'whom'], answerIndex: 2 },
  { id: 'b2-3', level: 'B2', skill: 'grammar', prompt: 'By the time we arrived, the film ___.', options: ['started', 'has started', 'had started', 'was starting'], answerIndex: 2 },
  { id: 'b2-4', level: 'B2', skill: 'vocabulary', prompt: 'Her argument was ___ — nobody could find a weakness in it.', options: ['compelling', 'reluctant', 'redundant', 'tedious'], answerIndex: 0 },
  { id: 'b2-5', level: 'B2', skill: 'vocabulary', prompt: 'The two reports ___ each other; one says profits rose, the other says they fell.', options: ['complement', 'contradict', 'confirm', 'convey'], answerIndex: 1 },
  { id: 'b2-6', level: 'B2', skill: 'grammar', prompt: 'I would rather you ___ tell anyone about this.', options: ["don't", "didn't", "wouldn't", "won't"], answerIndex: 1 },
  { id: 'b2-7', level: 'B2', skill: 'vocabulary', prompt: 'She decided to ___ down the offer because the salary was too low.', options: ['turn', 'take', 'bring', 'call'], answerIndex: 0 },
  {
    id: 'b2-8', level: 'B2', skill: 'reading',
    passage: 'While remote work has reduced commuting time for many employees, critics argue that it has blurred the boundary between professional and private life, leaving some workers effectively on call at all hours.',
    prompt: 'What concern do critics raise?', options: ['Commuting takes longer', 'Work and personal life overlap too much', 'Employees are less productive', 'Offices are becoming empty'], answerIndex: 1,
  },

  // ---------------------------------------------------------------- C1
  { id: 'c1-1', level: 'C1', skill: 'grammar', prompt: 'Not only ___ the deadline, but he also exceeded expectations.', options: ['he met', 'did he meet', 'he did meet', 'met he'], answerIndex: 1 },
  { id: 'c1-2', level: 'C1', skill: 'grammar', prompt: 'Had we known about the risk, we ___ differently.', options: ['would act', 'acted', 'would have acted', 'will act'], answerIndex: 2 },
  { id: 'c1-3', level: 'C1', skill: 'vocabulary', prompt: 'The evidence was ___ at best — hardly enough to support such a bold claim.', options: ['tenuous', 'robust', 'exhaustive', 'blatant'], answerIndex: 0 },
  { id: 'c1-4', level: 'C1', skill: 'vocabulary', prompt: 'His remarks were widely seen as an attempt to ___ responsibility.', options: ['shoulder', 'deflect', 'undertake', 'endorse'], answerIndex: 1 },
  { id: 'c1-5', level: 'C1', skill: 'grammar', prompt: 'It is essential that every application ___ by Friday.', options: ['is submitted', 'be submitted', 'will be submitted', 'submits'], answerIndex: 1 },
  { id: 'c1-6', level: 'C1', skill: 'vocabulary', prompt: 'The policy had the ___ effect of increasing the very costs it aimed to reduce.', options: ['deliberate', 'inevitable', 'paradoxical', 'marginal'], answerIndex: 2 },
  { id: 'c1-7', level: 'C1', skill: 'grammar', prompt: '___ the weather, the event will take place as planned.', options: ['Despite', 'Although', 'Regardless of', 'However'], answerIndex: 2 },
  {
    id: 'c1-8', level: 'C1', skill: 'reading',
    passage: 'The author concedes that the reform delivered short-term gains, yet maintains that these were achieved at the cost of long-term stability — a trade-off she considers indefensible.',
    prompt: "What is the author's overall position?", options: ['Fully supportive of the reform', 'Critical, despite acknowledging some benefits', 'Neutral and undecided', 'Supportive only of the long-term effects'], answerIndex: 1,
  },

  // ---------------------------------------------------------------- C2
  { id: 'c2-1', level: 'C2', skill: 'vocabulary', prompt: 'His apology struck many as ___ — polished, but entirely hollow.', options: ['perfunctory', 'heartfelt', 'candid', 'impromptu'], answerIndex: 0 },
  { id: 'c2-2', level: 'C2', skill: 'vocabulary', prompt: 'The committee was accused of ___ the issue rather than confronting it.', options: ['tackling', 'obfuscating', 'clarifying', 'resolving'], answerIndex: 1 },
  { id: 'c2-3', level: 'C2', skill: 'grammar', prompt: 'Little ___ that the decision would define the rest of his career.', options: ['he realised', 'did he realise', 'he did realise', 'realised he'], answerIndex: 1 },
  { id: 'c2-4', level: 'C2', skill: 'vocabulary', prompt: "To 'take something with a pinch of salt' means to ___.", options: ['believe it completely', 'treat it with scepticism', 'find it offensive', 'repeat it often'], answerIndex: 1 },
  { id: 'c2-5', level: 'C2', skill: 'vocabulary', prompt: 'Her prose is admired for its ___: not a single word is wasted.', options: ['verbosity', 'economy', 'ambiguity', 'ornamentation'], answerIndex: 1 },
  { id: 'c2-6', level: 'C2', skill: 'grammar', prompt: 'Were it not for his intervention, the project ___ long ago.', options: ['would collapse', 'would have collapsed', 'collapsed', 'will collapse'], answerIndex: 1 },
  { id: 'c2-7', level: 'C2', skill: 'vocabulary', prompt: 'The report was criticised for its ___ tone, which alienated the very readers it targeted.', options: ['condescending', 'accessible', 'measured', 'engaging'], answerIndex: 0 },
  {
    id: 'c2-8', level: 'C2', skill: 'reading',
    passage: 'For all its rhetorical flourish, the speech offered little in the way of substance; those hoping for concrete commitments left the hall much as they had entered it.',
    prompt: 'What does the writer imply about the speech?', options: ['It was both eloquent and substantial', 'It was well delivered but lacked real content', 'It was poorly written and badly received', 'It exceeded the audience\'s expectations'], answerIndex: 1,
  },
];

/* ----------------------------------------------------------------- durum */

export interface PlacementAnswer {
  questionId: string;
  level: CEFRLevel;
  skill: QuestionSkill;
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
 * Sıradaki soruyu seçer: önce hedef seviyeden, o seviyede kullanılmamış soru
 * kalmadıysa en yakın seviyeden. Havuz biterse null.
 */
export function nextQuestion(state: PlacementState): PlacementQuestion | null {
  if (isFinished(state)) return null;

  const used = new Set(state.askedIds);
  const target = state.currentLevelIndex;

  // Hedef seviyeden başlayarak dışa doğru tara: 0, +1, -1, +2, -2 ...
  for (let distance = 0; distance < LEVELS.length; distance++) {
    for (const direction of distance === 0 ? [0] : [1, -1]) {
      const index = target + distance * direction;
      if (index < 0 || index >= LEVELS.length) continue;

      const candidates = QUESTION_BANK.filter(
        (q) => q.level === LEVELS[index] && !used.has(q.id)
      );
      if (candidates.length > 0) {
        // Aynı sıra hep tekrarlanmasın diye havuzdan rastgele seç
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
    }
  }

  return null;
}

/** Cevabı işler ve yeni durumu döndürür. Girdiyi değiştirmez. */
export function answerQuestion(
  state: PlacementState,
  question: PlacementQuestion,
  chosenIndex: number
): PlacementState {
  const correct = chosenIndex === question.answerIndex;
  const levelIndex = LEVELS.indexOf(question.level);

  return {
    currentLevelIndex: correct
      ? Math.min(LEVELS.length - 1, levelIndex + 1)
      : Math.max(0, levelIndex - 1),
    askedIds: [...state.askedIds, question.id],
    answers: [
      ...state.answers,
      { questionId: question.id, level: question.level, skill: question.skill, correct },
    ],
  };
}

/* ---------------------------------------------------------------- sonuç */

export interface SkillScore {
  skill: QuestionSkill;
  correct: number;
  total: number;
  /** 0–100 */
  accuracy: number;
}

export interface PlacementResult {
  level: CEFRLevel;
  correctCount: number;
  total: number;
  skills: SkillScore[];
  weakestSkill: QuestionSkill | null;
  description: string;
}

/**
 * Seviyeyi hesaplar.
 *
 * Uyarlanabilir sınav ikinci yarıda kullanıcının gerçek seviyesi etrafında
 * salınır; bu yüzden sonuç, sınavın ikinci yarısında sorulan soruların
 * seviyelerinin ortalamasından üretilir. Doğru/yanlış dengesi de hafifçe
 * hesaba katılır.
 */
export function computeResult(state: PlacementState): PlacementResult {
  const answers = state.answers;
  const total = answers.length;
  const correctCount = answers.filter((a) => a.correct).length;

  // Beceri kırılımı
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

  if (total === 0) {
    return {
      level: 'A1',
      correctCount: 0,
      total: 0,
      skills,
      weakestSkill,
      description: LEVEL_DESCRIPTIONS.A1,
    };
  }

  // Sınavın ikinci yarısı: algoritma bu noktada gerçek seviyeye yakınsamış olur
  const secondHalf = answers.slice(Math.floor(total / 2));
  const meanIndex =
    secondHalf.reduce((sum, a) => sum + LEVELS.indexOf(a.level), 0) / secondHalf.length;

  // Genel başarı oranı sonucu bir miktar yukarı/aşağı çeker
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
    description: LEVEL_DESCRIPTIONS[level],
  };
}
