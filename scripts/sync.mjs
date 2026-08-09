#!/usr/bin/env node
/**
 * Köprü aracı — /ogretmen komutunun kullandığı yardımcı.
 *
 * Neden ayrı bir betik: PowerShell'in kodlama davranışı Türkçe karakterleri
 * bozuyor ve gist API'si bunu reddediyor. Node UTF-8'i doğal olarak
 * işlediği için bu sınıf hataların tamamı ortadan kalkıyor.
 *
 * Kullanım (proje kökünden):
 *   node scripts/sync.mjs pull            → outbox.json içeriğini yazdırır
 *   node scripts/sync.mjs push <dosya>    → dosyayı inbox.json olarak gönderir
 *   node scripts/sync.mjs status          → bağlantı ve kutu durumu
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const API = 'https://api.github.com';
const DESCRIPTION_PREFIX = 'ingilizce-asistan';

async function getToken() {
  try {
    const raw = await readFile(resolve('sync-token.txt'), 'utf8');
    const token = raw.trim();
    if (!token) throw new Error('boş');
    return token;
  } catch {
    console.error(
      'HATA: sync-token.txt okunamadı veya boş. GitHub jetonunu o dosyaya yapıştır.'
    );
    process.exit(1);
  }
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
  if (!res.ok) {
    console.error(`HATA: gist listesi alınamadı (${res.status}).`);
    process.exit(1);
  }
  const gists = await res.json();
  const found = gists.find((g) => (g.description ?? '').startsWith(DESCRIPTION_PREFIX));
  if (!found) {
    console.error(
      'HATA: senkron gist bulunamadı. Telefonda Ayarlar → Öğretmen bağlantısı → Bağlan.'
    );
    process.exit(1);
  }

  // Liste uç noktası dosya içeriklerini döndürmez — tek gist'i ayrıca çek
  const full = await fetch(`${API}/gists/${found.id}`, { headers: headers(token) });
  if (!full.ok) {
    console.error(`HATA: gist okunamadı (${full.status}).`);
    process.exit(1);
  }
  return await full.json();
}

/** Gist dosya içeriğini güvenle okur (büyük dosyalar kısaltılmış gelir). */
async function readGistFile(gist, name) {
  const file = gist.files?.[name];
  if (!file) return null;
  if (file.truncated && file.raw_url) {
    return await (await fetch(file.raw_url)).text();
  }
  return file.content ?? null;
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  const token = await getToken();

  if (command === 'status') {
    const me = await fetch(`${API}/user`, { headers: headers(token) });
    if (!me.ok) {
      console.error(`Jeton geçersiz (${me.status}).`);
      process.exit(1);
    }
    const user = await me.json();
    const gist = await findGist(token);
    const outbox = await readGistFile(gist, 'outbox.json');
    const inbox = await readGistFile(gist, 'inbox.json');
    console.log(`kullanıcı : ${user.login}`);
    console.log(`gist      : ${gist.id} (gizli: ${!gist.public})`);
    console.log(`outbox    : ${(outbox ?? '').length} karakter`);
    console.log(`inbox     : ${(inbox ?? '').length} karakter`);
    return;
  }

  if (command === 'pull') {
    const gist = await findGist(token);
    const content = await readGistFile(gist, 'outbox.json');
    if (!content || content.trim() === '{}') {
      console.log('OUTBOX BOŞ — telefonda Ayarlar → Şimdi senkronla yapılmamış.');
      return;
    }
    console.log(content);
    return;
  }

  if (command === 'push') {
    if (!arg) {
      console.error('Kullanım: node scripts/sync.mjs push <dosya.json>');
      process.exit(1);
    }
    const content = await readFile(resolve(arg), 'utf8');

    // Göndermeden önce geçerli JSON olduğunu doğrula
    try {
      JSON.parse(content);
    } catch (e) {
      console.error(`HATA: ${arg} geçerli JSON değil — ${e.message}`);
      process.exit(1);
    }

    const gist = await findGist(token);
    const res = await fetch(`${API}/gists/${gist.id}`, {
      method: 'PATCH',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { 'inbox.json': { content } } }),
    });

    if (!res.ok) {
      console.error(`HATA: gönderilemedi (${res.status})`);
      console.error((await res.text()).slice(0, 500));
      process.exit(1);
    }

    const updated = await res.json();
    console.log('GÖNDERİLDİ');
    console.log(`  inbox : ${updated.files['inbox.json'].size} bayt`);
    console.log(`  zaman : ${updated.updated_at}`);
    return;
  }

  console.error('Komut: pull | push <dosya> | status');
  process.exit(1);
}

main().catch((e) => {
  console.error('Beklenmeyen hata:', e.message);
  process.exit(1);
});
