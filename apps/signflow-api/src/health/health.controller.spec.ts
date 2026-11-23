import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller.js';
import type { Readiness } from './readiness.js';

describe('HealthController', () => {
  it('answers that the process is alive, with the version it was given', () => {
    // Liveness never asks the readiness check (it must not touch the database).
    const controller = new HealthController('1.2.3', {} as Readiness);

    expect(controller.live()).toEqual({ status: 'ok', version: '1.2.3' });
  });
});
