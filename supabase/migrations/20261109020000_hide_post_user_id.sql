-- 설계 15장 "user_id 노출 막기": 방마다 닉네임을 바꿔도 user_id가 보이면 같은 사람의 글을 방을 넘나들며 이을 수 있다

-- 1) 읽기 권한을 컬럼 단위로: user_id만 뺀다 (RLS의 24시간 조건은 그대로)
revoke select on public.place_posts from authenticated;
grant select (id, place_key, nickname, body, tags, images, photo_taken_at, kind, created_at)
  on public.place_posts to authenticated;

-- 2) postgres_changes는 행 전체(user_id 포함)를 보내므로 구독 대상에서 뺀다.
--    새 글은 백엔드가 저장 후 user_id를 뺀 글을 비공개 채널 place:{key}로 Broadcast 한다
alter publication supabase_realtime drop table public.place_posts;

-- 3) 비공개 채널 권한 (Realtime Authorization)
--    로그인 사용자: place:* 채널의 broadcast·presence 받기, presence 보내기(보는 사람 수)
--    broadcast 보내기는 정책이 없으므로 막힌다 → 가짜 글을 흘릴 수 없다. 백엔드는 service role이라 RLS를 우회한다
create policy "receive place channels" on realtime.messages
  for select to authenticated
  using (
    (select realtime.topic()) like 'place:%'
    and realtime.messages.extension in ('broadcast', 'presence')
  );

create policy "track presence on place channels" on realtime.messages
  for insert to authenticated
  with check (
    (select realtime.topic()) like 'place:%'
    and realtime.messages.extension = 'presence'
  );
