import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';
import { configureApp } from './app/configure-app.js';
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

const app = configureApp(await NestFactory.create(AppModule));
await app.listen(config.PORT);
Logger.log(
  `SignFlow API on http://localhost:${config.PORT}/api/v1`,
  'Bootstrap',
);
