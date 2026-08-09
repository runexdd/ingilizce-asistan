import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  View,
  type ViewStyle,
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
 *
 * İki şey bilinçli:
 *
 * 1. **Kalıplar tek parça.** Sözlükte "every evening" varsa, "every"ye de
 *    "evening"e de dokunulsa kalıbın anlamı çıkar. Kelimeleri ayrı ayrı
 *    çevirmek ("her", "akşam") bağlamı bozuyordu.
 * 2. **Cümle de çevriliyor.** Kelimenin tek başına karşılığı yanıltabilir;
 *    panelde cümlenin çevirisi de görünür, kullanıcı kelimeyi yerinde görür.
 */

interface Props {
  text: string;
  glossary: GlossaryEntry[];
  onAddCard?: (word: string, meaning: string) => void;
  knownWords?: string[];
  /** Kullanıcının CEFR seviyesi — örnek cümleler buna göre süzülür */
  level?: string;
  /**
   * Dış boşluk buradan verilir, sarmalayıcı View ile DEĞİL.
   *
   * React Native Web her View'a `z-index: 0` yazıyor ve bu her View'ı ayrı bir
   * yığın bağlamı yapıyor; araya konan sarmalayıcı, panelin `zIndex`'ini kendi
   * içine hapsedip "Okudum" butonunun altında bırakıyordu.
   */
  style?: StyleProp<ViewStyle>;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const POPUP_WIDTH = 290;
const POPUP_MAX_HEIGHT = 300;
const GAP = 8;

export function TappableText({
  text,
  glossary,
  onAddCard,
  knownWords = [],
  level,
  style,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  /** Vurgulanan kelime aralığı — kalıp seçilirse kalıbın tamamı sarıya döner */
  const [span, setSpan] = useState<[number, number] | null>(null);
  const [anchor, setAnchor] = useState<Box | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [popupHeight, setPopupHeight] = useState(130);

  const layouts = useRef<Record<number, Box>>({});

  /**
   * Metin iki listeye ayrılır:
   *   items — ekrana çizilecek parçalar (kelime veya paragraf boşluğu)
   *   words — sadece kelimeler; kalıp eşleştirme ve cümle bulma bunun üstünde
   */
  const { items, words, sentences } = useMemo(() => {
    const items: Array<{ type: 'word'; text: string; wi: number } | { type: 'break' }> =
      [];
    const words: Array<{ norm: string; sentence: number }> = [];
    const sentences: string[] = [];

    let buffer: string[] = [];
    let sentenceIndex = 0;

    const closeSentence = () => {
      if (buffer.length === 0) return;
      sentences[sentenceIndex] = buffer.join(' ');
      buffer = [];
      sentenceIndex += 1;
    };

    text.split(/\n\s*\n/).forEach((paragraph, pi) => {
      if (pi > 0) {
        closeSentence();
        items.push({ type: 'break' });
      }
      for (const raw of paragraph.split(/\s+/)) {
        if (!raw) continue;
        items.push({ type: 'word', text: raw, wi: words.length });
        words.push({ norm: normalizeWord(raw), sentence: sentenceIndex });
        buffer.push(raw);
        // Cümle sonu: nokta/soru/ünlem — tırnak veya parantez kapanışı olabilir
        if (/[.!?]["'’)\]]?$/.test(raw)) closeSentence();
      }
    });
    closeSentence();

    return { items, words, sentences };
  }, [text]);

  /** Sözlükteki çok kelimeli kalıplar, uzundan kısaya (en uzun eşleşme kazanır) */
  const phrases = useMemo(
    () =>
      glossary
        .filter((e) => e.word.trim().includes(' '))
        .map((e) => ({ entry: e, parts: e.word.trim().split(/\s+/).map(normalizeWord) }))
        .sort((a, b) => b.parts.length - a.parts.length),
    [glossary]
  );

  /** Tek kelimelik sözlük girdileri */
  const singles = useMemo(() => {
    const map: Record<string, GlossaryEntry> = {};
    for (const entry of glossary) {
      if (entry.word.trim().includes(' ')) continue;
      map[normalizeWord(entry.word)] = entry;
    }
    return map;
  }, [glossary]);

  /** Kelimenin bulunduğu yerde bir kalıp geçiyor mu? Geçiyorsa kalıp kazanır. */
  const findEntry = useCallback(
    (wi: number): { entry: GlossaryEntry; span: [number, number] } | null => {
      for (const { entry, parts } of phrases) {
        for (let offset = 0; offset < parts.length; offset++) {
          const start = wi - offset;
          if (start < 0 || start + parts.length > words.length) continue;
          const fits = parts.every((p, k) => words[start + k].norm === p);
          if (fits) return { entry, span: [start, start + parts.length - 1] };
        }
      }
      const single = singles[words[wi]?.norm ?? ''];
      return single ? { entry: single, span: [wi, wi] } : null;
    },
    [phrases, singles, words]
  );

  /** Renklendirme: sözlükteki kelimeler ve kalıpların TÜM parçaları işaretlenir */
  const marked = useMemo(() => {
    const gloss = new Set<string>();
    const target = new Set<string>();
    for (const entry of glossary) {
      for (const part of entry.word.trim().split(/\s+/)) {
        const key = normalizeWord(part);
        if (!key) continue;
        gloss.add(key);
        if (entry.isTarget) target.add(key);
      }
    }
    return { gloss, target };
  }, [glossary]);

  const known = useMemo(
    () => new Set(knownWords.map((w) => normalizeWord(w))),
    [knownWords]
  );

  const handleTap = useCallback(
    async (raw: string, itemIndex: number, wi: number) => {
      const word = normalizeWord(raw);
      if (!word) return;

      const match = findEntry(wi);
      const label = match ? match.entry.word : word;

      setAnchor(layouts.current[itemIndex] ?? null);
      setSelected(label);
      setSpan(match?.span ?? [wi, wi]);
      setJustAdded(null);
      setResult(null);
      setLoading(true);

      const sentence = sentences[words[wi]?.sentence ?? -1];
      const found = await lookupWord(word, { entry: match?.entry, sentence, level });
      setResult(found);
      setLoading(false);
    },
    [findEntry, sentences, words, level]
  );

  function close() {
    setSelected(null);
    setSpan(null);
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

  /** Karta eklenecek metin — kalıp eşleştiyse kalıbın kendisi */
  const cardWord = result?.phrase ?? result?.word ?? selected ?? '';
  const alreadyKnown = known.has(normalizeWord(cardWord));

  return (
    <View
      style={[styles.container, style]}
      onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.flow}>
        {items.map((item, i) => {
          if (item.type === 'break') return <View key={i} style={styles.paragraphBreak} />;

          const key = words[item.wi].norm;
          const isTarget = marked.target.has(key);
          const isGloss = marked.gloss.has(key);
          const isSelected = !!span && item.wi >= span[0] && item.wi <= span[1];

          return (
            <Pressable
              key={i}
              onLayout={(e) => {
                layouts.current[i] = e.nativeEvent.layout;
              }}
              onPress={() => void handleTap(item.text, i, item.wi)}
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
        Herhangi bir kelimeye dokun — anlamı, cümledeki karşılığı ve örnekleri
        hemen üstünde açılır. Renkli olanlar bugünün kelimeleri.
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
              <ScrollView
                style={styles.popupBody}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {result.meaning ? (
                  <>
                    {/* Anlamın nereden geldiği dürüstçe yazılır: cümleye
                        bakılarak mı seçildi, yoksa genel karşılık mı */}
                    <Text style={styles.meaningLabel}>
                      {result.source === 'glossary'
                        ? 'Bu metinde'
                        : result.fromContext
                          ? 'Bu cümlede'
                          : 'Genel anlamı'}
                    </Text>
                    <Text style={styles.meaning}>{result.meaning}</Text>
                  </>
                ) : (
                  <Text style={styles.notFound}>
                    Türkçe karşılığı bulunamadı — yanlış bir karşılık göstermektense
                    boş bırakıyoruz.
                  </Text>
                )}

                {result.baseForm && result.baseForm !== normalizeWord(selected) && (
                  <Text style={styles.baseForm}>sözlük hâli: {result.baseForm}</Text>
                )}

                {/* Bağlam: kelimeyi cümlenin içinde görmek, tek başına
                    çevirisinden daha güvenilirdir */}
                {result.sentenceTr && (
                  <View style={styles.block}>
                    <Text style={styles.blockTitle}>Cümlede</Text>
                    <Text style={styles.sentence}>{result.sentenceTr}</Text>
                  </View>
                )}

                {result.otherMeanings && result.otherMeanings.length > 0 && (
                  <View style={styles.block}>
                    <Text style={styles.blockTitle}>Diğer yaygın anlamları</Text>
                    <Text style={styles.senses}>{result.otherMeanings.join(' · ')}</Text>
                  </View>
                )}

                {result.synonym && (
                  <View style={styles.block}>
                    <Text style={styles.blockTitle}>Eş anlamlısı</Text>
                    <Text style={styles.synonym}>{result.synonym}</Text>
                  </View>
                )}

                {result.examples && result.examples.length > 0 && (
                  <View style={styles.block}>
                    {/* Öğretmenin yazdığı örnek kullanıcının seviyesine ve zayıf
                        yapılarına göre kuruluyor; sözlükten gelen herkese aynı.
                        Kullanıcı hangisine baktığını bilmeli. */}
                    <Text style={styles.blockTitle}>
                      {result.examplesFromTeacher
                        ? 'Örnekler · sana göre'
                        : 'Örnekler · genel sözlük'}
                    </Text>
                    {result.examples.slice(0, 3).map((ex) => (
                      <Pressable
                        key={ex}
                        onPress={() => void speakEnglish(ex, { rate: 0.85 })}
                      >
                        <Text style={styles.example}>• {ex}</Text>
                      </Pressable>
                    ))}
                  </View>
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
                      (alreadyKnown || justAdded === cardWord) && styles.addButtonDone,
                    ]}
                    disabled={alreadyKnown || justAdded === cardWord}
                    onPress={() => {
                      onAddCard(cardWord, result.meaning!);
                      setJustAdded(cardWord);
                    }}
                  >
                    <Text
                      style={[
                        styles.addButtonText,
                        (alreadyKnown || justAdded === cardWord) &&
                          styles.addButtonTextDone,
                      ]}
                    >
                      {alreadyKnown
                        ? '✓ Kartlarında'
                        : justAdded === cardWord
                          ? '✓ Eklendi'
                          : '+ Karta ekle'}
                    </Text>
                  </Pressable>
                )}
              </ScrollView>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Katman sırası bilinçli:
   *   container 20 — panelin, metinden SONRA gelen "Okudum" butonunun üstünde
   *                  kalmasını sağlar; yoksa buton paneli kesiyordu
   *   backdrop   1 — boşluğa dokununca kapansın diye, ama kelimelerin ALTINDA
   *   wordWrap   2 — panel açıkken başka kelimeye dokunmak doğrudan çalışsın;
   *                  perde üstte kalınca ikinci bir dokunuş gerekiyordu
   *   popup     30 — hepsinin üstünde
   */
  container: { position: 'relative', zIndex: 20 },
  /** zIndex perdenin ÜSTÜNDE olmalı ve buraya verilmeli — kelimelerin kendine
   *  verilince işe yaramıyor, çünkü bu View kendi yığın bağlamını kuruyor ve
   *  içindeki değerler dışarı çıkamıyor. */
  flow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    zIndex: 2,
  },
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
    zIndex: 1,
  },
  popup: {
    position: 'absolute',
    zIndex: 30,
    maxHeight: POPUP_MAX_HEIGHT,
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
  popupBody: { marginTop: spacing.xs },
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

  meaningLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.xs,
  },
  meaning: {
    fontSize: 16,
    color: colors.accent,
    lineHeight: 22,
    fontWeight: '600',
  },
  baseForm: { fontSize: 12, color: colors.muted, marginTop: 2 },

  block: { marginTop: spacing.sm },
  blockTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  sentence: { fontSize: 13, color: colors.text, lineHeight: 19 },
  senses: { fontSize: 13, color: colors.text, lineHeight: 19 },
  synonym: { fontSize: 13, color: colors.text, fontWeight: '600' },
  example: { fontSize: 13, color: colors.text, lineHeight: 19, marginBottom: 2 },
  definition: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.sm,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  notFound: { fontSize: 13, color: colors.muted, marginTop: spacing.xs + 2 },

  addButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  addButtonDone: { backgroundColor: colors.accentSoft },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  addButtonTextDone: { color: colors.accent },
});
