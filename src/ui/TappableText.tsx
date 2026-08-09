import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GlossaryEntry } from '../db/types';
import { colors, radius, spacing } from './theme';

/**
 * Dokunulabilir metin.
 *
 * Sözlükte geçen kelimeler altı çizili gösterilir; dokununca anlamı açılır ve
 * tek dokunuşla kelime kartına eklenebilir. Okurken sözlüğe gitmeden devam
 * edebilmek, okuma alışkanlığını ayakta tutan en önemli şey.
 *
 * Hedef kelimeler (günün kelimeleri) ayrıca vurgulanır.
 */

interface Props {
  text: string;
  glossary: GlossaryEntry[];
  /** Kelimeyi karta ekle; zaten kartta olanlar için undefined bırakılabilir */
  onAddCard?: (word: string, meaning: string) => void;
  /** Zaten kartta olan kelimeler — "eklendi" gösterilir */
  knownWords?: string[];
}

/** Kelimeyi eşleştirmek için sadeleştirir: küçük harf, noktalama yok. */
function normalize(token: string): string {
  return token.toLowerCase().replace(/[^a-zçğıöşü']/gi, '');
}

export function TappableText({ text, glossary, onAddCard, knownWords = [] }: Props) {
  const [selected, setSelected] = useState<GlossaryEntry | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const lookup = useMemo(() => {
    const map = new Map<string, GlossaryEntry>();
    for (const entry of glossary) {
      map.set(normalize(entry.word), entry);
      // Çok kelimeli ifadelerde ilk kelimeyi de anahtarla ("look forward to")
      const first = normalize(entry.word.split(/\s+/)[0]);
      if (!map.has(first)) map.set(first, entry);
    }
    return map;
  }, [glossary]);

  const known = useMemo(
    () => new Set(knownWords.map((w) => normalize(w))),
    [knownWords]
  );

  // Metni kelime ve aradaki boşluk/noktalamaya böl, sırayı koru
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);

  const alreadyHasSelected =
    selected !== null && known.has(normalize(selected.word));

  return (
    <View>
      <Text style={styles.body}>
        {tokens.map((token, i) => {
          const key = normalize(token);
          const entry = key ? lookup.get(key) : undefined;

          if (!entry) {
            return <Text key={i}>{token}</Text>;
          }

          return (
            <Text
              key={i}
              onPress={() => {
                setSelected(entry);
                setJustAdded(null);
              }}
              style={entry.isTarget ? styles.targetWord : styles.glossWord}
            >
              {token}
            </Text>
          );
        })}
      </Text>

      {selected && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelWord}>{selected.word}</Text>
            <Pressable onPress={() => setSelected(null)} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.panelMeaning}>{selected.meaning}</Text>

          {onAddCard && (
            <Pressable
              style={[
                styles.addButton,
                (alreadyHasSelected || justAdded === selected.word) &&
                  styles.addButtonDone,
              ]}
              disabled={alreadyHasSelected || justAdded === selected.word}
              onPress={() => {
                onAddCard(selected.word, selected.meaning);
                setJustAdded(selected.word);
              }}
            >
              <Text
                style={[
                  styles.addButtonText,
                  (alreadyHasSelected || justAdded === selected.word) &&
                    styles.addButtonTextDone,
                ]}
              >
                {alreadyHasSelected
                  ? '✓ Zaten kartlarında'
                  : justAdded === selected.word
                    ? '✓ Karta eklendi'
                    : '+ Karta ekle'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 17, color: colors.text, lineHeight: 29 },
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
  panelWord: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  close: { fontSize: 16, color: colors.muted, paddingHorizontal: spacing.sm },
  panelMeaning: {
    fontSize: 16,
    color: colors.accent,
    marginTop: spacing.xs + 2,
    lineHeight: 23,
  },
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
