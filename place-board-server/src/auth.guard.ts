import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseClient, type User } from '@supabase/supabase-js';
import type { Request } from 'express';

type AuthedRequest = Request & { user?: User };

const IS_PUBLIC = 'isPublic';
// 로그인 없이 부를 수 있는 경로 (헬스 체크, 나중의 공유 미리보기). 설계 8장
export const Public = () => SetMetadata(IS_PUBLIC, true);

// 검증 결과를 잠깐 기억해 요청마다 Supabase를 부르지 않는다
// ponytail: 프로세스 메모리, 로그아웃·차단이 최대 60초 늦게 반영. 더 빠른 반영이 필요하면 JWT 로컬 검증으로
const TOKEN_CACHE_MILLISECONDS = 60_000;
const verifiedUsers = new Map<string, { user: User; expiresAt: number }>();

// 전역 가드: @Public()이 없는 모든 API는 Supabase access token 필요 (설계 8장)
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(SupabaseClient) private readonly supabase: SupabaseClient,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const token = /^Bearer (.+)$/.exec(
      request.headers.authorization ?? '',
    )?.[1];
    if (!token) throw new UnauthorizedException();

    const now = Date.now();
    const cached = verifiedUsers.get(token);
    if (cached && cached.expiresAt > now) {
      request.user = cached.user;
      return true;
    }

    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException();

    for (const [key, entry] of verifiedUsers)
      if (entry.expiresAt <= now) verifiedUsers.delete(key);
    verifiedUsers.set(token, {
      user: data.user,
      expiresAt: now + TOKEN_CACHE_MILLISECONDS,
    });
    request.user = data.user;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthedRequest>().user!,
);
