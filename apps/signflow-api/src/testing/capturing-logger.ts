import type { LoggerService } from '@nestjs/common';

/** Keeps every log line, so a test can assert what is (not) written. */
export class CapturingLogger implements LoggerService {
  readonly lines: string[] = [];
  private keep(...parts: unknown[]) {
    this.lines.push(parts.map((part) => String(part)).join(' '));
  }
  log = (...parts: unknown[]) => this.keep(...parts);
  error = (...parts: unknown[]) => this.keep(...parts);
  warn = (...parts: unknown[]) => this.keep(...parts);
  debug = (...parts: unknown[]) => this.keep(...parts);
  verbose = (...parts: unknown[]) => this.keep(...parts);

  /** Everything written so far, one string. */
  text(): string {
    return this.lines.join('\n');
  }
}
