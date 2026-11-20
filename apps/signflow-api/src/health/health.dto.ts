import { IsIn } from 'class-validator';

/** Liveness answer: the process is running and can handle a request. */
export class HealthDto {
  /** Always `ok`: an API that cannot answer returns no body at all. */
  @IsIn(['ok'])
  status!: 'ok';

  /**
   * Version of the running API, from its package.json.
   * @example "0.1.0"
   */
  version!: string;
}
