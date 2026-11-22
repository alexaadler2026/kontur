import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { APP_VERSION } from '../app/app-version.js';
import { PublicConfigDto } from './public-config.dto.js';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(@Inject(APP_VERSION) private readonly version: string) {}

  /** Public settings for the SPA, loaded before it starts (ADR-0009). */
  @ApiOperation({ operationId: 'getConfig' })
  @Get()
  get(): PublicConfigDto {
    return { version: this.version };
  }
}
