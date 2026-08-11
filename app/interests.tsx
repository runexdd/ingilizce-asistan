/**
 * Zevkler — aşamalı seçim ekranı.
 *
 * Kullanıcının isteği: *"bu tercihleri biz yazmayalım, aşamalı seçenek kısmını
 * getir; ilk hobiler alanları, en son seçenek 'kendim yazmak istiyorum', sonra
 * sıradaki soru müzik türü…"*
 *
 * Ekran tek soru gösterir, seçilir, ilerlenir. Sorular `src/core/tastes.ts`
 * içinde; hangi sorunun sorulacağı önceki cevaba bağlı (müzik seçmediyse müzik
 * türü sorulmaz).
 *
 * Seçim yapıldığı anda veriye yazılıyor — "kaydet" düğmesi yok. Otomatik
 * senkron da bunu görüp öğretmene gönderiyor (bkz. `src/sync/autosync.tsx`);
 * kullanıcının ayrıca "şimdi senkronla"ya basması gerekmiyor.
 */

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CUSTOM_VALUE,
  activeSteps,
  emptyTastes,
  sanitizeTastes,
  type TasteStep,
} from '../src/core/tastes';
import { updateProfile } from '../src/db/mutations';
import { useStore } from '../src/db/store';
import { colors, radius, spacing } from '../src/ui/theme';

export default function InterestsScreen() {
  const { data, update } = useStore();
  const tastes = data.profile.tastes ?? emptyTastes();

  const steps = useMemo(() => activeSteps(tastes), [tastes]);
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState(tastes.note ?? '');

  const step: TasteStep | undefined = steps[index];
  const isLast = index >= steps.length - 1;

  const selected = step ? tastes[step.field] : [];
  const showNoteBox = selected.includes(CUSTOM_VALUE);

  function toggle(value: string) {
    if (!step) return;
    update((current) => {
      const base = current.profile.tastes ?? emptyTastes();
      const list = base[step.field];
      const next = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value];
      /**
       * ⚠️ İlgi alanı kaldırılınca **ona bağlı alt seçim de silinmeli.**
       *
       * Kullanıcının şikâyeti: *"oyun seçiyorum, örnek yine spor veriyor."*
       * Önce Spor → Futbol seçilmiş, sonra Spor kaldırılıp Oyun seçilmişti;
       * `sports: ['futbol']` veride kalıyordu ve konu seçen taraf onu hâlâ
       * geçerli sayıyordu. Sorulmayan bir sorunun cevabı veride durmamalı.
       */
      const temiz = sanitizeTastes({ ...base, [step.field]: next });
      return updateProfile(current, {
        tastes: { ...temiz, updatedAt: new Date().toISOString() },
      });
    });
  }

  function saveNote() {
    update((current) => {
      const base = current.profile.tastes ?? emptyTastes();
      return updateProfile(current, {
        tastes: { ...base, note: note.trim(), updatedAt: new Date().toISOString() },
      });
    });
  }

  function next() {
    saveNote();
    if (isLast) {
      router.back();
      return;
    }
    setIndex((i) => i + 1);
  }

  if (!step) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Hazır</Text>
        <Pressable style={styles.primary} onPress={() => router.back()}>
          <Text style={styles.primaryText}>Kapat</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Text style={styles.progress}>
          {index + 1} / {steps.length}
        </Text>
        <Text style={styles.title}>{step.question}</Text>
        <Text style={styles.why}>{step.why}</Text>

        <View style={styles.options}>
          {step.options.map((option) => {
            const on = selected.includes(option.value);
            return (
              <Pressable
                key={option.value}
                style={[styles.option, on && styles.optionOn]}
                onPress={() => toggle(option.value)}
              >
                <Text style={[styles.optionText, on && styles.optionTextOn]}>
                  {option.label}
                </Text>
                {on ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>

        {showNoteBox ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Kendi yazdıkların</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              onBlur={saveNote}
              placeholder="Metallica, The Office, Formula 1..."
              placeholderTextColor={colors.muted}
              multiline
            />
            <Text style={styles.noteHint}>
              Grup, dizi, takım adı yazabilirsin — öğretmen doğrudan bunları
              kullanır.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {index > 0 ? (
          <Pressable style={styles.secondary} onPress={() => setIndex((i) => i - 1)}>
            <Text style={styles.secondaryText}>Geri</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.primary} onPress={next}>
          <Text style={styles.primaryText}>
            {isLast ? 'Bitir' : selected.length === 0 ? 'Atla' : 'Devam'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  progress: { fontSize: 13, color: colors.accent, fontWeight: '700' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  why: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  options: { marginTop: spacing.lg, gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  optionOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionText: { flex: 1, fontSize: 16, color: colors.text },
  optionTextOn: { fontWeight: '700', color: colors.accent },
  check: { fontSize: 16, fontWeight: '800', color: colors.accent },

  noteBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noteLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  input: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    fontSize: 16,
    color: colors.text,
    minHeight: 64,
    backgroundColor: colors.bg,
  },
  noteHint: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    marginTop: spacing.sm,
  },

  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  primary: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  secondary: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryText: { fontSize: 16, fontWeight: '700', color: colors.muted },
});
