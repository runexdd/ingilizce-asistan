import { nextStage, type AnswerVerdict } from '../core/cardcheck';
import { reviewCard, toISODate, type ReviewGrade } from '../core/srs';
import { isTooHardFor, wordsForLevel } from '../core/wordbank';
import type { InboxPayload } from '../sync/github';
import { newId } from './id';
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

export interface AddCardExtras {
  /** Aynı derecede doğru sayılacak diğer cevaplar */
  accepted?: string[];
  /** Kartın geldiği günün teması */
  theme?: string;
}

/** Aynı kelime zaten varsa hiçbir şey yapmaz. */
export function addCard(
  data: AppData,
  word: string,
  meaning: string,
  example: string | null = null,
  sourceTaskId: string | null = null,
  today: Date = new Date(),
  extras: AddCardExtras = {}
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
        // Her kart en baştan başlar: önce tanıma, sonra yazma, sonra telaffuz
        stage: 1,
        accepted: extras.accepted?.length ? extras.accepted : undefined,
        theme: extras.theme,
      },
    ],
  };
}

/**
 * Öğretmenden ders gelmemişse günün kelimelerini seviye havuzundan doldurur.
 *
 * Neden gerekli: kartlara kelime yalnızca öğretmenden ya da okuma ekranında
 * kelimeye dokunmaktan geliyordu. Senkron yapılmayan bir günde kart ekranı ya
 * boş kalıyor ya da geçmişten kalan, seviyenin çok üstündeki kelimeleri
 * döndürüyordu (A2 profilinde "to be worth it", "to come up with").
 *
 * İki kural:
 *  - **Öğretmen konuştuysa karışma.** Bugüne ait ders varsa hiçbir şey yapılmaz;
 *    kelimeye karar veren hep öğretmendir, burası yedektir.
 *  - **Kotayı aşma.** Bekleyen ve bugün tanıştırılan kartlar sayılır, eksik
 *    kadarı eklenir. Böylece fonksiyon kaç kez çağrılırsa çağrılsın aynı sonucu
 *    verir — her render'da kuyruğa kelime eklenmez.
 */
export function seedDailyWords(
  data: AppData,
  dailyNewWords: number,
  today: Date = new Date()
): AppData {
  const iso = toISODate(today);
  if (data.lesson?.date === iso) return data;

  const introducedToday = data.cards.filter((c) => c.introducedAt === iso).length;

  /**
   * Sırada bekleyen kartlar sayılırken **seviyenin çok üstündekiler sayılmaz.**
   *
   * `getStudyQueue` onları zaten arkaya atıyor; burada da kotayı doldurmuş
   * saymazsak iki fonksiyon aynı şeyi söylemiş olur. Aksi hâlde kullanıcının
   * gerçek durumu ortaya çıkıyordu: destede beş tane B2 kalıbı varken kota
   * dolu görünüyor, yeni kelime eklenmiyor, kuyruk da onları geriye atınca
   * çalışacak hiçbir şey kalmıyordu.
   */
  const waiting = data.cards.filter(
    (c) => !c.introducedAt && !isTooHardFor(c.word, data.profile.level)
  ).length;

  const need = dailyNewWords - introducedToday - waiting;
  if (need <= 0) return data;

  const picks = wordsForLevel(
    data.profile.level,
    need,
    data.cards.map((c) => c.word),
    iso
  );

  let next = data;
  for (const w of picks) {
    next = addCard(next, w.word, w.meaning, w.example, null, today, {
      theme: `${w.level} kelime çalışması`,
    });
  }
  return next;
}

/**
 * Kelime tanıtıldı olarak işaretlenir.
 *
 * Kart bir daha tanıştırma ekranını göstermez; bundan sonra doğrudan sorulur.
 * Sınav sayılmaz, sadece "bu kelimeyi gördü" kaydıdır.
 */
export function markCardTaught(
  data: AppData,
  cardId: string,
  today: Date = new Date()
): AppData {
  const iso = toISODate(today);
  return {
    ...data,
    cards: data.cards.map((card) =>
      card.id === cardId ? { ...card, taughtAt: card.taughtAt ?? iso } : card
    ),
  };
}

/**
 * Kartı 3 aşamalı akışa göre değerlendirir.
 *
 * İki şey birden güncellenir ve bilinçli olarak ayrı tutulur:
 *  - **aşama**: kelimeyi nasıl soracağımız (tanıma → yazma → telaffuz)
 *  - **tekrar takvimi**: kelimeyi ne zaman soracağımız (SM-2)
 *
 * `close` (ufak yazım/telaffuz hatası) doğru sayılır ama aşama ilerlemez;
 * kelime henüz tam oturmamıştır.
 */
export function answerCard(
  data: AppData,
  cardId: string,
  verdict: AnswerVerdict,
  today: Date = new Date()
): AppData {
  const iso = toISODate(today);
  const now = new Date().toISOString();

  return {
    ...data,
    cards: data.cards.map((card) => {
      if (card.id !== cardId) return card;

      const current = (card.stage ?? 1) as 1 | 2 | 3;
      const stage = nextStage(current, verdict);

      /**
       * Kelime **üç basamağı da aynı gün** bitirmeli.
       *
       * Aksi hâlde SM-2 kartı ilk doğru cevapta yarına atıyor ve kullanıcı o
       * gün kelimeyi ne yazıyor ne telaffuz ediyor — ürünün istediği akış
       * bozuluyor. Bu yüzden tekrar takvimi yalnızca **telaffuz aşaması
       * geçildiğinde** işliyor; ara basamaklarda kart bugüne ait kalıyor ve
       * kuyruğun sonuna gidiyor.
       */
      const graduated = current === 3 && verdict === 'correct';

      if (!graduated) {
        return {
          ...card,
          stage,
          dueDate: iso,
          lastResult: verdict,
          lastReviewedAt: iso,
          lastAnsweredAt: now,
          introducedAt: card.introducedAt ?? iso,
        };
      }

      const grade: ReviewGrade = 'good';
      return {
        ...card,
        ...reviewCard(card, grade, today),
        /**
         * Bir sonraki karşılaşmada kelime **yazma** basamağından sorulur.
         * Üç basamaklı merdiven kelimenin tanıştığı gün içindir; sonraki
         * tekrarlarda ölçülmesi gereken şey üretme, yani yazabilmek.
         */
        stage: 2,
        lastResult: verdict,
        lastReviewedAt: iso,
        lastAnsweredAt: now,
        introducedAt: card.introducedAt ?? iso,
        spokenOkAt: card.spokenOkAt ?? iso,
      };
    }),
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
    next = addCard(next, w.word, w.meaning, w.example ?? null, taskId, today, {
      accepted: w.accepted,
    });
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

  /**
   * Günün dersi geldiyse hedef kelimeleri karta çevir.
   *
   * Kartlar, okuma ve konuşma **aynı temanın aynı kelimelerini** dövsün diye
   * tema da karta yazılıyor; kart ekranı günün kelimelerini öne alıyor.
   */
  if (inbox.lesson) {
    for (const w of inbox.lesson.targetWords) {
      next = addCard(next, w.word, w.meaning, w.example ?? null, null, today, {
        accepted: w.accepted,
        theme: inbox.lesson.theme,
      });
    }
  }

  return {
    ...next,
    suggestedTasks: inbox.nextTasks ?? next.suggestedTasks,
    content: inbox.content ?? next.content,
    weeklyReport: inbox.weeklyReport ?? next.weeklyReport,
    plan: inbox.plan ?? next.plan,
    lesson: inbox.lesson ?? next.lesson,
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
