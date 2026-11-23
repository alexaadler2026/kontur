import { type DynamicModule, Module } from '@nestjs/common';
import { APP_CONFIG } from '../config/app-config.token.js';
import { ConfigController } from '../config/config.controller.js';
import type { AppConfig } from '../config/load-config.js';
import { PrismaService } from '../database/prisma.service.js';
import { HealthController } from '../health/health.controller.js';
import { Readiness } from '../health/readiness.js';
import { APP_VERSION, readAppVersion } from './app-version.js';

@Module({})
export class AppModule {
  /**
   * The app with its validated settings (ADR-0009): main.ts passes loadConfig()'s result,
   * tests and the contract generator pass offlineConfig(). Code injects APP_CONFIG.
   */
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      // The root of the app: its settings and database client are visible in every
      // feature module without importing AppModule again.
      global: true,
      controllers: [HealthController, ConfigController],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        { provide: APP_VERSION, useFactory: readAppVersion },
        PrismaService,
        Readiness,
      ],
      exports: [APP_CONFIG, PrismaService],
    };
  }
}
