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

import type {
  AppData,
  ContentSuggestion,
  Feedback,
  SuggestedTask,
  TaskRecord,
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

/** Telefon → Claude Code */
export interface OutboxPayload {
  generatedAt: string;
  profile: {
    level: string;
    goals: string;
    weakestSkill?: string;
    weekdayMinutes: number;
    weekendMinutes: number;
  };
  /** Düzeltme bekleyen görevler */
  pendingTasks: OutboxTask[];
  /** En sık tekrarlanan hatalar — görev üretiminin girdisi */
  recentErrors: Array<{ category: string; count: number; example: string | null }>;
  stats: { cardCount: number; dueCardCount: number; streakDays: number };
  /** Zaten kartta olan kelimeler — Claude aynısını tekrar önermesin */
  knownWords: string[];
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
  /** Haftalık rapor metni (pazar günleri) */
  weeklyReport?: string;
  content?: ContentSuggestion[];
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

  const dueCount = data.cards.filter(
    (c) => c.dueDate <= new Date().toISOString().slice(0, 10)
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    profile: {
      level: data.profile.level,
      goals: data.profile.goals,
      weakestSkill: data.profile.weakestSkill,
      weekdayMinutes: data.profile.weekdayMinutes,
      weekendMinutes: data.profile.weekendMinutes,
    },
    pendingTasks: pending.map((t) => ({
      id: t.id,
      kind: t.kind,
      prompt: t.prompt,
      userResponse: t.userResponse,
      date: t.date,
    })),
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
