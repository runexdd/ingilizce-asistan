import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SKILL_LABELS, type QuestionSkill } from '../../src/core/placement';
import { updateProfile } from '../../src/db/mutations';
import { useStore } from '../../src/db/store';
import { colors, radius, spacing } from '../../src/ui/theme';

const MIN_MINUTES = 2;
const MAX_MINUTES = 90;

export default function SettingsScreen() {
  const { data, update, reset } = useStore();
  const router = useRouter();
  const profile = data.profile;

  function step(key: 'weekdayMinutes' | 'weekendMinutes', delta: number) {
    const value = Math.min(
      MAX_MINUTES,
      Math.max(MIN_MINUTES, profile[key] + delta)
    );
    update((current) => updateProfile(current, { [key]: value }));
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.md }}
    >
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
      <Text style={styles.note}>
        Bu süreler Bugün ekranındaki planı doğrudan belirler. Değiştirip Bugün
        sekmesine dön, planın anında güncellendiğini göreceksin.
      </Text>

      <Text style={styles.groupTitle}>Seviye</Text>
      <View style={styles.group}>
        <Pressable
          style={[styles.row, styles.rowDivider]}
          onPress={() => router.push('/placement')}
        >
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={styles.label}>Mevcut seviye</Text>
            <Text style={styles.hint}>
              {profile.placementDone
                ? `Ölçüm: ${profile.placementDate ?? '—'} · dokunup tekrar et`
                : 'Henüz ölçülmedi — dokunup teste başla'}
            </Text>
          </View>
          <Text style={[styles.value, { color: colors.accent, fontWeight: '700' }]}>
            {profile.placementDone ? profile.level : 'Ölç →'}
          </Text>
        </Pressable>

        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={styles.label}>En zayıf alan</Text>
            <Text style={styles.hint}>Görevler buraya ağırlık verir</Text>
          </View>
          <Text style={styles.value}>
            {profile.weakestSkill
              ? SKILL_LABELS[profile.weakestSkill as QuestionSkill]
              : '—'}
          </Text>
        </View>
      </View>

      <Text style={styles.groupTitle}>Bağlantı</Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={styles.label}>GitHub</Text>
            <Text style={styles.hint}>
              Faz 4: düzeltmelerin buradan gidip gelecek
            </Text>
          </View>
          <Text style={styles.value}>Bağlı değil</Text>
        </View>
      </View>

      <Text style={styles.groupTitle}>Tehlikeli bölge</Text>
      <View style={styles.group}>
        <Pressable style={styles.row} onPress={reset}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={[styles.label, { color: '#D92D20' }]}>
              Tüm verileri sıfırla
            </Text>
            <Text style={styles.hint}>
              Kartlar, hatalar, seri — hepsi silinir, başa döner
            </Text>
          </View>
        </Pressable>
      </View>
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
      <View style={{ flex: 1, paddingRight: spacing.sm }}>
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
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontSize: 16, color: colors.text },
  hint: { fontSize: 13, color: colors.muted, marginTop: 2 },
  value: { fontSize: 15, color: colors.muted, fontWeight: '500' },
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
  note: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
});
