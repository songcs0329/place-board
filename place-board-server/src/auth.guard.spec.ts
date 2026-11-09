import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthGuard } from './auth.guard.js';

const contextWith = (request: object) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  }) as unknown as ExecutionContext;

const reflectorWith = (isPublic: boolean) =>
  ({ getAllAndOverride: () => isPublic }) as unknown as Reflector;

const guardReturning = (result: object, isPublic = false) =>
  new AuthGuard(
    {
      auth: { getUser: () => Promise.resolve(result) },
    } as unknown as SupabaseClient,
    reflectorWith(isPublic),
  );

describe('AuthGuard', () => {
  it('토큰 없으면 401', async () => {
    const guard = guardReturning({});
    await expect(
      guard.canActivate(contextWith({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('@Public() 경로는 토큰 없이 통과', async () => {
    const guard = guardReturning({}, true);
    await expect(guard.canActivate(contextWith({ headers: {} }))).resolves.toBe(
      true,
    );
  });

  it('Supabase가 토큰을 거부하면 401', async () => {
    const guard = guardReturning({
      data: { user: null },
      error: new Error('invalid'),
    });
    const request = { headers: { authorization: 'Bearer bad' } };
    await expect(
      guard.canActivate(contextWith(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('유효한 토큰이면 request.user 설정', async () => {
    const user = { id: 'u1' };
    const guard = guardReturning({ data: { user }, error: null });
    const request: { headers: object; user?: unknown } = {
      headers: { authorization: 'Bearer ok' },
    };
    await expect(guard.canActivate(contextWith(request))).resolves.toBe(true);
    expect(request.user).toBe(user);
  });
});
