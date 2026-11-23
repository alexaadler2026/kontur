import 'reflect-metadata';
import {
  type AppConfig,
  ConfigError,
  loadConfig,
} from './config/load-config.js';

// ADR-0009: settings first. A wrong one stops the start here, with a message naming the
// variable — before Nest starts, so nothing half-works.
let config: AppConfig;
try {
  config = loadConfig();
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;
  console.error(error.message);
  process.exit(1);
}

// Loaded only now, with import(): static imports would load Nest, Prisma and pg before the
// first line above runs — seconds of work for a start that is about to stop (journal 032).
const [{ Logger }, { NestFactory }, { AppModule }, { configureApp }] =
  await Promise.all([
    import('@nestjs/common'),
    import('@nestjs/core'),
    import('./app/app.module.js'),
    import('./app/configure-app.js'),
  ]);

const app = configureApp(await NestFactory.create(AppModule.forRoot(config)));
await app.listen(config.PORT);
Logger.log(
  `SignFlow API on http://localhost:${config.PORT}/api/v1`,
  'Bootstrap',
);
