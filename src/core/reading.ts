/**
 * Yedek okuma parçaları — **her seviye için, her gün değişen.**
 *
 * Asıl okuma içeriğini öğretmen (Claude Code) gönderir: güncel, kişiye özel,
 * devam eden hikâye. Burası öğretmen henüz bir şey göndermemişken ekranın boş
 * ya da yanlış seviyede kalmaması için.
 *
 * **Neden yeniden yazıldı:** Önce toplam dört parça vardı (A2, B1, B1, B2) ve
 * `pickPassage` bunlardan seviyeye *en yakın* olanı seçiyordu. İki sonucu
 * vardı: A1'deki biri A2 metni okuyordu, C1'deki biri B2 metni; ve metin her
 * gün aynıydı. Kullanıcının isteği: *"her gün yenilenecek şekilde seviyeye
 * uygun reading, speaking, kelimeler kısmı oluştur ki B1'e çekince B1'e uygun,
 * B2 olunca ona uygun gelsin."*
 *
 * Şimdi her seviyenin kendi parçaları var ve gün numarasına göre sırayla
 * dönüyorlar. Uzunluklar `LEVEL_SPEC.passageWords` ile uyumlu.
 *
 * Saf TypeScript, ağ ve AI yok.
 */

import { LEVELS, levelIndex, type CEFRLevel } from './level';

export interface ReadingQuestion {
  question: string;
  options: string[];
  answerIndex: number;
}

export interface ReadingPassage {
  id: string;
  level: CEFRLevel;
  title: string;
  text: string;
  questions: ReadingQuestion[];
}

export const FALLBACK_PASSAGES: ReadingPassage[] = [
  /* ------------------------------------------------------------------ A1 */
  {
    id: 'r-a1-1',
    level: 'A1',
    title: 'A day at the shop',
    text: "Mert works in a small shop near the station. He starts at eight in the morning. First he opens the door and cleans the tables. Then he makes coffee for the first customers. Many people buy bread and milk before work. Mert knows their names. At one o'clock he eats his lunch in the garden behind the shop. He finishes at six and walks home. He likes his job because he talks to people all day.",
    questions: [
      {
        question: 'What does Mert do first in the morning?',
        options: ['He makes coffee', 'He opens the door and cleans', 'He eats lunch', 'He walks home'],
        answerIndex: 1,
      },
      {
        question: 'Why does he like his job?',
        options: ['It is easy', 'The money is good', 'He talks to people', 'He starts late'],
        answerIndex: 2,
      },
    ],
  },
  {
    id: 'r-a1-2',
    level: 'A1',
    title: 'My sister’s cat',
    text: "My sister has a small black cat. Its name is Boncuk. Boncuk sleeps all day under the table. In the evening it is very happy and plays with everything. It likes water, and this is strange for a cat. When my sister opens the door, Boncuk runs to her. It does not like other people. Last week my friend came to our house and the cat was under the bed for two hours.",
    questions: [
      {
        question: 'Where does the cat sleep?',
        options: ['On the bed', 'Under the table', 'In the garden', 'Near the door'],
        answerIndex: 1,
      },
      {
        question: 'What is strange about Boncuk?',
        options: ['It is black', 'It sleeps a lot', 'It likes water', 'It is small'],
        answerIndex: 2,
      },
    ],
  },
  {
    id: 'r-a1-3',
    level: 'A1',
    title: 'Saturday morning',
    text: "On Saturday I do not work. I get up late and make a big breakfast. My brother comes at eleven and we watch a football match. After the match we walk to the park. The park is near our house, so we go there every week. Sometimes we buy tea from a small shop. In the evening I read a book and go to bed early, because Sunday is a busy day for me.",
    questions: [
      {
        question: 'What do they do after the match?',
        options: ['They walk to the park', 'They read a book', 'They go to work', 'They make breakfast'],
        answerIndex: 0,
      },
      {
        question: 'Why does he go to bed early?',
        options: ['He is ill', 'Sunday is busy', 'The book is boring', 'His brother leaves'],
        answerIndex: 1,
      },
    ],
  },

  /* ------------------------------------------------------------------ A2 */
  {
    id: 'r-a2-1',
    level: 'A2',
    title: 'A new routine',
    text: "Deniz used to wake up at eight and rush to work. She was always tired, and she never had time for breakfast. Last month she decided to change this. Now she gets up at half past six. She has a quiet breakfast, reads for twenty minutes, and then walks to the office. The walk takes half an hour, so she gets some exercise every day. She says the mornings are calmer now, and she feels much better at work. The first week was very hard. She went to bed at midnight and could not wake up early. So she changed one more thing: she started leaving her phone in the kitchen at eleven o'clock. After that it became easier. Her friends often ask her how she does it. Deniz always gives the same answer: she did not become a different person, she only moved one hour. She still watches films and she still meets her friends, but now she does these things earlier in the evening. Next month she wants to add twenty minutes of English to her mornings.",
    questions: [
      {
        question: 'Why did Deniz change her routine?',
        options: [
          'She moved to a new city',
          'She was always tired and had no time',
          'Her office hours changed',
          'She wanted to save money',
        ],
        answerIndex: 1,
      },
      {
        question: 'How does she get to the office now?',
        options: ['By bus', 'By car', 'She walks', 'By bike'],
        answerIndex: 2,
      },
    ],
  },
  {
    id: 'r-a2-2',
    level: 'A2',
    title: 'The wrong bag',
    text: "Last Friday I took the wrong bag from the airport. The two bags were the same colour and I was in a hurry. I only noticed the mistake at home, when I opened it and found somebody else's clothes. I was worried, because my laptop was in my own bag. I called the airport and waited for two hours. Then a man phoned me. He had my bag, and he lived in the same district. We met at a café near the station and changed the bags. He was very polite about it. He told me that he had opened my bag and seen my name inside, so he knew who to call. I was lucky, because many people do not write their name on their luggage at all. When I got home I checked my laptop, and everything was fine. Now I always put a red ribbon on my luggage. My colleagues laugh at the ribbon, but I have never taken the wrong bag again.",
    questions: [
      {
        question: 'When did the writer notice the mistake?',
        options: ['At the airport', 'On the bus', 'At home', 'At the café'],
        answerIndex: 2,
      },
      {
        question: 'What does the writer do now?',
        options: [
          'Travels without luggage',
          'Puts a red ribbon on the bag',
          'Buys a new laptop',
          'Takes a taxi from the airport',
        ],
        answerIndex: 1,
      },
    ],
  },
  {
    id: 'r-a2-3',
    level: 'A2',
    title: 'Working with numbers',
    text: "Selin works in the finance department of a small company. Her job is to check the bills and prepare a report every month. She is good with numbers, but she says the hardest part is not the maths. The hardest part is explaining the numbers to people who do not like them. Last year she started making simple charts instead of long tables. Her manager was surprised, because meetings became much shorter. Now other departments ask her to prepare their reports too, and she is thinking about a new job in the company. She explained her method to me last week. She always starts with the question the manager really wants to answer, and then she removes everything else from the page. It sounds simple, but she says most reports do the opposite: they show all the data and hide the answer. Selin is studying for a professional exam in the evenings. She says the exam is difficult, but her real problem is time, because she can only study after eight o'clock.",
    questions: [
      {
        question: 'What is the hardest part of her job?',
        options: [
          'Checking the bills',
          'Explaining numbers to people',
          'Working with the manager',
          'Preparing charts',
        ],
        answerIndex: 1,
      },
      {
        question: 'What happened after she started using charts?',
        options: [
          'Meetings became shorter',
          'She changed companies',
          'Her salary went up',
          'She stopped writing reports',
        ],
        answerIndex: 0,
      },
    ],
  },

  /* ------------------------------------------------------------------ B1 */
  {
    id: 'r-b1-1',
    level: 'B1',
    title: 'Working from home',
    text: "When companies first sent everyone home to work, most people expected it to last a few weeks. Years later, many teams have never fully returned. Employees say they save hours of commuting and can focus better without constant interruptions. Managers, however, worry about something harder to measure: the short conversations that used to happen by accident. A question asked in a corridor can save a week of confusion, and those moments rarely happen on a scheduled video call. The evidence is mixed, and both sides can find studies that support them. Productivity, measured by output, usually rises; measured by new ideas, it often falls. Younger employees appear to suffer most. People who joined a company before the change already had a network of colleagues they could call informally, while those who joined afterwards learned their jobs through official channels only, and they learn more slowly as a result. Several large firms have settled on a compromise of two or three days in the office, although few of them can explain why that particular number is the right one. What many managers admit privately is that the decision was never really about productivity at all. It was about trust, and about the uncomfortable discovery that a great deal of office work had always been invisible.",
    questions: [
      {
        question: 'What do managers worry about?',
        options: [
          'Employees working too many hours',
          'The cost of office space',
          'The loss of unplanned conversations',
          'Employees leaving the company',
        ],
        answerIndex: 2,
      },
      {
        question: "What does 'a question asked in a corridor' represent?",
        options: [
          'A formal meeting',
          'A quick, accidental exchange',
          'A written report',
          'A training session',
        ],
        answerIndex: 1,
      },
    ],
  },
  {
    id: 'r-b1-2',
    level: 'B1',
    title: 'Learning a language as an adult',
    text: "People often say that children learn languages easily and adults do not. This is only half true. Children do pick up pronunciation more naturally, but adults learn grammar and vocabulary faster because they already understand how language works. The real difference is time and pressure. A child hears the language for hours every day and is not afraid of making mistakes. An adult practises for twenty minutes and worries about sounding foolish. The learners who succeed are usually not the most talented ones, but the ones who keep going after an embarrassing conversation. There is also a practical difference that nobody mentions. A child is allowed to be bad at things. Nobody expects a seven-year-old to sound clever, so the child speaks freely and improves quickly. An adult has a reputation, a job title and a sense of dignity, and every clumsy sentence feels like evidence against all three. This is why so many capable people can read a contract in English but freeze during a short phone call. The solution is not more grammar. It is finding a situation where being wrong costs nothing — a patient friend, a tutor, an app that does not judge — and then using it often enough that the fear wears off. Progress in a language is mostly the slow removal of embarrassment.",
    questions: [
      {
        question: 'According to the text, what do adults do better than children?',
        options: [
          'Pronunciation',
          'Grammar and vocabulary',
          'Listening',
          'Making friends',
        ],
        answerIndex: 1,
      },
      {
        question: 'What does the writer say about successful learners?',
        options: [
          'They are naturally talented',
          'They start very young',
          'They continue after embarrassing moments',
          'They study many hours a day',
        ],
        answerIndex: 2,
      },
    ],
  },
  {
    id: 'r-b1-3',
    level: 'B1',
    title: 'The money you do not notice',
    text: "Most people can tell you what they earn, but very few can tell you what they spend. The big payments are easy to remember: rent, a car, a holiday. The difficult ones are small and regular. A coffee on the way to work costs almost nothing, yet repeated every working day it becomes a serious amount by the end of the year. The same is true of subscriptions that continue quietly after we stop using them. Financial advisers often suggest an unpleasant exercise: write down everything you spend for one month, without changing your habits. Almost everyone is surprised, and the surprise is rarely about the large purchases. It is about how invisible the small ones had become. There is a second reason these costs stay hidden. Small payments do not feel like decisions. Buying a car involves research, comparison and a moment of doubt; buying a coffee involves none of these, so the brain files it under habit rather than spending. Cards and phone payments have made this easier still, because a payment that takes one second leaves almost no memory behind. Some people solve the problem by paying cash for small things, not because cash is cheaper but because handing over a note is slightly painful, and the pain is the point. Others simply cancel everything once a year and subscribe again only to what they actually miss. Both methods work for the same reason: they turn an invisible habit back into a visible decision.",
    questions: [
      {
        question: 'Which spending is hardest to remember?',
        options: [
          'Rent and large payments',
          'Small, regular spending',
          'Holidays',
          'Buying a car',
        ],
        answerIndex: 1,
      },
      {
        question: 'What surprises people about the exercise?',
        options: [
          'How much they earn',
          'How expensive holidays are',
          'How invisible small spending had become',
          'How difficult it is to write things down',
        ],
        answerIndex: 2,
      },
    ],
  },

  /* ------------------------------------------------------------------ B2 */
  {
    id: 'r-b2-1',
    level: 'B2',
    title: 'The cost of convenience',
    text: "Every service that promises to save us time quietly asks for something in return. Food arrives in minutes, but the person carrying it is paid by the delivery, not by the hour. Streaming gives us everything at once, and we spend longer choosing than watching. None of this is an argument against convenience; it is an argument for noticing the exchange. Consider what the promise of speed actually requires. Someone must be waiting, unpaid, for an order to arrive; a warehouse must hold stock that may never sell; an algorithm must predict demand closely enough that the wait feels instant. The cost does not disappear because it fails to appear on the receipt. It is distributed to the people with the least power to refuse it, and to a future in which the infrastructure still has to be maintained. There is a subtler cost as well, and this one falls on us. Convenience removes friction, and friction is where a certain kind of thinking used to happen. When a decision required effort — a trip across town, a phone call, a wait until Saturday — the effort itself acted as a filter, and a surprising number of purchases quietly failed it. Remove the friction and the filter disappears with it. None of this is an argument for inconvenience, which has no virtue of its own; it is an argument for choosing deliberately where we want friction to remain, rather than allowing it to be removed everywhere by companies whose interests are not ours. Nor is the answer to feel guilty about ordering dinner, which changes nothing and merely adds a private tax of shame to an ordinary transaction. What can be changed is attention. The exchange is real whether or not anyone examines it, and examining it occasionally costs nothing at all. The question is not whether these services are useful, but whether we still remember what we traded away to get them.",
    questions: [
      {
        question: "What is the writer's main point?",
        options: [
          'Convenient services should be banned',
          'We should be aware of the hidden trade-offs',
          'Delivery workers are paid fairly',
          'Streaming saves a lot of time',
        ],
        answerIndex: 1,
      },
      {
        question: "What does 'the exchange' refer to?",
        options: [
          'Money paid to companies',
          'What we give up in return for convenience',
          'Swapping one service for another',
          'Currency conversion',
        ],
        answerIndex: 1,
      },
    ],
  },
  {
    id: 'r-b2-2',
    level: 'B2',
    title: 'Why forecasts fail',
    text: "Forecasting is a strange profession. The people who make predictions are rarely judged by whether the predictions come true; they are judged by whether the predictions sounded reasonable at the time. This creates a quiet incentive to be wrong in the same direction as everyone else, because a shared mistake damages nobody's reputation. Researchers who have tracked expert predictions over decades found something uncomfortable: confidence and accuracy were almost unrelated. The most confident experts were not the most accurate, and in several studies they performed worse than simple statistical rules. What distinguished the better forecasters was not intelligence but a willingness to change their minds in small steps, revising an estimate slightly as new information arrived rather than defending a position until it collapsed. That habit is unglamorous, difficult to sell, and remarkably effective. The finding has survived repeated attempts to explain it away. It is not that experts know less; on any factual question they know a great deal more than an amateur does. The problem is that expertise supplies a coherent story, and a coherent story is very difficult to abandon when a single awkward fact contradicts it. The amateur, having no story to protect, updates freely. Institutions make the situation worse by demanding clarity. A forecaster who says a recession is somewhat more likely than it was last month is considered evasive; one who announces that a recession is coming is invited back on television. Over time the incentive selects for confidence rather than calibration, and the people who are best at the job become its least visible practitioners. A few organisations have started scoring their own published predictions and reporting the results. The exercise is humbling, which is presumably why it remains so rare. Those that persist with it report an unexpected benefit: not better forecasts, at least at first, but far shorter arguments, because a written record of who predicted what removes most of the material from which office disputes are ordinarily made.",
    questions: [
      {
        question: 'Why is there an incentive to make similar predictions to others?',
        options: [
          'Shared mistakes damage nobody’s reputation',
          'It is easier to calculate',
          'Clients demand agreement',
          'Regulations require it',
        ],
        answerIndex: 0,
      },
      {
        question: 'What distinguished the better forecasters?',
        options: [
          'Higher intelligence',
          'Greater confidence',
          'Willingness to revise estimates gradually',
          'Access to better data',
        ],
        answerIndex: 2,
      },
    ],
  },
  {
    id: 'r-b2-3',
    level: 'B2',
    title: 'The meeting that should have been an email',
    text: "Organisations rarely decide to waste time; they drift into it. A meeting is created for a genuine reason, and then it survives long after the reason has gone, because cancelling it would require someone to admit it is unnecessary. Over time these gatherings accumulate participants, since being invited is treated as a sign of importance and being left out as a quiet demotion. The result is a room full of people who are individually busy and collectively idle. Some companies have tried mechanical solutions: a maximum length, a written agenda, an empty chair representing the customer. These help a little, but the deeper problem is cultural. Where speaking is rewarded more than deciding, meetings will expand to fill whatever time is available, and the work will be done afterwards by two people in a corridor. There is an economic dimension that rarely appears in any budget. A weekly meeting of ten senior people costs more over a year than most of the software those same people argue about, yet the software requires three approvals and the meeting requires none. Time is the only significant resource an organisation spends without recording it. Attempts at reform tend to fail in a predictable way. A rule is introduced, complied with formally, and then quietly undermined: the agenda becomes a list of headings written five minutes beforehand, the time limit is met by scheduling a second meeting, the empty chair becomes a joke. Rules cannot fix a problem whose real cause is status. The organisations that genuinely reduce meeting time usually do one unglamorous thing first: they make it safe to decline an invitation. Once absence stops being read as irrelevance, the rooms begin to empty on their own. This is harder than any rule, because it requires senior people to demonstrate it personally and repeatedly, and to resist the temptation to interpret an empty chair as a slight rather than as the system working exactly as intended.",
    questions: [
      {
        question: 'Why do unnecessary meetings survive?',
        options: [
          'They are legally required',
          'Cancelling would mean admitting they are unnecessary',
          'They are cheap to run',
          'Employees enjoy them',
        ],
        answerIndex: 1,
      },
      {
        question: 'What does the writer say about mechanical solutions?',
        options: [
          'They solve the problem completely',
          'They make things worse',
          'They help a little, but the problem is cultural',
          'They are too expensive',
        ],
        answerIndex: 2,
      },
    ],
  },

  /* ------------------------------------------------------------------ C1 */
  {
    id: 'r-c1-1',
    level: 'C1',
    title: 'The tyranny of the measurable',
    text: "Whenever an institution decides to take performance seriously, it reaches for numbers, and the moment it does so the numbers begin to change behaviour rather than describe it. A hospital judged on waiting times will find ways to shorten the recorded wait without necessarily treating anyone sooner. A school judged on examination results will quietly discourage the students most likely to lower the average. None of this requires dishonesty; it requires only that people respond rationally to what is being counted. The deeper difficulty is that the qualities we most want are precisely the ones that resist measurement. Judgement, care, the willingness to raise an unwelcome objection — these show up in no dashboard, and so they gradually lose to whatever does. The answer is not to abandon measurement, which would leave us with nothing but assertion, but to hold it more loosely than we find comfortable: to treat a number as evidence rather than verdict, and to keep asking what the figure is failing to see. The phenomenon has a name — Goodhart's law, usually summarised as the observation that a measure ceases to be a good measure once it becomes a target — but naming it has done remarkably little to prevent it. Part of the reason is that the alternative sounds worse. Ask any executive to replace metrics with judgement and they will point out, correctly, that judgement is where favouritism hides, that the person arguing for discretion is very often the person who benefits from it, and that numbers at least apply to everyone equally. This is a serious objection and it deserves a serious answer rather than a sigh. The answer, such as it is, lies in how a figure is used rather than in whether it is collected at all. A metric consulted privately by a manager who understands the work is a useful instrument; the same metric published in a league table becomes a weapon, and behaviour reorganises itself around the weapon within months. Institutions that survive this tend to keep two things carefully separate: the numbers they use to notice that something may be wrong, and the process by which they decide what to do about it. The first can be automated. The second cannot, and every attempt to automate it has produced a system that is easier to game than to satisfy. The distinction is easy to state and almost impossible to hold, because the same figure serves both purposes and nobody can quite say when it crossed over.",
    questions: [
      {
        question: 'What happens when institutions start measuring performance?',
        options: [
          'Behaviour changes to suit the measurement',
          'Performance always improves',
          'Numbers become more accurate',
          'Staff become dishonest',
        ],
        answerIndex: 0,
      },
      {
        question: 'What does the writer recommend?',
        options: [
          'Abandoning measurement entirely',
          'Measuring more things',
          'Treating numbers as evidence rather than verdict',
          'Replacing dashboards with interviews',
        ],
        answerIndex: 2,
      },
    ],
  },
  {
    id: 'r-c1-2',
    level: 'C1',
    title: 'Fluency and the fear of silence',
    text: "Advanced learners often describe a peculiar frustration: they understand almost everything, they can write carefully and well, and yet in conversation they feel slower than they were a year earlier. This is rarely a loss of ability. It is usually the consequence of higher standards. At an intermediate level a learner is satisfied with being understood; at an advanced level the same learner wants to be precise, and precision takes time that conversation does not offer. The pause spent searching for the exact word is experienced as failure, though a native speaker would hesitate in the same place for the same reason. What separates those who eventually sound fluent is not vocabulary but tolerance of imperfection under time pressure — a willingness to say the second-best word now rather than the best word too late. Paradoxically, the learners who accept this most readily are the ones who end up needing the compromise least often. The pattern is visible in the way advanced learners avoid rather than fail. They rarely produce a wrong sentence; they produce a simpler one, steering away from the conditional they are unsure of and towards a construction they have used a thousand times. Because nothing sounds incorrect, no teacher corrects it, and the gap persists indefinitely. This is why assessments based purely on accuracy flatter such learners, and why those same learners nonetheless feel stuck. Breaking the pattern requires deliberately entering the territory being avoided, which is uncomfortable in almost exact proportion to how well it works. There is a further complication that is rarely acknowledged. Some of the hesitation is not linguistic at all but social: a speaker in a second language loses access to the small signals — irony, understatement, a well-placed pause — that establish who they are in their first. The resulting flatness is frequently mistaken, by the speaker themselves, for a vocabulary problem. It is nothing of the kind. It is the absence of a repertoire that took decades to build in one language and is being rebuilt from almost nothing in another. Recognising this is oddly liberating, because it converts an apparently permanent deficiency into an ordinary matter of time. The learners who make peace with the process tend to describe the same turning point: the moment they stopped rehearsing sentences before saying them, and understood that the rehearsal had itself been the thing slowing them down. What follows is rarely a dramatic improvement, and it is seldom noticed at the time; it is simply a gradual return of the speed they thought they had lost.",
    questions: [
      {
        question: 'Why do advanced learners feel slower in conversation?',
        options: [
          'They have forgotten vocabulary',
          'Their standards have risen',
          'They practise less',
          'They translate in their heads',
        ],
        answerIndex: 1,
      },
      {
        question: 'What separates those who eventually sound fluent?',
        options: [
          'A larger vocabulary',
          'Living abroad',
          'Tolerance of imperfection under time pressure',
          'Formal grammar study',
        ],
        answerIndex: 2,
      },
    ],
  },
];

/**
 * Gün numarası — 1970'ten bu yana geçen gün sayısı.
 * Metin, konuşma ve yazma görevleri aynı sayıyı kullanıyor ki günün içeriği
 * birlikte dönsün.
 */
export function dayNumber(today: Date = new Date()): number {
  return Math.floor(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000
  );
}

/**
 * Seviyeye uygun ve **güne göre değişen** parça.
 *
 * Önce tam seviyenin parçaları aranır; o seviyede hiç parça yoksa en yakın
 * seviyeye düşülür (C2 için C1'e). Parçalar gün numarasına göre sırayla
 * dönüyor, böylece aynı metin arka arkaya iki gün gelmiyor.
 *
 * `excludeIds` öğretmenin daha önce gönderdiği ya da bugün zaten okunmuş
 * parçaları eler; hepsi elenirse sıra baştan başlar (ekran boş kalmasın).
 */
export function pickPassage(
  level: string,
  excludeIds: string[] = [],
  today: Date = new Date()
): ReadingPassage | null {
  const target = levelIndex(level);

  const atDistance = (d: number) =>
    FALLBACK_PASSAGES.filter(
      (p) => Math.abs(LEVELS.indexOf(p.level) - target) === d
    );

  // En yakın, parçası olan seviyeyi bul
  let pool: ReadingPassage[] = [];
  for (let d = 0; d < LEVELS.length && pool.length === 0; d++) {
    pool = atDistance(d);
  }
  if (pool.length === 0) return null;

  const fresh = pool.filter((p) => !excludeIds.includes(p.id));
  const usable = fresh.length > 0 ? fresh : pool;

  return usable[dayNumber(today) % usable.length] ?? null;
}
