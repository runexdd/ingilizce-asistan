import { reviewCard, toISODate, type ReviewGrade } from '../core/srs';
import type { InboxPayload } from '../sync/github';
import { newId } from './store';
import type { AppData, Feedback, Profile, SyncState, TaskRecord } from './types';

/**
 * Değişiklikler. Hepsi saf fonksiyon: mevcut veriyi almaz-değiştirmez,
 * yeni bir AppData döndürür. `useStore().update(...)` ile kullanılır.
 */

export function updateProfile(data: AppData, patch: Partial<Profile>): AppData {
  return { ...data, profile: { ...data.profile, ...patch } };
}

/** Kartı değerlendirir ve yeni tekrar tarihini yazar. */
export function gradeCard(
  data: AppData,
  cardId: string,
  grade: ReviewGrade,
  today: Date = new Date()
): AppData {
  return {
    ...data,
    cards: data.cards.map((card) => {
      if (card.id !== cardId) return card;
      const next = reviewCard(card, grade, today);
      return { ...card, ...next };
    }),
  };
}

/** Aynı kelime zaten varsa hiçbir şey yapmaz. */
export function addCard(
  data: AppData,
  word: string,
  meaning: string,
  example: string | null = null,
  sourceTaskId: string | null = null,
  today: Date = new Date()
): AppData {
  const normalized = word.trim().toLowerCase();
  if (data.cards.some((c) => c.word.trim().toLowerCase() === normalized)) {
    return data;
  }

  const iso = toISODate(today);
  return {
    ...data,
    cards: [
      ...data.cards,
      {
        id: newId('card'),
        word: word.trim(),
        meaning,
        example,
        ease: 2.5,
        intervalDays: 0,
        repetitions: 0,
        dueDate: iso,
        createdAt: iso,
        sourceTaskId,
      },
    ],
  };
}

/** Aynı kategori tekrar görülürse sayacı artırır, yoksa yeni kayıt açar. */
export function recordError(
  data: AppData,
  category: string,
  exampleSentence: string | null = null,
  today: Date = new Date()
): AppData {
  const iso = toISODate(today);
  const existing = data.errors.find((e) => e.category === category);

  if (!existing) {
    return {
      ...data,
      errors: [...data.errors, { category, count: 1, lastSeen: iso, exampleSentence }],
    };
  }

  return {
    ...data,
    errors: data.errors.map((e) =>
      e.category === category
        ? {
            ...e,
            count: e.count + 1,
            lastSeen: iso,
            exampleSentence: exampleSentence ?? e.exampleSentence,
          }
        : e
    ),
  };
}

export function saveTaskResponse(
  data: AppData,
  params: { kind: string; prompt: string; userResponse: string },
  today: Date = new Date()
): AppData {
  const iso = toISODate(today);
  const task: TaskRecord = {
    id: newId('task'),
    date: iso,
    kind: params.kind,
    prompt: params.prompt,
    userResponse: params.userResponse,
    feedback: null,
    status: 'submitted',
    syncState: 'pending',
    createdAt: iso,
  };
  return { ...data, tasks: [...data.tasks, task] };
}

/**
 * Köprüden (Faz 4) gelen düzeltmeyi işler:
 * geri bildirimi göreve yazar, hataları sayaçlara ekler, kelimeleri karta çevirir.
 */
export function applyFeedback(
  data: AppData,
  taskId: string,
  feedback: Feedback,
  today: Date = new Date()
): AppData {
  let next: AppData = {
    ...data,
    tasks: data.tasks.map((t) =>
      t.id === taskId
        ? { ...t, feedback, status: 'corrected' as const, syncState: 'synced' as const }
        : t
    ),
  };

  for (const err of feedback.errors) {
    next = recordError(next, err.category, err.explanation, today);
  }
  for (const w of feedback.newWords) {
    next = addCard(next, w.word, w.meaning, w.example ?? null, taskId, today);
  }

  return next;
}

/**
 * Düzeltmeleri okundu olarak işaretler.
 * Ana ekrandaki "düzeltme hazır" kartı böylece kaybolur — kalıcı bir rozet
 * gibi durup kullanıcıyı rahatsız etmez.
 */
export function markFeedbackSeen(data: AppData): AppData {
  return {
    ...data,
    tasks: data.tasks.map((t) =>
      t.feedback !== null && !t.feedbackSeen ? { ...t, feedbackSeen: true } : t
    ),
  };
}

/* ------------------------------------------------------------------ köprü */

export function setSync(data: AppData, patch: Partial<SyncState>): AppData {
  return { ...data, sync: { ...data.sync, ...patch } };
}

/** Gönderilen görevleri "senkron edildi" olarak işaretler. */
export function markTasksSynced(data: AppData, taskIds: string[]): AppData {
  const ids = new Set(taskIds);
  return {
    ...data,
    tasks: data.tasks.map((t) =>
      ids.has(t.id) ? { ...t, syncState: 'synced' as const } : t
    ),
  };
}

/**
 * Claude Code'dan gelen paketi uygular:
 * düzeltmeleri işler, seviyeyi ve zayıf alanı günceller, görev ve içerik
 * önerilerini kaydeder.
 *
 * Seviye ve zayıf alan burada güncellendiği için sistem dinamiktir:
 * kullanıcı seviyesini kendi seçmiş olsa bile, gerçek performansı zamanla
 * doğru değeri bulur.
 */
export function applyInbox(
  data: AppData,
  inbox: InboxPayload,
  today: Date = new Date()
): AppData {
  let next = data;

  for (const item of inbox.feedback ?? []) {
    const { taskId, ...feedback } = item;
    next = applyFeedback(next, taskId, feedback as Feedback, today);
  }

  const profilePatch: Partial<Profile> = {};
  if (inbox.levelSuggestion) profilePatch.level = inbox.levelSuggestion;
  if (inbox.weakestSkillSuggestion) {
    profilePatch.weakestSkill = inbox.weakestSkillSuggestion;
  }
  if (Object.keys(profilePatch).length > 0) {
    next = updateProfile(next, profilePatch);
  }

  // Öğretmen puanı: aynı güne ikinci puan gelirse üzerine yaz, çoğaltma
  let scores = next.scores;
  if (inbox.score) {
    scores = [...scores.filter((s) => s.date !== inbox.score!.date), inbox.score].sort(
      (a, b) => (a.date < b.date ? -1 : 1)
    );
  }

  return {
    ...next,
    suggestedTasks: inbox.nextTasks ?? next.suggestedTasks,
    content: inbox.content ?? next.content,
    weeklyReport: inbox.weeklyReport ?? next.weeklyReport,
    plan: inbox.plan ?? next.plan,
    scores,
    sync: { ...next.sync, lastPullAt: new Date().toISOString() },
  };
}

/** Günlük oturumu kaydeder — seri ve ilerleme grafiği bunu kullanır. */
export function recordSession(
  data: AppData,
  minutesSpent: number,
  today: Date = new Date()
): AppData {
  const iso = toISODate(today);
  const existing = data.sessions.find((s) => s.date === iso);

  if (!existing) {
    return {
      ...data,
      sessions: [...data.sessions, { date: iso, minutesSpent, tasksCompleted: 1 }],
    };
  }

  return {
    ...data,
    sessions: data.sessions.map((s) =>
      s.date === iso
        ? {
            ...s,
            minutesSpent: s.minutesSpent + minutesSpent,
            tasksCompleted: s.tasksCompleted + 1,
          }
        : s
    ),
  };
}
