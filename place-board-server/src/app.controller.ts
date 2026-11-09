import { Controller, Get } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { CurrentUser } from './auth.guard.js';

@Controller()
export class AppController {
  // 로그인 확인용
  @Get('me')
  me(@CurrentUser() user: User) {
    return { id: user.id };
  }
}
