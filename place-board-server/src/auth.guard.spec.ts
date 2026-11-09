import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthGuard } from './auth.guard.js';

const ctxWith = (req: object) =>
  ({ switchToHttp: () => ({ getRequest: () => req }) }) as unknown as ExecutionContext;

const guardReturning = (result: object) =>
  new AuthGuard({ auth: { getUser: () => Promise.resolve(result) } } as unknown as SupabaseClient);

describe('AuthGuard', () => {
  it('토큰 없으면 401', async () => {
    const guard = guardReturning({});
    await expect(guard.canActivate(ctxWith({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('Supabase가 토큰을 거부하면 401', async () => {
    const guard = guardReturning({ data: { user: null }, error: new Error('invalid') });
    const req = { headers: { authorization: 'Bearer bad' } };
    await expect(guard.canActivate(ctxWith(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('유효한 토큰이면 req.user 설정', async () => {
    const user = { id: 'u1' };
    const guard = guardReturning({ data: { user }, error: null });
    const req: { headers: object; user?: unknown } = { headers: { authorization: 'Bearer ok' } };
    await expect(guard.canActivate(ctxWith(req))).resolves.toBe(true);
    expect(req.user).toBe(user);
  });
});
