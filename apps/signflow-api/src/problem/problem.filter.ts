import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ProblemFieldError } from './field-errors.js';
import { PROBLEM_CODES, type ProblemCode } from './problem-codes.js';
import { ProblemException } from './problem.exception.js';

/** The parts of Express's request and response the filter uses (no @types/express needed). */
interface HttpRequest {
  method: string;
  originalUrl: string;
}
interface HttpResponse {
  status(code: number): HttpResponse;
  type(contentType: string): HttpResponse;
  json(body: unknown): unknown;
}

/** The response body (RFC 9457 + our `code`, `traceId`, `errors`). */
export interface ProblemBody {
  type: string;
  title: string;
  status: number;
  code: ProblemCode;
  instance: string;
  traceId: string;
  errors?: ProblemFieldError[];
}

/**
 * Which code an exception becomes:
 * - ProblemException: its own code (validation, later business rules);
 * - Nest/Express HTTP errors: 404 → request.not_found, other 4xx → request.malformed
 *   (unparseable JSON arrives as a 400 here). More 4xx codes (413, 415) come with uploads;
 * - anything else: server.internal (500).
 */
function codeOf(exception: unknown): ProblemCode {
  if (exception instanceof ProblemException) return exception.code;
  const status =
    exception instanceof HttpException
      ? exception.getStatus()
      : (exception as { status?: unknown } | null)?.status;
  if (status === 404) return 'request.not_found';
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return 'request.malformed';
  }
  return 'server.internal';
}

/**
 * Every error leaves the API as application/problem+json (ADR-0008). The body is built
 * from the registry only: no exception message, no stack, no sent value. Only a 500 is
 * logged — with the traceId of the response, so a user can quote it; request bodies and
 * query strings are never logged (ADR-0020).
 */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger('Problem');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<HttpResponse>();

    const code = codeOf(exception);
    const { status, title } = PROBLEM_CODES[code];
    const path = request.originalUrl.split('?')[0];
    const body: ProblemBody = {
      type: `urn:kontur:problem:${code}`,
      title,
      status,
      code,
      instance: path,
      traceId: randomUUID(),
    };
    if (exception instanceof ProblemException && exception.errors) {
      body.errors = exception.errors;
    }

    if (status >= 500) {
      const stack =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        `traceId=${body.traceId} ${request.method} ${path} ${status}`,
        stack,
      );
    }

    response.status(status).type('application/problem+json').json(body);
  }
}
