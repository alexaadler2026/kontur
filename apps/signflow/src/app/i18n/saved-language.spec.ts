import { LANGUAGE_KEY, readSavedLang, saveLang } from './saved-language';

// Owner, 2026-11-23: reading and writing the language in localStorage is wrapped in
// try/catch — in private mode (and with blocked site data) the browser throws there.

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const throwing = (): Storage => {
  throw new DOMException('The operation is insecure.', 'SecurityError');
};

describe('saved language (localStorage, task 8-3)', () => {
  it('reads the saved choice', () => {
    const storage = memoryStorage({ [LANGUAGE_KEY]: 'en' });
    expect(readSavedLang(() => storage)).toBe('en');
  });

  it('nothing saved → null', () => {
    expect(readSavedLang(() => memoryStorage())).toBeNull();
  });

  it('a value the app does not have → null', () => {
    const storage = memoryStorage({ [LANGUAGE_KEY]: 'fr' });
    expect(readSavedLang(() => storage)).toBeNull();
  });

  it('localStorage itself throws (private mode) → null, no error thrown', () => {
    expect(readSavedLang(throwing)).toBeNull();
  });

  it('getItem throws → null', () => {
    const storage = memoryStorage();
    storage.getItem = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    expect(readSavedLang(() => storage)).toBeNull();
  });

  it('saves the choice under the key', () => {
    const storage = memoryStorage();
    saveLang('ru', () => storage);
    expect(storage.getItem(LANGUAGE_KEY)).toBe('ru');
  });

  it('saving where localStorage throws (or is full) does not throw', () => {
    const full = memoryStorage();
    full.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    expect(() => saveLang('ru', throwing)).not.toThrow();
    expect(() => saveLang('ru', () => full)).not.toThrow();
  });
});
