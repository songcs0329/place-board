import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthGuard } from './auth.guard.js';
import { ModerationController } from './moderation/moderation.controller.js';
import { CleanupService } from './cleanup.service.js';
import { HealthController } from './health.controller.js';
import { PostsController } from './posts/posts.controller.js';
import { ClaudeService } from './search/claude.service.js';
import { NaverService } from './search/naver.service.js';
import { SearchController } from './search/search.controller.js';
import { SearchService } from './search/search.service.js';
import { SummaryController } from './summary/summary.controller.js';
import { supabaseProvider } from './supabase.js';

// 환경별 .env: production이면 .env.production, 그 밖(개발, 테스트)은 .env.development
// 호스팅 대시보드(Railway)에 넣은 환경 변수가 파일보다 우선한다
const environmentFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: environmentFile }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    SearchController,
    PostsController,
    SummaryController,
    ModerationController,
    HealthController,
  ],
  providers: [
    supabaseProvider,
    { provide: APP_GUARD, useClass: AuthGuard },
    NaverService,
    ClaudeService,
    SearchService,
    CleanupService,
  ],
})
export class AppModule {}
