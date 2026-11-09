import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { SupabaseClient, type User } from '@supabase/supabase-js';
import { CurrentUser } from '../auth.guard.js';
import { makeNickname, parsePost } from './post-input.js';

// 응답·Broadcast로 내보내는 컬럼: user_id는 절대 내보내지 않는다 (설계 9장)
const PUBLIC_POST_COLUMNS =
  'id, place_key, nickname, body, tags, images, photo_taken_at, kind, created_at';

@Controller('places/:placeKey/posts')
export class PostsController {
  private readonly logger = new Logger(PostsController.name);

  constructor(
    @Inject(SupabaseClient) private readonly supabase: SupabaseClient,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: User,
    @Param('placeKey') placeKey: string,
    @Body() input: unknown,
  ) {
    // ponytail: imagePath가 실제로 업로드됐는지는 확인하지 않음(본인 폴더만 허용하므로 깨진 이미지는 본인 글에만 생김)
    const { body, tags, images, photoTakenAt } = parsePost(input, user.id);

    const place = await this.supabase
      .from('places')
      .select('place_key')
      .eq('place_key', placeKey)
      .maybeSingle();
    if (place.error) throw place.error;
    if (!place.data) throw new NotFoundException('없는 장소');

    // 같은 사용자 3초에 1개 (모든 방 합산)
    // ponytail: 동시에 두 요청이 오면 둘 다 통과할 수 있음. 문제 되면 DB 제약/락으로
    const last = await this.supabase
      .from('place_posts')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last.error) throw last.error;
    if (
      last.data &&
      Date.now() - new Date(last.data.created_at as string).getTime() < 3000
    ) {
      throw new HttpException(
        { code: 'TOO_FAST' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const { data, error } = await this.supabase
      .from('place_posts')
      .insert({
        place_key: placeKey,
        user_id: user.id,
        nickname: makeNickname(user.id, placeKey),
        body,
        tags,
        images,
        photo_taken_at: photoTakenAt,
      })
      .select(PUBLIC_POST_COLUMNS)
      .single();
    if (error) throw error;

    // 글 내용 대신 id만 보낸다: 받는 쪽이 id로 다시 조회해야 RLS가 차단·신고한 글을 걸러준다
    await this.broadcast(placeKey, {
      id: data.id,
      place_key: data.place_key,
      kind: data.kind,
    });
    return data;
  }

  // 새 글 알림 (설계 11장): 글 id·장소·종류만 비공개 채널 place:{key}로.
  // 받는 쪽은 Realtime 정책으로 로그인 사용자만, 보내는 쪽은 서버(service role)만
  // 전송이 실패해도 글은 이미 저장됐으므로 요청은 성공시키고, 화면은 다음 조회 때 맞춰진다
  private async broadcast(placeKey: string, post: unknown) {
    const channel = this.supabase.channel(`place:${placeKey}`, {
      config: { private: true },
    });
    try {
      const result = await channel.httpSend('post', post);
      if (!result.success)
        this.logger.warn(`broadcast 실패 ${result.status} ${result.error}`);
    } finally {
      await this.supabase.removeChannel(channel);
    }
  }
}
