import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { lookupWord, normalizeWord, type LookupResult } from '../core/dictionary';
import { speakEnglish } from '../core/speech';
import type { GlossaryEntry } from '../db/types';
import { colors, radius, spacing } from './theme';

/**
 * Dokunulabilir metin.
 *
 * METİNDEKİ HER KELİMEYE dokunulabilir — sadece öğretmenin sözlüğe koyduklarına
 * değil. Okurken takıldığın kelime, öğretmenin zor sandığı kelime olmak
 * zorunda değil.
 *
 * Öğretmenin sözlüğündeki kelimeler görsel olarak işaretlenir (bağlama uygun,
 * güvenilir anlam), diğerleri sözlükten aranır ve önbelleğe alınır.
 */

interface Props {
  text: string;
  glossary: GlossaryEntry[];
  onAddCard?: (word: string, meaning: string) => void;
  /** Zaten kartta olan kelimeler */
  knownWords?: string[];
}

export function TappableText({ text, glossary, onAddCard, knownWords = [] }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  /** Öğretmenin sözlüğü: kelime → anlam */
  const glossaryMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const entry of glossary) {
      map[normalizeWord(entry.word)] = entry.meaning;
      const first = normalizeWord(entry.word.split(/\s+/)[0]);
      if (!map[first]) map[first] = entry.meaning;
    }
    return map;
  }, [glossary]);

  /** Vurgulanacak kelimeler */
  const marked = useMemo(() => {
    const gloss = new Set<string>();
    const target = new Set<string>();
    for (const entry of glossary) {
      const keys = [
        normalizeWord(entry.word),
        normalizeWord(entry.word.split(/\s+/)[0]),
      ];
      for (const k of keys) {
        if (!k) continue;
        gloss.add(k);
        if (entry.isTarget) target.add(k);
      }
    }
    return { gloss, target };
  }, [glossary]);

  const known = useMemo(
    () => new Set(knownWords.map((w) => normalizeWord(w))),
    [knownWords]
  );

  const tokens = useMemo(() => text.split(/(\s+)/), [text]);

  const handleTap = useCallback(
    async (raw: string) => {
      const word = normalizeWord(raw);
      if (!word) return;
      setSelected(word);
      setJustAdded(null);
      setResult(null);
      setLoading(true);
      const found = await lookupWord(word, glossaryMap);
      setResult(found);
      setLoading(false);
    },
    [glossaryMap]
  );

  const alreadyKnown = selected ? known.has(selected) : false;

  return (
    <View>
      <Text style={styles.body}>
        {tokens.map((token, i) => {
          const key = normalizeWord(token);
          if (!key) return <Text key={i}>{token}</Text>;

          const isTarget = marked.target.has(key);
          const isGloss = marked.gloss.has(key);
          const isSelected = selected === key;

          return (
            <Text
              key={i}
              onPress={() => void handleTap(token)}
              style={[
                styles.word,
                isGloss && !isTarget && styles.glossWord,
                isTarget && styles.targetWord,
                isSelected && styles.selectedWord,
              ]}
            >
              {token}
            </Text>
          );
        })}
      </Text>

      <Text style={styles.hint}>
        Herhangi bir kelimeye dokunabilirsin. Renkli olanlar bugünün kelimeleri.
      </Text>

      {selected && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelWord}>{selected}</Text>
            <View style={styles.panelActions}>
              <Pressable
                onPress={() => void speakEnglish(selected, { rate: 0.85 })}
                hitSlop={10}
                style={styles.iconButton}
              >
                <Text style={styles.iconText}>🔊</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSelected(null);
                  setResult(null);
                }}
                hitSlop={10}
                style={styles.iconButton}
              >
                <Text style={styles.iconText}>✕</Text>
              </Pressable>
            </View>
          </View>

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.loadingText}>Aranıyor…</Text>
            </View>
          )}

          {!loading && result && (
            <>
              {result.meaning ? (
                <Text style={styles.meaning}>{result.meaning}</Text>
              ) : (
                <Text style={styles.notFound}>
                  Bu kelimenin karşılığı bulunamadı. İnternet yoksa daha sonra
                  tekrar dene.
                </Text>
              )}

              {result.definition && (
                <Text style={styles.definition}>{result.definition}</Text>
              )}

              {result.source === 'glossary' && (
                <Text style={styles.sourceTag}>Öğretmenin notu — bağlama uygun</Text>
              )}

              {result.meaning && onAddCard && (
                <Pressable
                  style={[
                    styles.addButton,
                    (alreadyKnown || justAdded === selected) && styles.addButtonDone,
                  ]}
                  disabled={alreadyKnown || justAdded === selected}
                  onPress={() => {
                    onAddCard(selected, result.meaning!);
                    setJustAdded(selected);
                  }}
                >
                  <Text
                    style={[
                      styles.addButtonText,
                      (alreadyKnown || justAdded === selected) &&
                        styles.addButtonTextDone,
                    ]}
                  >
                    {alreadyKnown
                      ? '✓ Zaten kartlarında'
                      : justAdded === selected
                        ? '✓ Karta eklendi'
                        : '+ Karta ekle'}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 17, color: colors.text, lineHeight: 30 },
  word: { color: colors.text },
  glossWord: {
    color: colors.accent,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  targetWord: {
    color: colors.accent,
    fontWeight: '700',
    backgroundColor: colors.accentSoft,
  },
  selectedWord: { backgroundColor: '#FEF0C7' },
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },

  panel: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelWord: { fontSize: 19, fontWeight: '700', color: colors.text, flex: 1 },
  panelActions: { flexDirection: 'row', gap: spacing.xs },
  iconButton: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
  iconText: { fontSize: 17 },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  loadingText: { fontSize: 14, color: colors.muted },

  meaning: {
    fontSize: 17,
    color: colors.accent,
    marginTop: spacing.xs + 2,
    lineHeight: 24,
    fontWeight: '600',
  },
  definition: {
    fontSize: 14,
    color: colors.muted,
    marginTop: spacing.sm,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  notFound: { fontSize: 14, color: colors.muted, marginTop: spacing.sm, lineHeight: 20 },
  sourceTag: { fontSize: 12, color: colors.success, marginTop: spacing.sm },

  addButton: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  addButtonDone: { backgroundColor: colors.accentSoft },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  addButtonTextDone: { color: colors.accent },
});
