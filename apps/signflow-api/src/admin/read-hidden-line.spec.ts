import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
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
