import { LANGS } from './languages';

/** The localStorage key of the language switch's choice (task 8-3). */
export const LANGUAGE_KEY = 'signflow.lang';

/**
 * The language chosen with the switch, or null. Never throws (owner, 2026-11-23): in
 * private mode or with blocked site data, even reading `localStorage` throws a
 * SecurityError. The storage comes as a getter for that reason — the access is inside
 * the try. A value the app does not have (old version, edited by hand) counts as nothing.
 */
export function readSavedLang(storage: () => Storage): string | null {
  try {
    const saved = storage().getItem(LANGUAGE_KEY);
    return saved !== null && LANGS.includes(saved) ? saved : null;
  } catch {
    return null;
  }
}

/** Remembers the choice; where the browser refuses (private mode, full), it is not kept. */
export function saveLang(lang: string, storage: () => Storage): void {
  try {
    storage().setItem(LANGUAGE_KEY, lang);
  } catch {
    // Nothing to do: the language works for this visit, the next start uses the browser's.
  }
}
