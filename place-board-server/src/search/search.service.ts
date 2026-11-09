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
    @Inject(SupabaseClient) private readonly db: SupabaseClient,
  ) {}

  async search(userId: string, query: string) {
    if (this.running.has(userId)) throw new HttpException({ code: 'IN_PROGRESS' }, HttpStatus.TOO_MANY_REQUESTS);
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
    const { count, error } = await this.db
      .from('search_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);
    if (error) throw error;
    if ((count ?? 0) >= DAILY_SEARCH_LIMIT) {
      throw new HttpException({ code: 'USER_LIMIT', limit: DAILY_SEARCH_LIMIT }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async run(userId: string, query: string) {
    // ① 검색어 생성 → ② 블로그 검색 (링크 기준 중복 제거)
    const queries = await this.claude.blogQueries(query);
    const lists = await Promise.all(queries.map((q) => this.naver.blog(q)));
    const seen = new Set<string>();
    const blogs: Blog[] = lists
      .flat()
      .filter((b) => !seen.has(b.link) && seen.add(b.link))
      .map((b) => ({
        title: clean(b.title),
        link: b.link,
        snippet: clean(b.description),
        blogger: clean(b.bloggername),
        postdate: b.postdate.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'),
      }));
    if (!blogs.length) return { query, places: [], unmatched: [] };

    // ③ 가게 추출 (글 번호는 1부터)
    const candidates = await this.claude.extractPlaces(
      query,
      blogs.map((b, i) => ({ id: i + 1, title: b.title, description: b.snippet })),
    );

    // ④ 캐시 → 지역 검색으로 검증 (한도 초과면 NaverQuotaError로 검색 전체 실패)
    const resolved = await Promise.all(candidates.map(async (c) => ({ c, row: await this.resolve(c) })));

    const byKey = new Map<string, ReturnType<typeof toPlace> & { summary: string; blogs: Blog[] }>();
    const unmatched: { name: string; area: string; summary: string; blogs: Blog[] }[] = [];
    for (const { c, row } of resolved) {
      const cBlogs = c.blogIds.map((id) => blogs[id - 1]).filter((b): b is Blog => !!b);
      if (!row) {
        unmatched.push({ name: c.name, area: c.area, summary: c.summary, blogs: cBlogs });
        continue;
      }
      const existing = byKey.get(row.place_key);
      if (existing) {
        // 서로 다른 후보가 같은 가게로 확인되면 후기를 합친다
        for (const b of cBlogs) if (!existing.blogs.some((x) => x.link === b.link)) existing.blogs.push(b);
      } else {
        byKey.set(row.place_key, { ...toPlace(row), summary: c.summary, blogs: cBlogs });
      }
    }
    const places = [...byKey.values()].sort((a, b) => b.blogs.length - a.blogs.length);

    const { error } = await this.db
      .from('search_sessions')
      .insert({ user_id: userId, query, place_keys: places.map((p) => p.placeKey) });
    if (error) throw error;

    return { query, places, unmatched };
  }

  private async resolve(c: Candidate): Promise<PlaceRow | null> {
    return (await this.findCached(c)) ?? (await this.lookup(c));
  }

  // 지역 검색 캐시: places에 같은 이름 + 같은 지역이 있으면 네이버 호출 생략
  private async findCached(c: Candidate): Promise<PlaceRow | null> {
    const term = c.name.replace(/[%_,()\\]/g, '').trim();
    if (term.length < 2) return null;
    const { data, error } = await this.db.from('places').select('*').ilike('name', `%${term}%`).limit(10);
    if (error) throw error;
    return (
      (data as PlaceRow[]).find(
        (p) => sameName(p.name, c.name) && `${p.address ?? ''} ${p.road_address ?? ''}`.includes(c.area),
      ) ?? null
    );
  }

  private async lookup(c: Candidate): Promise<PlaceRow | null> {
    const items = await this.naver.local(`${c.area} ${c.name}`);
    const hit = items.find((i) => sameName(i.title, c.name));
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
    const { error } = await this.db
      .from('places')
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'place_key' });
    if (error) throw error;
    return row;
  }
}

const toPlace = (r: PlaceRow) => ({
  placeKey: r.place_key,
  name: r.name,
  category: r.category ?? '',
  address: r.address ?? '',
  roadAddress: r.road_address ?? '',
  lat: r.lat,
  lng: r.lng,
  telephone: r.telephone ?? '',
  link: r.link ?? '',
});
