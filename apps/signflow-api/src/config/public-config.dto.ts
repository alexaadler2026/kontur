/**
 * Settings the SPA loads before it starts (ADR-0009). Public by definition: everything
 * here is visible to anyone who opens the app, so nothing secret and no server internals.
 * New fields come with the task that needs them (e.g. registrationMode with sign-up).
 */
export class PublicConfigDto {
  /**
   * Version of the running API, from its package.json.
   * @example "0.1.0"
   */
  version!: string;
}
