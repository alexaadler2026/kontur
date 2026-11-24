import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
  HiddenLineReader,
  InputAbortedError,
  readHiddenLine,
  type TerminalInput,
} from './read-hidden-line.js';

// Owner, 2026-11-23: the admin password is typed interactively and never shown.

function terminal() {
  const input = Object.assign(new PassThrough(), {
    isTTY: true,
    setRawMode: vi.fn(),
  }) as PassThrough & TerminalInput & { setRawMode: ReturnType<typeof vi.fn> };
  const output = new PassThrough();
  let shown = '';
  output.on('data', (chunk: Buffer) => (shown += chunk.toString('utf8')));
  return { input, output, shown: () => shown };
}

describe('readHiddenLine', () => {
  it('returns what was typed; the screen shows only the prompt and a line break', async () => {
    const t = terminal();
    const line = readHiddenLine('Password: ', t.input, t.output);

    t.input.write('Grüne Berge über Bischkek\r');

    expect(await line).toBe('Grüne Berge über Bischkek');
    expect(t.shown()).toBe('Password: \n');
  });

  it('turns raw mode on while reading and off afterwards (the terminal echoes nothing)', async () => {
    const t = terminal();
    const line = readHiddenLine('Password: ', t.input, t.output);
    t.input.write('x\n');
    await line;

    expect(t.input.setRawMode.mock.calls).toEqual([[true], [false]]);
  });

  it('keystrokes may come one by one; Backspace removes the last character', async () => {
    const t = terminal();
    const line = readHiddenLine('Password: ', t.input, t.output);

    for (const key of ['a', 'b', 'x', '\u007f', 'c', '\b', 'd', '\r']) {
      t.input.write(key);
    }

    expect(await line).toBe('abd');
  });

  it('Backspace removes a whole character, also one outside the BMP', async () => {
    const t = terminal();
    const line = readHiddenLine('Password: ', t.input, t.output);

    t.input.write('ab🙂\u007f\r');

    expect(await line).toBe('ab');
  });

  it('Ctrl+C aborts: no password, raw mode off again', async () => {
    const t = terminal();
    const line = readHiddenLine('Password: ', t.input, t.output);

    t.input.write('secret\u0003');

    await expect(line).rejects.toBeInstanceOf(InputAbortedError);
    expect(t.input.setRawMode).toHaveBeenLastCalledWith(false);
  });

  it('the input ends before Enter (Ctrl+D or a closed terminal) → aborted', async () => {
    const t = terminal();
    const line = readHiddenLine('Password: ', t.input, t.output);

    t.input.write('secret');
    t.input.end();

    await expect(line).rejects.toBeInstanceOf(InputAbortedError);
  });
});

// Owner, 2026-11-24: pasting the password twice (Ctrl+V) in Windows PowerShell gave "the two
// entries do not match". Measured on Windows: under `pnpm nx run … create-admin` (Nx's own
// pseudo-terminal) the input arrives merged — "first paste, Enter, second paste, Enter" in
// ONE chunk. Each prompt read its own line and threw the rest of the chunk away. Pastes may
// also end in "\r\n" (a copied line). One reader now serves both prompts and keeps the rest.
describe('HiddenLineReader (both prompts from one terminal session)', () => {
  const PASTED = 'Grüne Berge über Bischkek';

  it('a whole pasted line with spaces and ü, ending in \r\n, in one chunk', async () => {
    const t = terminal();
    const reader = new HiddenLineReader(t.input, t.output);
    const line = reader.read('Password: ');

    t.input.write(`${PASTED}\r\n`);

    expect(await line).toBe(PASTED);
    reader.close();
  });

  it('two pastes with Enter arriving merged in ONE chunk: both prompts get the line', async () => {
    const t = terminal();
    const reader = new HiddenLineReader(t.input, t.output);

    const first = reader.read('Password: ');
    t.input.write(`${PASTED}\r${PASTED}\r`);
    expect(await first).toBe(PASTED);
    expect(await reader.read('Repeat: ')).toBe(PASTED);
    reader.close();
  });

  it('"\r\n" counts as ONE Enter, also when the \n comes in the next chunk', async () => {
    const t = terminal();
    const reader = new HiddenLineReader(t.input, t.output);

    const first = reader.read('Password: ');
    t.input.write(`${PASTED}\r`);
    expect(await first).toBe(PASTED);

    const second = reader.read('Repeat: ');
    t.input.write('\n');
    t.input.write(`${PASTED}\r\n`);
    expect(await second).toBe(PASTED); // not "" from the leftover \n
    reader.close();
  });

  // Owner, 2026-11-24, reproduced with the real command on Windows: a copied line already
  // ends in a line break (= Enter); the extra Enter the person presses gave the next prompt
  // an empty answer → "do not match". A password is never empty: an empty Enter is ignored.
  it('paste ending in a line break + an extra Enter: the extra Enter is ignored', async () => {
    const t = terminal();
    const reader = new HiddenLineReader(t.input, t.output);

    const first = reader.read('Password: ');
    t.input.write(`${PASTED}\r\n`);
    t.input.write('\r');
    expect(await first).toBe(PASTED);

    const second = reader.read('Repeat: ');
    t.input.write(`${PASTED}\r\n\r`);
    expect(await second).toBe(PASTED); // not "" from the extra Enter
    reader.close();
  });

  it('raw mode stays on between the prompts (nothing is echoed), off at close', async () => {
    const t = terminal();
    const reader = new HiddenLineReader(t.input, t.output);
    const first = reader.read('Password: ');
    t.input.write('a b\r');
    await first;
    const second = reader.read('Repeat: ');
    t.input.write('a b\r');
    await second;

    expect(t.input.setRawMode.mock.calls).toEqual([[true]]);
    reader.close();
    expect(t.input.setRawMode.mock.calls).toEqual([[true], [false]]);
  });

  it('the screen shows only the prompts and line breaks — never the password', async () => {
    const t = terminal();
    const reader = new HiddenLineReader(t.input, t.output);
    const first = reader.read('Password: ');
    t.input.write(`${PASTED}\r\n${PASTED}\r\n`);
    await first;
    await reader.read('Repeat: ');
    reader.close();

    expect(t.shown()).toBe('Password: \nRepeat: \n');
  });

  it('the input ends while a prompt waits → aborted', async () => {
    const t = terminal();
    const reader = new HiddenLineReader(t.input, t.output);
    const line = reader.read('Password: ');

    t.input.write('half');
    t.input.end();

    await expect(line).rejects.toBeInstanceOf(InputAbortedError);
    reader.close();
  });
});
