/**
 * Müfredat ve hedef gün sayısının denetimi.
 *
 * Neden var: hedef gün sayısı kullanıcının en çok şikâyet ettiği sayı.
 * *"O gün sayılarında abartı oluyordu, 760 günler falan geliyordu."* Eski
 * model `remainingHours` × tempo idi ve 540 (tavan) veriyordu. Yeni model
 * müfredattan çıkıyor ve **denetlenebilir olması** tek gerekçesi: söz verilen
 * gün kadar çalışan gerçekten seviye atlamalı. Denetlenebilir bir sayı,
 * denetlenmeli.
 *
 * Çalıştırma: npm run mufredat
 */

import {
  A1_STEPS,
  activeCurriculum,
  calendarDaysFor,
  curriculumProgress,
  placeByScore,
  MAX_DAYS,
} from '../src/core/curriculum.ts';
import { LEVEL_SPEC } from '../src/core/level.ts';
import { estimateTarget, targetLevelFor, weeklyActiveDays } from '../src/core/progress.ts';
import { WORD_BANK } from '../src/core/words/index.ts';

let hata = 0;
const bekle = (ad, olan, beklenen) => {
  const ok = JSON.stringify(olan) === JSON.stringify(beklenen);
  if (!ok) hata++;
  console.log(`${ok ? 'OK  ' : 'HATA'} ${ad.padEnd(52)} ${olan} (beklenen ${beklenen})`);
};
const bekleAralik = (ad, olan, alt, ust) => {
  const ok = olan >= alt && olan <= ust;
  if (!ok) hata++;
  console.log(`${ok ? 'OK  ' : 'HATA'} ${ad.padEnd(52)} ${olan} (beklenen ${alt}-${ust})`);
};

/* ------------------------------------------------ 1. merdivenin kendisi */

console.log('— A1 merdiveni —');
const toplamGun = A1_STEPS.reduce((a, s) => a + s.days, 0);
bekleAralik('toplam ders günü', toplamGun, 45, 80);
bekle('basamak sayısı sınır içinde', A1_STEPS.length >= 3 && A1_STEPS.length <= 25, true);
bekle(
  'her basamağın günü 1-20 arası',
  A1_STEPS.every((s) => s.days >= 1 && s.days <= 20),
  true
);
bekle('kimlikler tekil', new Set(A1_STEPS.map((s) => s.id)).size, A1_STEPS.length);
bekle('her basamağın hedefi yazılı', A1_STEPS.every((s) => s.goal.length > 10), true);

/**
 * ⚠️ **Müfredat ile kelime havuzu aynı sayıyı vermeli.**
 *
 * Müfredat 63 günde bitip havuz 100 günde bitiyorsa, A2'ye geçen öğrencinin
 * A1 kelimelerinin üçte biri hiç gelmemiş olur. İki ölçü birbirini tutmazsa
 * "A1 bitti" demek anlamını yitirir.
 */
const a1Kelime = WORD_BANK.filter((w) => w.level === 'A1').length;
const kelimeGunu = Math.round((a1Kelime * 0.6) / LEVEL_SPEC.A1.maxNewWordsPerDay);
console.log(
  `    A1 havuzu ${a1Kelime} kelime · %60'ı günde ${LEVEL_SPEC.A1.maxNewWordsPerDay} kelimeyle ${kelimeGunu} gün`
);
bekleAralik('müfredat ile kelime havuzu uyumu (fark)', Math.abs(toplamGun - kelimeGunu), 0, 12);

/* --------------------------------------------------- 2. ilerleme hesabı */

console.log('\n— İlerleme —');
const hepsiTodo = { level: 'A1', steps: A1_STEPS.map((s) => ({ ...s })) };
bekle('hiç başlanmamışken kalan gün', curriculumProgress(hepsiTodo).remainingLessonDays, toplamGun);

const hepsiDone = { level: 'A1', steps: A1_STEPS.map((s) => ({ ...s, status: 'done' })) };
bekle('hepsi bitince kalan gün', curriculumProgress(hepsiDone).remainingLessonDays, 0);
bekle('hepsi bitince tamamlanan', curriculumProgress(hepsiDone).done, A1_STEPS.length);

/** Aktif basamak yarım sayılır — sayı basamak içinde de ilerlemeli */
const ilkAktif = {
  level: 'A1',
  steps: A1_STEPS.map((s, i) => ({ ...s, status: i === 0 ? 'active' : 'todo' })),
};
bekle(
  'aktif basamak yarım sayılıyor',
  curriculumProgress(ilkAktif).remainingLessonDays,
  Math.round(toplamGun - A1_STEPS[0].days / 2)
);

/* ------------------------------------------------- 3. puana göre yerleşim */

console.log('\n— Puana göre yerleştirme —');
const p0 = placeByScore(A1_STEPS, 0);
const p80 = placeByScore(A1_STEPS, 80);
bekle('0 puan başta duruyor', p0.filter((s) => s.status === 'done').length, 0);
bekle('80 puan ileride başlıyor', p80.filter((s) => s.status === 'done').length > 6, true);
bekle('80 puanda son basamak atlanmıyor', p80.at(-1).status !== 'done', true);
bekle(
  '80 puanlı ile 0 puanlının kalan günü farklı',
  curriculumProgress({ level: 'A1', steps: p0 }).remainingLessonDays !==
    curriculumProgress({ level: 'A1', steps: p80 }).remainingLessonDays,
  true
);

/* ------------------------------------------------- 4. takvim gününe çevirme */

console.log('\n— Takvim günü —');
bekle('her gün çalışan: ders günü = takvim günü', calendarDaysFor(63, 7), 63);
bekle('haftada 5 gün çalışan', calendarDaysFor(63, 5), Math.ceil((63 * 7) / 5));
bekle('haftada 1 gün çalışan', calendarDaysFor(63, 1), 63 * 7);
bekle('ölçüm yoksa 5 gün varsayılır', calendarDaysFor(63, undefined), calendarDaysFor(63, 5));
bekle('bitmiş müfredat 0 gün', calendarDaysFor(0, 5), 0);

/* ---------------------------------------- 5. uçtan uca: ekrana çıkan sayı */

console.log('\n— Uçtan uca (estimateTarget) —');

function veri(seviye, oturumGunleri, plan) {
  return {
    version: 1,
    profile: { level: seviye, goals: '', weekdayMinutes: 6, weekendMinutes: 25, placementDone: true, levelScore: 39 },
    cards: [], errors: [], tasks: [],
    sessions: oturumGunleri.map((d) => ({ date: d, minutes: 8 })),
    sync: {}, suggestedTasks: [], content: [], scores: [], contentDone: [],
    conversations: [], targetHistory: [], plan,
  };
}

const BUGUN = new Date('2026-08-11T09:00:00');

/**
 * ⚠️ Tarihleri `toISOString()` ile üretme — yerel saat UTC'ye çevrilirken bir
 * gün kayıyor ve gün sayısı sessizce değişiyor. (Bu test ilk yazıldığında tam
 * olarak buna takıldı: 28 gün üretildi, 27 tekil gün çıktı.)
 */
const iso = (gunOnce) => {
  const d = new Date(2026, 7, 11 - gunOnce);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Son 28 günün 20'sinde çalışmış biri ≈ haftada 5 gün */
const gunler = [];
for (let i = 0; i < 28; i++) if (i % 7 < 5) gunler.push(iso(i));

const bos = veri('A1', gunler, undefined);
const tahmin = estimateTarget(bos, BUGUN);
bekle('plan yokken bile tahmin var (varsayılan müfredat)', !!tahmin, true);
bekle('hedef bir üst seviye', tahmin?.level, 'A2');
bekleAralik('gün sayısı makul', tahmin?.daysRemaining ?? 0, 60, 130);
bekle('müfredat bilgisi ekrana gidiyor', !!tahmin?.curriculum, true);
console.log(`    not: ${tahmin?.note}`);

/**
 * ⚠️ Asıl şikâyetin testi: eski model burada 540 veriyordu.
 * `remainingHours` yüksek bile olsa müfredat kazanmalı.
 */
const abartiliPlan = {
  targetLevel: 'A2', remainingHours: 400, dailyNewWords: 4, dailyMinutes: 10,
  focus: [], note: '', updatedAt: '2026-08-11T00:00:00Z',
};
const tahmin2 = estimateTarget(veri('A1', gunler, abartiliPlan), BUGUN);
bekleAralik('400 saatlik plan gün sayısını şişirmiyor', tahmin2?.daysRemaining ?? 0, 60, 130);
bekle('540 tavanına dayanmıyor', (tahmin2?.daysRemaining ?? 0) < 400, true);

/** Her gün çalışan biri müfredatın söz verdiği gün kadar çalışmalı */
const hergun = [];
for (let i = 0; i < 28; i++) hergun.push(iso(i));
const hergunVeri = veri('A1', hergun, undefined);
const tahmin3 = estimateTarget(hergunVeri, BUGUN);
bekle('haftalık çalışma günü ölçülüyor', weeklyActiveDays(hergunVeri, BUGUN), 7);
bekle(
  'her gün çalışan: takvim günü = kalan ders günü',
  tahmin3?.daysRemaining,
  tahmin3?.curriculum?.lessonDaysLeft
);

/** Ekrandaki sayı ile müfredat her tempoda tutarlı olmalı */
const tempoVeri = veri('A1', gunler, undefined);
const tempoTahmin = estimateTarget(tempoVeri, BUGUN);
bekle(
  'gün sayısı müfredat × tempo formülüyle aynı',
  tempoTahmin?.daysRemaining,
  calendarDaysFor(
    tempoTahmin?.curriculum?.lessonDaysLeft ?? 0,
    weeklyActiveDays(tempoVeri, BUGUN)
  )
);

/**
 * ⚠️ Rozet ile sayı aynı seviyeyi göstermeli.
 *
 * Canlı testte yakalandı: ekranda **"A1 → B2, 82 gün"** yazıyordu. Gün sayısı
 * A2'ye göre hesaplanmış, rozet ise eskimiş plandan gelen B2'yi gösteriyordu.
 * İki ayrı kaynak aynı soruya iki cevap veriyordu.
 */
const eskimisPlan = {
  targetLevel: 'B2', remainingHours: 150, dailyNewWords: 4, dailyMinutes: 10,
  focus: [], note: '', updatedAt: '2026-08-01T00:00:00Z',
};
const eskimisVeri = veri('A1', gunler, eskimisPlan);
bekle('rozet eskimiş plandan etkilenmiyor', targetLevelFor(eskimisVeri), 'A2');
bekle(
  'rozet ile tahmin aynı seviyeyi gösteriyor',
  targetLevelFor(eskimisVeri),
  estimateTarget(eskimisVeri, BUGUN)?.level
);

/* ------------------------------------------------ 6. tavan ve geri sızma */

console.log('\n— Tavan (bağımsız denetimin bulduğu iki açık) —');

/**
 * ⚠️ Yeni model de tavansızdı: 175 ders günlük müfredat + haftada 2 gün tempo
 * **613 gün**, haftada 1 gün **1225 gün** veriyordu. Kullanıcının şikâyet
 * ettiği sayı kaynağı değişmiş hâlde geri geliyordu.
 */
const kocamanMufredat = {
  level: 'A1',
  steps: Array.from({ length: 25 }, (_, i) => ({
    id: `a1-${i + 1}`,
    title: `Basamak ${i + 1}`,
    goal: 'Bir şey öğreniyorsun.',
    days: 7,
    status: 'todo',
  })),
};
const yavasGunler = [];
for (let i = 0; i < 28; i++) if (i % 7 < 2) yavasGunler.push(iso(i));
const yavasVeri = veri('A1', yavasGunler, {
  targetLevel: 'A2', remainingHours: 200, dailyNewWords: 4, dailyMinutes: 10,
  focus: [], note: '', updatedAt: '2026-08-11T00:00:00Z', curriculum: kocamanMufredat,
});
const yavasTahmin = estimateTarget(yavasVeri, BUGUN);
bekle('en büyük müfredat + en yavaş tempo tavanı aşmıyor', yavasTahmin?.daysRemaining <= MAX_DAYS, true);
bekle('tavana dayanınca yol gösteriyor', /haftada 5 gün/.test(yavasTahmin?.note ?? ''), true);
console.log(`    not: ${yavasTahmin?.note}`);

/**
 * ⚠️ Müfredat yalnızca A1 için varsayılan; A2 ve üstünde öğretmen müfredat
 * göndermemişse eski saat modeline düşülüyordu ve orada tavan **540**'tı.
 * Kullanıcı yine şikâyet ettiği sayıyı görüyordu.
 */
const a2Veri = veri('A2', gunler, {
  targetLevel: 'B1', remainingHours: 400, dailyNewWords: 5, dailyMinutes: 10,
  focus: [], note: '', updatedAt: '2026-08-11T00:00:00Z',
});
const a2Tahmin = estimateTarget(a2Veri, BUGUN);
bekle('A2de müfredat yokken tavan 540 değil', a2Tahmin?.daysRemaining <= MAX_DAYS, true);
bekle('A2de müfredatın eksik olduğu söyleniyor', /müfredatını kurduğunda/.test(a2Tahmin?.note ?? ''), true);
console.log(`    A2 gün: ${a2Tahmin?.daysRemaining} · not: ${a2Tahmin?.note}`);

console.log(`\n${hata === 0 ? 'HEPSİ GEÇTİ' : hata + ' HATA'}`);
process.exit(hata ? 1 : 0);
