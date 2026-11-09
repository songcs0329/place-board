import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ClaudeService, type Candidate } from './claude.service.js';
import { NaverService } from './naver.service.js';
import { clean, makePlaceKey, sameName } from './text.js';

// 사용자별 검색 제한: 24시간에 20회 (검색 1회 ≈ 네이버 20회, 하루 한도 25,000회)
const DAILY_SEARCH_LIMIT = 20;

interface PlaceRow {
  place_key: string;
  name: string;
  category: string | null;
  address: string | null;
  road_address: string | null;
  lat: number | null;
  lng: number | null;
  telephone: string | null;
  link: string | null;
}

export interface Blog {
  title: string;
  link: string;
  snippet: string;
  blogger: string;
  postdate: string;
}

@Injectable()
export class SearchService {
  // 같은 사용자의 동시 검색 차단 (연타·병렬 요청으로 제한을 우회하지 못하게)
  // ponytail: 프로세스 하나 기준. 서버 여러 대면 DB/Redis 락으로
  private readonly running = new Set<string>();

  constructor(
    private readonly claude: ClaudeService,
    private readonly naver: NaverService,
    @Inject(SupabaseClient) private readonly supabase: SupabaseClient,
  ) {}

  async search(userId: string, query: string) {
    if (this.running.has(userId))
      throw new HttpException(
        { code: 'IN_PROGRESS' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    this.running.add(userId);
    try {
      await this.checkLimit(userId);
      return await this.run(userId, query);
    } finally {
      this.running.delete(userId);
    }
  }

  private async checkLimit(userId: string) {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count, error } = await this.supabase
      .from('search_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);
    if (error) throw error;
    if ((count ?? 0) >= DAILY_SEARCH_LIMIT) {
      throw new HttpException(
        { code: 'USER_LIMIT', limit: DAILY_SEARCH_LIMIT },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async run(userId: string, query: string) {
    // ① 검색어 생성 → ② 블로그 검색 (링크 기준 중복 제거)
    const blogQueries = await this.claude.blogQueries(query);
    const blogLists = await Promise.all(
      blogQueries.map((blogQuery) => this.naver.blog(blogQuery)),
    );
    const seenLinks = new Set<string>();
    const blogs: Blog[] = blogLists
      .flat()
      .filter((blog) => !seenLinks.has(blog.link) && seenLinks.add(blog.link))
      .map((blog) => ({
        title: clean(blog.title),
        link: blog.link,
        snippet: clean(blog.description),
        blogger: clean(blog.bloggername),
        postdate: blog.postdate.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'),
      }));
    if (!blogs.length) return { query, places: [], unmatched: [] };

    // ③ 가게 추출 (글 번호는 1부터)
    const candidates = await this.claude.extractPlaces(
      query,
      blogs.map((blog, index) => ({
        id: index + 1,
        title: blog.title,
        description: blog.snippet,
      })),
    );

    // ④ 캐시 → 지역 검색으로 검증 (한도 초과면 NaverQuotaError로 검색 전체 실패)
    const resolved = await Promise.all(
      candidates.map(async (candidate) => ({
        candidate,
        row: await this.resolve(candidate),
      })),
    );

    const placesByKey = new Map<
      string,
      ReturnType<typeof toPlace> & { summary: string; blogs: Blog[] }
    >();
    const unmatched: {
      name: string;
      area: string;
      summary: string;
      blogs: Blog[];
    }[] = [];
    for (const { candidate, row } of resolved) {
      const candidateBlogs = candidate.blogIds
        .map((id) => blogs[id - 1])
        .filter((blog): blog is Blog => !!blog);
      if (!row) {
        unmatched.push({
          name: candidate.name,
          area: candidate.area,
          summary: candidate.summary,
          blogs: candidateBlogs,
        });
        continue;
      }
      const existing = placesByKey.get(row.place_key);
      if (existing) {
        // 서로 다른 후보가 같은 가게로 확인되면 후기를 합친다
        for (const blog of candidateBlogs)
          if (!existing.blogs.some((saved) => saved.link === blog.link))
            existing.blogs.push(blog);
      } else {
        placesByKey.set(row.place_key, {
          ...toPlace(row),
          summary: candidate.summary,
          blogs: candidateBlogs,
        });
      }
    }
    const places = [...placesByKey.values()].sort(
      (first, second) => second.blogs.length - first.blogs.length,
    );

    const { error } = await this.supabase.from('search_sessions').insert({
      user_id: userId,
      query,
      place_keys: places.map((place) => place.placeKey),
    });
    if (error) throw error;

    return { query, places, unmatched };
  }

  private async resolve(candidate: Candidate): Promise<PlaceRow | null> {
    return (await this.findCached(candidate)) ?? (await this.lookup(candidate));
  }

  // 지역 검색 캐시: places에 같은 이름 + 같은 지역이 있으면 네이버 호출 생략
  private async findCached(candidate: Candidate): Promise<PlaceRow | null> {
    const term = candidate.name.replace(/[%_,()\\]/g, '').trim();
    if (term.length < 2) return null;
    const { data, error } = await this.supabase
      .from('places')
      .select('*')
      .ilike('name', `%${term}%`)
      .limit(10);
    if (error) throw error;
    return (
      (data as PlaceRow[]).find(
        (place) =>
          sameName(place.name, candidate.name) &&
          `${place.address ?? ''} ${place.road_address ?? ''}`.includes(
            candidate.area,
          ),
      ) ?? null
    );
  }

  private async lookup(candidate: Candidate): Promise<PlaceRow | null> {
    const items = await this.naver.local(`${candidate.area} ${candidate.name}`);
    const hit = items.find((item) => sameName(item.title, candidate.name));
    if (!hit) return null;

    const row: PlaceRow = {
      place_key: makePlaceKey(hit.title, hit.roadAddress || hit.address),
      name: clean(hit.title),
      category: hit.category || null,
      address: hit.address || null,
      road_address: hit.roadAddress || null,
      lat: hit.mapy ? Number(hit.mapy) / 1e7 : null,
      lng: hit.mapx ? Number(hit.mapx) / 1e7 : null,
      telephone: hit.telephone || null,
      link: hit.link || null,
    };
    const { error } = await this.supabase
      .from('places')
      .upsert(
        { ...row, updated_at: new Date().toISOString() },
        { onConflict: 'place_key' },
      );
    if (error) throw error;
    return row;
  }
}

const toPlace = (row: PlaceRow) => ({
  placeKey: row.place_key,
  name: row.name,
  category: row.category ?? '',
  address: row.address ?? '',
  roadAddress: row.road_address ?? '',
  lat: row.lat,
  lng: row.lng,
  telephone: row.telephone ?? '',
  link: row.link ?? '',
});
