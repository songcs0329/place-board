import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AuthGuard } from './auth.guard.js';
import { supabaseProvider } from './supabase.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [supabaseProvider, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
