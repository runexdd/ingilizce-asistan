/**
 * Günün sohbeti — akış motoru.
 *
 * ## Neden böyle kuruldu (bunu okumadan değiştirme)
 *
 * Kullanıcı gerçek bir sohbet istiyor: öğretmen bir şey sorsun, o cevaplasın,
 * öğretmen devam etsin. Telefondaki uygulama **canlı yapay zekâ çağıramıyor**
 * — proje kısıtı, Claude Max aboneliği dışında ek ücret yok.
 *
 * Çözüm: sohbeti öğretmen (Claude Code) bir gün önceden yazıyor. O gün hangi
 * diziyi/şarkıyı önerdiğini, kullanıcının seviyesini ve hangi kelimeleri
 * çalıştığını bildiği için sorular isabetli oluyor. Bu dosya o senaryoyu
 * yürütür: sırayı takip eder, kaçamak cevapta üsteler, yeterli konuşma olunca
 * bitirir.
 *
 * **Ne veremez:** cevabın içeriğine göre yepyeni bir soru üretmek. Onun yerine
 * öğretmen her tura bir `followUp` yazıyor ve uygulama kısa/kaçamak cevapta
 * onu kullanıyor. Derin değerlendirme (düzeltmeler, doğal karşılıklar) bir
 * sonraki senkronda `ConversationReview` olarak geliyor.
 *
 * Saf TypeScript — React yok, ağ yok, node ile test edilebilir.
 */

import { checkInstant, type InstantNote } from './instantcheck';
import { specOf, type LevelSizing } from './level';
import type { ConversationPlan, ConversationRecord, ConversationTurn } from '../db/types';

/** Kullanıcı cevabından sonra ne olacak */
export type ConversationAction =
  /** Aynı soruda kal, öğretmen üsteliyor */
  | 'follow-up'
  /** Sıradaki tura geç */
  | 'advance'
  /** Sohbet bitti */
  | 'finish';

export interface ConversationStep {
  action: ConversationAction;
  /** Öğretmenin bundan sonra söyleyeceği (İngilizce) */
  teacherLine: string;
  /** O repliğin Türkçe ipucu */
  hint?: string;
  /** Anlık Türkçe uyarılar — öğretmen konuşmadan ÖNCE gösterilir */
  notes: InstantNote[];
  /** Bundan sonraki tur numarası (0 tabanlı) */
  nextIndex: number;
}

/**
 * Bir turda beklenen en az kelime sayısı.
 *
 * Öğretmen `minWords` yazdıysa o geçerli. Yazmadıysa seviyeden türetilir:
 * konuşma süresinin saniyesi kabaca kelime sayısına yakın çıkıyor (A2 için
 * 45 sn ≈ 45 kelimelik bir konuşma), ama tek turda bunun tamamı beklenemez —
 * sohbet çok turdan oluşuyor. Bu yüzden dörtte biri alınıyor ve tabanı 6.
 */
export function expectedWords(
  turn: ConversationTurn,
  level: string,
  sizing?: LevelSizing | null
): number {
  if (turn.minWords) return turn.minWords;
  const seconds = specOf(level, sizing).speakingSeconds;
  return Math.max(6, Math.round(seconds / 4));
}

/**
 * Kullanıcının cevabını değerlendirip sıradaki adımı verir.
 *
 * `followedUp`: bu turda öğretmen zaten bir kez üstelemişse ikinci kez
 * üstelemez — ısrar öğretmez, bıktırır. Bir üsteleme hakkı yeter.
 */
export function nextStep(
  plan: ConversationPlan,
  index: number,
  answer: string,
  followedUp: boolean,
  level: string,
  sizing?: LevelSizing | null
): ConversationStep {
  const turn = plan.turns[index];
  const isLast = index >= plan.turns.length - 1;

  const minWords = turn ? expectedWords(turn, level, sizing) : 6;
  const notes = checkInstant(answer, {
    minWords,
    targetWords: turn?.useWords,
  });

  const answerWords = answer.trim().split(/\s+/).filter(Boolean).length;

  /**
   * Üsteleme şartı: cevap beklenenin **yarısından** kısa. Beklenenin biraz
   * altında kalan cevap yeterlidir; her eksik kelimede üstelemek sohbeti
   * sorgu hâline getirir.
   */
  const tooShort = answerWords < Math.ceil(minWords / 2);

  if (turn?.followUp && tooShort && !followedUp) {
    return {
      action: 'follow-up',
      teacherLine: turn.followUp,
      hint: 'Öğretmen biraz daha açmanı istiyor — bir iki cümle daha ekle.',
      notes,
      nextIndex: index,
    };
  }

  if (isLast) {
    return {
      action: 'finish',
      teacherLine: plan.closing,
      hint: plan.closingNote,
      notes,
      nextIndex: index + 1,
    };
  }

  const next = plan.turns[index + 1];
  return {
    action: 'advance',
    teacherLine: next.say,
    hint: next.hint,
    notes,
    nextIndex: index + 1,
  };
}

/* ------------------------------------------------------------- istatistik */

export interface ConversationStats {
  /** Kaç sohbet tamamlandı */
  sessions: number;
  /** Toplam kullanıcı repliği */
  userTurns: number;
  /** Mikrofonla verilen cevapların oranı, 0-100 */
  spokenRatio: number;
  /** Kullanıcının yazdığı toplam kelime */
  wordsSpoken: number;
  /** Cevap başına ortalama kelime — akıcılığın kaba ölçüsü */
  averageWords: number;
  /** Uygulamanın anlık yakaladığı hata sayısı */
  instantErrors: number;
  /** 1000 kelimede hata — düşerse gerçekten ilerliyor demektir */
  errorsPerThousand: number;
}

/**
 * Sohbet kayıtlarını sayıya çevirir.
 *
 * ⚠️ **Bunlar ölçüm, yargı değil.** Projenin baştan beri koyduğu ayrım:
 * uygulama sayar, öğretmen yargılar. `errorsPerThousand` sadece uygulamanın
 * yerel kurallarla yakaladıklarını sayar; "İngilizcen şu kadar iyi" demez.
 */
export function conversationStats(
  records: ConversationRecord[]
): ConversationStats {
  let userTurns = 0;
  let spoken = 0;
  let wordsSpoken = 0;
  let instantErrors = 0;

  for (const record of records) {
    for (const message of record.messages) {
      if (message.role !== 'user') continue;
      userTurns++;
      if (message.via === 'mic') spoken++;
      wordsSpoken += message.text.trim().split(/\s+/).filter(Boolean).length;
      instantErrors += message.notes?.length ?? 0;
    }
  }

  return {
    sessions: records.filter((r) => r.finished).length,
    userTurns,
    spokenRatio: userTurns === 0 ? 0 : Math.round((spoken / userTurns) * 100),
    wordsSpoken,
    averageWords: userTurns === 0 ? 0 : Math.round(wordsSpoken / userTurns),
    instantErrors,
    errorsPerThousand:
      wordsSpoken === 0 ? 0 : Math.round((instantErrors / wordsSpoken) * 1000),
  };
}

/**
 * Sohbetin öğretmene gönderilecek düz metin hâli.
 *
 * JSON yerine okunabilir bir döküm gönderiliyor: öğretmenin işi bunu okuyup
 * düzeltmek, ayrıştırmak değil. Uygulamanın anlık yakaladığı hatalar da
 * ekleniyor ki öğretmen aynı şeyi ikinci kez söylemesin.
 */
export function transcriptText(record: ConversationRecord): string {
  const lines: string[] = [`Konu: ${record.topic}`, ''];
  for (const message of record.messages) {
    if (message.role === 'teacher') {
      lines.push(`ÖĞRETMEN: ${message.text}`);
    } else {
      lines.push(`ÖMER${message.via === 'mic' ? ' (mikrofon)' : ''}: ${message.text}`);
      if (message.notes?.length) {
        lines.push(`   [uygulama uyardı: ${message.notes.join(' · ')}]`);
      }
    }
  }
  return lines.join('\n');
}
