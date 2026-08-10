/**
 * Uygulamanın tüm verisinin şekli.
 *
 * Veri küçük (birkaç yüz kart, birkaç yüz kayıt) olduğu için tek bir JSON
 * belgesi olarak tutuluyor. SQLite'a göre avantajı: tarayıcıda, telefonda ve
 * ileride gerçek uygulamada tamamen aynı şekilde çalışması.
 */

import type { CardStage } from '../core/cardcheck';
import type { LevelSizing } from '../core/level';

/**
 * Kullanıcının seçtiği zevkler — **aşamalı seçimle** doldurulur.
 *
 * Neden serbest metin değil: kullanıcı *"bu tercihleri biz yazmayalım, aşamalı
 * seçenek kısmını getir"* dedi. Boş bir kutuya "zevklerin neler" diye sormak
 * ya boş bırakılıyor ya da öğretmenin işine yaramayan iki kelime alıyor.
 * Seçenek listesi hem hatırlatıyor hem de öğretmene **aynı sözcüklerle** veri
 * veriyor — "metal" ile "metal müzik" ayrı şeyler sanılmıyor.
 */
export interface Tastes {
  /** İlgi alanları: 'muzik', 'dizi', 'spor', 'oyun'... */
  areas: string[];
  /** Müzik türleri — sadece 'muzik' seçiliyse sorulur */
  music: string[];
  /** Dizi/film türleri */
  screen: string[];
  /** Spor dalları */
  sports: string[];
  /** Diğer alanlarda seçilenler (oyun, teknoloji, yemek…) */
  other: string[];
  /** "Kendim yazmak istiyorum" diyenin serbest notu */
  note?: string;
  /** Son güncelleme — öğretmen değişikliği fark etsin */
  updatedAt?: string;
}

export interface Profile {
  /** CEFR seviyesi: A1, A2, B1, B2, C1, C2 — yerleştirme sınavı belirler */
  level: string;
  /**
   * **Seviyenin neresindesin — 0-100.**
   *
   * Kullanıcının tespiti: *"A2 ama A2'de kaç puan? A2 80 puan, B1'e yakın;
   * veya A2 30 puan."* CEFR etiketi bir **aralıktır**, bir nokta değil. Aynı
   * "B1" iki kişide bambaşka şey demek olabilir ve ikisine aynı içerik
   * verilirse biri sıkılır, öteki boğulur.
   *
   * Kaynağı seviye sınavı (`levelExam`); sonra öğretmen her senkronda gerçek
   * performansa göre günceller. Boşsa "henüz ölçülmedi" demektir — uygulama
   * kendi kendine bir sayı uydurmaz.
   */
  levelScore?: number;
  /**
   * Seviyenin **en son değiştiği** an (ISO).
   *
   * Bunsuz uygulama seviye değiştiğini fark edemiyordu: kullanıcı A2'den
   * B1'e geçtiği hâlde ekranda hâlâ A2 için seçilmiş dizi bölümü duruyordu.
   * Bu damga öğretmenden gelen paketin tarihiyle karşılaştırılıyor; paket
   * eskiyse içerik "seviyen değişti, yenisi geliyor" diye işaretleniyor.
   */
  levelChangedAt?: string;
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
  /**
   * Kullanıcının seçtiği seslendirme sesi (cihaz ses kimliği).
   * Boşsa uygulama en iyi puanlı sesi otomatik seçer.
   */
  voiceId?: string;
  /**
   * Sesli okuma hızı (1.0 normal).
   *
   * Kullanıcı seçiyor: dinlerken takip edemediği hız öğretmiyor, çok yavaş
   * olan da robotik duyuluyor. Doğru hız kişiye ve güne göre değişir.
   */
  speechRate?: number;
  /**
   * Aşamalı seçimle doldurulan zevkler. Öğretmen dizi/film/müzik önerisini ve
   * günün sohbet konusunu buradan seçer.
   */
  tastes?: Tastes;
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

  /**
   * Öğrenme basamağı: 1 tanıma (şıklar) → 2 yazma → 3 telaffuz.
   * Doğru cevapta yükselir, yanlışta düşer. Eski kartlarda yoksa 1 sayılır.
   */
  stage?: CardStage;
  /** Öğretmenin aynı derecede doğru saydığı diğer cevaplar */
  accepted?: string[];
  /** Kartın geldiği günün teması — kart dizilimi temaya göre sıralanıyor */
  theme?: string;
  /** Son cevabın sonucu — öğretmene giden rapora giriyor */
  lastResult?: 'correct' | 'close' | 'wrong';
  /**
   * Kelimenin **ilk kez çalışıldığı** tarih, 'YYYY-MM-DD'.
   *
   * Günlük yeni kelime kotası bunun üstünden sayılır. Eskiden "hiç
   * cevaplanmamış" kartlar sayılıyordu; kart cevaplanır cevaplanmaz yeni
   * olmaktan çıkıyor, kota da yerine bir kelime daha çekiyordu. Sonuç: her
   * cevapta kuyruk bir uzuyordu ve 5 kelimelik gün 17 karta çıkıyordu.
   */
  introducedAt?: string;
  /**
   * Kelimenin **öğretildiği** (tanıştırma ekranının gösterildiği) tarih.
   *
   * Hiç görülmemiş bir kelimeyi doğrudan sınamak öğretmez: kullanıcı şıkları
   * tahmin eder, yanlış yapar, aynı yere döner. Önce kelime tanıtılır —
   * anlamı, örneği, telaffuzu — sonra sorulur.
   */
  taughtAt?: string;
  /** Son çalışıldığı tarih, 'YYYY-MM-DD' */
  lastReviewedAt?: string;
  /**
   * Son cevabın tam zamanı (ISO). Gün içinde kartların sırayla dönmesi için:
   * en uzun süredir cevaplanmayan kart öne gelir, aynı kart üst üste çıkmaz.
   */
  lastAnsweredAt?: string;
  /** Telaffuz aşaması ilk kez geçildiğinde damgalanır, 'YYYY-MM-DD' */
  spokenOkAt?: string;
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
  newWords: Array<{
    word: string;
    meaning: string;
    example?: string;
    /** Aynı derecede doğru sayılacak diğer cevaplar — kart denetiminde kullanılır */
    accepted?: string[];
  }>;
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
  /** Kullanıcı düzeltmeyi okudu mu — okunduktan sonra ana ekrandaki kart kaybolur */
  feedbackSeen?: boolean;
  createdAt: string;
}

export interface SessionRecord {
  /** 'YYYY-MM-DD' */
  date: string;
  minutesSpent: number;
  tasksCompleted: number;
}

/**
 * Metinde dokunulabilir kelime — anlamı anında görünür, karta eklenebilir.
 *
 * Bu sözlük **en güvenilir kaynaktır**: metni yazan öğretmen doldurduğu için
 * kelimenin o cümledeki anlamını bilir. İnternetten gelen karşılık bağlamı
 * bilmez; bu yüzden sözlük her zaman öncelikli.
 *
 * `word` çok kelimeli olabilir ("every evening"). O zaman kalıbın içindeki
 * herhangi bir kelimeye dokunulduğunda kalıbın anlamı çıkar — tek tek "her" ve
 * "akşam" göstermek yanıltıcı olurdu.
 */
export interface GlossaryEntry {
  /** Metinde geçtiği hâli (küçük harfe indirgenmiş eşleşme yapılır) */
  word: string;
  /** Bu metindeki anlamı — bağlama uygun tek karşılık */
  meaning: string;
  /** Bu kelime bugünün hedef kelimelerinden mi */
  isTarget?: boolean;
  /** Kelimenin bugün de yaygın olan diğer anlamları (eskimiş olanlar değil) */
  senses?: string[];
  /** Yaygın kullanılan bir eş anlamlısı */
  synonym?: string;
  /** 2-3 kısa örnek cümle — kelime bu anlamda kullanılmış olmalı */
  examples?: string[];
}

/**
 * Günün dersi — tek tema, tek kelime seti.
 *
 * Ürünün ayırt edici mekaniği: o gün yapılan HER görev (okuma, yazma,
 * konuşma, kartlar, içerik) aynı kelimeleri döver. Aynı kelimeyle beş farklı
 * yerde karşılaşmak, aynı kelimeyi beş kez ezberlemekten kalıcıdır.
 *
 * Öğretmen (Claude Code) her senkronda kurar.
 */
export interface DailyLesson {
  /** 'YYYY-MM-DD' */
  date: string;
  /** Günün teması: "seyahat", "iş görüşmesi", "sağlık"... */
  theme: string;
  /** Bugün öğrenilecek kelimeler — tüm görevler bunlara bağlanır */
  targetWords: Array<{
    word: string;
    meaning: string;
    example?: string;
    accepted?: string[];
  }>;
  /** Öğretmenin yazdığı okuma parçası (özgün, seviyeye uygun) */
  passage?: {
    title: string;
    text: string;
    /** Devam eden hikâyede kaçıncı bölüm */
    chapter?: number;
    questions?: Array<{ question: string; options: string[]; answerIndex: number }>;
  };
  /** Metindeki zor kelimelerin anlamları — dokun-çevir için */
  glossary: GlossaryEntry[];
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
  /**
   * Günün tavsiyesi — Türkçe, somut, tek şey.
   *
   * `note` durum bildirir ("iki gündür girmiyorsun"); `advice` **bugün ne
   * yapacağını** söyler ("bugün konuşurken cümleyi bitirmeden düşünme, önce
   * söyle sonra düzelt"). Kullanıcının isteği: *"her gün ödev gibi advice
   * verecek."*
   */
  advice?: string;
  /**
   * Hedef tarihini bugün neden oynattığının gerekçesi (Türkçe).
   * Ekranda "78 gün (dün 80)" yazarken altına bu çıkar.
   */
  targetReason?: string;
  /**
   * Görev ölçüleri — seviye tablosundaki varsayılanların üstüne yazar.
   *
   * Seviye tablosu bir başlangıç noktasıdır; son sözü öğretmen söyler.
   * Aynı seviyedeki iki kişi aynı değildir, öğretmen gerçek performansa
   * bakıp burayı günceller. Boş bırakılan alanlar tabloda kalır.
   */
  sizing?: LevelSizing;
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
  /** Tamamlandığı tarih 'YYYY-MM-DD' — istatistiğe ve öğretmene giden kayıt */
  doneAt?: string;
  /**
   * **Neden bu?** Öğretmenin tek cümlelik Türkçe gerekçesi:
   * *"Metal seviyorsun ve bu şarkının sözleri A2 için fazla ağır değil."*
   * Gerekçesiz öneri rastgele görünür ve açılmaz.
   */
  why?: string;
  /** Nereden izlenir/dinlenir: "Netflix", "YouTube", "Spotify" */
  where?: string;
  /**
   * İçeriğe **girmeden önce** öğrenilecek kelimeler.
   *
   * Anlamadığı bir bölümü izlemek dinleme değil, seyretmedir. Öğretmen 4-6
   * kelimeyi önden verir; kullanıcı bunları bilerek izleyince içeriğin
   * yarısından fazlasını anlar.
   */
  words?: Array<{ word: string; meaning: string }>;
  /** İzlerken/dinlerken dikkat edilecek şeyler (Türkçe, 2-3 madde) */
  watchFor?: string[];
  /**
   * Sohbette bu içeriğe ne diye hitap edilecek.
   *
   * `type` yetmiyor: bir animasyon filmi de dizi bölümü de `series` olarak
   * işaretleniyor ama sohbet birine "this episode", ötekine "this film"
   * demeli. Boşsa `type`'tan tahmin ediliyor (eski davranış).
   */
  noun?: 'episode' | 'song' | 'video' | 'film';
}

/* -------------------------------------------------- günün sohbeti */

/**
 * Sohbetin tek turu — öğretmenin bir repliği ve o replikten beklediği cevap.
 *
 * ⚠️ **Neden önceden yazılmış:** Telefondaki uygulama canlı yapay zekâ
 * çağırmıyor (ek ücret istenmiyor). Öğretmen sohbeti bir gün önceden, o günün
 * dizisini/şarkısını ve kullanıcının seviyesini bilerek yazıyor. Karşılıklı
 * akış uygulamada yürüyor; derin değerlendirme bir sonraki senkronda geliyor.
 */
export interface ConversationTurn {
  /** Öğretmenin söylediği — İngilizce */
  say: string;
  /** Türkçe ipucu: ne sorduğu, nasıl cevaplanacağı */
  hint?: string;
  /** Bu turda kullanması beklenen kelimeler */
  useWords?: string[];
  /** Beklenen en az kelime sayısı — altında kalırsa `followUp` gelir */
  minWords?: number;
  /** Kaçamak/kısa cevap gelirse öğretmenin üsteleyişi — İngilizce */
  followUp?: string;
}

/** Öğretmenin o gün için yazdığı sohbet senaryosu */
export interface ConversationPlan {
  /** 'YYYY-MM-DD' */
  date: string;
  /** Konu: "The Flash 1. sezon 1. bölüm", "Metallica — Lux Æterna" */
  topic: string;
  /** Bağlı olduğu içerik önerisinin başlığı — sohbet ondan sonra açılır */
  contentTitle?: string;
  /** Türkçe giriş: bugün ne konuşacağız, ne bekleniyor */
  intro: string;
  turns: ConversationTurn[];
  /** Öğretmenin kapanış repliği — İngilizce */
  closing: string;
  /** Kapanışta Türkçe not */
  closingNote?: string;
  /** Sohbette geçmesi beklenen günün kelimeleri */
  targetWords: string[];
}

/** Sohbetteki tek mesaj */
export interface ConversationMessage {
  role: 'teacher' | 'user';
  text: string;
  /** Kullanıcı mikrofonla mı konuştu, yazdı mı */
  via?: 'mic' | 'text';
  /**
   * Uygulamanın **öğretmen cevap vermeden önce** verdiği Türkçe uyarılar.
   * Kullanıcının kuralı: *"yazım hatası veya cümle hatalarını öğretmen cevap
   * vermeden önce Türkçe eksikliklerini söylesin."*
   */
  notes?: string[];
  at: string;
}

/** Öğretmenin sonradan (senkronda) gelen sohbet değerlendirmesi */
export interface ConversationReview {
  /** Türkçe genel değerlendirme */
  verdict: string;
  /** Cümle cümle düzeltmeler */
  corrections: Array<{
    original: string;
    corrected: string;
    /** Ana dili İngilizce olan nasıl derdi */
    natural?: string;
    /** Türkçe kural açıklaması */
    note: string;
  }>;
  /** İyi yaptığı somut şey — dürüst olmak kadar görmek de öğretmenin işi */
  praise?: string;
  /** Akıcılık puanı 0-100 */
  fluency?: number;
}

/** Yapılmış bir sohbetin kaydı */
export interface ConversationRecord {
  id: string;
  date: string;
  topic: string;
  messages: ConversationMessage[];
  /** Planın kaç turu tamamlandı */
  turnsDone: number;
  turnsTotal: number;
  /** Kullanıcının **mikrofonla** cevapladığı tur sayısı */
  spokenTurns: number;
  finished: boolean;
  syncState: 'pending' | 'synced';
  review?: ConversationReview;
}

/**
 * Hedef tarihinin bir günkü hâli.
 *
 * Kullanıcının istediği şey: *"çok çalışıyorsun, 80 günde B1 olacaksan artık
 * 78 güne düşürecek; girmeyene 82 olacak."* Bunu gösterebilmek için dünkü
 * sayının saklanması gerekiyor — yoksa ekranda sadece bugünkü sayı durur ve
 * kısalıp kısalmadığı görünmez.
 */
export interface TargetPoint {
  /** 'YYYY-MM-DD' */
  date: string;
  /** Hedef seviye */
  level: string;
  daysRemaining: number;
  /** Öğretmenin o günkü tek cümlelik gerekçesi */
  reason?: string;
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

/**
 * Öğretmene sorulan serbest soru — **posta kutusu**, canlı sohbet değil.
 *
 * Kullanıcının isteği: *"öğretmenle konuşacağım yer olsun."* Günün sohbeti
 * (`conversationPlan`) öğretmenin önceden yazdığı senaryoyu oynatıyor; bu ise
 * tersi yön — aklına takılan şeyi **kendi** sorabilmesi.
 *
 * Telefondaki uygulama canlı yapay zekâ çağıramıyor (proje kısıtı: Claude Max
 * dışında tek kuruş ödenmiyor). Bu yüzden akış posta kutusu gibi işliyor:
 * soru yazılır → senkronda gist'e gider → Ömer bilgisayarda `/ogretmen`
 * çalıştırınca öğretmen cevaplar → sonraki senkronda cevap ekrana düşer.
 *
 * Gecikmeli ama gerçek: cevabı yazan, o kişinin bütün geçmişini gören
 * öğretmenin kendisi. Ekranda "cevap bekleniyor" diye dürüstçe yazıyor ki
 * kullanıcı anında cevap sanıp beklemesin.
 */
export interface TeacherQuestion {
  id: string;
  /** Kullanıcının sorusu — Türkçe ya da İngilizce, serbest */
  text: string;
  askedAt: string;
  /** Soru öğretmene ulaştı mı */
  syncState: 'pending' | 'synced';
  /** Öğretmenin cevabı; gelene kadar boş */
  answer?: string;
  answeredAt?: string;
  /** Kullanıcı cevabı gördü mü — rozet için */
  readAt?: string;
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
  /** Günün dersi — tema, hedef kelimeler, okuma parçası */
  lesson?: DailyLesson;
  /** Öğretmenin günlük puan geçmişi — ilerleme grafiğinin kaynağı */
  scores: TeacherScore[];
  /**
   * Tamamlanan içeriklerin kaydı.
   *
   * `content` her senkronda üzerine yazılıyor (her gün yeni öneri gelir), ama
   * "hangi bölümü izledim, hangi şarkıyı dinledim" kalıcı olmalı: öğretmen
   * diziyi kaldığı bölümden devam ettirecek ve istatistiğe girecek.
   */
  contentDone: Array<{ type: string; title: string; date: string }>;
  /** Öğretmenin bugün için yazdığı sohbet senaryosu */
  conversationPlan?: ConversationPlan;
  /**
   * Öğretmenin **yedek** sohbetleri — aynı gün için yazdığı alternatifler.
   *
   * Kullanıcının isteği: *"her tıklayana o bölümle alakalı farklı bir diyalog
   * gelsin, hep sınırlı rol dönmesini istemiyorum."* Her tıklamada öğretmeni
   * yeniden çalıştırmak 1-2 dakika bekletirdi; onun yerine öğretmen günlük
   * pakete 2-3 sohbet koyuyor (fazladan ~700 jeton) ve tıklama anında
   * geçiş yapıyor. Bunlar da bitince uygulamanın kendi tur bankası devreye
   * giriyor (`buildLocalConversation`, 15.625 bileşim, sıfır jeton).
   */
  conversationAlternatives?: ConversationPlan[];
  /**
   * Bugün kaçıncı sohbet isteniyor. "Başka bir sohbet ver" her basıldığında
   * artıyor; tarih değişince sıfırlanıyor.
   */
  conversationVariant?: { date: string; index: number };
  /** Yapılmış sohbetlerin kaydı — öğretmene giden ham veri */
  conversations: ConversationRecord[];
  /** Hedef tarihinin gün gün geçmişi — "dün 80'di, bugün 78" grafiği */
  targetHistory: TargetPoint[];
  /**
   * Öğretmene sorulan serbest sorular ve gelen cevaplar.
   * Bkz. {@link TeacherQuestion}.
   */
  teacherQuestions?: TeacherQuestion[];
  /** Seviye içi puanlama sınavının son sonucu */
  levelExam?: LevelExamResult;
  /**
   * Öğretmenden en son paket **ne zaman üretildi** (inbox `generatedAt`).
   *
   * `profile.levelChangedAt` bundan yeniyse elimizdeki ders/içerik/sohbet
   * eski seviyeye göre yazılmış demektir; ekran bunu "eskimiş" diye
   * işaretler. Aksi hâlde B1'e geçmiş birine A2 için seçilmiş dizi bölümü
   * gösterilmeye devam ediyor.
   */
  lastInboxAt?: string;
}

/* ------------------------------------------------- seviye içi puanlama */

export type LevelExamSkill =
  | 'vocabulary'
  | 'grammar'
  | 'listening'
  | 'writing'
  | 'speaking';

export interface LevelExamSkillScore {
  skill: LevelExamSkill;
  /** 0-100 */
  score: number;
  /** Kaç soru soruldu */
  total: number;
}

/**
 * Seviye içi puanlama sınavının sonucu.
 *
 * **Yerleştirme sınavından farkı:** o hangi seviyede olduğunu bulur (adaptif,
 * tüm seviyelerden soru sorar). Bu ise seviyeyi **bilerek** girer ve *o
 * seviyenin içinde nerede durduğunu* ölçer. Kullanıcının kuralı: *"ilk sınav
 * seviye tespit, 2. sınav o seviye için puanlama sistemi olmalı."*
 */
export interface LevelExamResult {
  /** Hangi seviye için yapıldı */
  level: string;
  /** 'YYYY-MM-DD' */
  date: string;
  /** Seviye içi konum 0-100 */
  score: number;
  skills: LevelExamSkillScore[];
  /** En zayıf beceri */
  weakest: LevelExamSkill | null;
  /**
   * Yazma ve konuşma cevapları — öğretmen bunları okuyup puanı düzeltecek.
   * Uygulama bunlara ancak kaba bir puan verebilir (kelime sayısı, hedef
   * kelime kullanımı, yerel hata kontrolü); asıl yargı öğretmenindir.
   */
  responses: Array<{
    questionId: string;
    skill: LevelExamSkill;
    prompt: string;
    answer: string;
    /** Konuşma cevabı mikrofonla mı geldi */
    via?: 'mic' | 'text';
  }>;
  /** Öğretmene gönderildi mi */
  syncState: 'pending' | 'synced';
}

export const DATA_VERSION = 1;
