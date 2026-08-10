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
import { keysFromNote, noteSubject } from './tastematch';
import type { Tastes } from '../db/types';

type PromptSet = Record<CEFRLevel, string[]>;

/* ==================================================== zevke bağlı görevler
 *
 * ⚠️ **Kullanıcının şikâyeti:** *"Her hobiyi değiştirdiğimde farklı bir
 * speaking yaptırması lazım ama orası hâlâ kopuk."* Haklıydı: aşağıdaki genel
 * havuzlar yalnızca **seviye** ve **gün numarası** ile seçiliyordu; zevkler
 * denkleme hiç girmiyordu. Spor seçen de seyahat seçen de aynı soruyu
 * alıyordu.
 *
 * Çözümün şekli önemli: her zevk için altı seviyelik ayrı liste yazmak 60+
 * blok eder ve biri eklenince ötekiler unutulur. Onun yerine iki parça
 * çarpılıyor:
 *
 *   **konu** (zevkten gelir)  ×  **çerçeve** (seviyeden gelir)
 *
 * Konu *neyi* konuşacağını, çerçeve *ne kadar derin* konuşacağını belirliyor.
 * Böylece yeni bir hobi eklemek tek satır, yeni bir seviye eklemek tek çerçeve.
 */

interface TasteTopic {
  /** `src/core/tastes.ts` içindeki anahtarlar */
  keys: string[];
  /**
   * İngilizce konu öbekleri. Çerçeveye gömüldüğü için **isim öbeği** olmalı:
   * "Describe ___", "Tell me about ___" cümlesine oturmalı.
   */
  subjects: string[];
  /**
   * A1 karşılıkları — **somut, tek adımlı, hafızadan cevaplanabilir** konular.
   *
   * ⚠️ Buranın olmaması ölçülmüş bir hataydı. Çerçeve seviyeye göre
   * değişiyordu ama **konu değişmiyordu**; A1 kullanıcısına şu çıkıyordu:
   *
   *     "Talk about a scientific idea you find hard to believe.
   *      Use short, simple sentences."
   *
   * Yani B2 konusu, üstünde A1 talimatı. Böyle bir görevin karşısında A1
   * öğrencisi hiçbir şey yazamaz; kullanıcı bunu "bilim/tarih/ekonomi
   * kısmında diyalog gelmiyor" diye bildirdi. Cümleyi kısaltmak konuyu
   * kolaylaştırmıyor — konunun kendisi somutlaşmalı.
   *
   * Ölçüt: cevabı **isim ve geniş zaman fiille** verilebilmeli. "Sevdiğin
   * takım hangisi" A1'dir; "insanlar sporu neden bu kadar önemsiyor" değildir.
   */
  simple: string[];
  /** Türkçe ipucunda geçen alan adı */
  labelTR: string;
}

const TASTE_TOPICS: TasteTopic[] = [
  {
    keys: ['spor', 'futbol', 'basketbol', 'tenis', 'motor', 'dovus'],
    labelTR: 'spor',
    simple: [
      'your favourite team',
      'a sport you like to watch',
      'the last match you watched',
      'a player you like',
    ],
    subjects: [
      'the last match you watched',
      'a player or athlete you admire',
      'the moment your team disappointed you',
      'why people care so much about sport',
      'a game you will never forget',
    ],
  },
  {
    keys: ['fitness', 'kosu', 'dogaspor'],
    labelTR: 'spor ve hareket',
    simple: [
      'what you do to keep fit',
      'the days of the week you exercise',
      'how you feel after sport',
      'a place where you like to walk or run',
    ],
    subjects: [
      'your training routine this week',
      'the hardest workout you have done',
      'how exercise changes your mood',
      'a goal you are working towards',
    ],
  },
  {
    keys: ['muzik', 'rock', 'metal', 'pop', 'rap', 'caz', 'klasik', 'blues', 'country', 'elektronik', 'akustik'],
    labelTR: 'müzik',
    simple: [
      'the music you like',
      'a singer or band you listen to',
      'when you listen to music',
      'a song you know well',
    ],
    subjects: [
      'the last song you listened to',
      'a band or artist you keep coming back to',
      'the kind of music you cannot stand',
      'a song that reminds you of a place',
      'what you listen to when you need to focus',
    ],
  },
  {
    keys: ['dizi', 'superhero', 'scifi', 'polisiye', 'komedi', 'dram', 'animasyon', 'tarihi', 'fantastik', 'gerilim'],
    labelTR: 'dizi ve film',
    simple: [
      'a film or show you like',
      'a character you like',
      'when and where you watch films',
      'what happens in the story',
    ],
    subjects: [
      'the last episode you watched',
      'a character you find interesting',
      'a story with an ending you did not expect',
      'a series everyone likes but you do not',
      'what makes you keep watching a show',
    ],
  },
  {
    keys: ['belgesel', 'bilim', 'tarih'],
    labelTR: 'belgesel ve bilim',
    simple: [
      'an animal you find interesting',
      'a place in the world you want to see',
      'something new you learned this week',
      'the weather where you live',
    ],
    subjects: [
      'something you learned recently that surprised you',
      'a documentary or article you would recommend',
      'a period in history you would like to see',
      'a scientific idea you find hard to believe',
    ],
  },
  {
    keys: ['oyun'],
    labelTR: 'oyun',
    simple: [
      'a game you play',
      'when you play games',
      'the game you played last',
      'who you play with',
    ],
    subjects: [
      'the game you are playing at the moment',
      'a level or match that took you many tries',
      'why some games stay interesting for years',
      'playing alone or with friends',
    ],
  },
  {
    keys: ['teknoloji'],
    labelTR: 'teknoloji',
    simple: [
      'the phone you use',
      'an app you open every day',
      'how many hours you use your phone',
      'a thing you bought online',
    ],
    subjects: [
      'an app you use every day',
      'a piece of technology that disappointed you',
      'how your phone changes the way you spend time',
      'something you would like technology to solve',
    ],
  },
  {
    keys: ['yemek'],
    labelTR: 'yemek',
    simple: [
      'the food you like',
      'what you eat for breakfast',
      'a meal you can cook',
      'a food you do not like',
    ],
    subjects: [
      'the last meal you cooked',
      'a dish from your childhood',
      'a restaurant you would go back to',
      'food you tried once and never again',
    ],
  },
  {
    keys: ['seyahat', 'seyahat-ortam'],
    labelTR: 'seyahat',
    simple: [
      'a city you visited',
      'the place you want to go',
      'how you travel — by car, bus or plane',
      'what you take with you on a trip',
    ],
    subjects: [
      'the last place you travelled to',
      'a journey that did not go as planned',
      'a city you would like to live in for a year',
      'what you always pack and never use',
      'travelling alone or with other people',
    ],
  },
  {
    keys: ['kitap', 'akademik'],
    labelTR: 'kitap',
    simple: [
      'a book you like',
      'when you read',
      'a story you know well',
      'reading on paper or on a phone',
    ],
    subjects: [
      'the last book you read',
      'a book you started and never finished',
      'a writer whose style you enjoy',
      'reading on paper or on a screen',
    ],
  },
  {
    keys: ['is', 'ofis'],
    labelTR: 'iş',
    simple: [
      'your job — what you do every day',
      'the time you start and finish work',
      'the people you work with',
      'how you go to work',
    ],
    subjects: [
      'the busiest day you had at work this month',
      'a meeting that could have been an email',
      'a colleague you learn something from',
      'the part of your job nobody sees',
    ],
  },
  {
    keys: ['otomobil'],
    labelTR: 'otomobil',
    simple: [
      'a car you like',
      'the car you drive or want',
      'how you go to work — car, bus or metro',
      'the colour and size of your car',
    ],
    subjects: [
      'a car you would buy if money were not a problem',
      'the longest drive you have done',
      'how driving in your city feels',
      'whether people need cars as much as they think',
    ],
  },
  {
    keys: ['gunluk', 'sosyal'],
    labelTR: 'günlük hayat',
    simple: [
      'what you do in the morning',
      'your weekend',
      'the people in your family',
      'the street where you live',
    ],
    subjects: [
      'how your day usually starts',
      'a small thing that improved your week',
      'something you keep meaning to do',
      'the last conversation that stayed with you',
    ],
  },
];

/**
 * Seviye çerçeveleri — **zorluk buradan gelir.**
 *
 * A1 tarif eder, A2 anlatır, B1 gerekçelendirir, B2 karşı görüş üretir,
 * C1 kendi önyargısını sorgular. Aynı konu her seviyede başka bir zihin
 * işi yaptırıyor; konu değişince görev değişiyor, seviye değişince derinlik.
 */
const SPEAK_FRAMES: Record<CEFRLevel, (subject: string) => string> = {
  A1: (s) => `Talk about ${s}. Use short, simple sentences.`,
  A2: (s) => `Tell me about ${s}. Say what happened and how you felt.`,
  B1: (s) => `Talk about ${s}, and explain the reasons behind your opinion.`,
  B2: (s) => `Talk about ${s}. Then give the strongest reason someone might disagree with you.`,
  C1: (s) => `Discuss ${s}, and say where your own view might be biased.`,
  C2: (s) => `Explore ${s}, including the part of your position you find hardest to defend.`,
};

const WRITE_FRAMES: Record<CEFRLevel, (subject: string) => string> = {
  A1: (s) => `Write about ${s}.`,
  A2: (s) => `Write about ${s}. Use past simple and say why.`,
  B1: (s) => `Write about ${s} and explain what you learned from it.`,
  B2: (s) => `Write about ${s}. Include one argument against your own view.`,
  C1: (s) => `Write about ${s}, examining the assumptions behind your position.`,
  C2: (s) => `Write about ${s}, and reconstruct why a reasonable person might see it differently.`,
};

/** Kullanıcının bütün zevk seçimleri tek kümede — serbest metin dahil */
function tasteKeys(tastes: Tastes | undefined): Set<string> {
  if (!tastes) return new Set();
  return new Set([
    ...tastes.areas,
    ...tastes.music,
    ...tastes.screen,
    ...tastes.sports,
    ...tastes.other,
    ...keysFromNote(tastes.note),
  ]);
}

/** Kullanıcının zevklerine değen konu blokları */
function topicsFor(tastes: Tastes | undefined): TasteTopic[] {
  const keys = tasteKeys(tastes);
  if (keys.size === 0) return [];
  return TASTE_TOPICS.filter((t) => t.keys.some((k) => keys.has(k)));
}

/**
 * Zevke bağlı görev. Zevk seçilmemişse `null` döner ve çağıran genel havuza
 * düşer — uydurma bir konu vermektense tarafsız bir soru daha dürüst.
 *
 * `salt` konuşma ile yazmanın aynı gün aynı konuyu sormasını engelliyor.
 */
function tasteBased(
  frames: Record<CEFRLevel, (s: string) => string>,
  level: string,
  tastes: Tastes | undefined,
  today: Date,
  salt: number
): string | null {
  const topics = topicsFor(tastes);

  /**
   * Hiçbir konu bloğu tutmadı ama kullanıcı serbest metne bir şey yazmış.
   *
   * Eskiden bu durumda genel havuza düşülüyordu: "tiyatro" yazan biri
   * tiyatroyla ilgisi olmayan bir görev alıyordu. Şimdi kendi kelimesi
   * göreve gömülüyor — *"Talk about tiyatro. Use short, simple sentences."*
   * Uydurma eşleşmeden dürüst, genel sorudan isabetli. Öğretmen çalıştığında
   * bunun yerine gerçek bir tiyatro içeriği ve sohbeti geliyor.
   */
  if (topics.length === 0) {
    const own = noteSubject(tastes?.note);
    if (!own) return null;
    const specOwn = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIndex(level)))];
    return frames[specOwn](own);
  }

  const day = dayNumber(today) + salt;
  /**
   * Konu bloğu gün gün dönüyor: iki hobi seçen biri bir gün spor, ertesi gün
   * müzik konuşuyor. Blok içindeki özne de dönüyor ki aynı hobide takılıp
   * kalmasın.
   */
  const topic = topics[day % topics.length];
  const spec = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIndex(level)))];

  /**
   * ⚠️ **Konu havuzu da seviyeye bağlı.** Eskiden sadece çerçeve seviyeye
   * göre değişiyordu, konu hep aynı havuzdan geliyordu ve A1 kullanıcısı
   * *"Talk about a scientific idea you find hard to believe"* gibi bir
   * görevin karşısında donuyordu. Cümleyi kısaltmak konuyu kolaylaştırmaz.
   *
   * A1'de somut havuz, üstünde de A1 çerçevesi. A2 ve üstü şimdilik eski
   * havuzda — faz kuralı: bir seviye bitmeden ötekinin malzemesine
   * dokunulmuyor.
   */
  const pool = spec === 'A1' ? topic.simple : topic.subjects;
  const subject = pool[Math.floor(day / topics.length) % pool.length];

  return frames[spec](subject);
}

/** Görevin hangi ilgi alanından geldiği — ekranda "· spor" diye gösteriliyor */
export function taskTopicLabel(
  tastes: Tastes | undefined,
  today: Date = new Date(),
  salt = 0
): string | null {
  const topics = topicsFor(tastes);
  /** Serbest metinden gelen görevin etiketi kullanıcının kendi kelimesi olur */
  if (topics.length === 0) return noteSubject(tastes?.note);
  return topics[(dayNumber(today) + salt) % topics.length].labelTR;
}

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

/**
 * Günün konuşma görevi.
 *
 * **Önce zevk, sonra genel havuz.** Kullanıcı hobisini değiştirdiği anda görev
 * de değişiyor; hiç zevk seçmemişse eski genel havuz devrede kalıyor.
 */
export function speakingPromptFor(
  level: string,
  today: Date = new Date(),
  tastes?: Tastes
): string {
  return tasteBased(SPEAK_FRAMES, level, tastes, today, 0) ?? pick(SPEAKING, level, today, 0);
}

export function writingPromptFor(
  level: string,
  today: Date = new Date(),
  tastes?: Tastes
): string {
  return tasteBased(WRITE_FRAMES, level, tastes, today, 3) ?? pick(WRITING, level, today, 3);
}
