import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { SupabaseClient, type User } from '@supabase/supabase-js';
import { CurrentUser } from '../auth.guard.js';

export const REPORT_REASONS = ['spam', 'abuse', 'privacy', 'etc'];
// 서로 다른 사람 이만큼 신고하면 모두에게 숨긴다 (관리자 화면이 없어서 자동 처리)
export const HIDE_AFTER_REPORTS = 3;

// 신고·차단 (설계 15장). 화면은 작성자 user_id를 모르므로 글 id로 받고, 작성자는 서버가 찾는다
@Controller('posts/:postId')
export class ModerationController {
  constructor(
    @Inject(SupabaseClient) private readonly supabase: SupabaseClient,
  ) {}

  @Post('report')
  @HttpCode(204)
  async report(
    @CurrentUser() user: User,
    @Param('postId', ParseIntPipe) postId: number,
    @Body() input: { reason?: unknown },
  ) {
    const reason = input?.reason;
    if (typeof reason !== 'string' || !REPORT_REASONS.includes(reason))
      throw new BadRequestException('알 수 없는 신고 사유');
    const author = await this.findAuthor(postId);
    if (author === user.id)
      throw new BadRequestException('내 글은 신고할 수 없어요');

    // 같은 사람이 여러 번 신고해도 한 번으로 센다 (primary key)
    const inserted = await this.supabase
      .from('post_reports')
      .upsert(
        { post_id: postId, reporter_id: user.id, reason },
        { onConflict: 'post_id,reporter_id', ignoreDuplicates: true },
      );
    if (inserted.error) throw inserted.error;

    const { count, error } = await this.supabase
      .from('post_reports')
      .select('post_id', { count: 'exact', head: true })
      .eq('post_id', postId);
    if (error) throw error;
    if ((count ?? 0) >= HIDE_AFTER_REPORTS) {
      const hidden = await this.supabase
        .from('place_posts')
        .update({ hidden_at: new Date().toISOString() })
        .eq('id', postId)
        .is('hidden_at', null);
      if (hidden.error) throw hidden.error;
    }
  }

  // 이 글 작성자의 글을 나에게서 모든 장소에서 숨긴다
  @Post('block-author')
  @HttpCode(204)
  async blockAuthor(
    @CurrentUser() user: User,
    @Param('postId', ParseIntPipe) postId: number,
  ) {
    const author = await this.findAuthor(postId);
    if (author === user.id)
      throw new BadRequestException('나를 차단할 수는 없어요');
    const { error } = await this.supabase
      .from('user_blocks')
      .upsert(
        { blocker_id: user.id, blocked_id: author },
        { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
      );
    if (error) throw error;
  }

  private async findAuthor(postId: number): Promise<string> {
    const { data, error } = await this.supabase
      .from('place_posts')
      .select('user_id')
      .eq('id', postId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException('없는 글');
    return data.user_id as string;
  }
}
