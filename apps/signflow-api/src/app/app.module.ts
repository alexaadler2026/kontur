import { Module } from '@nestjs/common';
import { ConfigController } from '../config/config.controller.js';
import { HealthController } from '../health/health.controller.js';
import { APP_VERSION, readAppVersion } from './app-version.js';

@Module({
  controllers: [HealthController, ConfigController],
  providers: [{ provide: APP_VERSION, useFactory: readAppVersion }],
})
export class AppModule {}
