import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setTimeout as sleep } from 'node:timers/promises';

export class NaverQuotaError extends Error {}

export interface NaverBlog {
  title: string;
  link: string;
  description: string;
  bloggername: string;
  postdate: string; // YYYYMMDD
}

export interface NaverLocal {
  title: string;
  link: string;
  category: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string; // 경도 × 1e7
  mapy: string; // 위도 × 1e7
}

// NAVER API HUB 검색 (설계 5장 네이버 호출 한도)
@Injectable()
export class NaverService {
  private readonly base = 'https://naverapihub.apigw.ntruss.com/search/v1';
  private nextSlot = 0;

  constructor(private readonly config: ConfigService) {}

  blog(query: string) {
    return this.get<NaverBlog>('blog', { query, display: '30', sort: 'sim' });
  }

  local(query: string) {
    return this.get<NaverLocal>('local', { query, display: '5' });
  }

  private async get<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T[]> {
    for (let attempt = 0; ; attempt++) {
      await this.slot();
      const res = await fetch(
        `${this.base}/${path}?${new URLSearchParams(params)}`,
        {
          headers: {
            'X-NCP-APIGW-API-KEY-ID':
              this.config.getOrThrow<string>('NAVER_CLIENT_ID'),
            'X-NCP-APIGW-API-KEY': this.config.getOrThrow<string>(
              'NAVER_CLIENT_SECRET',
            ),
          },
        },
      );
      if (res.status === 429) {
        // 초당 한도면 1초 뒤 재시도로 풀린다. 재시도도 429면 일·월 한도 차단으로 본다
        if (attempt === 0) {
          await sleep(1000);
          continue;
        }
        throw new NaverQuotaError();
      }
      if (!res.ok) throw new Error(`naver ${path} ${res.status}`);
      return ((await res.json()) as { items?: T[] }).items ?? [];
    }
  }

  // 호출 시작 간격 25ms = 초당 40회로 50 RPS 아래 유지
  // ponytail: 프로세스 하나 기준. 서버를 여러 대 띄우면 공유 카운터(Redis 등)로 바꿀 것
  private async slot() {
    const now = Date.now();
    const at = Math.max(now, this.nextSlot);
    this.nextSlot = at + 25;
    if (at > now) await sleep(at - now);
  }
}
