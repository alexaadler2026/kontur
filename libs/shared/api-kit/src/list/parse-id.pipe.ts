import { Injectable, type PipeTransform } from '@nestjs/common';
import { ProblemException } from '../problem/problem.exception.js';

/** The canonical text form of a UUID (any version; ours are v7 from the database). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Checks an id from the URL path: `@Param('id', ParseIdPipe) id: string`.
 * Not a UUID → 404 `request.not_found` (owner, 2026-11-23): no record can have such an id,
 * and the answer is the same as for an id that does not exist. Without this pipe the value
 * reached PostgreSQL and came back as a 500 (journal 032).
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!UUID.test(value)) {
      throw new ProblemException('request.not_found');
    }
    return value;
  }
}
