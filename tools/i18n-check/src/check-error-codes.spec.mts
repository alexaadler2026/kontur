import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  checkErrorCodes,
  type ContractWithCodes,
  problemCodesOf,
} from './check-error-codes.mts';
import type { Translations } from './check-translations.mts';

describe('checkErrorCodes', () => {
  const contract: ContractWithCodes = {
    components: {
      schemas: {
        ProblemCode: { enum: ['validation.email', 'server.internal'] },
      },
    },
  };

  it('reads the codes from the ProblemCode enum of the contract', () => {
    expect(problemCodesOf(contract)).toEqual([
      'validation.email',
      'server.internal',
    ]);
    expect(problemCodesOf({})).toEqual([]);
  });

  it('a code with errors.<code> in the source language is fine', () => {
    const de = {
      errors: {
        validation: { email: 'Bitte …' },
        server: { internal: 'Fehler …' },
      },
    };
    expect(checkErrorCodes(problemCodesOf(contract), de, 'x')).toEqual([]);
  });

  it('names every code without a translation', () => {
    const de = { errors: { validation: { email: 'Bitte …' } } };
    expect(
      checkErrorCodes(problemCodesOf(contract), de, 'apps/x/de.json'),
    ).toEqual([
      'apps/x/de.json: error code "server.internal" has no translation "errors.server.internal"',
    ]);
  });
});

/** Each libs/<app>/api-contract/openapi.json belongs to apps/<app>/public/i18n. */
function contractsOfTheRepo(): { app: string; contract: URL; de: URL }[] {
  const root = new URL('../../../', import.meta.url);
  return readdirSync(new URL('libs/', root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      app: entry.name,
      contract: new URL(`libs/${entry.name}/api-contract/openapi.json`, root),
      de: new URL(`apps/${entry.name}/public/i18n/de.json`, root),
    }))
    .filter(({ contract }) => existsSync(contract));
}

describe('error codes of the repo contracts', () => {
  const contracts = contractsOfTheRepo();

  it('finds the contracts and their codes (guard: a check over nothing proves nothing)', () => {
    expect(contracts.map(({ app }) => app)).toContain('signflow');
    for (const { contract } of contracts) {
      const codes = problemCodesOf(JSON.parse(readFileSync(contract, 'utf8')));
      expect(codes.length).toBeGreaterThan(0);
    }
  });

  for (const { app, contract, de } of contracts) {
    it(`${app}: every error code of the contract is translated in apps/${app}/public/i18n`, () => {
      const codes = problemCodesOf(JSON.parse(readFileSync(contract, 'utf8')));
      const source = JSON.parse(readFileSync(de, 'utf8')) as Translations;

      expect(
        checkErrorCodes(codes, source, `apps/${app}/public/i18n/de.json`),
      ).toEqual([]);
    });
  }
});
