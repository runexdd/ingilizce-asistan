/**
 * Günün sohbeti ekranı.
 *
 * ## Akış (kullanıcının istediği sıra)
 *
 *   öğretmen sorar → kullanıcı **mikrofonla ya da yazarak** cevaplar →
 *   **önce Türkçe eksikler** gösterilir → sonra öğretmen devam eder →
 *   yeterli konuşma olunca öğretmen bitirir
 *
 * "Önce Türkçe eksikler" kısmı bilinçli olarak bir düğmenin arkasında:
 * uyarılar görünür görünmez öğretmenin repliği de gelirse kullanıcı uyarıyı
 * okumadan geçer. Uyarı yoksa beklemeye gerek olmadığı için doğrudan devam
 * edilir.
 *
 * ⚠️ Uygulama burada **canlı yapay zekâ çağırmıyor** — ek ücret yok kuralı.
 * Öğretmen (Claude Code) sohbeti bir gün önceden yazıyor; buradaki uyarılar
 * `instantcheck.ts` içindeki yerel kurallardan geliyor. Cümle cümle asıl
 * düzeltme bir sonraki senkronda `review` olarak gelip Öğretmen ekranında
 * görünüyor. Bu takas kullanıcıya ekranda da yazılıyor.
 */

import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { expectedWords, nextStep } from '../src/core/conversation';
import type { InstantNote } from '../src/core/instantcheck';
import { describeNotes } from '../src/core/instantcheck';
import { speakEnglish, stopSpeaking } from '../src/core/speech';
import {
  describeSpeechError,
  isSpeechInputSupported,
  startSpeechInput,
  type SpeechInputHandle,
} from '../src/core/speechInput';
import { toISODate } from '../src/core/srs';
import {
  addConversationMessage,
  finishConversation,
  recordSession,
  startConversation,
} from '../src/db/mutations';
import { getActiveConversation } from '../src/db/selectors';
import { useStore } from '../src/db/store';
import { colors, radius, spacing } from '../src/ui/theme';

export default function ConversationScreen() {
  const { data, update } = useStore();
  const today = toISODate(new Date());

  /**
   * Senaryonun kaynağı tek yerden seçiliyor: öğretmenin bugüne yazdığı plan
   * taze ise o, değilse uygulamanın seviye + zevke göre kurduğu plan. Böylece
   * seviye değiştiği anda sohbet de değişiyor, bilgisayarı beklemeden.
   */
  const active = useMemo(() => getActiveConversation(data), [data]);
  const plan = active.plan;

  /* Sohbet kaydı yoksa aç — ekran ilk açıldığında öğretmenin ilk repliği düşer */
  useEffect(() => {
    update((current) => startConversation(current, plan));
    // Plan gün içinde değişmiyor; kimlik değil tarih üzerinden bağlanıyoruz
  }, [plan.date, plan.topic, update]);

  const record = useMemo(
    () => (data.conversations ?? []).filter((c) => c.date === today).at(-1),
    [data.conversations, today]
  );

  /* --- akış durumu --- */
  const [turnIndex, setTurnIndex] = useState(0);
  const [followedUp, setFollowedUp] = useState(false);
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  /** Kullanıcı cevapladı, uyarılar okunuyor; öğretmen henüz konuşmadı */
  const [pending, setPending] = useState<{
    notes: InstantNote[];
    teacherLine: string;
    hint?: string;
    action: 'follow-up' | 'advance' | 'finish';
    nextIndex: number;
  } | null>(null);

  const micRef = useRef<SpeechInputHandle | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const micSupported = useMemo(() => isSpeechInputSupported(), []);
  /** Cevap mikrofonla mı verildi — kaydın istatistiğine giriyor */
  const usedMic = useRef(false);

  useEffect(() => {
    // Yarıda kalmış sohbet varsa kaldığı turdan devam
    if (record && turnIndex === 0 && record.turnsDone > 0) {
      setTurnIndex(record.turnsDone);
    }
  }, [record, turnIndex]);

  useEffect(() => () => {
    micRef.current?.stop();
    stopSpeaking();
  }, []);

  const finished = record?.finished ?? false;
  const currentTurn = plan.turns[turnIndex];
  const minWords = currentTurn
    ? expectedWords(currentTurn, data.profile.level, data.plan?.sizing)
    : 6;

  /* ------------------------------------------------------------ mikrofon */
  const toggleMic = () => {
    if (recording) {
      micRef.current?.stop();
      return;
    }
    setMicError(null);
    setInterim('');
    setRecording(true);
    const handle = startSpeechInput({
      onFinal: (chunk) => {
        if (!chunk) return;
        usedMic.current = true;
        setText((current) => (current ? `${current.trim()} ${chunk}` : chunk));
        setInterim('');
      },
      onInterim: setInterim,
      onError: (code) => setMicError(describeSpeechError(code)),
      onStop: () => {
        setRecording(false);
        setInterim('');
        micRef.current = null;
      },
    });
    micRef.current = handle;
    if (!handle) setRecording(false);
  };

  /* -------------------------------------------------------------- gönder */
  const send = () => {
    const answer = text.trim();
    if (!answer || !record || pending) return;
    micRef.current?.stop();

    const step = nextStep(
      plan,
      turnIndex,
      answer,
      followedUp,
      data.profile.level,
      data.plan?.sizing
    );

    const via = usedMic.current ? 'mic' : 'text';
    usedMic.current = false;

    update((current) =>
      addConversationMessage(current, record.id, {
        role: 'user',
        text: answer,
        via,
        notes: step.notes.map((n) => n.message),
        at: new Date().toISOString(),
      })
    );

    setText('');
    setPending({
      notes: step.notes,
      teacherLine: step.teacherLine,
      hint: step.hint,
      action: step.action,
      nextIndex: step.nextIndex,
    });

    // Uyarı yoksa bekletmenin anlamı yok — öğretmen hemen devam etsin
    if (step.notes.length === 0) {
      setTimeout(() => continueWith(step.teacherLine, step.action, step.nextIndex), 0);
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  };

  /** Öğretmenin repliğini kayda düşer ve turu ilerletir */
  const continueWith = (
    teacherLine: string,
    action: 'follow-up' | 'advance' | 'finish',
    nextIndex: number
  ) => {
    if (!record) return;

    update((current) => {
      let next = addConversationMessage(
        current,
        record.id,
        { role: 'teacher', text: teacherLine, at: new Date().toISOString() },
        action === 'follow-up' ? undefined : nextIndex
      );
      if (action === 'finish') {
        next = finishConversation(next, record.id);
        // Sohbet de bir çalışmadır; seriye ve haftalık dakikaya işlensin
        next = recordSession(next, 5);
      }
      return next;
    });

    setFollowedUp(action === 'follow-up');
    if (action !== 'follow-up') setTurnIndex(nextIndex);
    setPending(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  };

  const messages = record?.messages ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md }}
      >
        {/* ------------------------------------------------ başlık */}
        <View style={styles.header}>
          <Text style={styles.topic}>{plan.topic}</Text>
          <Text style={styles.intro}>{plan.intro}</Text>
          <Text style={styles.progress}>
            {finished
              ? 'Sohbet tamamlandı'
              : `Tur ${Math.min(turnIndex + 1, plan.turns.length)} / ${plan.turns.length}`}
          </Text>
        </View>

        {/* ------------------------------------------------ mesajlar */}
        {messages.map((m, i) =>
          m.role === 'teacher' ? (
            <View key={i} style={styles.teacherBubble}>
              <Text style={styles.teacherText}>{m.text}</Text>
              <Pressable
                onPress={() =>
                  speakEnglish(m.text, { rate: data.profile.speechRate ?? 0.95 })
                }
                style={styles.speakButton}
              >
                <Text style={styles.speakText}>🔊  Dinle</Text>
              </Pressable>
            </View>
          ) : (
            <View key={i} style={styles.userWrap}>
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{m.text}</Text>
                {m.via === 'mic' ? (
                  <Text style={styles.viaMark}>🎤 mikrofonla</Text>
                ) : null}
              </View>
              {m.notes?.length ? (
                <View style={styles.noteBox}>
                  {m.notes.map((n, j) => (
                    <Text key={j} style={styles.noteLine}>
                      • {n}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          )
        )}

        {/* --------------------- öğretmen cevaplamadan önce: Türkçe eksikler */}
        {pending && pending.notes.length > 0 ? (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingTitle}>{describeNotes(pending.notes)}</Text>
            {pending.notes.map((n, i) => (
              <View key={i} style={styles.pendingRow}>
                <Text
                  style={[
                    styles.pendingBullet,
                    n.severity === 'hint' && styles.pendingBulletHint,
                  ]}
                >
                  {n.severity === 'sure' ? '✕' : '?'}
                </Text>
                <Text
                  style={[
                    styles.pendingText,
                    n.severity === 'hint' && styles.pendingTextHint,
                  ]}
                >
                  {n.message}
                </Text>
              </View>
            ))}
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                continueWith(pending.teacherLine, pending.action, pending.nextIndex)
              }
            >
              <Text style={styles.primaryButtonText}>Anladım, devam</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ------------------------------------------------ bitiş */}
        {finished ? (
          <View style={styles.finishBox}>
            <Text style={styles.finishTitle}>Bugünlük bu kadar</Text>
            <Text style={styles.finishText}>
              {plan.closingNote ??
                'Öğretmen yeterli konuşma yapıldığına karar verdi.'}
              {'\n\n'}
              Cümlelerinin tek tek düzeltmesi bir sonraki senkronda gelecek —
              uygulamanın burada söyledikleri sadece yazım ve noktalama; üslup
              ve doğallık öğretmenin işi.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => router.back()}>
              <Text style={styles.primaryButtonText}>Kapat</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ------------------------------------------------ giriş alanı */}
      {!finished && !pending ? (
        <View style={styles.inputArea}>
          {currentTurn?.hint ? (
            <Text style={styles.hint}>💡 {currentTurn.hint}</Text>
          ) : null}
          {currentTurn?.useWords?.length ? (
            <Text style={styles.useWords}>
              Kullan: {currentTurn.useWords.join(' · ')}
            </Text>
          ) : null}

          <TextInput
            style={styles.input}
            value={recording && interim ? `${text} ${interim}`.trim() : text}
            onChangeText={setText}
            placeholder={`İngilizce cevapla — en az ${minWords} kelime`}
            placeholderTextColor={colors.muted}
            multiline
            editable={!recording}
          />

          {micError ? <Text style={styles.micError}>{micError}</Text> : null}

          <View style={styles.buttonRow}>
            {micSupported ? (
              <Pressable
                style={[styles.micButton, recording && styles.micButtonActive]}
                onPress={toggleMic}
              >
                <Text style={[styles.micText, recording && styles.micTextActive]}>
                  {recording ? '⏹  Durdur' : '🎤  Konuş'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.sendButton, !text.trim() && styles.sendButtonOff]}
              disabled={!text.trim()}
              onPress={send}
            >
              <Text style={styles.sendText}>Gönder</Text>
            </Pressable>
          </View>

          {!micSupported ? (
            <Text style={styles.micHint}>
              Bu tarayıcı ekrandan mikrofonu desteklemiyor; klavyedeki mikrofon
              tuşuyla da konuşabilirsin.
            </Text>
          ) : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    marginTop: spacing.sm,
  },

  header: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  topic: { fontSize: 17, fontWeight: '700', color: colors.text },
  intro: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
    marginTop: spacing.xs + 2,
  },
  progress: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '700',
    marginTop: spacing.sm,
  },

  teacherBubble: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderTopLeftRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
    maxWidth: '90%',
  },
  teacherText: { fontSize: 16, color: colors.text, lineHeight: 24 },
  speakButton: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  speakText: { fontSize: 13, color: colors.accent, fontWeight: '600' },

  userWrap: { alignSelf: 'flex-end', maxWidth: '90%', marginBottom: spacing.sm },
  userBubble: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    borderTopRightRadius: 4,
    padding: spacing.md,
  },
  userText: { fontSize: 16, color: '#FFFFFF', lineHeight: 24 },
  viaMark: {
    fontSize: 11,
    color: '#D6E4FF',
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  noteBox: {
    marginTop: spacing.xs + 2,
    backgroundColor: '#FFF6ED',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  noteLine: { fontSize: 13, color: '#93370D', lineHeight: 19 },

  pendingBox: {
    backgroundColor: '#FFFAEB',
    borderWidth: 1,
    borderColor: '#FEC84B',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#93370D',
    marginBottom: spacing.sm,
  },
  pendingRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs + 2 },
  pendingBullet: { fontSize: 14, fontWeight: '800', color: '#B42318', width: 14 },
  pendingBulletHint: { color: '#B54708' },
  pendingText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 21 },
  pendingTextHint: { color: colors.muted },

  finishBox: {
    backgroundColor: '#E7F6EF',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  finishTitle: { fontSize: 16, fontWeight: '700', color: '#08794A' },
  finishText: {
    fontSize: 14,
    color: '#0A5C3B',
    lineHeight: 21,
    marginTop: spacing.sm,
  },

  inputArea: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
  },
  hint: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  useWords: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  input: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    minHeight: 76,
    backgroundColor: colors.bg,
  },
  micError: { fontSize: 13, color: '#B42318', marginTop: spacing.sm, lineHeight: 19 },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  micButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  micButtonActive: { backgroundColor: '#D92D20', borderColor: '#D92D20' },
  micText: { fontSize: 15, fontWeight: '700', color: colors.accent },
  micTextActive: { color: '#FFFFFF' },
  sendButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  sendButtonOff: { backgroundColor: colors.border },
  sendText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  micHint: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    marginTop: spacing.sm,
  },

  primaryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
