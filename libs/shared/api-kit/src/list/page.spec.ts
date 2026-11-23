import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { toFieldErrors } from '../problem/field-errors.js';
import { PageQueryDto, toPage, toSkipTake } from './page.js';

/** Query parameters arrive as strings; the ValidationPipe turns them into the DTO. */
async function parse(query: Record<string, string>) {
  const dto = plainToInstance(PageQueryDto, query);
  return { dto, errors: toFieldErrors(await validate(dto)) };
}

describe('PageQueryDto (ADR-0008: page from 1, pageSize 25 by default, at most 100)', () => {
  it('without parameters: page 1 of 25', async () => {
    const { dto, errors } = await parse({});
    expect(errors).toEqual([]);
    expect({ page: dto.page, pageSize: dto.pageSize }).toEqual({
      page: 1,
      pageSize: 25,
    });
  });

  it('reads the numbers from the query string', async () => {
    const { dto, errors } = await parse({ page: '2', pageSize: '100' });
    expect(errors).toEqual([]);
    expect({ page: dto.page, pageSize: dto.pageSize }).toEqual({
      page: 2,
      pageSize: 100,
    });
  });

  it('rejects page 0, pageSize 0 or 101, fractions and words', async () => {
    const invalid: Record<string, string>[] = [
      { page: '0' },
      { page: '1.5' },
      { page: 'abc' },
      { pageSize: '0' },
      { pageSize: '101' },
    ];
    for (const query of invalid) {
      const [field] = Object.keys(query);
      expect((await parse(query)).errors, JSON.stringify(query)).toEqual([
        { pointer: `/${field}`, code: 'validation.invalid', params: {} },
      ]);
    }
  });
});

describe('toSkipTake and toPage', () => {
  it('page 3 of 25 skips the first 50 rows', () => {
    expect(toSkipTake({ page: 3, pageSize: 25 })).toEqual({
      skip: 50,
      take: 25,
    });
  });

  it('builds the response body of a list', () => {
    expect(toPage(['a', 'b'], { page: 2, pageSize: 25 }, 27)).toEqual({
      items: ['a', 'b'],
      page: 2,
      pageSize: 25,
      totalItems: 27,
    });
  });
});
