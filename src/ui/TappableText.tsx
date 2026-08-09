import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { lookupWord, normalizeWord, type LookupResult } from '../core/dictionary';
import { speakEnglish } from '../core/speech';
import type { GlossaryEntry } from '../db/types';
import { colors, radius, spacing } from './theme';

/**
 * Dokunulabilir metin.
 *
 * Metindeki HER kelimeye dokunulabilir ve anlamı **dokunulan kelimenin hemen
 * üstünde** açılır. Panel sayfanın altında olursa her kelimede aşağı-yukarı
 * gitmek gerekir; okuma akışını bozan en büyük şey buydu.
 *
 * Konumlandırma için kelimeler tek tek ölçülebilir olmalı, bu yüzden metin
 * sarmalayan bir satır içinde ayrı ayrı bileşenler olarak çiziliyor.
 */

interface Props {
  text: string;
  glossary: GlossaryEntry[];
  onAddCard?: (word: string, meaning: string) => void;
  knownWords?: string[];
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const POPUP_WIDTH = 270;
const GAP = 8;

export function TappableText({ text, glossary, onAddCard, knownWords = [] }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<Box | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [popupHeight, setPopupHeight] = useState(130);

  const layouts = useRef<Record<number, Box>>({});

  const glossaryMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const entry of glossary) {
      map[normalizeWord(entry.word)] = entry.meaning;
      const first = normalizeWord(entry.word.split(/\s+/)[0]);
      if (!map[first]) map[first] = entry.meaning;
    }
    return map;
  }, [glossary]);

  const marked = useMemo(() => {
    const gloss = new Set<string>();
    const target = new Set<string>();
    for (const entry of glossary) {
      for (const k of [
        normalizeWord(entry.word),
        normalizeWord(entry.word.split(/\s+/)[0]),
      ]) {
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

  /** Paragraf sonları tam genişlik boşlukla temsil edilir, kelimeler ayrı ayrı. */
  const items = useMemo(() => {
    const out: Array<{ type: 'word'; text: string } | { type: 'break' }> = [];
    const paragraphs = text.split(/\n\s*\n/);
    paragraphs.forEach((paragraph, pi) => {
      if (pi > 0) out.push({ type: 'break' });
      for (const w of paragraph.split(/\s+/)) {
        if (w) out.push({ type: 'word', text: w });
      }
    });
    return out;
  }, [text]);

  const handleTap = useCallback(
    async (raw: string, index: number) => {
      const word = normalizeWord(raw);
      if (!word) return;

      const box = layouts.current[index];
      setAnchor(box ?? null);
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

  function close() {
    setSelected(null);
    setResult(null);
    setAnchor(null);
  }

  /** Panelin konumu: kelimenin üstü; yer yoksa altı. */
  const popupStyle = useMemo(() => {
    if (!anchor) return null;
    const width = Math.min(POPUP_WIDTH, Math.max(200, containerWidth));
    const centered = anchor.x + anchor.width / 2 - width / 2;
    const left = Math.max(0, Math.min(centered, Math.max(0, containerWidth - width)));

    const above = anchor.y - popupHeight - GAP;
    const showBelow = above < 0;
    const top = showBelow ? anchor.y + anchor.height + GAP : above;

    return { left, top, width, showBelow };
  }, [anchor, containerWidth, popupHeight]);

  const alreadyKnown = selected ? known.has(selected) : false;

  return (
    <View
      style={styles.container}
      onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.flow}>
        {items.map((item, i) => {
          if (item.type === 'break') return <View key={i} style={styles.paragraphBreak} />;

          const key = normalizeWord(item.text);
          const isTarget = marked.target.has(key);
          const isGloss = marked.gloss.has(key);
          const isSelected = selected === key && key !== '';

          return (
            <Pressable
              key={i}
              onLayout={(e) => {
                layouts.current[i] = e.nativeEvent.layout;
              }}
              onPress={() => void handleTap(item.text, i)}
              style={styles.wordWrap}
            >
              <Text
                style={[
                  styles.word,
                  isGloss && !isTarget && styles.glossWord,
                  isTarget && styles.targetWord,
                  isSelected && styles.selectedWord,
                ]}
              >
                {item.text}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>
        Herhangi bir kelimeye dokun — anlamı hemen üstünde açılır. Renkli olanlar
        bugünün kelimeleri.
      </Text>

      {selected && popupStyle && (
        <>
          {/* Boş yere dokununca kapansın */}
          <Pressable style={styles.backdrop} onPress={close} />

          <View
            style={[
              styles.popup,
              { left: popupStyle.left, top: popupStyle.top, width: popupStyle.width },
            ]}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (Math.abs(h - popupHeight) > 4) setPopupHeight(h);
            }}
          >
            <View style={styles.popupHeader}>
              <Text style={styles.popupWord} numberOfLines={1}>
                {selected}
              </Text>
              <Pressable
                onPress={() => void speakEnglish(selected, { rate: 0.85 })}
                hitSlop={8}
                style={styles.iconButton}
              >
                <Text style={styles.iconText}>🔊</Text>
              </Pressable>
              <Pressable onPress={close} hitSlop={8} style={styles.iconButton}>
                <Text style={styles.iconText}>✕</Text>
              </Pressable>
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
                  <Text style={styles.notFound}>Karşılığı bulunamadı.</Text>
                )}

                {result.definition && (
                  <Text style={styles.definition} numberOfLines={3}>
                    {result.definition}
                  </Text>
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
                        ? '✓ Kartlarında'
                        : justAdded === selected
                          ? '✓ Eklendi'
                          : '+ Karta ekle'}
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  flow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  paragraphBreak: { width: '100%', height: spacing.md },

  wordWrap: { marginRight: 6 },
  word: { fontSize: 17, color: colors.text, lineHeight: 30 },
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
    marginTop: spacing.md,
    fontStyle: 'italic',
  },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  popup: {
    position: 'absolute',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    // Metnin üstünde dursun
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  popupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  popupWord: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 },
  iconButton: { paddingHorizontal: spacing.xs + 2 },
  iconText: { fontSize: 15 },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs + 2,
  },
  loadingText: { fontSize: 13, color: colors.muted },

  meaning: {
    fontSize: 16,
    color: colors.accent,
    marginTop: spacing.xs + 2,
    lineHeight: 22,
    fontWeight: '600',
  },
  definition: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.xs + 2,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  notFound: { fontSize: 13, color: colors.muted, marginTop: spacing.xs + 2 },

  addButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  addButtonDone: { backgroundColor: colors.accentSoft },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  addButtonTextDone: { color: colors.accent },
});
