import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { APP_VERSION } from '../app/app-version.js';
import { ProblemException } from '@adlersoft/api-kit';
import { HealthDto } from './health.dto.js';
import { Readiness } from './readiness.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(APP_VERSION) private readonly version: string,
    private readonly readiness: Readiness,
  ) {}

  /** Liveness: the process answers. Never touches the database. */
  @ApiOperation({ operationId: 'getHealthLive' })
  @Get('live')
  live(): HealthDto {
    return { status: 'ok', version: this.version };
  }

  /**
   * Readiness: the database answers and every migration of this build is applied.
   * Otherwise 503 `server.unavailable` (ADR-0020); the reason is in the log.
   */
  @ApiOperation({ operationId: 'getHealthReady' })
  @Get('ready')
  async ready(): Promise<HealthDto> {
    if (await this.readiness.notReadyReason()) {
      throw new ProblemException('server.unavailable');
    }
    return { status: 'ok', version: this.version };
  }
}
