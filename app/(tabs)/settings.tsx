import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  describeSpeakingSize,
  describeWritingSize,
  isTeacherTuned,
  specOf,
} from '../../src/core/level';
import {
  SKILL_LABELS as EXAM_SKILL_TR,
  describeLevelScore,
} from '../../src/core/levelexam';
import { SKILL_LABELS, type QuestionSkill } from '../../src/core/placement';
import { describeTastes, isEmpty as isTastesEmpty } from '../../src/core/tastes';
import {
  listEnglishVoices,
  setPreferredVoice,
  speakEnglish,
  type VoiceOption,
} from '../../src/core/speech';
import {
  applyInbox,
  markConversationsSynced,
  markTasksSynced,
  setSync,
  updateProfile,
} from '../../src/db/mutations';
import { useStore } from '../../src/db/store';
import {
  buildOutbox,
  ensureGist,
  pullInbox,
  pushOutbox,
  validateToken,
} from '../../src/sync/github';
import { colors, radius, spacing } from '../../src/ui/theme';
import { BUILD } from '../../src/version';

const MIN_MINUTES = 2;
const MAX_MINUTES = 90;

const SKILL_TR: Record<string, string> = {
  ...SKILL_LABELS,
  production: 'Üretme',
};

export default function SettingsScreen() {
  const { data, update, reset } = useStore();
  const router = useRouter();
  const profile = data.profile;
  const sync = data.sync;

  /** Öğretmenin ayarladığı ölçüler varsa onlar geçerli, yoksa seviye tablosu */
  const sizing = data.plan?.sizing;
  const levelSpec = specOf(profile.level, sizing);

  const [voices, setVoices] = useState<VoiceOption[] | null>(null);
  const [tokenInput, setTokenInput] = useState('');

  const tastesEmpty = isTastesEmpty(profile.tastes);
  const tasteSummary = describeTastes(profile.tastes);

  // Cihazdaki sesleri bir kez yükle; kaydedilmiş tercihi motora bildir
  useEffect(() => {
    setPreferredVoice(profile.voiceId);
    void listEnglishVoices().then(setVoices);
  }, [profile.voiceId]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(
    null
  );

  function step(key: 'weekdayMinutes' | 'weekendMinutes', delta: number) {
    const value = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, profile[key] + delta));
    update((current) => updateProfile(current, { [key]: value }));
  }

  async function connect() {
    const token = tokenInput.trim();
    if (!token) return;
    setBusy('connect');
    setMessage(null);

    const check = await validateToken(token);
    if (!check.ok) {
      setBusy(null);
      setMessage({ text: check.error ?? 'Bağlanılamadı.', error: true });
      return;
    }

    const gist = await ensureGist(token, sync.gistId);
    setBusy(null);

    if ('error' in gist) {
      setMessage({ text: gist.error, error: true });
      return;
    }

    update((current) =>
      setSync(current, {
        token,
        gistId: gist.gistId,
        githubLogin: check.login,
      })
    );
    setTokenInput('');
    setMessage({ text: `Bağlandı: ${check.login}` });
  }

  async function syncNow() {
    if (!sync.token || !sync.gistId) return;
    setBusy('sync');
    setMessage(null);

    // 1) Gönder
    const outbox = buildOutbox(data);
    const pushed = await pushOutbox(sync.token, sync.gistId, outbox);
    if ('error' in pushed) {
      setBusy(null);
      setMessage({ text: pushed.error, error: true });
      return;
    }

    // 2) Al
    const pulled = await pullInbox(sync.token, sync.gistId);
    setBusy(null);

    if ('error' in pulled) {
      setMessage({ text: pulled.error, error: true });
      return;
    }

    const sentIds = outbox.pendingTasks.map((t) => t.id);
    const sentConversations = outbox.conversations.map((c) => c.id);
    update((current) => {
      let next = markTasksSynced(current, sentIds);
      next = markConversationsSynced(next, sentConversations);
      next = setSync(next, { lastPushAt: new Date().toISOString() });
      if (pulled.inbox) next = applyInbox(next, pulled.inbox);
      return next;
    });

    const gotFeedback = pulled.inbox?.feedback?.length ?? 0;
    setMessage({
      text: gotFeedback
        ? `${sentIds.length} görev gönderildi, ${gotFeedback} düzeltme geldi.`
        : sentIds.length > 0
          ? `${sentIds.length} görev gönderildi. Bilgisayarda /ogretmen çalıştır.`
          : 'Gönderilecek yeni görev yok.',
    });
  }

  function disconnect() {
    update((current) => setSync(current, { token: undefined }));
    setMessage({ text: 'Bağlantı kesildi. Verilerin telefonda duruyor.' });
  }

  const connected = Boolean(sync.token && sync.gistId);
  const pendingCount = data.tasks.filter(
    (t) => t.syncState === 'pending' && t.userResponse.trim()
  ).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.md }}
      keyboardShouldPersistTaps="handled"
    >
      {/* ------------------------------------------------------- tempo */}
      <Text style={styles.groupTitle}>Günlük tempo</Text>
      <View style={styles.group}>
        <Stepper
          label="İş günü"
          hint="Pazartesi–Cuma, mesai temposuna göre"
          value={profile.weekdayMinutes}
          onStep={(d) => step('weekdayMinutes', d)}
          divider
        />
        <Stepper
          label="Hafta sonu"
          hint="Cumartesi–Pazar"
          value={profile.weekendMinutes}
          onStep={(d) => step('weekendMinutes', d)}
        />
      </View>

      {/* ------------------------------------------------------ seviye */}
      <Text style={styles.groupTitle}>Seviye</Text>
      <View style={styles.group}>
        <Pressable
          style={[styles.row, styles.rowDivider]}
          onPress={() => router.push('/placement')}
        >
          <View style={styles.rowMain}>
            <Text style={styles.label}>Mevcut seviye</Text>
            <Text style={styles.hint}>
              {profile.placementDone
                ? `${profile.placementDate ?? '—'} · dokunup değiştir`
                : 'Dokunup ölç veya kendin seç'}
            </Text>
          </View>
          <Text style={styles.valueAccent}>
            {profile.placementDone ? profile.level : 'Belirle →'}
          </Text>
        </Pressable>

        {/* Seviye içi puan — "A2" bir aralık, bir nokta değil.
            Kullanıcının tespiti: *"A2 ama A2'de kaç puan? A2 80 puan, B1'e
            yakın; veya A2 30 puan."* İçerik seçimi bu sayıya bakıyor. */}
        <Pressable
          style={[styles.row, styles.rowDivider]}
          onPress={() => router.push('/levelexam')}
        >
          <View style={styles.rowMain}>
            <Text style={styles.labelAccent}>
              {profile.levelScore === undefined
                ? 'Seviye içi puanlama sınavı'
                : 'Puanı yeniden ölç'}
            </Text>
            <Text style={styles.hint}>
              {describeLevelScore(profile.level, profile.levelScore)}
              {'\n'}
              {profile.levelScore === undefined
                ? `${profile.level} seviyesine özel 12 soru: kelime, gramer, dinleme, yazma, konuşma. ~8 dakika.`
                : data.levelExam
                  ? `Son ölçüm: ${data.levelExam.date}${
                      data.levelExam.weakest
                        ? ` · en zayıf: ${EXAM_SKILL_TR[data.levelExam.weakest]}`
                        : ''
                    }`
                  : 'Öğretmen bu puanı her senkronda güncelliyor.'}
            </Text>
          </View>
          <Text style={styles.valueAccent}>
            {profile.levelScore === undefined ? 'Başla →' : String(profile.levelScore)}
          </Text>
        </Pressable>

        {/* Seviyenin somut karşılığı. "A2" tek başına bir şey ifade etmiyor;
            görevlerin ve metinlerin neye göre ayarlandığı burada görünsün. */}
        <View style={[styles.row, styles.rowDivider]}>
          <View style={styles.rowMain}>
            <Text style={styles.label}>Bu seviyede</Text>
            <Text style={styles.hint}>
              Yazma {describeWritingSize(profile.level, sizing)} · konuşma{' '}
              {describeSpeakingSize(profile.level, sizing)} · okuma{' '}
              {levelSpec.passageWords.join('-')} kelime · günde en fazla{' '}
              {levelSpec.maxNewWordsPerDay} yeni kelime
              {'\n'}
              Çalışılan yapılar: {levelSpec.structures}
              {'\n'}
              {isTeacherTuned(sizing)
                ? 'Bu ölçüleri öğretmen senin performansına göre ayarladı.'
                : 'Şimdilik seviye varsayılanları; öğretmen performansına göre değiştirebilir.'}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.rowMain}>
            <Text style={styles.label}>Zayıf alan</Text>
            <Text style={styles.hint}>
              {profile.weakestSkill
                ? 'Görevler buraya ağırlık veriyor'
                : 'İlk düzeltmeden sonra gerçek hatalarından belirlenecek'}
            </Text>
          </View>
          <Text style={styles.value}>
            {profile.weakestSkill
              ? (SKILL_TR[profile.weakestSkill] ??
                SKILL_LABELS[profile.weakestSkill as QuestionSkill])
              : 'Henüz yok'}
          </Text>
        </View>
      </View>

      {/* ------------------------------------------------------ zevkler
          Aşamalı seçimle dolduruluyor (app/interests.tsx). Serbest metin
          kutusu kaldırıldı: kullanıcı *"bu tercihleri biz yazmayalım, aşamalı
          seçenek kısmını getir"* dedi ve haklı — boş kutu ya boş kalıyor ya da
          öğretmenin işine yaramayan iki kelime alıyor. */}
      <Text style={styles.groupTitle}>Zevklerim</Text>
      <View style={styles.group}>
        <Pressable style={styles.row} onPress={() => router.push('/interests')}>
          <View style={styles.rowMain}>
            <Text style={styles.labelAccent}>
              {tastesEmpty ? 'Zevklerini seç' : 'Zevklerini düzenle'}
            </Text>
            <Text style={styles.hint}>
              {tastesEmpty
                ? 'Birkaç dokunuş: ilgi alanı → müzik türü → dizi türü. Öğretmen günlük dizi/şarkı önerisini ve sohbet konusunu buna göre seçiyor.'
                : tasteSummary}
            </Text>
          </View>
          <Text style={styles.valueAccent}>→</Text>
        </Pressable>
      </View>

      {/* ------------------------------------------------------- köprü */}
      <Text style={styles.groupTitle}>Öğretmen bağlantısı</Text>
      <View style={styles.group}>
        {connected ? (
          <>
            <View style={[styles.row, styles.rowDivider]}>
              <View style={styles.rowMain}>
                <Text style={styles.label}>GitHub</Text>
                <Text style={styles.hint}>
                  {sync.githubLogin} · gizli posta kutusu hazır
                </Text>
              </View>
              <Text style={[styles.value, { color: colors.success }]}>Bağlı</Text>
            </View>

            <Pressable
              style={[styles.row, styles.rowDivider]}
              disabled={busy !== null}
              onPress={() => void syncNow()}
            >
              <View style={styles.rowMain}>
                <Text style={styles.labelAccent}>Şimdi senkronla</Text>
                <Text style={styles.hint}>
                  {pendingCount > 0
                    ? `${pendingCount} görev gönderilmeyi bekliyor`
                    : 'Gönderilecek yeni görev yok, gelen kutusu kontrol edilir'}
                </Text>
              </View>
              {busy === 'sync' ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={styles.valueAccent}>↕</Text>
              )}
            </Pressable>

            <Pressable style={styles.row} onPress={disconnect}>
              <View style={styles.rowMain}>
                <Text style={styles.label}>Bağlantıyı kes</Text>
                <Text style={styles.hint}>Jeton silinir, verilerin kalır</Text>
              </View>
            </Pressable>
          </>
        ) : (
          <View style={styles.connectBox}>
            <Text style={styles.hint}>
              GitHub kişisel erişim jetonunu yapıştır ({'"'}gist{'"'} izinli).
              Jeton sadece bu cihazda saklanır, hiçbir yere gönderilmez.
            </Text>
            <TextInput
              style={styles.input}
              value={tokenInput}
              onChangeText={setTokenInput}
              placeholder="ghp_..."
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Pressable
              style={[styles.button, (!tokenInput.trim() || busy) && styles.disabled]}
              disabled={!tokenInput.trim() || busy !== null}
              onPress={() => void connect()}
            >
              {busy === 'connect' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Bağlan</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {message && (
        <Text style={[styles.message, message.error && styles.messageError]}>
          {message.text}
        </Text>
      )}

      {/* ---------------------------------------------------- tehlikeli */}
      <Text style={styles.groupTitle}>Tehlikeli bölge</Text>
      <View style={styles.group}>
        <Pressable style={styles.row} onPress={reset}>
          <View style={styles.rowMain}>
            <Text style={[styles.label, { color: '#D92D20' }]}>
              Tüm verileri sıfırla
            </Text>
            <Text style={styles.hint}>
              Kartlar, hatalar, seri — hepsi silinir, başa döner
            </Text>
          </View>
        </Pressable>
      </View>

      {/* --------------------------------------------------------- ses */}
      <Text style={styles.groupTitle}>Seslendirme</Text>
      <View style={styles.group}>
        {voices === null ? (
          <View style={styles.row}>
            <Text style={styles.hint}>Sesler yükleniyor…</Text>
          </View>
        ) : voices.length === 0 ? (
          <View style={styles.row}>
            <Text style={styles.hint}>
              Bu cihazda İngilizce ses bulunamadı. Tarayıcı seslendirmeyi
              desteklemiyor olabilir.
            </Text>
          </View>
        ) : (
          voices.map((v, i) => {
            const active = (profile.voiceId ?? '') === v.id;
            return (
              <View
                key={v.id}
                style={[styles.row, i < voices.length - 1 && styles.rowDivider]}
              >
                <Pressable
                  style={styles.rowMain}
                  onPress={() => {
                    update((current) => updateProfile(current, { voiceId: v.id }));
                    setPreferredVoice(v.id);
                  }}
                >
                  <Text style={[styles.label, active && styles.labelActive]}>
                    {active ? '● ' : '○ '}
                    {v.name}
                  </Text>
                  <Text style={styles.hint}>
                    {v.language}
                    {v.quality && v.quality !== '-' ? ` · ${v.quality}` : ''}
                    {v.recommended ? ' · önerilen' : ''}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.testButton}
                  onPress={() =>
                    void speakEnglish(
                      'This is how I sound. Tap a word to see its meaning.',
                      { voice: v.id }
                    )
                  }
                >
                  <Text style={styles.testButtonText}>🔊 Dinle</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>
      <Text style={styles.note}>
        Sesleri dinleyip beğendiğini seç. iPhone'da daha doğal sesler için:
        Ayarlar → Erişilebilirlik → Sözlü İçerik → Sesler → English → bir ses
        indir. Tarayıcı bazı premium seslere erişemeyebilir; o yüzden dinleme
        pratiğini gerçek içerikten (dizi, podcast) yapmak daha doğru.
      </Text>

      <Text style={styles.build}>
        Sürüm {BUILD}
        {'\n'}Güncelleme gelmediyse: sayfayı aşağı çekip yenile, ya da ana
        ekrandaki ikonu kapatıp yeniden aç.
      </Text>
    </ScrollView>
  );
}

function Stepper({
  label,
  hint,
  value,
  onStep,
  divider,
}: {
  label: string;
  hint: string;
  value: number;
  onStep: (delta: number) => void;
  divider?: boolean;
}) {
  return (
    <View style={[styles.row, divider && styles.rowDivider]}>
      <View style={styles.rowMain}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <View style={styles.stepper}>
        <Pressable style={styles.stepButton} onPress={() => onStep(-1)}>
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value} dk</Text>
        <Pressable style={styles.stepButton} onPress={() => onStep(1)}>
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  group: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  rowMain: { flex: 1, paddingRight: spacing.sm },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontSize: 16, color: colors.text },
  labelActive: { color: colors.accent, fontWeight: '700' },
  testButton: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  testButtonText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  labelAccent: { fontSize: 16, color: colors.accent, fontWeight: '600' },
  hint: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  value: { fontSize: 15, color: colors.muted, fontWeight: '500' },
  valueAccent: { fontSize: 15, color: colors.accent, fontWeight: '700' },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: {
    fontSize: 20,
    color: colors.accent,
    fontWeight: '600',
    lineHeight: 22,
  },
  stepValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    minWidth: 48,
    textAlign: 'center',
  },

  connectBox: { padding: spacing.md, gap: spacing.sm + 2 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm + 4,
    fontSize: 15,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.4 },

  message: {
    fontSize: 14,
    color: colors.success,
    marginTop: spacing.sm + 2,
    lineHeight: 20,
  },
  messageError: { color: '#D92D20' },
  note: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  build: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
