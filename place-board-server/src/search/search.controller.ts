import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { CurrentUser } from '../auth.guard.js';
import { NaverQuotaError } from './naver.service.js';
import { SearchService } from './search.service.js';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @HttpCode(200)
  async search(@CurrentUser() user: User, @Body() body: { query?: unknown }) {
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    if (query.length < 2 || query.length > 100)
      throw new BadRequestException('검색어는 2~100자');

    try {
      return await this.searchService.search(user.id, query);
    } catch (e) {
      if (e instanceof NaverQuotaError) {
        throw new ServiceUnavailableException({
          code: 'NAVER_QUOTA',
          message: '오늘 검색 한도를 다 썼어요',
        });
      }
      throw e;
    }
  }
}
