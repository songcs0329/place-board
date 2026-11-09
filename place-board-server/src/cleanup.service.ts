import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseClient } from '@supabase/supabase-js';

const HOUR = 3600_000;
const BATCH = 500;

// 정리 작업 (설계 12장). 조회 쿼리에도 시간 조건이 있어서 이게 늦게 돌아도 만료 글은 안 보인다
// ponytail: 서버를 여러 대 띄우면 각자 돈다(삭제라 중복 실행해도 결과는 같음). 문제 되면 @nestjs/locks
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @Inject(SupabaseClient) private readonly supabase: SupabaseClient,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run(now = Date.now()) {
    const day = new Date(now - 24 * HOUR).toISOString();
    const posts = await this.deleteExpiredPosts(day);
    const chats = await this.deleteWhere('place_posts', (query) =>
      query
        .eq('kind', 'chat')
        .lt('created_at', new Date(now - 6 * HOUR).toISOString()),
    );
    const sessions = await this.deleteWhere('search_sessions', (query) =>
      query.lt('created_at', day),
    );
    this.logger.log(`정리: 글 ${posts}, 채팅 ${chats}, 검색 기록 ${sessions}`);
    return { posts, chats, sessions };
  }

  // 24시간 지난 글: 사진 파일을 먼저 지우고 글을 지운다 (글만 지우면 Storage에 파일이 남는다)
  private async deleteExpiredPosts(before: string) {
    let total = 0;
    for (;;) {
      const { data, error } = await this.supabase
        .from('place_posts')
        .select('id, images')
        .lt('created_at', before)
        .limit(BATCH);
      if (error) throw error;
      if (!data.length) return total;

      const paths = data.flatMap((post) => post.images as string[]);
      if (paths.length) {
        const removed = await this.supabase.storage
          .from('place-photos')
          .remove(paths);
        if (removed.error) throw removed.error;
      }
      const ids = data.map((post) => post.id as number);
      const deleted = await this.supabase
        .from('place_posts')
        .delete()
        .in('id', ids);
      if (deleted.error) throw deleted.error;
      total += ids.length;
    }
  }

  private async deleteWhere(
    table: string,
    where: (
      query: ReturnType<ReturnType<SupabaseClient['from']>['delete']>,
    ) => PromiseLike<{ count: number | null; error: unknown }>,
  ) {
    const { count, error } = await where(
      this.supabase.from(table).delete({ count: 'exact' }),
    );
    if (error) throw error;
    return count ?? 0;
  }
}
