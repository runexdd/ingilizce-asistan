/**
 * Otomatik senkron.
 *
 * Kullanıcının şikâyeti: *"biz seçenek işaretlediğimizde zaten otomatik
 * senkronize etsin, sürekli seç elle oraya bas."* Doğru: bir tercih seçmek
 * veya bir görev bitirmek zaten "gönderilecek bir şey var" demek. Ayrıca bir
 * düğmeye basmayı hatırlamak gerekiyorsa sistem dinamik değil, elle sürülen
 * bir şey olur.
 *
 * ## Nasıl çalışıyor
 *
 * Uygulamanın kökünde görünmez bir bileşen duruyor ve iki iş yapıyor:
 *
 * 1. **Açılışta çeker.** Öğretmen gece paket bıraktıysa kullanıcı sabah
 *    uygulamayı açtığında görsün.
 * 2. **Değişiklikten sonra gönderir.** Gönderilmeye değer bir şey değiştiyse
 *    (yeni görev cevabı, biten sohbet, seçilen tercih, biten sınav, seviye
 *    değişikliği) 4 saniye bekleyip gönderir.
 *
 * ## Neden "imza" var
 *
 * Her veri değişiminde göndermek sonsuz döngü yapardı: gönder → veriye
 * "senkronlandı" yaz → veri değişti → gönder… Bu yüzden yalnızca **öğretmeni
 * ilgilendiren** alanlardan küçük bir imza (`syncSignature`) çıkarılıyor ve
 * imza değişmediyse ağa hiç çıkılmıyor. Kart cevaplamak, ekran gezmek,
 * senkron damgası yazmak imzayı değiştirmez.
 *
 * ## Neden 4 saniye
 *
 * Tercih ekranında arka arkaya beş seçenek işaretleniyor. Her dokunuşta ağa
 * çıkmak hem gereksiz hem de yarım kalmış bir seçim listesini gönderir.
 * Kullanıcı durunca gönderiliyor.
 */

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import {
  applyInbox,
  markConversationsSynced,
  markLevelExamSynced,
  markTasksSynced,
  setSync,
} from '../db/mutations';
import { useStore } from '../db/store';
import type { AppData } from '../db/types';
import { buildOutbox, pullInbox, pushOutbox } from './github';

/** Bekleme süresi — kullanıcı seçim yapmayı bitirsin diye */
const DEBOUNCE_MS = 4000;
/** Aynı paketi üst üste göndermemek için asgari ara */
const MIN_INTERVAL_MS = 20000;

/**
 * Gönderilmeye değer ne var — kısa bir parmak izi.
 *
 * Buraya **sadece öğretmenin göreceği** şeyler girer. Bir alan eklerken şunu
 * sor: "bu değiştiğinde öğretmene haber gitmeli mi?" Cevap hayırsa ekleme,
 * yoksa uygulama boşuna ağa çıkar.
 */
export function syncSignature(data: AppData): string {
  const pendingTasks = data.tasks.filter(
    (t) => t.syncState === 'pending' && t.userResponse.trim()
  ).length;
  const pendingConversations = data.conversations.filter(
    (c) => c.syncState === 'pending' && c.messages.some((m) => m.role === 'user')
  ).length;
  const tastes = data.profile.tastes;

  return [
    pendingTasks,
    pendingConversations,
    data.profile.level,
    data.profile.levelScore ?? '',
    data.profile.levelChangedAt ?? '',
    data.profile.weekdayMinutes,
    data.profile.weekendMinutes,
    data.levelExam?.syncState === 'pending' ? (data.levelExam.date ?? 'x') : '',
    tastes?.updatedAt ?? '',
    (data.contentDone ?? []).length,
  ].join('|');
}

interface Runner {
  running: boolean;
}

async function runSync(
  data: AppData,
  update: (fn: (current: AppData) => AppData) => void,
  options: { push: boolean }
): Promise<void> {
  const { token, gistId } = data.sync;
  if (!token || !gistId) return;

  let sentTaskIds: string[] = [];
  let sentConversationIds: string[] = [];
  let sentExam = false;

  if (options.push) {
    const outbox = buildOutbox(data);
    const pushed = await pushOutbox(token, gistId, outbox);
    if ('error' in pushed) return;
    sentTaskIds = outbox.pendingTasks.map((t) => t.id);
    sentConversationIds = outbox.conversations.map((c) => c.id);
    sentExam = Boolean(outbox.levelExam);
  }

  const pulled = await pullInbox(token, gistId);

  update((current) => {
    let next = current;
    if (options.push) {
      next = markTasksSynced(next, sentTaskIds);
      next = markConversationsSynced(next, sentConversationIds);
      if (sentExam) next = markLevelExamSynced(next);
      next = setSync(next, { lastPushAt: new Date().toISOString() });
    }
    if (!('error' in pulled) && pulled.inbox) {
      next = applyInbox(next, pulled.inbox);
    }
    return next;
  });
}

/**
 * Görünmez bileşen — kökte bir kez asılır.
 *
 * Ekran çizmez; sadece veriyi izler. Hata durumunda **sessiz kalır**: arka
 * planda çalışan bir şey kullanıcının önüne hata atmamalı. Elle senkron
 * (Ayarlar → Şimdi senkronla) duruyor ve orada hatalar görünüyor.
 */
export function AutoSync() {
  const { data, update } = useStore();

  const dataRef = useRef(data);
  dataRef.current = data;

  const runner = useRef<Runner>({ running: false });
  const lastSignature = useRef<string | null>(null);
  const lastRunAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connected = Boolean(data.sync.token && data.sync.gistId);
  const signature = connected ? syncSignature(data) : '';

  /* --- 1. açılışta ve uygulamaya geri dönüşte çek --- */
  useEffect(() => {
    if (!connected) return;

    const pull = () => {
      if (runner.current.running) return;
      runner.current.running = true;
      void runSync(dataRef.current, update, { push: false }).finally(() => {
        runner.current.running = false;
      });
    };

    pull();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') pull();
    });
    return () => subscription.remove();
  }, [connected, update]);

  /* --- 2. değişiklikten sonra gönder --- */
  useEffect(() => {
    if (!connected) return;

    // İlk turda imzayı sadece kaydet; açılışta gereksiz gönderme yapma
    if (lastSignature.current === null) {
      lastSignature.current = signature;
      return;
    }
    if (signature === lastSignature.current) return;

    /**
     * ⚠️ Çok erken gelen değişiklik **düşürülmez, ertelenir.**
     *
     * Önce "20 saniye dolmadıysa çık" deniyordu; ama efekt yalnızca imza
     * değiştiğinde çalıştığı için o değişiklik bir daha hiç gönderilmiyordu.
     * Kullanıcı tercihini senkronun hemen ardından değiştirirse seçimi
     * telefonda kalırdı. Şimdi kalan süre kadar tekrar kuruluyor.
     */
    const attempt = () => {
      const now = Date.now();
      const waited = now - lastRunAt.current;
      if (runner.current.running || waited < MIN_INTERVAL_MS) {
        const retryIn = runner.current.running
          ? 2000
          : MIN_INTERVAL_MS - waited;
        timer.current = setTimeout(attempt, retryIn);
        return;
      }
      lastSignature.current = signature;
      lastRunAt.current = now;
      runner.current.running = true;
      void runSync(dataRef.current, update, { push: true }).finally(() => {
        runner.current.running = false;
      });
    };

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(attempt, DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [signature, connected, update]);

  return null;
}
