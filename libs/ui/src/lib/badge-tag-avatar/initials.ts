const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** First user-perceived character: "É" written as E + combining accent stays whole. */
function firstGrapheme(word: string): string {
  for (const { segment } of graphemes.segment(word)) return segment;
  return '';
}

/**
 * Initials of a full name (contract: AvatarProps): the first letters of the first and the
 * last word, upper-case. One word → one letter. "Ursula von der Leyen" → "UL".
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = firstGrapheme(words[0]);
  const last = words.length > 1 ? firstGrapheme(words[words.length - 1]) : '';
  return (first + last).toUpperCase();
}
