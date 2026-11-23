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
  setHeader(name: string, value: string): unknown;
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
 * What the log says about an unexpected error.
 * - Database errors (Prisma's `PrismaClient…Error`): name, error code and model only.
 *   Their message and stack quote what was sent — PostgreSQL says
 *   `invalid input syntax for type uuid: "<value>"` — and that may be personal data or a
 *   secret (journal 032). The code (e.g. P2002 = unique constraint) and the traceId are
 *   enough to find the cause.
 * - Everything else: the stack, which is our own code's message and call chain.
 * Recognised by name, not by import: this filter lives in libs/shared/api-kit, shared by
 * both APIs, and must not depend on one app's generated Prisma client.
 */
function describeForLog(exception: unknown): string {
  if (exception instanceof Error && exception.name.startsWith('PrismaClient')) {
    const { code, meta } = exception as Error & {
      code?: unknown;
      meta?: { modelName?: unknown };
    };
    return [
      exception.name,
      typeof code === 'string' ? code : undefined,
      typeof meta?.modelName === 'string'
        ? `model=${meta.modelName}`
        : undefined,
      '(message withheld: database errors quote sent values)',
    ]
      .filter(Boolean)
      .join(' ');
  }
  return exception instanceof Error
    ? (exception.stack ?? exception.name)
    : String(exception);
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

    // A ProblemException is a deliberate answer (e.g. 503 "not ready", which explains itself
    // in its own log line); only unexpected errors are logged here.
    if (status >= 500 && !(exception instanceof ProblemException)) {
      this.logger.error(
        `traceId=${body.traceId} ${request.method} ${path} ${status}`,
        describeForLog(exception),
      );
    }

    const retryAfter =
      exception instanceof ProblemException
        ? exception.options.retryAfterSeconds
        : undefined;
    if (retryAfter !== undefined) {
      // Whole seconds, at least 1: "Retry-After: 0" would invite an immediate retry.
      response.setHeader(
        'Retry-After',
        String(Math.max(1, Math.ceil(retryAfter))),
      );
    }

    response.status(status).type('application/problem+json').json(body);
  }
}
