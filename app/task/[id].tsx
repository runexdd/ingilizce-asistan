import { useState } from 'react';
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
import { useLocalSearchParams } from 'expo-router';
import { recordSession, saveTaskResponse } from '../../src/db/mutations';
import { useStore } from '../../src/db/store';
import { colors, radius, spacing } from '../../src/ui/theme';

export default function TaskScreen() {
  const { update } = useStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isLong = id === 'writing-long';
  const prompt = isLong
    ? 'Describe a situation this week where you had to explain something to someone. What happened, and how did you handle it?'
    : 'Write 3-4 sentences about what you did today.';

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  function handleSubmit() {
    const response = text.trim();
    if (!response) return;

    update((current) => {
      const withTask = saveTaskResponse(current, {
        kind: isLong ? 'writing-long' : 'writing-micro',
        prompt,
        userResponse: response,
      });
      return recordSession(withTask, isLong ? 12 : 4);
    });

    setSubmitted(true);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.promptBox}>
          <Text style={styles.promptLabel}>Görev</Text>
          <Text style={styles.prompt}>{prompt}</Text>
        </View>

        <TextInput
          style={styles.input}
          multiline
          editable={!submitted}
          placeholder="Write in English..."
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{wordCount} kelime</Text>

        {!submitted && (
          <Pressable
            style={[styles.button, !text.trim() && styles.buttonDisabled]}
            disabled={!text.trim()}
            onPress={handleSubmit}
          >
            <Text style={styles.buttonText}>Gönder</Text>
          </Pressable>
        )}

        {submitted && (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Kaydedildi ✅</Text>
            <Text style={styles.noticeText}>
              Metnin kaydedildi ve serine işlendi. Faz 4'te GitHub'a gidecek;
              bilgisayarda{' '}
              <Text style={{ fontWeight: '700' }}>/ogretmen</Text> komutunu
              çalıştırdığında düzeltmesi hazırlanıp buraya geri dönecek.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  promptBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prompt: {
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.xs + 2,
    lineHeight: 23,
  },
  input: {
    minHeight: 160,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text,
    lineHeight: 23,
  },
  counter: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.xs + 2,
    textAlign: 'right',
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  notice: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  noticeText: { fontSize: 14, color: colors.muted, lineHeight: 20 },
});
