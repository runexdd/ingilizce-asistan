/**
 * GitHub köprüsü — telefon ile Claude Code arasındaki posta kutusu.
 *
 * Neden gist: uygulamanın kodu herkese açık bir depoda (yayınlanabilmesi için),
 * ama kullanıcının yazdıkları gizli kalmalı. Gizli (secret) gist tam bunu verir:
 * ücretsiz, adresi bilinmeden bulunamaz, sadece jeton sahibi yazabilir.
 *
 * Bu dosya uygulamadaki TEK ağ noktasıdır. İleride gerçek bir sunucuya
 * geçilecekse sadece burası değişir.
 */

import { transcriptText } from '../core/conversation';
import {
  actualWeeklyMinutes,
  measureMomentum,
  measureProgress,
} from '../core/progress';
import { addDays, toISODate } from '../core/srs';
import { describeTastes } from '../core/tastes';
import {
  getTodayWordProgress,
  isLevelStale,
  type WordProgress,
} from '../db/selectors';
import type {
  AppData,
  ContentSuggestion,
  ConversationPlan,
  ConversationReview,
  DailyLesson,
  Feedback,
  LevelExamResult,
  SuggestedTask,
  Tastes,
  TaskRecord,
  TeacherPlan,
  TeacherScore,
} from '../db/types';

const API = 'https://api.github.com';
const GIST_DESCRIPTION = 'ingilizce-asistan · senkron (silme)';
const OUTBOX_FILE = 'outbox.json';
const INBOX_FILE = 'inbox.json';

export interface OutboxTask {
  id: string;
  kind: string;
  prompt: string;
  userResponse: string;
  date: string;
}

/** Yapılmış bir sohbetin öğretmene giden hâli */
export interface OutboxConversation {
  id: string;
  date: string;
  topic: string;
  /** Okunabilir döküm — öğretmen bunu okuyup düzeltir */
  transcript: string;
  turnsDone: number;
  turnsTotal: number;
  finished: boolean;
  /** Kaç cevabı mikrofonla verdi */
  spokenTurns: number;
  /** Uygulamanın yerel kurallarla yakaladıkları — öğretmen tekrar etmesin */
  instantNotes: string[];
}

/** Telefon → Claude Code */
export interface OutboxPayload {
  generatedAt: string;
  profile: {
    level: string;
    /**
     * **Seviyenin neresinde — 0-100.** "B1" bir aralıktır; B1'in başındaki
     * kişiyle sonundaki kişi aynı içeriği kaldırmaz. İçerik, kelime sayısı ve
     * görev boyu seçilirken bakılacak asıl sayı budur.
     */
    levelScore?: number;
    /** Seviye en son ne zaman değişti (ISO) — eski içerik tespiti için */
    levelChangedAt?: string;
    /** Seviye bu paketten sonra mı değişti — öyleyse içeriği baştan kur */
    levelJustChanged?: boolean;
    goals: string;
    weakestSkill?: string;
    weekdayMinutes: number;
    weekendMinutes: number;
    /** Zevkleri — okunabilir özet ("Müzik: Rock, Metal · Dizi/film: …") */
    interests?: string;
    /** Zevklerin ham hâli — aşamalı seçimden gelen anahtarlar */
    tastes?: Tastes;
  };
  /** Seviye içi puanlama sınavının son sonucu — öğretmen puanı düzeltecek */
  levelExam?: LevelExamResult;
  /** Düzeltme bekleyen görevler */
  pendingTasks: OutboxTask[];
  /**
   * Kullanıcının öğretmene sorduğu, henüz cevaplanmamış serbest sorular.
   * Öğretmen `inbox.answers` içinde aynı `id` ile cevaplar.
   */
  questions?: Array<{ id: string; text: string; askedAt: string }>;
  /** En sık tekrarlanan hatalar — görev üretiminin girdisi */
  recentErrors: Array<{ category: string; count: number; example: string | null }>;
  stats: { cardCount: number; dueCardCount: number; streakDays: number };
  /** Zaten kartta olan kelimeler — Claude aynısını tekrar önermesin */
  knownWords: string[];
  /**
   * Uygulamanın objektif ölçümleri — öğretmenin karar verirken bakacağı veri.
   * Bunlar hesaplanır, yorumlanmaz; yorum öğretmenin işi.
   */
  measurements: {
    /** 0-100, son 14 gün */
    consistency: number;
    output: number;
    retention: number;
    overall: number;
    /** Son 4 haftanın gerçek haftalık dakikası */
    weeklyMinutes: number;
    /** Son 14 gün ile önceki 14 günün farkı */
    momentum: string;
    momentumDelta: number;
    /** Son çalışmadan bu yana geçen gün */
    daysSinceLastSession: number;
  };
  /**
   * Bugünün ders kelimelerinin kart durumu.
   *
   * Kartlar üç aşamadan geçiyor: tanıma → yazma → telaffuz. Bu liste her
   * kelimenin hangi basamakta olduğunu ve telaffuzu geçip geçmediğini
   * söyler. Öğretmen buna bakıp **günün kelimeleri oturdu mu** kararını
   * verir; uygulama bu kararı vermez, sadece ölçer.
   */
  wordProgress: WordProgress[];
  /**
   * Değerlendirilmeyi bekleyen sohbetler.
   *
   * Ürünün yeni ayağı: her gün kullanıcının ilgi alanından (dizi bölümü,
   * şarkı) bir konu üstüne konuşuluyor. Uygulama sohbeti yürütür ama
   * **yargılamaz** — düzeltme, doğal karşılık ve akıcılık puanı öğretmenin işi.
   */
  conversations: OutboxConversation[];
  /**
   * Tamamlanan içerikler — hangi bölüm izlendi, hangi şarkı dinlendi.
   * Öğretmen diziyi kaldığı bölümden sürdürür; aynı bölümü iki kez vermez.
   */
  contentLog: Array<{ type: string; title: string; date: string }>;
  /** Bugün önerilip henüz yapılmamış içerikler */
  contentPending: Array<{ type: string; title: string }>;
  /**
   * Hedef tarihinin son 14 günü.
   *
   * Öğretmen `remainingHours`'ı oynatırken buraya bakar: sayı zaten dün
   * kısaldıysa bugün bir daha kısaltmak abartı olur.
   */
  targetHistory: Array<{ date: string; level: string; daysRemaining: number }>;
  /** Öğretmenin mevcut planı — varsa üzerine karar verir */
  currentPlan?: TeacherPlan;
}

/** Claude Code → telefon */
export interface InboxPayload {
  generatedAt: string;
  /** Görev kimliğine göre düzeltmeler */
  feedback: Array<{ taskId: string } & Feedback>;
  /** Yarının görevleri */
  nextTasks: SuggestedTask[];
  /**
   * Seviye önerisi — dinamik ayarlama.
   * Kullanıcı seviyesini kendi seçmiş olsa bile, gerçek performansına göre
   * Claude Code burayı günceller; seviye sabit bir kapı değil, kayan bir başlangıçtır.
   */
  levelSuggestion?: string;
  /**
   * Zayıf alan tespiti — 'grammar' | 'vocabulary' | 'reading' | 'production'.
   * Kullanıcı seviyesini kendi seçtiyse sınav sonucu olmadığı için burası boş kalır;
   * ilk düzeltmeden sonra gerçek hatalardan belirlenir.
   */
  weakestSkillSuggestion?: string;
  /**
   * Seviye içi puan önerisi (0-100).
   *
   * Sınav bir başlangıç ölçümü; asıl kaynak günlük performans. Öğretmen bunu
   * her senkronda azar azar oynatır ve içerik seçimini buna göre yapar.
   */
  levelScoreSuggestion?: number;
  /** Haftalık rapor metni (pazar günleri) */
  weeklyReport?: string;
  content?: ContentSuggestion[];
  /**
   * Öğretmenin güncellediği plan — hedef seviye, kalan saat, günlük kelime
   * sayısı, odak. Karar verici öğretmendir; uygulama sadece uygular.
   */
  plan?: TeacherPlan;
  /** Öğretmenin bugünkü puanlaması */
  score?: TeacherScore;
  /**
   * Günün dersi — tema, hedef kelimeler, okuma parçası ve sözlük.
   * Tüm görevler bu kelimelere bağlanır.
   */
  lesson?: DailyLesson;
  /**
   * Günün sohbeti — öğretmenin önceden yazdığı senaryo.
   *
   * Telefonda canlı yapay zekâ yok; öğretmen o günün dizisini/şarkısını ve
   * kullanıcının seviyesini bilerek turları önceden yazıyor, uygulama
   * yürütüyor. Detaylı kural `.claude/commands/ogretmen.md` §5.1'de.
   */
  conversation?: ConversationPlan;
  /**
   * Aynı gün için yazılmış **yedek sohbetler** (en fazla 2-3).
   *
   * Kullanıcı "başka bir sohbet ver" dediğinde öğretmeni yeniden çalıştırmak
   * 1-2 dakika bekletir; onun yerine öğretmen paketi hazırlarken birkaç
   * alternatif yazıyor ve geçiş anında oluyor. Maliyeti sohbet başına
   * ~350 jeton. Kural `ogretmen.md` §5.1'de.
   */
  conversationAlternatives?: ConversationPlan[];
  /**
   * Kullanıcının sorduğu serbest sorulara cevaplar.
   * `id` outbox'taki `questions[].id` ile birebir aynı olmalı.
   */
  answers?: Array<{ id: string; answer: string }>;
  /** Bir önceki günün sohbetlerine yazılan değerlendirmeler */
  conversationReviews?: Array<{
    conversationId: string;
    review: ConversationReview;
  }>;
}

/* ------------------------------------------------------------- yardımcı */

async function api(
  path: string,
  token: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
}

export interface TokenCheck {
  ok: boolean;
  login?: string;
  error?: string;
}

/** Jetonun geçerli olduğunu ve gist yetkisi bulunduğunu doğrular. */
export async function validateToken(token: string): Promise<TokenCheck> {
  try {
    const res = await api('/user', token);
    if (res.status === 401) {
      return { ok: false, error: 'Jeton geçersiz veya süresi dolmuş.' };
    }
    if (!res.ok) {
      return { ok: false, error: `GitHub yanıtı: ${res.status}` };
    }
    const user = (await res.json()) as { login: string };

    // gist yetkisi var mı — jetonun izinleri yanıt başlığında listelenir
    const scopes = res.headers.get('x-oauth-scopes') ?? '';
    if (scopes && !scopes.split(',').map((s) => s.trim()).includes('gist')) {
      return {
        ok: false,
        login: user.login,
        error: "Jetonda 'gist' izni yok. Yeni jeton oluştururken gist kutusunu işaretle.",
      };
    }

    return { ok: true, login: user.login };
  } catch {
    return { ok: false, error: 'Bağlantı kurulamadı. İnternetini kontrol et.' };
  }
}

/**
 * Senkron gist'ini bulur, yoksa oluşturur.
 * Gizli (secret) olarak açılır: bağlantıyı bilmeyen bulamaz.
 */
export async function ensureGist(
  token: string,
  knownId?: string
): Promise<{ gistId: string } | { error: string }> {
  try {
    if (knownId) {
      const res = await api(`/gists/${knownId}`, token);
      if (res.ok) return { gistId: knownId };
      // 404 ise aşağıda yenisi oluşturulur
    }

    // Aynı açıklamaya sahip bir gist zaten var mı
    const list = await api('/gists?per_page=100', token);
    if (list.ok) {
      const gists = (await list.json()) as Array<{ id: string; description: string }>;
      const found = gists.find((g) => g.description === GIST_DESCRIPTION);
      if (found) return { gistId: found.id };
    }

    const created = await api('/gists', token, {
      method: 'POST',
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: {
          [OUTBOX_FILE]: { content: '{}' },
          [INBOX_FILE]: { content: '{}' },
        },
      }),
    });

    if (!created.ok) {
      return { error: `Gist oluşturulamadı (${created.status}).` };
    }
    const gist = (await created.json()) as { id: string };
    return { gistId: gist.id };
  } catch {
    return { error: 'Bağlantı kurulamadı.' };
  }
}

/** Uygulamanın verisinden gönderilecek paketi hazırlar. */
export function buildOutbox(data: AppData): OutboxPayload {
  const pending = data.tasks.filter(
    (t: TaskRecord) => t.syncState === 'pending' && t.userResponse.trim().length > 0
  );

  const today = new Date();
  const dueCount = data.cards.filter((c) => c.dueDate <= toISODate(today)).length;

  const snapshot = measureProgress(data, today);
  const momentum = measureMomentum(data, today);

  const lastDate = data.sessions.map((s) => s.date).sort().at(-1);
  const daysSince = lastDate
    ? Math.round(
        (new Date(toISODate(today) + 'T00:00:00').getTime() -
          new Date(lastDate + 'T00:00:00').getTime()) /
          86400000
      )
    : -1;

  /**
   * Henüz değerlendirilmemiş sohbetler. Yarım bırakılanlar da gider —
   * "başlayıp üçüncü turda bıraktı" bilgisi öğretmen için değerlidir.
   */
  const pendingConversations = data.conversations
    .filter((c) => c.syncState === 'pending' && c.messages.some((m) => m.role === 'user'))
    .map((c) => ({
      id: c.id,
      date: c.date,
      topic: c.topic,
      transcript: transcriptText(c),
      turnsDone: c.turnsDone,
      turnsTotal: c.turnsTotal,
      finished: c.finished,
      spokenTurns: c.spokenTurns,
      instantNotes: Array.from(
        new Set(c.messages.flatMap((m) => m.notes ?? []))
      ),
    }));

  const historyStart = toISODate(addDays(today, -13));

  return {
    generatedAt: new Date().toISOString(),
    profile: {
      level: data.profile.level,
      levelScore: data.profile.levelScore,
      levelChangedAt: data.profile.levelChangedAt,
      // Öğretmene giden bayrak **seviye** içindir; zevk değişimi ayrı alanda
      levelJustChanged: isLevelStale(data),
      goals: data.profile.goals,
      weakestSkill: data.profile.weakestSkill,
      weekdayMinutes: data.profile.weekdayMinutes,
      weekendMinutes: data.profile.weekendMinutes,
      interests: describeTastes(data.profile.tastes) || undefined,
      tastes: data.profile.tastes,
    },
    levelExam:
      data.levelExam?.syncState === 'pending' ? data.levelExam : undefined,
    pendingTasks: pending.map((t) => ({
      id: t.id,
      kind: t.kind,
      prompt: t.prompt,
      userResponse: t.userResponse,
      date: t.date,
    })),
    // Cevaplanmamış sorular her pakette gider — öğretmen bir turu kaçırırsa kaybolmasın
    questions: (data.teacherQuestions ?? [])
      .filter((q) => !q.answer)
      .map((q) => ({ id: q.id, text: q.text, askedAt: q.askedAt })),
    recentErrors: [...data.errors]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((e) => ({
        category: e.category,
        count: e.count,
        example: e.exampleSentence,
      })),
    stats: {
      cardCount: data.cards.length,
      dueCardCount: dueCount,
      streakDays: data.sessions.length,
    },
    knownWords: data.cards.map((c) => c.word),
    measurements: {
      consistency: snapshot.consistency,
      output: snapshot.output,
      retention: snapshot.retention,
      overall: snapshot.overall,
      weeklyMinutes: Math.round(actualWeeklyMinutes(data)),
      momentum: momentum.direction,
      momentumDelta: momentum.delta,
      daysSinceLastSession: daysSince,
    },
    wordProgress: getTodayWordProgress(data, today),
    conversations: pendingConversations,
    contentLog: (data.contentDone ?? []).slice(-30),
    contentPending: data.content
      .filter((c) => !c.done)
      .map((c) => ({ type: c.type, title: c.title })),
    targetHistory: (data.targetHistory ?? [])
      .filter((p) => p.date >= historyStart)
      .map((p) => ({
        date: p.date,
        level: p.level,
        daysRemaining: p.daysRemaining,
      })),
    currentPlan: data.plan,
  };
}

export async function pushOutbox(
  token: string,
  gistId: string,
  payload: OutboxPayload
): Promise<{ ok: true } | { error: string }> {
  try {
    const res = await api(`/gists/${gistId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({
        files: { [OUTBOX_FILE]: { content: JSON.stringify(payload, null, 2) } },
      }),
    });
    return res.ok ? { ok: true } : { error: `Gönderilemedi (${res.status}).` };
  } catch {
    return { error: 'Bağlantı kurulamadı.' };
  }
}

export async function pullInbox(
  token: string,
  gistId: string
): Promise<{ inbox: InboxPayload | null } | { error: string }> {
  try {
    const res = await api(`/gists/${gistId}`, token);
    if (!res.ok) return { error: `Okunamadı (${res.status}).` };

    const gist = (await res.json()) as {
      files: Record<string, { content?: string; truncated?: boolean; raw_url?: string }>;
    };
    const file = gist.files?.[INBOX_FILE];
    if (!file) return { inbox: null };

    let content = file.content ?? '';
    // Büyük dosyalar kısaltılmış gelir; tam halini ayrı adresten çek
    if (file.truncated && file.raw_url) {
      content = await (await fetch(file.raw_url)).text();
    }
    if (!content.trim() || content.trim() === '{}') return { inbox: null };

    const parsed = JSON.parse(content) as InboxPayload;
    if (!parsed || typeof parsed !== 'object') return { inbox: null };
    return { inbox: parsed };
  } catch {
    return { error: 'Gelen kutusu okunamadı (bozuk veri olabilir).' };
  }
}
