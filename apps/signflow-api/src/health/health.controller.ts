import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { APP_VERSION } from '../app/app-version.js';
import { HealthDto } from './health.dto.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(APP_VERSION) private readonly version: string) {}

  /** Liveness: the process answers. */
  @ApiOperation({ operationId: 'getHealthLive' })
  @Get('live')
  live(): HealthDto {
    // Readiness (/health/ready: database reachable, migrations applied) comes with
    // the database in task 5.
    return { status: 'ok', version: this.version };
  }
}
