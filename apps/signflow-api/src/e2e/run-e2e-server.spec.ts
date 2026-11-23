import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { runE2eServer } from './run-e2e-server.js';

// Task 8-1: a broken e2e setup stops with a clear message and exit code 1 — it never
// starts an API on a database without the test account. The account file is read before
// Docker, so this case needs no Docker; a missing Docker ends in the same message path.

function collect(): { stream: Writable; text: () => string } {
  let text = '';
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      text += chunk.toString();
      done();
    },
  });
  return { stream, text: () => text };
}

describe('runE2eServer', () => {
  it('a weak password in the account file: exit 1 with the reason, nothing started', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'e2e-user-'));
    const userFile = join(dir, 'e2e-user.json');
    writeFileSync(
      userFile,
      JSON.stringify({ email: 'e2e.nutzer@beispiel.de', password: 'kurz' }),
    );
    const stderr = collect();

    const code = await runE2eServer({
      userFile,
      projectRoot: dir,
      apiEntry: join(dir, 'no-such-main.js'),
      port: '0',
      stderr: stderr.stream,
    });

    expect(code).toBe(1);
    expect(stderr.text()).toContain(
      'e2e server: e2e account: the password breaks the password rules (too_short)',
    );
  });
});
