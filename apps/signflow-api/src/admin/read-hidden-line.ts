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

const BACKSPACE = new Set(['\u007f', '\b']);
const CTRL_C = '\u0003';
const CTRL_D = '\u0004';

interface Waiting {
  typed: string[]; // code points, so Backspace removes "🙂" whole
  resolve: (line: string) => void;
  reject: (error: Error) => void;
}

/**
 * Reads hidden lines (passwords) from one terminal session. Raw mode turns the terminal's
 * own echo off, so every key arrives here and nothing appears on screen; the typed text
 * exists only in memory. Enter finishes, Backspace removes the last character, Ctrl+C /
 * Ctrl+D abort.
 *
 * Why one reader for all prompts (owner, 2026-11-24, measured on Windows): input does not
 * arrive one key at a time. A paste is one chunk, and under `pnpm nx run` (Nx's own
 * pseudo-terminal) "paste, Enter, paste, Enter" can arrive as ONE chunk. What comes after
 * an Enter belongs to the next prompt, so it is kept, not thrown away. Raw mode stays on
 * from the first prompt until close(): between two prompts nothing is echoed either.
 * "\r\n" (a copied line) is one Enter, even when the "\n" comes in the next chunk.
 */
export class HiddenLineReader {
  private readonly pending: string[] = []; // code points not used by a prompt yet
  private waiting: Waiting | null = null;
  private ended = false;
  private afterCarriageReturn = false;

  private readonly onData = (chunk: string | Buffer) => {
    this.pending.push(...String(chunk));
    this.drain();
  };
  private readonly onEnd = () => {
    this.ended = true;
    this.drain();
  };

  constructor(
    private readonly input: TerminalInput,
    private readonly output: Writable,
  ) {
    input.setRawMode?.(true);
    input.setEncoding('utf8');
    input.on('data', this.onData);
    input.on('end', this.onEnd);
    input.resume();
  }

  read(prompt: string): Promise<string> {
    this.output.write(prompt);
    return new Promise((resolve, reject) => {
      this.waiting = { typed: [], resolve, reject };
      this.drain();
    });
  }

  /** Raw mode off, input released. Call it once, after the last prompt. */
  close(): void {
    this.input.removeListener('data', this.onData);
    this.input.removeListener('end', this.onEnd);
    this.input.setRawMode?.(false);
    this.input.pause();
  }

  /** Hands the pending keys to the waiting prompt until its line is complete. */
  private drain(): void {
    while (this.waiting && this.pending.length > 0) {
      const key = this.pending.shift() as string;
      const skipLineFeed = this.afterCarriageReturn && key === '\n';
      this.afterCarriageReturn = false;
      if (skipLineFeed) continue; // the "\n" of "\r\n": the Enter was already counted

      if (key === '\r' || key === '\n') {
        this.afterCarriageReturn = key === '\r';
        this.finish(this.waiting.typed.join(''));
      } else if (key === CTRL_C || key === CTRL_D) {
        this.finish(new InputAbortedError());
      } else if (BACKSPACE.has(key)) {
        this.waiting.typed.pop();
      } else {
        this.waiting.typed.push(key);
      }
    }
    if (this.waiting && this.ended) this.finish(new InputAbortedError());
  }

  private finish(result: string | Error): void {
    const waiting = this.waiting as Waiting;
    this.waiting = null;
    this.output.write('\n');
    if (result instanceof Error) waiting.reject(result);
    else waiting.resolve(result);
  }
}

/** One hidden line with its own reader: raw mode on for this prompt only. */
export async function readHiddenLine(
  prompt: string,
  input: TerminalInput,
  output: Writable,
): Promise<string> {
  const reader = new HiddenLineReader(input, output);
  try {
    return await reader.read(prompt);
  } finally {
    reader.close();
  }
}
