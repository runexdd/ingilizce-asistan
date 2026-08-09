/**
 * Uygulamanın tüm verisinin şekli.
 *
 * Veri küçük (birkaç yüz kart, birkaç yüz kayıt) olduğu için tek bir JSON
 * belgesi olarak tutuluyor. SQLite'a göre avantajı: tarayıcıda, telefonda ve
 * ileride gerçek uygulamada tamamen aynı şekilde çalışması.
 */

export interface Profile {
  /** CEFR seviyesi: A1, A2, B1, B2, C1, C2 — yerleştirme sınavı belirler */
  level: string;
  /** Virgülle ayrılmış hedefler: 'gunluk,is' gibi */
  goals: string;
  weekdayMinutes: number;
  weekendMinutes: number;
  /** Yerleştirme sınavı yapıldı mı */
  placementDone: boolean;
  /** Sınavda en düşük çıkan beceri — görev üretiminde önceliklendirilir */
  weakestSkill?: string;
  /** Sınavın yapıldığı tarih, 'YYYY-MM-DD' — aylık yeniden ölçüm için */
  placementDate?: string;
}

export interface Card {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  /** Kolaylık katsayısı (SM-2) */
  ease: number;
  intervalDays: number;
  repetitions: number;
  /** 'YYYY-MM-DD' */
  dueDate: string;
  createdAt: string;
  sourceTaskId: string | null;
}

export interface ErrorCategory {
  category: string;
  count: number;
  lastSeen: string;
  exampleSentence: string | null;
}

export interface FeedbackError {
  category: string;
  explanation: string;
}

export interface Feedback {
  corrected: string;
  natural: string;
  errors: FeedbackError[];
  newWords: Array<{ word: string; meaning: string; example?: string }>;
}

export type TaskKind =
  | 'writing-micro'
  | 'writing-long'
  | 'reading'
  | 'listening'
  | 'speaking';

export interface TaskRecord {
  id: string;
  date: string;
  kind: TaskKind | string;
  prompt: string;
  userResponse: string;
  feedback: Feedback | null;
  status: 'submitted' | 'corrected';
  /** Köprüye gönderildi mi (Faz 4) */
  syncState: 'pending' | 'synced';
  createdAt: string;
}

export interface SessionRecord {
  /** 'YYYY-MM-DD' */
  date: string;
  minutesSpent: number;
  tasksCompleted: number;
}

/**
 * Öğretmenin (Claude Code) belirlediği plan.
 *
 * Uygulama bu planı ÜRETMEZ, sadece uygular ve ölçer. Karar verici öğretmendir;
 * her senkronda kullanıcının gerçek verisine bakıp burayı günceller.
 */
export interface TeacherPlan {
  /** Hedeflenen bir sonraki seviye */
  targetLevel: string;
  /** Öğretmenin tahmini varış tarihi, 'YYYY-MM-DD' */
  targetDate?: string;
  /** Bu seviye için kalan tahmini çalışma saati */
  remainingHours: number;
  /** Öğretmenin bugün için uygun gördüğü yeni kelime sayısı */
  dailyNewWords: number;
  /** Öğretmenin önerdiği günlük dakika */
  dailyMinutes: number;
  /** Üzerine gidilecek hata kategorileri */
  focus: string[];
  /** Öğretmenin kullanıcıya kısa notu (Türkçe) */
  note: string;
  updatedAt: string;
}

/**
 * Öğretmenin verdiği günlük puanlar.
 *
 * Bunlar makine tarafından hesaplanamaz — insan/öğretmen yargısı gerektirir.
 * Objektif ölçümler (süreklilik, hacim, hatırlama) uygulamada hesaplanır.
 */
export interface TeacherScore {
  /** 'YYYY-MM-DD' */
  date: string;
  /** Dilbilgisi/kullanım doğruluğu 0-100 */
  accuracy: number;
  /** Kelime ve yapı zenginliği 0-100 */
  range: number;
  /** İfade yaratıcılığı, risk alma 0-100 */
  creativity: number;
  /** Öğretmenin kısa gerekçesi (Türkçe) */
  verdict: string;
}

/** Claude Code'un önerdiği içerik — video, dizi bölümü, okuma, şarkı */
export interface ContentSuggestion {
  type: 'youtube' | 'series' | 'reading' | 'song' | 'podcast' | 'task';
  title: string;
  /** YouTube video kimliği veya bağlantı */
  ref?: string;
  /** "12:00-20:00" gibi zaman aralığı */
  segment?: string;
  instruction: string;
  skill: 'listening' | 'reading' | 'speaking' | 'writing';
  /** Kullanıcı tamamladı mı */
  done?: boolean;
}

/** Claude Code'un ürettiği sıradaki görev */
export interface SuggestedTask {
  kind: string;
  prompt: string;
  /** Hangi hatayı hedefliyor */
  targetError?: string;
}

/** Köprü (GitHub gist) bağlantı durumu */
export interface SyncState {
  /** GitHub kişisel erişim jetonu — sadece bu cihazda saklanır */
  token?: string;
  /** Senkron gist kimliği — ilk bağlantıda otomatik oluşturulur */
  gistId?: string;
  githubLogin?: string;
  lastPushAt?: string;
  lastPullAt?: string;
}

export interface AppData {
  /** Veri şeması sürümü — ileride biçim değişirse taşıma için */
  version: number;
  profile: Profile;
  cards: Card[];
  errors: ErrorCategory[];
  tasks: TaskRecord[];
  sessions: SessionRecord[];
  sync: SyncState;
  /** Claude Code'dan gelen sıradaki görevler */
  suggestedTasks: SuggestedTask[];
  /** Claude Code'dan gelen içerik önerileri (video, dizi, okuma) */
  content: ContentSuggestion[];
  /** Son haftalık rapor metni */
  weeklyReport?: string;
  /** Öğretmenin belirlediği güncel plan */
  plan?: TeacherPlan;
  /** Öğretmenin günlük puan geçmişi — ilerleme grafiğinin kaynağı */
  scores: TeacherScore[];
}

export const DATA_VERSION = 1;
