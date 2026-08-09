import { nextStage, type AnswerVerdict } from '../core/cardcheck';
import { reviewCard, toISODate, type ReviewGrade } from '../core/srs';
import { isTooHardFor, wordsForLevel } from '../core/wordbank';
import type { InboxPayload } from '../sync/github';
import { newId } from './id';
import { countIntroducedToday, isContentStale } from './selectors';
import type {
  AppData,
  ConversationMessage,
  ConversationRecord,
  Feedback,
  LevelExamResult,
  Profile,
  SyncState,
  TargetPoint,
  TaskRecord,
} from './types';

/**
 * Değişiklikler. Hepsi saf fonksiyon: mevcut veriyi almaz-değiştirmez,
 * yeni bir AppData döndürür. `useStore().update(...)` ile kullanılır.
 */

export function updateProfile(data: AppData, patch: Partial<Profile>): AppData {
  /**
   * **Seviye değiştiyse damgala.**
   *
   * Bunsuz uygulama seviye değiştiğini fark edemiyordu: kullanıcı A2'den B1'e
   * geçtiği hâlde ekranda hâlâ A2 için seçilmiş dizi bölümü ("The Flash 1.
   * bölüm") duruyordu, çünkü içerik öğretmenden gelen eski pakette yazıyordu.
   * Damga, elimizdeki ders/içerik/sohbetin **eskimiş** olduğunu anlamayı ve
   * ekranda dürüstçe söylemeyi sağlıyor.
   *
   * Seviye içi puan da sıfırlanıyor: B1'e yeni geçen birinin A2'deki 85 puanı
   * artık bir şey ifade etmez, yeniden ölçülmesi gerekir.
   */
  const levelChanged =
    patch.level !== undefined && patch.level !== data.profile.level;

  return {
    ...data,
    profile: {
      ...data.profile,
      ...patch,
      ...(levelChanged
        ? {
            levelChangedAt: new Date().toISOString(),
            levelScore: patch.levelScore ?? undefined,
          }
        : {}),
    },
  };
}

/** Seviye içi puanlama sınavının sonucunu kaydeder ve puanı profile yazar. */
export function saveLevelExam(data: AppData, result: LevelExamResult): AppData {
  return {
    ...data,
    levelExam: result,
    profile: { ...data.profile, levelScore: result.score },
  };
}

export function markLevelExamSynced(data: AppData): AppData {
  if (!data.levelExam) return data;
  return {
    ...data,
    levelExam: { ...data.levelExam, syncState: 'synced' as const },
  };
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

  /**
   * Seviye değiştiyse öğretmenin bugünkü dersi **eski seviyeye aittir** ve
   * yolu tıkamamalıdır. Kullanıcının şikâyeti: *"seviyeyi elle B1 yapıyorum,
   * dinamik olarak yeni kelime gelmiyor, hâlâ eski kelime geliyor."*
   */
  const stale = isContentStale(data);

  /**
   * ⚠️ Burada eskiden "bugüne ait ders varsa hiç karışma" diye erken çıkış
   * vardı. Öğretmenin dersi **seviyeye uygunsa** doğru davranış buydu, ama
   * uygun değilse felaketti: gist'teki ders beş B2 kalıbı hedefliyordu, kuyruk
   * hepsini eliyordu ve ekranda tek kelime kalmıyordu — kullanıcı ya eski
   * kelimeleri ya boş ekran görüyordu.
   *
   * Erken çıkış kaldırıldı; karar kotaya bırakıldı. Öğretmenin gönderdiği
   * kelimeler zaten kart olarak duruyor: seviyeye uygun olanlar `waiting`
   * sayılıp kotayı doldurur ve hiçbir şey tohumlanmaz (normal gün). Hepsi
   * elenirse kota boş kalır ve seviyeye uygun kelimeler devreye girer.
   */

  /**
   * Seviye değişimi günü **sıfırlar.**
   *
   * Elle seviye değiştirmek "bana verilen şey yanlıştı" demektir; o güne ait
   * eski seviyenin kotası yeni seviyeyi kilitlememeli. Bu yüzden:
   *  - henüz hiç çalışılmamış, havuzdan otomatik gelmiş eski kartlar silinir
   *    (kullanıcı verisi değil, uygulamanın kendi tohumu)
   *  - seviye değişiminden önce cevaplanan kartlar günün kotasını doldurmuş
   *    sayılmaz
   *
   * Öğretmenin gönderdiği kartlara ve kullanıcının çalıştığı kartlara
   * dokunulmaz — onlar emek, tohum değil.
   */
  const seededTheme = /^(A1|A2|B1|B2|C1|C2) kelime çalışması$/;
  const base: AppData = stale
    ? {
        ...data,
        cards: data.cards.filter(
          (c) => c.introducedAt || !(c.theme && seededTheme.test(c.theme))
        ),
      }
    : data;

  // Kuyrukla **ortak** sayaç — ikisi ayrı sayarsa kelime eklenir ama görünmez
  const introducedToday = countIntroducedToday(base, today);

  /**
   * Sırada bekleyen kartlar sayılırken **seviyenin çok üstündekiler sayılmaz.**
   *
   * `getStudyQueue` onları zaten arkaya atıyor; burada da kotayı doldurmuş
   * saymazsak iki fonksiyon aynı şeyi söylemiş olur. Aksi hâlde kullanıcının
   * gerçek durumu ortaya çıkıyordu: destede beş tane B2 kalıbı varken kota
   * dolu görünüyor, yeni kelime eklenmiyor, kuyruk da onları geriye atınca
   * çalışacak hiçbir şey kalmıyordu.
   */
  const waiting = base.cards.filter(
    (c) => !c.introducedAt && !isTooHardFor(c.word, base.profile.level)
  ).length;

  const need = dailyNewWords - introducedToday - waiting;
  if (need <= 0) return base;

  const picks = wordsForLevel(
    base.profile.level,
    need,
    base.cards.map((c) => c.word),
    iso
  );

  let next = base;
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

/* -------------------------------------------------------------- içerik */

/**
 * İçerik önerisini tamamlandı olarak işaretler.
 *
 * İki yere yazılır: `content` içindeki öğeye (ekranda tik görünsün) ve kalıcı
 * `contentDone` günlüğüne (öğretmen diziyi kaldığı bölümden sürdürebilsin —
 * `content` her senkronda üzerine yazılıyor).
 */
export function markContentDone(
  data: AppData,
  title: string,
  today: Date = new Date()
): AppData {
  const iso = toISODate(today);
  const item = data.content.find((c) => c.title === title);
  if (!item || item.done) return data;

  return {
    ...data,
    content: data.content.map((c) =>
      c.title === title ? { ...c, done: true, doneAt: iso } : c
    ),
    contentDone: [
      ...(data.contentDone ?? []).filter((d) => d.title !== title),
      { type: item.type, title: item.title, date: iso },
    ],
  };
}

/* ------------------------------------------------------- günün sohbeti */

/**
 * Sohbeti başlatır — öğretmenin ilk repliğiyle birlikte kayıt açar.
 *
 * Aynı gün ikinci kez başlatılırsa var olan kayda döner; sohbet yarıda
 * kalmışsa kullanıcı kaldığı yerden devam etsin diye.
 */
export function startConversation(
  data: AppData,
  today: Date = new Date()
): AppData {
  const plan = data.conversationPlan;
  if (!plan) return data;

  /**
   * Günde tek sohbet. Bitmiş sohbet için yenisi açılmaz — kullanıcı ekranı
   * tekrar açtığında konuşmasını okur. Yarım kalmışsa kaldığı yerden devam
   * eder; her açılışta yeni kayıt açmak günün verisini ikiye böler.
   */
  const iso = toISODate(today);
  if (data.conversations.some((c) => c.date === iso)) return data;

  const record: ConversationRecord = {
    id: newId('conv'),
    date: iso,
    topic: plan.topic,
    messages: [
      {
        role: 'teacher',
        text: plan.turns[0]?.say ?? plan.closing,
        at: new Date().toISOString(),
      },
    ],
    turnsDone: 0,
    turnsTotal: plan.turns.length,
    spokenTurns: 0,
    finished: false,
    syncState: 'pending',
  };

  return { ...data, conversations: [...data.conversations, record] };
}

export function addConversationMessage(
  data: AppData,
  conversationId: string,
  message: ConversationMessage,
  turnsDone?: number
): AppData {
  return {
    ...data,
    conversations: data.conversations.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            messages: [...c.messages, message],
            turnsDone: turnsDone ?? c.turnsDone,
            spokenTurns:
              message.role === 'user' && message.via === 'mic'
                ? c.spokenTurns + 1
                : c.spokenTurns,
          }
        : c
    ),
  };
}

/**
 * Sohbeti bitirir.
 *
 * Bitiş kararı öğretmenindir (senaryonun son turu). Kullanıcı erken çıkarsa
 * kayıt `finished: false` kalır ve yine de öğretmene gider — yarım bırakılan
 * sohbet de bir veridir.
 */
export function finishConversation(
  data: AppData,
  conversationId: string
): AppData {
  return {
    ...data,
    conversations: data.conversations.map((c) =>
      c.id === conversationId ? { ...c, finished: true } : c
    ),
  };
}

export function markConversationsSynced(
  data: AppData,
  ids: string[]
): AppData {
  const set = new Set(ids);
  return {
    ...data,
    conversations: data.conversations.map((c) =>
      set.has(c.id) ? { ...c, syncState: 'synced' as const } : c
    ),
  };
}

/* --------------------------------------------------------- hedef geçmişi */

/**
 * Bugünkü hedef tahminini geçmişe işler.
 *
 * Günde tek kayıt: aynı gün tekrar çağrılırsa üzerine yazar. Böylece
 * "dün 80'di, bugün 78" karşılaştırması gerçekten günler arası olur.
 */
export function recordTargetPoint(
  data: AppData,
  point: TargetPoint
): AppData {
  const history = data.targetHistory ?? [];
  const existing = history.find((p) => p.date === point.date);
  if (existing && existing.daysRemaining === point.daysRemaining) return data;

  return {
    ...data,
    targetHistory: [...history.filter((p) => p.date !== point.date), point].sort(
      (a, b) => (a.date < b.date ? -1 : 1)
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
  /**
   * Seviye içi puanı öğretmen günceller.
   *
   * Sınav bir başlangıç ölçümü; asıl kaynak günlük performans. Öğretmen bu
   * sayıyı her senkronda azar azar oynatıyor ve içerik seçimini buna göre
   * yapıyor — "B1" etiketi tek başına yetmiyor, B1'in başı ile sonu aynı
   * içeriği kaldırmıyor.
   */
  if (typeof inbox.levelScoreSuggestion === 'number') {
    profilePatch.levelScore = Math.max(0, Math.min(100, inbox.levelScoreSuggestion));
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

  /**
   * Öğretmenin sohbet değerlendirmeleri kayda işlenir.
   *
   * Sohbet yapıldığı gün uygulama yalnızca yazım/noktalama uyarısı verebiliyor
   * (canlı yapay zekâ yok). Asıl düzeltme burada geliyor: kullanıcı sohbeti
   * açtığında öğretmenin cümle cümle düzeltmelerini görüyor.
   */
  let conversations = next.conversations;
  for (const item of inbox.conversationReviews ?? []) {
    conversations = conversations.map((c) =>
      c.id === item.conversationId ? { ...c, review: item.review } : c
    );
  }

  /**
   * İçerik önerileri yenilenirken **tamamlananlar korunur.**
   * Öğretmen aynı diziyi/şarkıyı tekrar gönderdiyse (çok bölümlü içerik)
   * kullanıcının "izledim" işareti silinmemeli.
   */
  const doneTitles = new Set((next.contentDone ?? []).map((d) => d.title));
  const content = (inbox.content ?? next.content).map((c) =>
    doneTitles.has(c.title)
      ? {
          ...c,
          done: true,
          doneAt: (next.contentDone ?? []).find((d) => d.title === c.title)?.date,
        }
      : c
  );

  return {
    ...next,
    suggestedTasks: inbox.nextTasks ?? next.suggestedTasks,
    content,
    weeklyReport: inbox.weeklyReport ?? next.weeklyReport,
    plan: inbox.plan ?? next.plan,
    lesson: inbox.lesson ?? next.lesson,
    conversationPlan: inbox.conversation ?? next.conversationPlan,
    conversations,
    scores,
    /**
     * Paketin **üretildiği** an saklanıyor (indiği an değil).
     * `profile.levelChangedAt` bundan yeniyse elimizdeki içerik eski seviyeye
     * göre yazılmış demektir ve ekran onu "eskimiş" diye işaretler.
     */
    lastInboxAt: inbox.generatedAt ?? new Date().toISOString(),
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
