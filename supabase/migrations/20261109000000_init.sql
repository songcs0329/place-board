-- 설계 9장. "Automatically expose new tables" 꺼둠 → 권한은 아래 GRANT로만 연다.

-- 장소 (검색에서 검증된 장소만 저장)
create table public.places (
  place_key text primary key,
  name text not null,
  category text,
  address text,
  road_address text,
  lat double precision,
  lng double precision,
  telephone text,
  link text,
  updated_at timestamptz not null default now()
);

-- 게시판 글 (메모 + 채팅을 한 테이블에)
create table public.place_posts (
  id bigint generated always as identity primary key,
  place_key text not null references public.places (place_key) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null,
  body text check (char_length(body) <= 300),
  tags text[] not null default '{}',
  images text[] not null default '{}',
  photo_taken_at timestamptz,
  kind text generated always as (
    case when cardinality(tags) > 0 or cardinality(images) > 0
         then 'memo' else 'chat' end
  ) stored,
  created_at timestamptz not null default now(),
  constraint has_content check (
    body is not null or cardinality(tags) > 0 or cardinality(images) > 0
  )
);

create index on public.place_posts (place_key, created_at desc);
create index on public.place_posts (user_id, created_at desc);

-- AI 요약 캐시
create table public.place_summaries (
  place_key text primary key references public.places (place_key) on delete cascade,
  summary text not null,
  source_count int not null,
  last_post_at timestamptz not null,
  generated_at timestamptz not null default now()
);

-- 로그인 사용자 검색 기록 (비로그인은 localStorage)
create table public.search_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  place_keys text[] not null,
  created_at timestamptz not null default now()
);

-- RLS (automatic RLS가 켜져 있어도 명시)
alter table public.places enable row level security;
alter table public.place_posts enable row level security;
alter table public.place_summaries enable row level security;
alter table public.search_sessions enable row level security;

-- 권한: 로그인 필수 서비스라 anon에는 아무 권한도 주지 않는다. 쓰기는 백엔드(service_role, RLS 우회)만
grant select on public.places, public.place_posts, public.place_summaries to authenticated;
grant select, insert, delete on public.search_sessions to authenticated;
grant all on public.places, public.place_posts, public.place_summaries, public.search_sessions to service_role;

create policy "places readable" on public.places
  for select to authenticated using (true);

create policy "recent posts readable" on public.place_posts
  for select to authenticated
  using (created_at > now() - interval '24 hours');

create policy "summaries readable" on public.place_summaries
  for select to authenticated using (true);

create policy "own search sessions" on public.search_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.place_posts;

-- ponytail: storage 버킷 place-photos + 업로드 정책은 6단계(사진)에서 별도 마이그레이션으로
