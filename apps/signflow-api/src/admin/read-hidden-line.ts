import type { Writable } from 'node:stream';

/** A terminal's input: a stream that can be switched to raw mode (process.stdin on a TTY). */
export interface TerminalInput extends NodeJS.ReadableStream {
  isTTY?: boolean;
  setRawMode?(mode: boolean): unknown;
}

/** The person pressed Ctrl+C, or the input ended before Enter. */
export class InputAbortedError extends Error {
  constructor() {
    super('Input aborted');
    this.name = 'InputAbortedError';
  }
}

const ENTER = new Set(['\r', '\n']);
const BACKSPACE = new Set(['\u007f', '\b']);
const CTRL_C = '\u0003';
const CTRL_D = '\u0004';

/**
 * Reads one line without showing it (a password). Raw mode turns the terminal's own echo
 * off, so every key arrives here and nothing appears on screen; the typed text exists only
 * in memory. Enter finishes, Backspace removes the last character, Ctrl+C / Ctrl+D abort.
 */
export function readHiddenLine(
  prompt: string,
  input: TerminalInput,
  output: Writable,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const typed: string[] = []; // code points, so Backspace removes "🙂" whole
    output.write(prompt);
    input.setRawMode?.(true);
    input.setEncoding('utf8');
    input.resume();

    const finish = (result: string | Error) => {
      input.removeListener('data', onData);
      input.removeListener('end', onEnd);
      input.setRawMode?.(false);
      input.pause();
      output.write('\n');
      if (result instanceof Error) reject(result);
      else resolve(result);
    };
    const onData = (chunk: string | Buffer) => {
      for (const key of String(chunk)) {
        if (ENTER.has(key)) return finish(typed.join(''));
        if (key === CTRL_C || key === CTRL_D) {
          return finish(new InputAbortedError());
        }
        if (BACKSPACE.has(key)) typed.pop();
        else typed.push(key);
      }
    };
    const onEnd = () => finish(new InputAbortedError());

    input.on('data', onData);
    input.on('end', onEnd);
  });
}
