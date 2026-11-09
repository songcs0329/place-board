import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthGuard } from './auth.guard.js';
import { ClaudeService } from './search/claude.service.js';
import { NaverService } from './search/naver.service.js';
import { SearchController } from './search/search.controller.js';
import { SearchService } from './search/search.service.js';
import { supabaseProvider } from './supabase.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ScheduleModule.forRoot()],
  controllers: [SearchController],
  providers: [
    supabaseProvider,
    { provide: APP_GUARD, useClass: AuthGuard },
    NaverService,
    ClaudeService,
    SearchService,
  ],
})
export class AppModule {}
