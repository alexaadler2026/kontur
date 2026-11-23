import {
  readSessionCookie,
  type RequestHeaders,
  SESSION_COOKIE,
} from '@adlersoft/auth-server';
import { ProblemException } from '@adlersoft/api-kit';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';
import { CreateSessionDto, SessionDto } from './session.dto.js';
import { SessionService } from './session.service.js';

/** The parts of Express's request and response used here (no @types/express needed). */
interface HttpRequest {
  headers: RequestHeaders;
  ip?: string;
}
interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge?: number;
}
interface HttpResponse {
  cookie(name: string, value: string, options: CookieOptions): unknown;
  clearCookie(name: string, options: CookieOptions): unknown;
}

/**
 * ADR-0010: `__Host-` requires Secure and Path=/ and forbids Domain. HttpOnly — page
 * scripts cannot read it; SameSite=Lax — the second CSRF layer after SameOriginGuard.
 */
const COOKIE: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
};

/** One resource, "the session": sign in (POST), who am I (GET), sign out (DELETE). */
@ApiTags('session')
@Controller('session')
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  /**
   * Sign in. Sets the session cookie. Wrong e-mail or password: 401
   * `auth.invalid_credentials` — the same answer for both. Too many attempts: 429
   * `auth.throttled` with Retry-After (ADR-0010).
   */
  @ApiOperation({ operationId: 'createSession' })
  @Post()
  @UseGuards(AuthRateLimitGuard)
  @HttpCode(204)
  async create(
    @Body() body: CreateSessionDto,
    @Req() request: HttpRequest,
    @Res({ passthrough: true }) response: HttpResponse,
  ): Promise<void> {
    const userAgent = request.headers['user-agent'];
    const token = await this.sessions.signIn(body.email, body.password, {
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
      ip: request.ip,
    });
    response.cookie(SESSION_COOKIE, token, {
      ...COOKIE,
      maxAge: this.sessions.cookieMaxAgeMs,
    });
  }

  /** Who is signed in with this cookie. No or ended session: 401 `auth.unauthenticated`. */
  @ApiOperation({ operationId: 'getSession' })
  @Get()
  async get(@Req() request: HttpRequest): Promise<SessionDto> {
    const user = await this.sessions.findUser(sessionToken(request));
    if (!user) throw new ProblemException('auth.unauthenticated');
    return { user };
  }

  /** Sign out: the session ends on the server and the cookie is cleared. Always 204. */
  @ApiOperation({ operationId: 'deleteSession' })
  @Delete()
  @HttpCode(204)
  async remove(
    @Req() request: HttpRequest,
    @Res({ passthrough: true }) response: HttpResponse,
  ): Promise<void> {
    await this.sessions.signOut(sessionToken(request));
    response.clearCookie(SESSION_COOKIE, COOKIE);
  }
}

function sessionToken(request: HttpRequest): string | undefined {
  const cookie = request.headers['cookie'];
  return readSessionCookie(typeof cookie === 'string' ? cookie : undefined);
}
