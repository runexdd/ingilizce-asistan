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
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const API = 'https://api.github.com';
const DESCRIPTION_PREFIX = 'ingilizce-asistan';
/** Son işlenen paketin damgası burada tutulur — aynı paketi iki kez işleme */
const STATE_FILE = resolve('.watch-state.json');

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
 * `--allowed-tools`: nöbetçi kimseye soru soramaz (arkada çalışıyor), o yüzden
 * `/ogretmen`'in ihtiyaç duyduğu araçlar önceden verilir. Liste bilerek dar:
 * yalnızca köprü betiği ve dosya yazma. Geniş bir izin vermek, arka planda
 * çalışan bir şeye gereğinden fazla yetki vermek olurdu.
 */
function runTeacher() {
  return new Promise((resolvePromise) => {
    const args = [
      '-p',
      '/ogretmen',
      '--permission-mode',
      'acceptEdits',
      '--allowed-tools',
      'Bash(node scripts/sync.mjs:*)',
      'Read',
      'Write',
      'Edit',
      'Glob',
      'Grep',
    ];

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

  const ok = await runTeacher();
  await saveState({
    lastOutboxAt: generatedAt,
    lastRunAt: Date.now(),
    lastLessonDate: ok ? today : state.lastLessonDate,
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
