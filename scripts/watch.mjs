#!/usr/bin/env node
/**
 * Öğretmen nöbetçisi — `/ogretmen`'i **elle çalıştırmayı** ortadan kaldırır.
 *
 * ## Neden var
 *
 * Kullanıcının isteği: *"bilgisayarda öğretmen çalıştırmak zorunda mıyım,
 * ben yaptıkça canlı şekilde çalışsın."*
 *
 * Telefondaki uygulama yapay zekâyı doğrudan çağıramıyor — proje kısıtı, Claude
 * Max aboneliği dışında ücret yok (bkz. `AGENTS.md`). Ama **bilgisayarın işi
 * kendi kendine yapması** mümkün: bu betik gist'i dinler, telefondan yeni bir
 * şey geldiğini görünce Claude Code'u sessiz kipte (`claude -p "/ogretmen"`)
 * çalıştırır ve cevabı gist'e bırakır. Uygulama da açıkken kendiliğinden
 * çekiyor (`src/sync/autosync.tsx`).
 *
 * Sonuç: kullanıcı hiçbir şeye basmıyor. Bilgisayar **açıkken** döngü kendi
 * dönüyor, gecikme ~1-2 dakika. Bilgisayar kapalıysa işler birikiyor ve
 * bilgisayar açılınca tek seferde işleniyor — o zaman bile kimse bir şey
 * yazmıyor.
 *
 * ⚠️ **Dürüst sınır:** bilgisayar kapalıyken öğretmen çalışamaz. Bunu aşmanın
 * tek yolu bulutta bir yapay zekâ çağırmak, o da ücretli. Kullanıcı ek ücret
 * istemiyor, dolayısıyla mimarinin sınırı burası.
 *
 * ## Kullanım
 *
 *   node scripts/watch.mjs              → dinlemeye başlar (60 sn'de bir bakar)
 *   node scripts/watch.mjs --once       → tek sefer bakar, iş varsa çalıştırır
 *   node scripts/watch.mjs --interval 30
 *   node scripts/watch.mjs --dry        → çalıştırmaz, sadece ne yapacağını yazar
 *
 * Durdurmak için Ctrl+C.
 */

import { spawn } from 'node:child_process';
import { appendFile, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.github.com';
const DESCRIPTION_PREFIX = 'ingilizce-asistan';

/**
 * Yollar **betiğin konumuna** sabitlenir, çalışma dizinine değil.
 *
 * Nöbetçi Windows Zamanlanmış Görev'inden başlatılıyor ve orada çalışma dizini
 * her zaman proje kökü olmayabiliyor. `resolve('.outbox.json')` o durumda
 * bambaşka bir klasörü işaret ediyor; öğretmen dosyayı bulamıyor ve hiçbir şey
 * çalışmıyor — üstelik sessizce.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Son işlenen paketin damgası burada tutulur — aynı paketi iki kez işleme */
const STATE_FILE = join(ROOT, '.watch-state.json');
/**
 * Nöbetçinin kendi kaydı.
 *
 * ⚠️ 12 Ağustos'ta nöbetçi iki gün boyunca hiçbir iş yapmadı ve **bunu hiç
 * kimse göremedi**: süreç arka planda penceresiz çalıştığı için `console.log`
 * çıktısı hiçbir yere düşmüyordu. Artık her satır diske de yazılıyor;
 * "nöbetçi ne yapıyor" sorusu tahminle değil dosyaya bakarak cevaplanıyor.
 */
const LOG_FILE = join(ROOT, '.watch-log.txt');
/** Kayıt dosyası bu boyutu aşınca yarısı atılır — disk şişmesin */
const LOG_MAX_BYTES = 256 * 1024;
/** Telefondan gelen paket — öğretmen bunu diskten okur, ağa çıkmaz */
const OUTBOX_FILE = join(ROOT, '.outbox.json');
/** Öğretmenin yazdığı cevap — nöbetçi bunu gist'e gönderir */
const DRAFT_FILE = join(ROOT, '.inbox-draft.json');
const TOKEN_FILE = join(ROOT, 'sync-token.txt');

/** Yerel takvim günü. `toISOString()` UTC verir; gece yarısından sonra
 *  Türkiye'de bir gün geride kalıyordu. */
function localDay(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/* ------------------------------------------------------------ ayarlar */

function parseArgs(argv) {
  const options = { interval: 60, once: false, dry: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--once') options.once = true;
    else if (argv[i] === '--dry') options.dry = true;
    else if (argv[i] === '--interval') options.interval = Number(argv[++i]) || 60;
  }
  return options;
}

/**
 * İki çalıştırma arasındaki en kısa süre.
 *
 * Kullanıcı telefonda üst üste beş şey yaparsa otomatik senkron beş kez
 * gönderir; her birine ayrı bir öğretmen çalıştırmak hem jeton israfı hem de
 * anlamsız — öğretmen zaten günün tamamına bakıyor. Bu yüzden yeni bir paket
 * görülse bile son çalıştırmanın üstünden bu kadar süre geçmemişse beklenir.
 */
const MIN_GAP_MS = 5 * 60 * 1000;

/**
 * Bugünün dersi zaten gönderildiyse, **yalnızca gerçek iş** için tekrar çalış.
 *
 * Telefon 20 saniyede bir paket atabiliyor; her pakete tam bir öğretmen turu
 * açmak hem jeton israfı hem de `ogretmen.md` §7.5'teki "günde tek çalıştır"
 * bütçesine aykırı. Ders bir kez kurulduktan sonra düzeltilecek yazı, sohbet,
 * soru veya sınav yoksa öğretmeni rahatsız etmiyoruz.
 */
const REFRESH_GAP_MS = 45 * 60 * 1000;

/** Üst üste başarısızlıkta bekleme süresi büyür — sonsuz döngü olmasın */
const BACKOFF_MS = [0, 10 * 60 * 1000, 30 * 60 * 1000, 60 * 60 * 1000];
const MAX_FAILS = 4;

/**
 * Öğretmen bu süreyi aşarsa süreç öldürülür — takılan tur nöbeti kilitlemesin.
 *
 * ⚠️ 12 dakikaydı ve **yetmiyordu.** 14 Ağustos'ta üç turun ikisi tam bu
 * duvara tosladı; iki gün ders üretilmedi. Öğretmenin bir turda yazdığı şey
 * küçük değil: 150-250 kelimelik özgün metin, 40-70 satır sözlük, 6-10 turluk
 * sohbet + iki alternatifi, görevler, puan ve plan (`ogretmen.md` §7.5).
 * Bunu 12 dakikaya sıkıştırmak, yarısına kadar gelmiş bir turu her seferinde
 * çöpe atmak demekti — hem ders yok hem jeton boşa.
 */
const TEACHER_TIMEOUT_MS = 25 * 60 * 1000;

/**
 * Kalp atışı: nöbetçi gist'e "buradayım" diye yazar.
 *
 * ⚠️ Neden gerekti: 10 Ağustos akşamı nöbetçi dört kez üst üste başarısız
 * olup pes etti, iki gün hiçbir ders üretmedi ve telefonda **hiçbir şey
 * değişmedi** — ekran "öğretmen çalışıyor" havasındaydı. Sessiz başarısızlık
 * bu projede tekrar tekrar can yaktı. Uygulama artık nöbetçinin son ne zaman
 * ayakta olduğunu görüyor ve susmuşsa açıkça yazıyor.
 */
const HEARTBEAT_GAP_MS = 15 * 60 * 1000;
const HEARTBEAT_FILE = 'watch.json';

/**
 * ⛔ **Aynı anda tek tur.**
 *
 * `setInterval` turu beklemiyordu; öğretmen dakikalarca sürdüğü için ikinci,
 * üçüncü tur devreye giriyor, hepsi aynı iki dosyayı yazıp siliyordu — biri
 * ötekinin taslağını silerken bir başkası `.outbox.json`'u tazeliyordu.
 * Beş dakikalık bir turda beş paralel `claude` süreci birikebiliyordu.
 */
let running = false;

/* ------------------------------------------------------------- yardımcı */

function stamp() {
  return new Date().toLocaleTimeString('tr-TR');
}

/**
 * Bekleyen yazma işleri.
 *
 * ⚠️ Testte yakalandı: `log()` diske **beklemeden** yazıyordu ve `--once`
 * kipinde süreç, son satırlar diske düşmeden kapanıyordu — turun sonucu tam
 * da en çok merak edilen yerde kayboluyordu. Satırlar sıraya diziliyor,
 * çıkmadan önce `flushLog()` ile bekleniyor.
 */
let logChain = Promise.resolve();

function log(message) {
  const line = `[${stamp()}] ${message}`;
  console.log(line);
  logChain = logChain.then(() => appendLog(line)).catch(() => {});
}

/** Bekleyen kayıt satırları diske düşene kadar bekler */
function flushLog() {
  return logChain;
}

/**
 * Kayıt dosyasına ekler. Hata **yutulur**: nöbetçinin asıl işi ders üretmek,
 * günlük tutamadı diye tur çökmemeli.
 */
async function appendLog(line) {
  try {
    /**
     * ⚠️ `toISOString()` UTC verir; saat damgası ise yerel. Gece 01:00'de
     * kayıt "11 Ağustos 01:15" diye yazıyordu — bir önceki gün. Nöbetçi
     * hatalarını geriye dönük ararken en son isteyeceğin şey yanlış tarih.
     */
    await appendFile(LOG_FILE, `${localDay()} ${line}\n`, 'utf8');
    const { size } = await stat(LOG_FILE);
    if (size > LOG_MAX_BYTES) {
      const text = await readFile(LOG_FILE, 'utf8');
      const lines = text.split('\n');
      await writeFile(LOG_FILE, lines.slice(Math.floor(lines.length / 2)).join('\n'), 'utf8');
    }
  } catch {
    /* günlük tutulamadı, iş devam */
  }
}

async function getToken() {
  const raw = await readFile(TOKEN_FILE, 'utf8').catch(() => '');
  const token = raw.trim();
  if (!token) {
    console.error(
      'HATA: sync-token.txt okunamadı veya boş. GitHub jetonunu o dosyaya yapıştır.'
    );
    process.exit(1);
  }
  return token;
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * Senkron gist'ini getirir — **mobil veriyi düşünerek.**
 *
 * ⚠️ Ölçüldü: gist listesi 2,7 KB, içerikli gist **77,5 KB**. Her tur ikisini
 * birden çekiyordu; dakikada bir bakınca **günde ~115 MB** eder. Kullanıcı
 * bilgisayarı telefonun hotspot'una bağlayacağını söyleyince bu rakam
 * kabul edilemez hâle geldi.
 *
 * İki tasarruf:
 *
 * 1. **Gist kimliği bir kez bulunur**, sonra duruma yazılır. Liste isteği
 *    ilk turdan sonra hiç yapılmaz.
 * 2. **Koşullu istek (ETag).** GitHub her yanıtta bir `ETag` veriyor; bir
 *    sonraki isteğe `If-None-Match` koyunca içerik değişmediyse **304** ve
 *    boş gövde dönüyor — birkaç yüz bayt. Telefon yeni bir şey göndermediği
 *    sürece tur neredeyse bedava.
 *
 * Sonuç: boştaki tur 80 KB'den ~0,4 KB'ye iniyor (yaklaşık 200 kat).
 */
async function fetchGist(token, state) {
  let gistId = state.gistId;

  if (!gistId) {
    const res = await fetch(`${API}/gists?per_page=100`, { headers: headers(token) });
    if (!res.ok) throw new Error(`gist listesi alınamadı (${res.status})`);
    const gists = await res.json();
    const found = gists.find((g) =>
      (g.description ?? '').startsWith(DESCRIPTION_PREFIX)
    );
    if (!found) throw new Error('senkron gist bulunamadı');
    gistId = found.id;
  }

  const conditional = state.etag ? { 'If-None-Match': state.etag } : {};
  const full = await fetch(`${API}/gists/${gistId}`, {
    headers: { ...headers(token), ...conditional },
  });

  // Değişmemiş — gövde yok, indirilen veri yok
  if (full.status === 304) return { gistId, unchanged: true, etag: state.etag };

  if (!full.ok) {
    // Kimlik eskimişse (gist silinip yeniden oluşturulmuşsa) baştan ara
    if (full.status === 404 && state.gistId) {
      return fetchGist(token, { ...state, gistId: null, etag: null });
    }
    throw new Error(`gist okunamadı (${full.status})`);
  }

  return {
    gistId,
    gist: await full.json(),
    etag: full.headers.get('etag'),
    unchanged: false,
  };
}

async function readGistFile(gist, name) {
  const file = gist.files?.[name];
  if (!file) return null;
  if (file.truncated && file.raw_url) {
    return await (await fetch(file.raw_url)).text();
  }
  return file.content ?? null;
}

/**
 * Kalp atışını gist'e yazar ve **yeni durumu döndürür**.
 *
 * ⚠️ Kendi yazdığımız dosya gist'i değiştirdiği için ETag'i geçersiz kılar;
 * önlem alınmazsa her kalp atışı bir sonraki turda 80 KB'lık tam indirmeye
 * yol açardı (ETag tasarrufunun tamamı çöpe giderdi). Bu yüzden PATCH
 * yanıtının ETag'i saklanıyor: yanıt gövdesi GET ile aynı temsil olduğu için
 * bir sonraki koşullu istek 304 dönüyor. Tutmazsa en kötü ihtimalle bir kez
 * tam indirme olur — eski davranışa döner, bozulan bir şey olmaz.
 */
async function sendHeartbeat(token, gistId, state, extra = {}) {
  const now = Date.now();
  if (!gistId) return state;
  if (now - (state.lastHeartbeatAt ?? 0) < HEARTBEAT_GAP_MS && !extra.force) {
    return state;
  }

  const payload = {
    at: new Date(now).toISOString(),
    lastLessonDate: state.lastLessonDate ?? null,
    fails: state.fails ?? 0,
    /** Nöbetçi pes ettiyse telefon bunu "kendiliğinden düzelmez" diye okuyor */
    gaveUp: Boolean(extra.gaveUp),
    host: process.env.COMPUTERNAME || 'bilgisayar',
  };

  try {
    const res = await fetch(`${API}/gists/${gistId}`, {
      method: 'PATCH',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: { [HEARTBEAT_FILE]: { content: JSON.stringify(payload, null, 2) } },
      }),
    });
    if (!res.ok) return state;
    const next = {
      ...state,
      lastHeartbeatAt: now,
      etag: res.headers.get('etag') ?? state.etag,
    };
    await saveState(next);
    return next;
  } catch {
    // Ağ yoksa kalp atışı da atılamaz; zaten telefon da göremiyor olacak
    return state;
  }
}

async function loadState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch {
    return { lastOutboxAt: null, lastRunAt: 0, gistId: null, etag: null, fails: 0 };
  }
}

async function saveState(state) {
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

/* ------------------------------------------------------- öğretmeni çalıştır */

/**
 * Claude Code'u sessiz kipte çalıştırır.
 *
 * ## ⚠️ Ağ işini öğretmen değil, nöbetçi yapar
 *
 * Nöbetçi kimseye soru soramaz — arkada çalışıyor, karşısında kimse yok. İlk
 * tasarımda öğretmen `node scripts/sync.mjs pull|push` çalıştırıyordu ve **üç
 * denemede de** izin duvarına tosladı: `-p` kipindeki oturum kabuk komutunu
 * çalıştıramadı, "izin ver" diye sordu, cevap veren olmadı. Her seferinde
 * "bitti" yazdı ama gist'e tek bayt yazılmamıştı — sessiz başarısızlık, en
 * kötü tür.
 *
 * Denenip **işe yaramayanlar** (tekrar deneme):
 *  - `--allowed-tools "Bash(node scripts/sync.mjs:*)"` → Windows'ta parantez
 *    ve boşluk `shell: true` altında bozuluyor, desen eşleşmiyor.
 *  - Bayrağı Bash'siz vermek → bayrak bir **beyaz liste**, verildiği anda
 *    listede olmayan her araç kapanıyor; Bash tamamen kayboldu.
 *  - `.claude/settings.json` içine izin kuralı → `-p` oturumu yine sordu.
 *
 * Çözüm mimarinin kendisinde: **öğretmenin ağa çıkmasına gerek yok.**
 *  1. Nöbetçi gist'ten çeker, `.outbox.json` diye diske yazar.
 *  2. Öğretmen o dosyayı **okur**, cevabı `.inbox-draft.json` diye **yazar**.
 *     İkisi de dosya işi; `--permission-mode acceptEdits` bunlara yetiyor.
 *  3. Nöbetçi taslağı doğrulayıp gist'e kendisi gönderir.
 *
 * Yan faydası güvenlik: arka planda çalışan yapay zekâ hiçbir kabuk komutu
 * çalıştırmıyor, sadece iki dosyaya dokunuyor.
 */
function runTeacher() {
  return new Promise((resolvePromise) => {
    const args = ['-p', '/ogretmen', '--permission-mode', 'acceptEdits'];

    log(`öğretmen çalıştırılıyor: claude ${args.slice(0, 2).join(' ')}`);

    // Windows'ta claude bir .ps1/.cmd sarmalayıcısı — shell gerekiyor
    const child = spawn('claude', args, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.on('error', (error) => {
      log(`HATA: claude başlatılamadı — ${error.message}`);
      resolvePromise(false);
    });

    /** Takılan tur nöbeti kilitlemesin */
    const timer = setTimeout(() => {
      log(`öğretmen ${TEACHER_TIMEOUT_MS / 60000} dakikada bitmedi, durduruluyor.`);
      try {
        child.kill();
      } catch {
        /* zaten ölmüş */
      }
    }, TEACHER_TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(timer);
      /**
       * ⚠️ Öğretmenin kendi çıktısı **kayda geçmeli.**
       *
       * Burada `console.log` vardı; nöbetçi Başlangıç klasöründen penceresiz
       * açıldığı için o çıktı hiçbir yere düşmüyordu. 14 Ağustos'ta öğretmen
       * "çalıştı ama taslak yazmadı" dedi ve **niye** olduğunu görecek tek
       * satır yoktu. Artık son satırlar `.watch-log.txt` içine giriyor.
       */
      const tail = output.trim().split('\n').slice(-12).join('\n');
      if (tail) log(`öğretmenin son sözleri:\n${tail}`);
      if (code === 0) {
        log('öğretmen turu bitti.');
        resolvePromise(true);
      } else {
        /**
         * Windows'ta `claude` bulunamazsa `error` olayı tetiklenmiyor; kabuk
         * açılıp 1/9009 ile çıkıyor ve buraya düşüyor. Sebebi göremeyen
         * kullanıcı için açıkça yazıyoruz.
         */
        if (code === 9009 || code === 127) {
          log('HATA: `claude` komutu bulunamadı. Claude Code kurulu mu?');
        } else {
          log(`öğretmen ${code} koduyla çıktı.`);
        }
        resolvePromise(false);
      }
    });
  });
}

/* ------------------------------------------------------------- döngü */

/**
 * Bir tur: gist'e bak, yeni iş var mı, varsa öğretmeni çalıştır.
 *
 * "Yeni iş" ölçütü `outbox.generatedAt`: telefon her gönderdiğinde değişiyor.
 * Bunu son işlenenle karşılaştırmak, aynı paket için ikinci kez öğretmen
 * çalıştırmayı önlüyor — yoksa nöbetçi her dakika jeton yakardı.
 */
async function tick(token, options) {
  // `let`: gist kimliği ve ETag alındıktan sonra üzerine yazılıyor
  let state = await loadState();

  let fetched;
  try {
    fetched = await fetchGist(token, state);
  } catch (error) {
    log(`bağlanılamadı: ${error.message}`);
    return;
  }

  /**
   * Gist hiç değişmemiş — telefon yeni bir şey göndermemiş, veri harcamadık.
   *
   * ⚠️⚠️ **Buradaki erken çıkış nöbetçiyi iki gün kör etti.** Aşağıdaki
   * "bugünün dersi yok" kontrolü bu satırların *altında* olduğu için hiç
   * çalışmıyordu: telefon sessizse gist değişmez, gist değişmezse tur burada
   * biter, ders de hiç üretilmezdi. Ömer uygulamayı telefondan silince
   * senkron durdu ve öğretmen sustu — kimse de fark etmedi.
   *
   * Doğrusu: paket değişmemiş olabilir ama **gün değişmiş** olabilir.
   * Bugüne ders kurulmadıysa elimizdeki (değişmemiş) paketle çalışmak
   * gerekir, bunun için gövdeyi koşulsuz bir kez indiriyoruz.
   */
  if (fetched.unchanged) {
    let next = state;
    if (state.gistId !== fetched.gistId) {
      next = { ...next, gistId: fetched.gistId };
      await saveState(next);
    }

    const dersGerekiyor = next.lastLessonDate !== localDay();
    const sonTurdanBeri = Date.now() - (next.lastRunAt ?? 0);
    if (!dersGerekiyor || sonTurdanBeri < REFRESH_GAP_MS) {
      await sendHeartbeat(token, fetched.gistId, next);
      return;
    }

    log('paket değişmedi ama bugüne ders yok — gövde koşulsuz indiriliyor.');
    try {
      fetched = await fetchGist(token, { ...next, etag: null });
    } catch (error) {
      log(`bağlanılamadı: ${error.message}`);
      return;
    }
    if (fetched.unchanged || !fetched.gist) return;
    state = next;
  }

  const gist = fetched.gist;
  /**
   * Kimlik ve ETag hemen yazılıyor: tur ilerideki bir adımda hata verse bile
   * bir sonraki tur liste isteğini tekrar yapmasın.
   */
  state = { ...state, gistId: fetched.gistId, etag: fetched.etag };
  await saveState(state);

  const raw = await readGistFile(gist, 'outbox.json');
  if (!raw || raw.trim() === '{}') {
    log('outbox boş — telefondan henüz bir şey gelmemiş.');
    return;
  }

  let outbox;
  try {
    outbox = JSON.parse(raw);
  } catch {
    log('outbox bozuk JSON — atlanıyor.');
    return;
  }

  const generatedAt = outbox.generatedAt ?? null;
  /**
   * ⚠️ Bu da ETag çıkışıyla **aynı hatanın ikizi**: "paket zaten işlendi"
   * demek "bugünün işi bitti" demek değil. Telefon günlerdir yeni bir şey
   * göndermemiş olabilir; ders yine de her gün kurulmalı. Sadece paket
   * aynıysa **ve** bugüne ders varsa sessizce bekliyoruz.
   */
  if (generatedAt && generatedAt === state.lastOutboxAt && state.lastLessonDate === localDay()) {
    state = await sendHeartbeat(token, fetched.gistId, state);
    return;
  }

  /* Gerçekten iş var mı — boş bir senkron için öğretmen çalıştırma */
  const pendingTasks = outbox.pendingTasks?.length ?? 0;
  const pendingConversations = outbox.conversations?.length ?? 0;
  const hasExam = Boolean(outbox.levelExam);
  const levelChanged = Boolean(outbox.profile?.levelJustChanged);
  const questions = outbox.questions?.length ?? 0;
  const today = localDay();
  /**
   * Bugüne ders geldi mi.
   *
   * ⚠️ Bu bayrak eskiden "nöbetçi bugün bir paket gönderdi mi" demekti ve
   * telefon her senkron attığında tam bir öğretmen turu tetikliyordu —
   * `ogretmen.md` §7.5'teki "günde tek çalıştır" bütçesine aykırı. Artık
   * gerçekten **dersin tarihine** bakılıyor.
   */
  const needsToday = state.lastLessonDate !== today;

  const reasons = [];
  if (pendingTasks) reasons.push(`${pendingTasks} görev`);
  if (pendingConversations) reasons.push(`${pendingConversations} sohbet`);
  if (questions) reasons.push(`${questions} soru`);
  if (hasExam) reasons.push('seviye sınavı');
  if (levelChanged) reasons.push('seviye değişti');
  if (needsToday) reasons.push('bugünün dersi yok');

  if (reasons.length === 0) {
    state = { ...state, lastOutboxAt: generatedAt, fails: 0 };
    await saveState(state);
    log('yeni paket var ama işlenecek bir şey yok.');
    await sendHeartbeat(token, fetched.gistId, state);
    return;
  }

  /**
   * Bugünün dersi zaten kurulduysa ve elde **gerçek iş** yoksa öğretmeni
   * sık sık rahatsız etme. Ders yenilemek için 45 dakika bekleniyor.
   */
  const onlyRefresh = !pendingTasks && !pendingConversations && !questions && !hasExam && !levelChanged;
  const since = Date.now() - (state.lastRunAt ?? 0);
  const gap = onlyRefresh ? REFRESH_GAP_MS : MIN_GAP_MS;
  /** Üst üste başarısızlıkta bekleme büyür */
  const fails = state.fails ?? 0;
  const backoff = BACKOFF_MS[Math.min(fails, BACKOFF_MS.length - 1)];
  const wait = Math.max(gap, backoff) - since;

  if (wait > 0) {
    log(`iş var (${reasons.join(', ')}) ama ${Math.ceil(wait / 1000)} sn sonra.`);
    return;
  }

  if (fails >= MAX_FAILS) {
    log(
      `${fails} kez üst üste başarısız oldu, bu paket bırakılıyor. Ayrıntı: ${LOG_FILE}`
    );
    state = { ...state, lastOutboxAt: generatedAt, fails: 0 };
    await saveState(state);
    /**
     * Pes etme **telefona da bildiriliyor**. Eskiden bu satır sessizdi:
     * nöbetçi vazgeçiyor, ekran hiçbir şey söylemiyordu.
     */
    await sendHeartbeat(token, fetched.gistId, state, { force: true, gaveUp: true });
    return;
  }

  log(`iş var: ${reasons.join(', ')}`);
  if (options.dry) {
    log('--dry: çalıştırılmadı.');
    return;
  }

  let sent = false;
  let lessonDate = state.lastLessonDate;

  try {
    /* 1) Paketi diske koy — öğretmen ağa çıkmasın, sadece okusun */
    await writeFile(OUTBOX_FILE, raw, 'utf8');

    /**
     * Önceki turdan **geçerli bir taslak** kaldıysa öğretmeni tekrar
     * çalıştırma; sadece göndermeyi yeniden dene. Geçici bir ağ hatası
     * yüzünden tamamlanmış bir turu çöpe atmak jetonun boşa gitmesi demek.
     */
    let draft = await readFile(DRAFT_FILE, 'utf8').catch(() => null);
    if (draft) {
      try {
        JSON.parse(draft);
        log('önceki turdan geçerli taslak bulundu — sadece gönderim denenecek.');
      } catch {
        draft = null;
      }
    }

    /* 2) Öğretmeni çalıştır */
    if (!draft) {
      const ran = await runTeacher();
      draft = await readFile(DRAFT_FILE, 'utf8').catch(() => null);
      if (!draft) {
        log(
          ran
            ? 'öğretmen çalıştı ama .inbox-draft.json yazmamış — paket gönderilmedi.'
            : 'öğretmen tamamlanmadı, taslak yok.'
        );
      }
    }

    /* 3) Doğrula ve gönder */
    let parsed = null;
    if (draft) {
      try {
        parsed = JSON.parse(draft);
      } catch (error) {
        log(`taslak bozuk JSON, gönderilmedi — ${error.message}`);
        await rm(DRAFT_FILE, { force: true });
        draft = null;
      }
    }

    if (draft) {
      const res = await fetch(`${API}/gists/${gist.id}`, {
        method: 'PATCH',
        headers: { ...headers(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: { 'inbox.json': { content: draft } } }),
      });
      if (res.ok) {
        sent = true;
        /**
         * "Bugünün dersi kuruldu" damgası **paketin içindeki dersin
         * tarihinden** okunuyor. Öğretmen bir bölümde tıkanıp `lesson`
         * alanını boş bıraktıysa gün işaretlenmemeli, yoksa dersi olmayan
         * bir gün fark edilmeden geçer.
         */
        if (parsed?.lesson?.date === today) lessonDate = today;
        await rm(DRAFT_FILE, { force: true });
        log(
          `paket gönderildi (${draft.length} karakter). Telefon kendiliğinden çekecek.`
        );
      } else {
        // Taslak SİLİNMİYOR — bir sonraki turda gönderim tekrar denenecek
        log(`gönderilemedi (${res.status}); taslak korundu, tekrar denenecek.`);
      }
    }
  } catch (error) {
    log(`tur hata verdi: ${error.message}`);
  } finally {
    await rm(OUTBOX_FILE, { force: true });
  }

  state = {
    // ⚠️ `state`'i yay: `gistId` ve `etag` burada düşerse her tur yeniden
    // liste isteği yapılır ve koşullu istek tasarrufu tamamen kaybolur.
    ...state,
    lastOutboxAt: sent ? generatedAt : state.lastOutboxAt,
    fails: sent ? 0 : fails + 1,
    lastLessonDate: lessonDate,
    lastRunAt: Date.now(),
  };
  await saveState(state);

  /**
   * Tur bittiğinde kalp atışı **zorla** atılıyor: telefon hem "ne zaman
   * çalıştı" hem de "kaç kez tökezledi" bilgisini turun hemen ardından
   * görsün. Paket gönderdiysek gist zaten değişti, ek maliyeti yok.
   */
  await sendHeartbeat(token, fetched.gistId, state, { force: true });
}

/** Kilitli tur — aynı anda ikinci bir öğretmen süreci başlamasın */
async function guardedTick(token, options) {
  if (running) {
    log('önceki tur hâlâ sürüyor, bu tur atlandı.');
    return;
  }
  running = true;
  try {
    await tick(token, options);
  } catch (error) {
    log(`beklenmeyen hata: ${error.message}`);
  } finally {
    running = false;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const token = await getToken();

  /**
   * Açılışta bayat `.outbox.json` temizlenir.
   *
   * Ctrl+C veya çökme sonrası dosya diskte kalıyordu; kullanıcı elle
   * `/ogretmen` çalıştırdığında öğretmen kendini nöbetçi kipinde sanıp
   * taslak yazıyor ve paket hiç gönderilmiyordu — sessiz başarısızlığın
   * yeni bir çeşidi.
   */
  await rm(OUTBOX_FILE, { force: true });

  const stop = () => {
    log('nöbetçi durduruldu.');
    void rm(OUTBOX_FILE, { force: true })
      .then(flushLog)
      .finally(() => process.exit(0));
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  log(
    options.once
      ? 'tek sefer bakılıyor…'
      : `nöbet başladı — ${options.interval} saniyede bir bakılacak. Durdurmak için Ctrl+C.`
  );

  await guardedTick(token, options);

  /**
   * Açılış kalp atışı: nöbetçi yeni başladıysa telefon bunu ilk turda görsün.
   * Aksi hâlde bilgisayar yeni açılmışken ekran hâlâ "saatlerdir sessiz"
   * diyor ve kullanıcı boşuna uğraşıyor.
   */
  const başlangıç = await loadState();
  if (başlangıç.gistId) {
    await sendHeartbeat(token, başlangıç.gistId, başlangıç, { force: true });
  }

  if (options.once) {
    await flushLog();
    return;
  }

  setInterval(() => {
    void guardedTick(token, options);
  }, options.interval * 1000);
}

main().catch((error) => {
  console.error('Beklenmeyen hata:', error.message);
  process.exit(1);
});
