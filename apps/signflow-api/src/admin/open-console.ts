import { openSync, writeSync } from 'node:fs';

/** Writes text straight to the console window; see openConsole(). */
export type ConsoleWriter = (text: string) => void;

/**
 * The console the person is looking at, opened directly — NOT stdout.
 *
 * Why (measured 2026-11-24): under `pnpm nx run` on Windows, stdin is the console but
 * stdout is a pipe into Nx, which passes it on and may keep it. A generated password must
 * reach the person's eyes only, so it goes past stdout: `CONOUT$` on Windows, `/dev/tty`
 * elsewhere (as ssh and gpg do for their prompts). Null when there is no console (CI, a
 * service, a redirected run): then nothing may be shown.
 */
export function openConsole(): ConsoleWriter | null {
  const device = process.platform === 'win32' ? '\\\\.\\CONOUT$' : '/dev/tty';
  let fd: number;
  try {
    fd = openSync(device, 'w');
  } catch {
    return null;
  }
  // The descriptor is closed by the process exit: create-admin ends right after showing it.
  return (text) => {
    writeSync(fd, text);
  };
}
