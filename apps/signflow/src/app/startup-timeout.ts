/**
 * How long a request before the first render may take. Shared by every app initializer
 * (translations, settings): they run in parallel, so this is the worst-case wait for a
 * blank page — one value, not a sum.
 */
export const STARTUP_TIMEOUT_MS = 10_000;
