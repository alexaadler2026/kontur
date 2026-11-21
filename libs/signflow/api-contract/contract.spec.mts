import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Generated MSW mocks take their data from the contract's examples (Orval useExamples,
 * ADR-0007). A property without an example would get random faker data instead — so
 * every property of every schema must carry one.
 */
interface Schema {
  properties?: Record<string, { example?: unknown; $ref?: string }>;
}
interface Contract {
  components?: { schemas?: Record<string, Schema> };
}

const contract = JSON.parse(
  readFileSync(new URL('./openapi.json', import.meta.url), 'utf8'),
) as Contract;
const schemas = Object.entries(contract.components?.schemas ?? {});

describe('signflow-api contract (openapi.json)', () => {
  it('has schemas (guard: a check over zero schemas proves nothing)', () => {
    expect(schemas.length).toBeGreaterThan(0);
  });

  it('gives every property of every schema an example', () => {
    const missing = schemas.flatMap(([schemaName, schema]) =>
      Object.entries(schema.properties ?? {})
        // A $ref points to another schema; that schema is checked on its own.
        .filter(
          ([, property]) => !property.$ref && property.example === undefined,
        )
        .map(
          ([propertyName]) =>
            `${schemaName}.${propertyName}: no example — add @ApiProperty({ example }) ` +
            '(or a JSDoc @example) to the DTO field',
        ),
    );

    expect(missing).toEqual([]);
  });
});
