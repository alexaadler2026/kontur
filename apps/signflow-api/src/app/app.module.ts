import { Module } from '@nestjs/common';
import { HealthController } from '../health/health.controller.js';
import { APP_VERSION, readAppVersion } from './app-version.js';

@Module({
  controllers: [HealthController],
  providers: [{ provide: APP_VERSION, useFactory: readAppVersion }],
})
export class AppModule {}
