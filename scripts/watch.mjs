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
import { readFile, rm, writeFile } from 'node:fs/promises';
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

/** Öğretmen bu süreyi aşarsa süreç öldürülür — takılan tur nöbeti kilitlemesin */
const TEACHER_TIMEOUT_MS = 12 * 60 * 1000;

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

function log(message) {
  console.log(`[${stamp()}] ${message}`);
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

async function findGist(token) {
  const res = await fetch(`${API}/gists?per_page=100`, { headers: headers(token) });
  if (!res.ok) throw new Error(`gist listesi alınamadı (${res.status})`);
  const gists = await res.json();
  const found = gists.find((g) =>
    (g.description ?? '').startsWith(DESCRIPTION_PREFIX)
  );
  if (!found) throw new Error('senkron gist bulunamadı');
  const full = await fetch(`${API}/gists/${found.id}`, { headers: headers(token) });
  if (!full.ok) throw new Error(`gist okunamadı (${full.status})`);
  return await full.json();
}

async function readGistFile(gist, name) {
  const file = gist.files?.[name];
  if (!file) return null;
  if (file.truncated && file.raw_url) {
    return await (await fetch(file.raw_url)).text();
  }
  return file.content ?? null;
}

async function loadState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch {
    return { lastOutboxAt: null, lastRunAt: 0 };
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
      const tail = output.trim().split('\n').slice(-12).join('\n');
      if (tail) console.log(tail);
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
  const state = await loadState();

  let gist;
  try {
    gist = await findGist(token);
  } catch (error) {
    log(`bağlanılamadı: ${error.message}`);
    return;
  }

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
  if (generatedAt && generatedAt === state.lastOutboxAt) {
    return; // yeni bir şey yok, sessizce bekle
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
    await saveState({ ...state, lastOutboxAt: generatedAt, fails: 0 });
    log('yeni paket var ama işlenecek bir şey yok.');
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
      `${fails} kez üst üste başarısız oldu, bu paket bırakılıyor. Sorunu çözüp .watch-state.json dosyasını sil.`
    );
    await saveState({ ...state, lastOutboxAt: generatedAt, fails: 0 });
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

  await saveState({
    lastOutboxAt: sent ? generatedAt : state.lastOutboxAt,
    fails: sent ? 0 : fails + 1,
    lastLessonDate: lessonDate,
    lastRunAt: Date.now(),
  });
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
    void rm(OUTBOX_FILE, { force: true }).finally(() => process.exit(0));
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  log(
    options.once
      ? 'tek sefer bakılıyor…'
      : `nöbet başladı — ${options.interval} saniyede bir bakılacak. Durdurmak için Ctrl+C.`
  );

  await guardedTick(token, options);
  if (options.once) return;

  setInterval(() => {
    void guardedTick(token, options);
  }, options.interval * 1000);
}

main().catch((error) => {
  console.error('Beklenmeyen hata:', error.message);
  process.exit(1);
});
