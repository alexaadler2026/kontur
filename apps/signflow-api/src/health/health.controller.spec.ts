import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('answers that the process is alive, with the version it was given', () => {
    const controller = new HealthController('1.2.3');

    expect(controller.live()).toEqual({ status: 'ok', version: '1.2.3' });
  });
});
