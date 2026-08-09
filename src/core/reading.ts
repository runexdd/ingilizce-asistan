/**
 * Yedek okuma parçaları.
 *
 * Asıl okuma içeriğini öğretmen (Claude Code) gönderir — güncel, kişiye özel
 * ve ilgi alanına göre. Burası sadece öğretmen henüz bir şey göndermemişken
 * ekranın boş kalmaması için: uygulama internetsiz ve senkronsuz da çalışmalı.
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
  {
    id: 'r-a2-1',
    level: 'A2',
    title: 'A new routine',
    text: "Deniz used to wake up at eight and rush to work. She was always tired, and she never had time for breakfast. Last month she decided to change this. Now she gets up at half past six. She has a quiet breakfast, reads for twenty minutes, and then walks to the office. The walk takes half an hour, so she gets some exercise every day. She says the mornings are calmer now, and she feels much better at work.",
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
    id: 'r-b1-1',
    level: 'B1',
    title: 'Working from home',
    text: "When companies first sent everyone home to work, most people expected it to last a few weeks. Years later, many teams have never fully returned. Employees say they save hours of commuting and can focus better without constant interruptions. Managers, however, worry about something harder to measure: the short conversations that used to happen by accident. A question asked in a corridor can save a week of confusion, and those moments rarely happen on a scheduled video call.",
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
    text: "People often say that children learn languages easily and adults do not. This is only half true. Children do pick up pronunciation more naturally, but adults learn grammar and vocabulary faster because they already understand how language works. The real difference is time and pressure. A child hears the language for hours every day and is not afraid of making mistakes. An adult practises for twenty minutes and worries about sounding foolish. The learners who succeed are usually not the most talented ones, but the ones who keep going after an embarrassing conversation.",
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
    id: 'r-b2-1',
    level: 'B2',
    title: 'The cost of convenience',
    text: "Every service that promises to save us time quietly asks for something in return. Food arrives in minutes, but the person carrying it is paid by the delivery, not by the hour. Streaming gives us everything at once, and we spend longer choosing than watching. None of this is an argument against convenience; it is an argument for noticing the exchange. The question is not whether these services are useful, but whether we still remember what we traded away to get them.",
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
];

/** Kullanıcının seviyesine en yakın parçayı seçer. */
export function pickPassage(
  level: string,
  excludeIds: string[] = []
): ReadingPassage | null {
  const target = levelIndex(level);

  const available = FALLBACK_PASSAGES.filter((p) => !excludeIds.includes(p.id));
  const pool = available.length > 0 ? available : FALLBACK_PASSAGES;

  // Seviyeye en yakın olanı seç
  return (
    [...pool].sort(
      (a, b) =>
        Math.abs(LEVELS.indexOf(a.level) - target) -
        Math.abs(LEVELS.indexOf(b.level) - target)
    )[0] ?? null
  );
}
