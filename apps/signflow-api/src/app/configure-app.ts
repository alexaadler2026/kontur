import { type INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Settings shared by the running server, the OpenAPI script and the HTTP tests,
 * so all three see the same routes and the same validation.
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
    }),
  );
  return app;
}
