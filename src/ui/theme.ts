/**
 * Renk ve ölçü sabitleri.
 * Rakip arayüz incelemesinden (Faz 0) sonra burası gözden geçirilecek —
 * tüm ekranlar buradan beslendiği için tasarım değişikliği tek dosyayla yapılır.
 */

export const colors = {
  bg: '#F7F8FA',
  card: '#FFFFFF',
  border: '#E4E7EC',
  text: '#101828',
  muted: '#667085',
  accent: '#2E6BE6',
  accentSoft: '#EAF1FE',
  weekend: '#7A5AF8',
  weekendSoft: '#F0EBFF',
  success: '#12B76A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;
