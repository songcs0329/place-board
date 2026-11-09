import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthGuard } from './auth.guard.js';
import { CleanupService } from './cleanup.service.js';
import { PostsController } from './posts/posts.controller.js';
import { ClaudeService } from './search/claude.service.js';
import { NaverService } from './search/naver.service.js';
import { SearchController } from './search/search.controller.js';
import { SearchService } from './search/search.service.js';
import { supabaseProvider } from './supabase.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ScheduleModule.forRoot()],
  controllers: [SearchController, PostsController],
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
