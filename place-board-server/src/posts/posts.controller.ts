import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { SupabaseClient, type User } from '@supabase/supabase-js';
import { CurrentUser } from '../auth.guard.js';
import { makeNickname, parsePost } from './post-input.js';

@Controller('places/:placeKey/posts')
export class PostsController {
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
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
