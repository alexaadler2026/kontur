import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/**
 * `?page=2&pageSize=25` of a list endpoint (ADR-0008). Offset pagination: page numbers and
 * "47 entries" match the mockups. An endpoint extends this class with its own `sort` and
 * named filters.
 */
export class PageQueryDto {
  /** 1-based page number. */
  @ApiPropertyOptional({ type: 'integer', minimum: 1, default: 1 })
  // Query parameters are strings; "2" → 2 before validation, "abc" → NaN → rejected.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  /** Entries per page. */
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = DEFAULT_PAGE_SIZE;
}

/** The response body of a list: `{ items, page, pageSize, totalItems }` (ADR-0008). */
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
}

type PageRequest = Pick<PageQueryDto, 'page' | 'pageSize'>;

/** Rows to skip and to take — Prisma's `skip` / `take` for this page. */
export function toSkipTake({ page, pageSize }: PageRequest): {
  skip: number;
  take: number;
} {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function toPage<T>(
  items: T[],
  { page, pageSize }: PageRequest,
  totalItems: number,
): Page<T> {
  return { items, page, pageSize, totalItems };
}
