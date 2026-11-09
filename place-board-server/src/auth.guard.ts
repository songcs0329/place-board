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

    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException();

    request.user = data.user;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthedRequest>().user!,
);
