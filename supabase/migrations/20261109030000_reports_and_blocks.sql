-- 신고·차단 (설계 15장)
-- 신고: 신고한 사람에게는 바로 숨기고, 서로 다른 3명이 신고하면 모두에게 숨긴다 (hidden_at)
-- 차단: 차단한 사람에게는 그 작성자의 글을 모든 장소에서 숨긴다
-- 두 테이블 모두 user_id가 들어 있어 클라이언트에는 권한을 주지 않는다. 쓰기·읽기는 백엔드(service role)만

alter table public.place_posts add column hidden_at timestamptz;

create table public.post_reports (
  post_id bigint not null references public.place_posts (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('spam', 'abuse', 'privacy', 'etc')),
  created_at timestamptz not null default now(),
  primary key (post_id, reporter_id)
);

create table public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.post_reports enable row level security;
alter table public.user_blocks enable row level security;
grant all on public.post_reports, public.user_blocks to service_role;

-- 글 읽기 정책에서 쓰는 함수. 위 두 테이블은 클라이언트가 읽을 수 없으므로 security definer로 확인한다
-- (결과는 true/false뿐이라 다른 사람의 차단·신고 기록이나 user_id가 드러나지 않는다)
create function public.can_see_post(author_id uuid, target_post_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
      select 1 from public.user_blocks
      where blocker_id = auth.uid() and blocked_id = author_id
    )
    and not exists (
      select 1 from public.post_reports
      where post_id = target_post_id and reporter_id = auth.uid()
    );
$$;
revoke execute on function public.can_see_post(uuid, bigint) from public, anon;
grant execute on function public.can_see_post(uuid, bigint) to authenticated;

drop policy "recent posts readable" on public.place_posts;
create policy "recent posts readable" on public.place_posts
  for select to authenticated
  using (
    created_at > now() - interval '24 hours'
    and hidden_at is null
    and public.can_see_post(user_id, id)
  );
