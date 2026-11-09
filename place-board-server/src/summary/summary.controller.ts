import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { TAG_LABELS } from '../posts/post-input.js';
import { ClaudeService } from '../search/claude.service.js';
import { shouldRegenerate, type CachedSummary } from './summary-policy.js';

const HOUR = 3600_000;

interface PostRow {
  body: string | null;
  tags: string[];
  images: string[];
  created_at: string;
}

const minutesAgo = (time: string, now: number) =>
  `${Math.max(0, Math.round((now - new Date(time).getTime()) / 60_000))}분 전`;

// 프롬프트용 한 줄: "[12분 전] 자리 여유, 주차 대기 | 2층 창가 비었어요 | (사진)"
const toLine = (post: PostRow, now: number) =>
  [
    `[${minutesAgo(post.created_at, now)}]`,
    post.tags.map((tag) => TAG_LABELS[tag] ?? tag).join(', '),
    post.body ?? '',
    post.images.length ? '(사진)' : '',
  ]
    .filter(Boolean)
    .join(' | ');

// AI 현장 요약 (설계 6장, 10장 GET /places/:placeKey/summary)
@Controller('places/:placeKey/summary')
export class SummaryController {
  // 같은 장소 요약을 여러 사람이 동시에 요청해도 Claude는 한 번만 부른다
  // ponytail: 프로세스 하나 기준. 서버 여러 대면 DB 락으로
  private readonly inFlight = new Map<string, Promise<string>>();

  constructor(
    @Inject(SupabaseClient) private readonly supabase: SupabaseClient,
    private readonly claude: ClaudeService,
  ) {}

  @Get()
  async get(@Param('placeKey') placeKey: string) {
    const now = Date.now();
    const place = await this.supabase
      .from('places')
      .select('name')
      .eq('place_key', placeKey)
      .maybeSingle();
    if (place.error) throw place.error;
    if (!place.data) throw new NotFoundException('없는 장소');

    // 최근 6시간 글, 최대 50개 (최신순)
    const posts = await this.supabase
      .from('place_posts')
      .select('body, tags, images, created_at')
      .eq('place_key', placeKey)
      .gte('created_at', new Date(now - 6 * HOUR).toISOString())
      .order('created_at', { ascending: false })
      .is('hidden_at', null) // 신고로 숨겨진 글은 요약에서 뺀다
      .limit(50);
    if (posts.error) throw posts.error;
    const rows = posts.data as PostRow[];
    if (!rows.length) return { summary: null, generatedAt: null };

    const cache = await this.supabase
      .from('place_summaries')
      .select('summary, last_post_at, generated_at')
      .eq('place_key', placeKey)
      .maybeSingle();
    if (cache.error) throw cache.error;
    const cached = cache.data as CachedSummary | null;

    if (
      cached &&
      !shouldRegenerate(
        cached,
        rows.map((row) => row.created_at),
        now,
      )
    ) {
      return { summary: cached.summary, generatedAt: cached.generated_at };
    }

    let pending = this.inFlight.get(placeKey);
    if (!pending) {
      pending = this.regenerate(placeKey, place.data.name as string, rows, now);
      this.inFlight.set(placeKey, pending);
      void pending
        .finally(() => this.inFlight.delete(placeKey))
        .catch(() => {});
    }
    const summary = await pending;
    return { summary, generatedAt: new Date(now).toISOString() };
  }

  private async regenerate(
    placeKey: string,
    placeName: string,
    rows: PostRow[],
    now: number,
  ) {
    // 오래된 글부터 시간순으로 넘긴다
    const lines = [...rows].reverse().map((row) => toLine(row, now));
    const summary = await this.claude.summarizePosts(placeName, lines);
    const { error } = await this.supabase.from('place_summaries').upsert(
      {
        place_key: placeKey,
        summary,
        source_count: rows.length,
        last_post_at: rows[0].created_at,
        generated_at: new Date(now).toISOString(),
      },
      { onConflict: 'place_key' },
    );
    if (error) throw error;
    return summary;
  }
}
