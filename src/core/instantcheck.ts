/**
 * Anlık hata uyarısı — **öğretmen cevap vermeden önce** çalışan katman.
 *
 * Kullanıcının kuralı: *"yazım hatası veya cümle hatalarını öğretmen cevap
 * vermeden önce Türkçe eksikliklerini söylesin."*
 *
 * ⚠️ **Bu dosya öğretmenin yerine geçmez.** Telefondaki uygulama canlı yapay
 * zekâ çağırmadığı için (ek ücret yok) derin gramer yargısı burada yapılamaz.
 * Burada yalnızca **kural ile kesin yakalanabilen** şeyler var: yazım hataları,
 * noktalama, Türk konuşurların tekrar tekrar yaptığı sabit kalıplar. Gerisini
 * — üslup, kelime seçimi, doğallık — öğretmen bir sonraki senkronda söyler.
 *
 * Bu ayrımı ekranda da açıkça yazıyoruz; kullanıcı "hata yok" yazısını
 * "cümlem kusursuz" diye okumasın.
 *
 * Saf TypeScript: ağ yok, React yok. `node --experimental-strip-types` ile
 * doğrudan çalıştırılıp gerçek cümlelerle sınanabilir.
 */

export interface InstantNote {
  /**
   * Hata sınıfı. `ogretmen.md`'deki kategori listesiyle uyumlu tutuldu ki
   * öğretmen aynı hatayı ikinci kez saymasın.
   */
  kind: string;
  /** Kullanıcıya gösterilen Türkçe uyarı */
  message: string;
  /**
   * `sure` — kural kesin, tartışma yok (yazım, noktalama, sabit kalıp).
   * `hint` — olabilir; kullanıcı bilerek yapmış olabilir. Ekranda daha soluk
   * gösterilir, çünkü yanlış uyarı güven kaybettirir.
   */
  severity: 'sure' | 'hint';
}

/* ------------------------------------------------------------ yazım hataları
 *
 * Sadece **tek doğru karşılığı olan** yaygın hatalar. "belki şu olabilir"
 * diyeceğimiz hiçbir kelime buraya girmez; yanlış düzeltme yanlış öğretir.
 */
const MISSPELLINGS: Record<string, string> = {
  alot: 'a lot',
  becouse: 'because',
  becuase: 'because',
  beacuse: 'because',
  definately: 'definitely',
  recieve: 'receive',
  recieved: 'received',
  wich: 'which',
  thier: 'their',
  seperate: 'separate',
  seperated: 'separated',
  allways: 'always',
  ofcourse: 'of course',
  untill: 'until',
  sucess: 'success',
  succesful: 'successful',
  bussiness: 'business',
  buisness: 'business',
  adress: 'address',
  occured: 'occurred',
  comming: 'coming',
  writting: 'writing',
  begining: 'beginning',
  intresting: 'interesting',
  intersting: 'interesting',
  genious: 'genius',
  tought: 'thought',
  trough: 'through',
  wanna: 'want to',
  gonna: 'going to',
  freind: 'friend',
  beleive: 'believe',
  diffrent: 'different',
  diferent: 'different',
  enviroment: 'environment',
  goverment: 'government',
  intrested: 'interested',
  probaly: 'probably',
  reccomend: 'recommend',
  recomend: 'recommend',
  rember: 'remember',
  remeber: 'remember',
  studing: 'studying',
  thinked: 'thought',
  goed: 'went',
  buyed: 'bought',
  teached: 'taught',
  catched: 'caught',
  bringed: 'brought',
  eated: 'ate',
  runned: 'ran',
  feeled: 'felt',
  finded: 'found',
};

/* ------------------------------------------------- sabit Türk konuşur hataları
 *
 * Hepsi Türkçenin yapısından doğan, herkeste aynı çıkan hatalar. Regex ile
 * kesin yakalanır ve düzeltmesi tartışmasızdır.
 */
interface Pattern {
  test: RegExp;
  kind: string;
  message: string;
  severity?: 'sure' | 'hint';
}

const PATTERNS: Pattern[] = [
  {
    test: /\b(i|we|they|you)\s+am\s+agree\b|\bi\s+am\s+agree\b/i,
    kind: 'word choice',
    message: '"I am agree" değil, **"I agree"**. `agree` zaten fiil, yanına `am` gelmez.',
  },
  {
    test: /\b(i|he|she|we|they)\s+(have|has)\s+\d+\s+years?\b/i,
    kind: 'word choice',
    message: 'Yaş için `have` kullanılmaz: **"I am 25 years old"**. (Türkçedeki "25 yaşım var" birebir çevrilmiyor.)',
  },
  {
    test: /\b(he|she|it)\s+(don't|do not)\b/i,
    kind: 'subject-verb agreement',
    message: '`he/she/it` ile **"doesn\'t"** kullanılır: *He doesn\'t know.*',
  },
  {
    test: /\b(he|she|it)\s+(have)\b/i,
    kind: 'subject-verb agreement',
    message: '`he/she/it` ile **"has"** kullanılır: *She has a car.*',
  },
  {
    test: /\bdid\s+(?:not\s+|n't\s+)?\w*\s*(went|saw|ate|took|made|came|got|said|knew|thought|found|gave)\b/i,
    kind: 'past simple',
    message: '`did` varken fiil **yalın** kalır: *Did you **go**?* / *I didn\'t **see** it.*',
  },
  {
    test: /\b(explain|say|suggest)\s+(me|him|her|us|them)\b/i,
    kind: 'prepositions',
    message: '`explain/say/suggest` sonrası **"to"** gerekir: *explain **to** me*, *say **to** him*. (`tell me` doğru — o istisna.)',
  },
  {
    test: /\bdiscuss\s+about\b/i,
    kind: 'prepositions',
    message: '`discuss` sonrası `about` gelmez: **"discuss the film"**.',
  },
  {
    test: /\b(go|went|going|come|came)\s+to\s+home\b/i,
    kind: 'prepositions',
    message: '`home` önüne `to` almaz: **"go home"**, **"came home"**.',
  },
  {
    test: /\bin\s+(yesterday|tomorrow|last\s+night|last\s+week|next\s+week)\b/i,
    kind: 'prepositions',
    message: '`yesterday`, `last night`, `next week` önüne edat gelmez: **"I saw it yesterday."**',
  },
  {
    test: /\b(in|at)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    kind: 'prepositions',
    message: 'Günlerde **"on"** kullanılır: *on Monday*.',
  },
  {
    test: /\bmore\s+(better|worse|easier|bigger|smaller|older|younger|faster|harder)\b/i,
    kind: 'word choice',
    message: '`-er` eki zaten "daha" demek; başına `more` gelmez: **"better"**.',
  },
  {
    test: /\bmost\s+best\b/i,
    kind: 'word choice',
    message: '**"the best"** yeterli, `most` fazla.',
  },
  {
    test: /\b(informations|advices|newses|peoples|equipments|homeworks|furnitures|softwares)\b/i,
    kind: 'plural/singular',
    message: 'Bu kelimeler İngilizcede sayılamaz — çoğul `-s` almaz: *information*, *advice*, *news*, *people*, *homework*.',
  },
  {
    test: /\bnews\s+are\b/i,
    kind: 'subject-verb agreement',
    message: '`news` tekil sayılır: **"the news is"**.',
  },
  {
    test: /\bfor\s+to\s+\w+/i,
    kind: 'gerund/infinitive',
    message: 'Amaç anlatırken `for to` olmaz, tek başına **"to"** yeter: *I came **to** see you.*',
  },
  {
    test: /\bhave\s+(went|came|did|saw|ate|took|wrote|spoke|broke)\b/i,
    kind: 'present perfect',
    message: '`have` sonrası fiilin **3. hâli** gelir: *have **gone***, *have **come***, *have **done***, *have **seen***.',
  },
  {
    test: /\bi\s+am\s+(boring|interesting|exciting|confusing|tiring)\b/i,
    kind: 'word choice',
    message: '`-ing` şeyin kendisini anlatır, `-ed` senin hissini: **"I am bored"** (sıkıldım) / *the film is boring* (film sıkıcı).',
    severity: 'hint',
  },
  {
    test: /\bdo\s+a\s+mistake\b/i,
    kind: 'collocation',
    message: 'Hata "yapılırken" **make** kullanılır: **"make a mistake"**.',
  },
  {
    test: /\bvery\s+much\s+(good|nice|beautiful|bad|hard|easy)\b/i,
    kind: 'word choice',
    message: '`very much` sıfatın önüne gelmez. Sadece **"very good"** de, ya da daha güçlü bir kelime seç: *excellent*.',
  },
  {
    test: /\bevery\s+days\b/i,
    kind: 'plural/singular',
    message: '**"every day"** — `every` sonrası tekil gelir.',
  },
  {
    test: /\ball\s+of\s+people\b/i,
    kind: 'word choice',
    message: '**"all people"** ya da **"everyone"**.',
  },
  {
    test: /\baccording\s+to\s+me\b/i,
    kind: 'register/formality',
    message: '`according to` başkası için kullanılır. Kendin için: **"In my opinion"** / **"I think"**.',
  },
];

/* --------------------------------------------------------------- yardımcılar */

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** Noktalama ve tırnaktan arındırılmış küçük harfli kelimeler */
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zçğıöşü'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Kelimenin kökü — hedef kelime denetiminde çekimli hâli de sayılsın diye.
 * Kaba ama bu iş için yeterli: "noticed" → "notic", "watching" → "watch".
 */
function stem(word: string): string {
  return word
    .toLowerCase()
    .replace(/(ing|ed|es|s)$/, '')
    .replace(/^to\s+/, '');
}

export interface InstantCheckOptions {
  /** Bu cevapta kullanılması beklenen kelimeler */
  targetWords?: string[];
  /** Beklenen en az kelime sayısı — seviyeye göre çağıran belirler */
  minWords?: number;
}

/**
 * Cevabı yerel kurallardan geçirir.
 *
 * Sıra önemli: kesin hatalar üstte, tahminler altta. Ekran ilk üçünü öne
 * çıkarıyor — on maddelik liste kimseyi düzeltmez, yıldırır.
 */
export function checkInstant(
  text: string,
  options: InstantCheckOptions = {}
): InstantNote[] {
  const notes: InstantNote[] = [];
  const trimmed = text.trim();
  if (!trimmed) return notes;

  const all = words(trimmed);

  /* --- 1. uzunluk: cevap verilmiş mi --- */
  if (options.minWords && all.length < options.minWords) {
    notes.push({
      kind: 'too short',
      severity: 'sure',
      message: `Cevabın ${all.length} kelime. En az ${options.minWords} kelime bekleniyordu — bir cümle daha ekle, sebebini anlat.`,
    });
  }

  /* --- 2. Türkçe kelime kaçmış mı ---
     Mikrofonla konuşurken çok oluyor: tanıma motoru bir kelimeyi Türkçe
     duyunca ekrana Türkçe yazıyor. Kullanıcı fark etmezse öğretmene de öyle
     gidiyor. */
  const turkish = trimmed.match(/[çğıöşüÇĞİÖŞÜ]/g);
  if (turkish) {
    const guilty = all.filter((w) => /[çğıöşüÇĞİÖŞÜ]/.test(w)).slice(0, 3);
    notes.push({
      kind: 'word choice',
      severity: 'sure',
      message: `Cevabında Türkçe kelime var: ${guilty.join(', ')}. İngilizcesini bilmiyorsan başka kelimelerle anlat — asıl beceri bu.`,
    });
  }

  /* --- 3. büyük I --- */
  if (/(^|\s)i(\s|'|$)/.test(trimmed)) {
    notes.push({
      kind: 'spelling',
      severity: 'sure',
      message: 'İngilizcede "ben" her zaman büyük yazılır: **I**, **I\'m**, **I\'ve**.',
    });
  }

  /* --- 4. cümle başı büyük harf --- */
  if (/^[a-zçğıöşü]/.test(trimmed)) {
    notes.push({
      kind: 'punctuation',
      severity: 'sure',
      message: 'Cümle büyük harfle başlar.',
    });
  }

  /* --- 5. cümle sonu noktalama --- */
  if (!/[.!?]$/.test(trimmed) && all.length >= 3) {
    notes.push({
      kind: 'punctuation',
      severity: 'sure',
      message: 'Cümlenin sonuna nokta (veya soru işareti) koy. Bu senin tekrar eden hatalarından biri.',
    });
  }

  /* --- 6. yazım hataları --- */
  const seen = new Set<string>();
  for (const token of tokens(trimmed)) {
    const fix = MISSPELLINGS[token];
    if (fix && !seen.has(token)) {
      seen.add(token);
      notes.push({
        kind: 'spelling',
        severity: 'sure',
        message: `**${token}** → **${fix}**`,
      });
    }
  }

  /* --- 7. sabit kalıp hataları --- */
  for (const p of PATTERNS) {
    if (p.test.test(trimmed)) {
      notes.push({ kind: p.kind, severity: p.severity ?? 'sure', message: p.message });
    }
  }

  /* --- 8. aynı kelime iki kez üst üste ("the the") --- */
  const tok = tokens(trimmed);
  for (let i = 1; i < tok.length; i++) {
    if (tok[i] === tok[i - 1] && tok[i].length > 1) {
      notes.push({
        kind: 'spelling',
        severity: 'sure',
        message: `"${tok[i]}" iki kez üst üste yazılmış.`,
      });
      break;
    }
  }

  /* --- 9. run-on sentence — kullanıcının bilinen zayıflığı ---
     Uzun ve noktasız, üstelik "and/but/so" ile birbirine eklenmiş cümle. */
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim());
  const runOn = sentences.find((s) => {
    const n = words(s).length;
    const joins = (s.match(/\b(and|but|so|because|then)\b/gi) ?? []).length;
    return n >= 22 && joins >= 2;
  });
  if (runOn) {
    notes.push({
      kind: 'run-on sentence',
      severity: 'hint',
      message: 'Uzun bir cümleyi "and/but/so" ile birbirine eklemişsin. İkiye böl — bu senin en sık hatan.',
    });
  }

  /* --- 10. "very" tekrarı --- */
  const veryCount = tok.filter((w) => w === 'very').length;
  if (veryCount >= 3) {
    notes.push({
      kind: 'word choice',
      severity: 'hint',
      message: `"very" ${veryCount} kez geçiyor. Daha güçlü kelimeler dene: *really*, *extremely*, ya da doğrudan *excellent / exhausted / huge*.`,
    });
  }

  /* --- 11. hedef kelimeler kullanılmış mı --- */
  if (options.targetWords?.length) {
    const stems = new Set(tok.map(stem));
    const missing = options.targetWords.filter((w) => {
      const parts = w.toLowerCase().replace(/^to\s+/, '').split(/\s+/);
      // Çok kelimeli kalıpta ilk anlamlı kelimenin geçmesi yeterli sayılır
      return !parts.some((p) => stems.has(stem(p)));
    });
    if (missing.length > 0) {
      notes.push({
        kind: 'target words',
        severity: 'hint',
        message: `Bugünün kelimelerinden kullanmadıkların: ${missing.join(', ')}. Bir sonraki cevaba sıkıştır — kelime ancak kullanınca oturur.`,
      });
    }
  }

  return notes;
}

/**
 * Uyarı listesinin başlığı.
 *
 * Hata yoksa "mükemmel" demiyoruz — uygulama yalnızca kural ile yakalanabilen
 * şeye bakabiliyor, üslup ve doğallık öğretmenin işi. Yanlış övgü, yanlış
 * düzeltme kadar zararlı.
 */
export function describeNotes(notes: InstantNote[]): string {
  const sure = notes.filter((n) => n.severity === 'sure').length;
  if (notes.length === 0) {
    return 'Yazım ve noktalamada bir şey bulamadım. Üslup ve doğallığa öğretmen senkronda bakacak.';
  }
  if (sure === 0) {
    return 'Kesin bir hata yok ama şunlara bir bak:';
  }
  return `Cevabına geçmeden önce ${sure} şey:`;
}
