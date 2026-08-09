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
import { resolve } from 'node:path';

const API = 'https://api.github.com';
const DESCRIPTION_PREFIX = 'ingilizce-asistan';
/** Son işlenen paketin damgası burada tutulur — aynı paketi iki kez işleme */
const STATE_FILE = resolve('.watch-state.json');
/** Telefondan gelen paket — öğretmen bunu diskten okur, ağa çıkmaz */
const OUTBOX_FILE = resolve('.outbox.json');
/** Öğretmenin yazdığı cevap — nöbetçi bunu gist'e gönderir */
const DRAFT_FILE = resolve('.inbox-draft.json');

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

/* ------------------------------------------------------------- yardımcı */

function stamp() {
  return new Date().toLocaleTimeString('tr-TR');
}

function log(message) {
  console.log(`[${stamp()}] ${message}`);
}

async function getToken() {
  const raw = await readFile(resolve('sync-token.txt'), 'utf8').catch(() => '');
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

    child.on('close', (code) => {
      const tail = output.trim().split('\n').slice(-12).join('\n');
      if (tail) console.log(tail);
      if (code === 0) {
        log('öğretmen bitti — paket gist\'e bırakıldı.');
        resolvePromise(true);
      } else {
        log(`öğretmen ${code} koduyla çıktı.`);
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
  const today = new Date().toISOString().slice(0, 10);
  /** Bugüne ders gelmemişse öğretmenin bugünün paketini kurması gerekiyor */
  const needsToday = state.lastLessonDate !== today;

  const reasons = [];
  if (pendingTasks) reasons.push(`${pendingTasks} görev`);
  if (pendingConversations) reasons.push(`${pendingConversations} sohbet`);
  if (hasExam) reasons.push('seviye sınavı');
  if (levelChanged) reasons.push('seviye değişti');
  if (needsToday) reasons.push('bugünün dersi yok');

  if (reasons.length === 0) {
    await saveState({ ...state, lastOutboxAt: generatedAt });
    log('yeni paket var ama işlenecek bir şey yok.');
    return;
  }

  const since = Date.now() - (state.lastRunAt ?? 0);
  if (since < MIN_GAP_MS) {
    const wait = Math.ceil((MIN_GAP_MS - since) / 1000);
    log(`iş var (${reasons.join(', ')}) ama son çalıştırmadan ${wait} sn sonra.`);
    return;
  }

  log(`iş var: ${reasons.join(', ')}`);
  if (options.dry) {
    log('--dry: çalıştırılmadı.');
    return;
  }

  /* 1) Paketi diske koy — öğretmen ağa çıkmasın, sadece okusun */
  await writeFile(OUTBOX_FILE, raw, 'utf8');
  await rm(DRAFT_FILE, { force: true });

  /* 2) Öğretmeni çalıştır */
  const ran = await runTeacher();

  /* 3) Taslağı al, doğrula, gist'e gönder */
  let draft = null;
  try {
    draft = await readFile(DRAFT_FILE, 'utf8');
  } catch {
    log(
      ran
        ? 'öğretmen çalıştı ama .inbox-draft.json yazmamış — paket gönderilmedi.'
        : 'öğretmen tamamlanmadı, taslak yok.'
    );
  }

  let sent = false;
  if (draft) {
    try {
      JSON.parse(draft);
    } catch (error) {
      log(`taslak bozuk JSON, gönderilmedi — ${error.message}`);
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
      log(`paket gönderildi (${draft.length} karakter). Telefon kendiliğinden çekecek.`);
    } else {
      log(`gönderilemedi (${res.status}).`);
    }
  }

  await rm(DRAFT_FILE, { force: true });
  await rm(OUTBOX_FILE, { force: true });

  await saveState({
    lastOutboxAt: sent ? generatedAt : state.lastOutboxAt,
    lastRunAt: Date.now(),
    lastLessonDate: sent ? today : state.lastLessonDate,
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const token = await getToken();

  log(
    options.once
      ? 'tek sefer bakılıyor…'
      : `nöbet başladı — ${options.interval} saniyede bir bakılacak. Durdurmak için Ctrl+C.`
  );

  await tick(token, options);
  if (options.once) return;

  setInterval(() => {
    void tick(token, options).catch((error) =>
      log(`beklenmeyen hata: ${error.message}`)
    );
  }, options.interval * 1000);
}

main().catch((error) => {
  console.error('Beklenmeyen hata:', error.message);
  process.exit(1);
});
