import { Controller, Get } from '@nestjs/common';
import { Public } from './auth.guard.js';

// 호스팅 헬스 체크용 (DEPLOY_PLAN 2번). 외부 서비스는 확인하지 않는다: 서버 프로세스가 살아 있는지만
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
