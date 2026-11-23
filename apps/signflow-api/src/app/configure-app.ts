import { type INestApplication, ValidationPipe } from '@nestjs/common';
import {
  ProblemException,
  ProblemFilter,
  toFieldErrors,
} from '@adlersoft/api-kit';

/**
 * Settings shared by the running server, the OpenAPI script and the HTTP tests,
 * so all three see the same routes, the same validation and the same error format.
 */
export function configureApp<T extends INestApplication>(app: T): T {
  // ADR-0008: every endpoint lives under /api/v1.
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      // Drop properties without decorators, and reject requests that send them.
      whitelist: true,
      forbidNonWhitelisted: true,
      // Turn plain JSON into DTO class instances (and "5" into 5 where the type says number).
      transform: true,
      // ADR-0008: a validation failure is 422 Problem Details with errors[], not Nest's 400.
      exceptionFactory: (errors) =>
        new ProblemException('validation.failed', toFieldErrors(errors)),
    }),
  );
  // ADR-0008: every error, including unknown routes and crashes, is Problem Details.
  app.useGlobalFilters(new ProblemFilter());
  return app;
}
