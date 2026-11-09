# 장소 메모판 프로젝트 설계

## 1. 개요

"우드톤 분위기 경기도 외곽 대형 카페"처럼 분위기로 장소를 찾고, 찾은 장소마다 붙은 게시판에서 지금 상황(자리, 주차, 웨이팅)을 확인하는 웹 서비스다.

검색은 Claude가 네이버 블로그 후기로 후보를 찾고, 네이버 지역 검색으로 실제 존재하는 장소인지 확인하는 방식이다. 지역 검색 결과에는 분위기를 판단할 정보가 없고, 블로그 결과에는 주소와 좌표가 없어서 둘을 섞어 쓴다.

실시간 정보는 위치 데이터 대신 사용자가 직접 남기는 글로 채운다. 네이버를 포함해 공개 API로는 개별 카페의 실시간 인원을 얻을 수 없고, 위치 공유는 법적 부담(개인위치정보사업 등록)이 커서 제외했다.

## 2. 범위

### 포함

- 웹 서비스 (모바일 브라우저 기준)
- 검색 결과 탭: 지역 검색 + 블로그 후기를 합친 장소 카드
- 실시간 게시판 탭: 내가 검색한 장소의 현재 소식만
- 장소 게시판: 현장 메모 + 채팅, 사진 1장
- 카카오 로그인 필수 (이메일은 선택 동의, 서비스에서 사용 안 함)
- Claude 기반 현장 요약

### 제외

- 위치 공유, 지오펜스 기반 인원 집계
- 네이티브 앱 (iOS/Android 스토어 배포)
- 1:1 DM
- 웹 푸시 알림

## 3. 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프론트엔드 | Vite + React SPA ([template-vite-react](https://github.com/songcs0329/template-vite-react) 기반), TypeScript, Tailwind CSS |
| 백엔드 | NestJS, TypeScript |
| DB / 인증 / 실시간 / 파일 | Supabase (Postgres, Auth, Realtime, Storage) |
| LLM | Claude API (tool use로 구조화된 결과 받기) |
| 외부 검색 | 네이버 검색 API (블로그, 지역) |

프론트는 SSR 없이 SPA로 만든다. 서버에서 할 일(키 보관, 검증, 외부 API, cron)은 NestJS가 모두 맡고, 읽기·Realtime·Presence·로그인·사진 처리는 전부 브라우저에서 돈다. 글은 24시간 뒤 사라지고 검색 결과는 사용자마다 달라서 SSR/SEO 이점도 거의 없다. 배포할 때는 모든 경로를 `index.html`로 돌리는 SPA fallback을 설정한다. 설정하지 않으면 카카오 로그인 콜백 같은 직접 진입 경로가 404가 난다.

### 역할 분담

읽기는 프론트가 Supabase에서 직접 가져오고, 쓰기와 외부 API 호출은 백엔드를 거친다. 네이버, Anthropic 키와 Supabase service role 키는 백엔드에만 둔다. 글쓰기를 백엔드로 모으는 이유는 rate limit, 입력 검증, 닉네임 생성을 한 곳에서 처리하기 위해서다.

| 기능 | 담당 |
| --- | --- |
| 장소 검색 | 백엔드 |
| 글쓰기 (검증, rate limit, 닉네임) | 백엔드 |
| AI 현장 요약 | 백엔드 |
| 만료 데이터 정리 | 백엔드 (매시간 cron) |
| 글 읽기, 실시간 구독, 보는 사람 수 | 프론트 → Supabase |
| 카카오 로그인, 사진 업로드 | 프론트 → Supabase |

## 4. 화면 구성

```
                 [로그인] 카카오로 시작하기
                            ↓
[검색 결과] 탭                    [실시간 게시판] 탭
  검색창                            최근 검색어별 묶음
  장소 카드 목록                      장소 목록 (글 있는 곳 최신순, 빈 곳 아래)
  장소 확인 안 된 후기 (접힘)           
        │                                  │
        └──────────── 장소 게시판 ──────────┘
                      현장 메모 + AI 요약
                      채팅 (보는 사람 N명)
                      입력창 + 빠른 태그 + 사진
```

### 4.0 로그인

- 로그인하지 않은 사용자는 어느 경로로 들어와도 로그인 화면으로 보낸다.
- 로그인 화면은 서비스 한 줄 소개와 "카카오로 시작하기" 버튼만 둔다.
- 로그인이 끝나면 원래 가려던 경로로 돌려보낸다. 공유 링크로 장소 게시판에 바로 들어온 경우에도 그 게시판으로 돌아간다.

### 4.1 검색 결과 탭

장소가 기준 단위다. 블로그 글은 별도 목록으로 두지 않고, 그 장소를 추천하는 근거로 카드에 붙인다. 두 목록을 나란히 두면 같은 장소가 양쪽에 따로 나오고, 블로그 글은 장소가 아니라서 게시판으로 연결할 수 없기 때문이다.

```
○○카페 · 양평군 ○○면 · 카페,디저트           [최근 사진]
2시간 전 · 자리 여유 · 사진
"원목 인테리어, 통창 2층" (블로그 후기 기준 한 줄)

관련 후기 3건
· 양평 우드톤 대형카페 다녀왔어요 — 블로거명 · 2026-10-28
· ...
더보기
```

- 후기는 제목, 블로거, 작성일, 원문 링크만 보여주고 요약문을 길게 옮기지 않는다.
- 카드에는 해당 장소의 최근 현장 메모 배지와 최근 사진 썸네일을 띄운다.
- 블로그에서 뽑았지만 지역 검색으로 확인되지 않은 장소는 맨 아래 "장소 확인 안 된 후기"로 접어둔다. 새로 생겼거나 폐업했을 수 있다는 안내를 같이 붙인다.
- 정렬은 관련 후기 수 기준이다.
- 탭을 오가도 마지막 검색 결과가 유지되도록 sessionStorage에 저장한다.

### 4.2 실시간 게시판 탭

정확도를 위해 내가 검색한 장소만 보여준다.

- 최근 검색 3개를 검색어별로 묶어서 보여준다.
- 검색 기록은 24시간이 지나면 지운다. 어제 검색한 장소의 "지금 상황"은 의미가 줄어든다.
- 현장 메모(`kind = 'memo'`)만 보여준다. 채팅은 장소 게시판 안에서만 보인다. 이 탭은 "지금 상황"을 훑어보는 곳이라, 장소 밖에서 보는 채팅은 잡음이 된다.
- 각 묶음 안에서 메모가 있는 장소를 최신순으로 위에, 메모가 없는 장소는 아래에 "아직 소식이 없어요 · 첫 소식을 남겨주세요"로 둔다.
- 새 메모는 Realtime 구독으로 바로 반영한다.

### 4.3 장소 게시판

메모판과 채팅을 따로 만들지 않고, 하나의 글 흐름을 두 가지 방식으로 보여준다. 초기 사용자가 적을 때 두 곳으로 나뉘면 양쪽 다 비어 보이기 때문이다.

- 태그나 사진이 붙은 글은 "현장 메모"로 분류되어 상단, AI 요약, 검색 결과 배지에 쓰인다.
- 일반 텍스트는 채팅 흐름에만 보인다.
- 사용자는 채팅하듯 쓰다가 태그를 누르거나 사진을 올리면 자동으로 메모가 된다.
- 상단에 AI 요약 한 줄, 채팅 영역에 "지금 N명이 보고 있어요"(2명 이상일 때)를 보여준다.
- 6시간이 지난 글은 흐리게 표시한다.

## 5. 검색 파이프라인

```
사용자 요청
  ↓
① Claude: 블로그 검색어 3~5개 생성
   ("경기도 외곽" → 양평, 가평, 파주, 김포, 남양주 + 분위기 키워드)
  ↓
② 네이버 블로그 검색 (검색어별 30건, 링크 기준 중복 제거)
  ↓
③ Claude: 후기에서 가게명, 지역, 분위기 한 줄, 언급한 글 번호 추출 (최대 15곳)
  ↓
④ 네이버 지역 검색 "지역 + 가게명"으로 검증
   - 결과 중 정규화한 이름이 겹치는 첫 항목을 같은 가게로 판단
   - 확인되면 주소·좌표 확보 후 places 테이블에 upsert
   - 확인 안 되면 "장소 확인 안 된 후기"로 분류
  ↓
⑤ 장소 카드 목록 + 확인 안 된 후기 반환
```

### 참고 사항

- 지역 검색은 한 번에 최대 5건이라 검증 용도로만 쓴다.
- 지역 검색 좌표(mapx, mapy)는 WGS84 값에 1e7을 곱한 정수라서 나눠서 저장한다.
- 네이버 결과의 `<b>` 태그와 HTML 엔티티는 제거한다.
- Claude 호출은 structured outputs(`output_config.format`에 JSON 스키마)로 JSON 결과를 받는다. Sonnet 5.5는 `tool_choice`로 도구를 강제하면 400을 반환해서 이 방식을 쓴다. 속도를 위해 `effort: low`.
- 한 번 검색에 Claude 2회 + 네이버 수 회 호출이라 약 10초 걸린다(실측 9~10초). 화면에 진행 안내를 띄운다.
- 분위기 한 줄은 주어진 후기 내용만 근거로 쓰게 하고 과장을 금지한다.

### 네이버 호출 한도

네이버 검색 API는 NAVER API HUB(네이버 클라우드 플랫폼)로 옮겨졌다. 예전 Developers Center 키는 쓸 수 없다.

| 항목 | 값 |
| --- | --- |
| 호출 주소 | `https://naverapihub.apigw.ntruss.com/search/v1/{blog,local}` (`.json` 없음) |
| 인증 헤더 | `X-NCP-APIGW-API-KEY-ID`, `X-NCP-APIGW-API-KEY` |
| 파라미터·응답 | 예전과 같음 (`query`, `display`, `items[]`, `mapx`/`mapy`) |
| 호출 한도 | 검색 카테고리 통합 월 775,000건. 요금표에는 "일 최대 25,000건"도 적혀 있어 일 25,000건 기준으로 잡는다 |
| 초당 한도 | 키당 50 RPS, 넘으면 429 |
| 한도 도달 | 자동 차단. 무료 기간에는 한도를 늘릴 수 없다. 50·80·100%에서 이메일 알림 |
| 키 공유 | 같은 키를 쓰는 서비스끼리 호출량이 합산된다 |

| 단계 | 검색 1회당 호출 |
| --- | --- |
| ② 블로그 | 3~5회 |
| ④ 지역 | 최대 15회 |
| 합계 | 약 20회 → 하루 약 1,250번 검색 |

- **전용 키:** 이 프로젝트 전용 앱을 등록해서 키를 받는다. 다른 서비스와 같이 쓰면 한쪽 사용량 때문에 둘 다 멈춘다.
- **지역 검색 캐시:** ④ 단계 전에 `places`에서 같은 가게를 먼저 찾고, 있으면 지역 검색을 건너뛴다. 같은 지역을 반복해서 검색하는 서비스라 호출이 크게 준다.
- **동시 호출:** ④ 단계 지역 검색은 병렬로 보내되 키당 50 RPS 아래로 묶는다. 429는 1초 뒤 한 번 재시도한다.
- **한도 초과 처리:** 월·일 한도로 차단되면 검색 전체를 실패로 처리하고 "오늘 검색 한도를 다 썼어요"를 띄운다. 이 경우를 "장소 확인 안 된 후기"로 분류하면 실제로 있는 가게도 미확인으로 보이므로 그렇게 처리하지 않는다.
- **사용자별 검색 제한:** 한 사람이 반복 검색해도 하루치 한도가 바닥날 수 있어서 넣는다. 검색은 로그인이 필수라 IP가 아니라 사용자 ID 기준으로 센다.
  - 24시간에 20회. 성공한 검색마다 `search_sessions`에 한 줄을 남기고, 최근 24시간 줄 수로 센다. 서버를 재시작해도 유지되고 검색 기록(4.2)과 같은 테이블을 쓴다.
  - 같은 사용자의 검색이 진행 중이면 새 검색을 막는다(연타·병렬 요청으로 제한 우회 방지).

### 장소 키

네이버 지역 검색 결과에는 고유 장소 ID가 없다. 상호명과 도로명 주소를 정규화(태그 제거, 공백·특수문자 제거, 소문자)해서 해시한 값을 장소 키로 쓴다.

```ts
placeKey = sha1(normalize(title) + '|' + normalize(roadAddress || address)).slice(0, 16)
```

## 6. 게시판 규칙

### 보존 기간

| 대상 | 보존 |
| --- | --- |
| 현장 메모 (태그·사진 있는 글) | 24시간 |
| 채팅 (텍스트만) | 6시간 |
| 사진 파일 | 글과 함께 삭제 |
| 검색 기록 | 24시간 |

"오늘 자정까지"가 아니라 롤링 방식이다. 자정 기준으로 하면 밤 11시에 쓴 글이 1시간 만에 사라진다. 조회 쿼리에도 24시간 조건을 걸어서, 정리 작업이 돌기 전에도 만료된 글이 보이지 않게 한다.

### 빠른 태그

긴 글 없이 버튼 한 번으로 글쓰기를 끝낼 수 있게 한다.

| 값 | 표시 |
| --- | --- |
| `seat:free` | 자리 여유 |
| `seat:normal` | 자리 보통 |
| `seat:full` | 만석 |
| `parking:free` | 주차 여유 |
| `parking:wait` | 주차 대기 |
| `waiting:yes` | 웨이팅 있음 |

프론트와 백엔드에 같은 목록을 둔다.

### 닉네임

방마다 랜덤 닉네임을 쓴다. 사용자 ID와 장소 키를 해시해서 만들기 때문에, 같은 방에서는 항상 같은 닉네임이고 방이 바뀌면 달라진다. 카카오 닉네임과 프로필 사진은 화면에 노출하지 않는다.

```
makeNickname(userId, placeKey) → "우드톤 고양이 12"
```

### 제한

- 글 300자
- 같은 사용자 3초에 1개
- 사진 1장
- 내용, 태그, 사진 중 하나는 필수

### AI 현장 요약

- 최근 6시간 글(최대 50개)을 대상으로 40자 이내 한 줄 요약
- 자리, 주차, 웨이팅 위주, 글에 없는 내용은 추측 금지
- 결과를 `place_summaries`에 캐시하고, 새 글이 3개 이상 쌓였거나 10분이 지나고 새 글이 있을 때만 다시 생성
- 글이 없으면 요약을 띄우지 않는다

## 7. 사진 처리

| 항목 | 처리 |
| --- | --- |
| 위치 정보 | 업로드 전에 canvas로 다시 그려 EXIF(GPS 포함)를 전부 제거 |
| 용량 | 긴 변 1280px, WebP 품질 0.8 |
| 촬영 시각 | EXIF 제거 전에 `DateTimeOriginal`만 읽어서 저장 |
| 오래된 사진 | 촬영 시각이 3시간 이상 지났으면 업로드 막기 |
| 촬영 시각 없음 | 허용하되 "촬영 시각" 표시 생략 |
| 카메라 | `<input type="file" accept="image/*" capture="environment">` |
| 다른 손님 얼굴 | 업로드 화면에 "다른 사람 얼굴이 나오지 않게 찍어주세요" 안내 |
| 저장 경로 | `place-photos/{userId}/{uuid}.webp`, 본인 폴더에만 업로드 가능 |
| 삭제 | DB 행만 지우면 Storage 파일이 남으므로 정리 작업에서 같이 삭제 |

EXIF 위치 정보를 지우지 않으면 위치 공유를 뺀 의미가 없어지므로 반드시 처리한다.

## 8. 인증

- Supabase Auth의 카카오 provider 사용
- 검색, 읽기, 쓰기 모두 로그인이 필요하다. 사용자 ID가 항상 있으므로 검색 제한, 검색 기록, 닉네임을 모두 사용자 기준으로 단순하게 처리할 수 있고, 네이버·Claude 호출 비용을 익명 사용자가 쓰는 일도 막는다.
- Supabase 카카오 provider는 `account_email`을 항상 요청한다. "Allow users without an email"을 켜거나 `scopes`를 따로 넘겨도 빠지지 않는다(직접 확인). 카카오 앱에 이메일 동의항목이 없으면 로그인 시 KOE205 에러가 난다.
- 그래서 카카오 앱을 **개인 개발자 비즈 앱**으로 전환하고 이메일을 **선택 동의**로 둔다. 사용자는 동의 화면에서 이메일 제공을 해제할 수 있다.
- 이메일을 받더라도 서비스에서는 쓰지 않는다. 화면 노출, 알림 발송, 식별 모두 Supabase 사용자 ID로만 한다. Supabase "Allow users without an email"은 켜두어 이메일 없이도 가입되게 한다.
- 이메일을 아예 받지 않으려면 Supabase 기본 카카오 provider 대신, 백엔드에서 카카오 OIDC로 ID 토큰을 받아 `signInWithIdToken`으로 로그인시켜야 한다. 코드와 관리 부담이 커서 지금은 하지 않는다.
- 백엔드는 모든 API에서 프론트가 보낸 Supabase access token을 `auth.getUser(token)`으로 검증한다. 공유 미리보기(`GET /share/:placeKey`)만 예외다.
- 프론트가 Supabase에서 직접 읽을 때도 로그인 세션(authenticated 역할)으로 읽는다. 로그인하지 않은 anon 역할에는 테이블 권한을 주지 않는다.

### 카카오 디벨로퍼스 설정

1. 앱 생성 → 카카오 로그인 사용 설정 ON
2. 앱 → 플랫폼 키 → REST API 키: 카카오 로그인 리다이렉트 URI에 `https://<project>.supabase.co/auth/v1/callback` 등록, 클라이언트 시크릿 생성 후 활성화
3. 개인 개발자 비즈 앱 전환 (본인인증)
4. 동의항목: 닉네임 필수, 프로필 사진 선택, 카카오계정(이메일) 선택

### Supabase 설정

- Authentication → Sign In / Providers → Kakao: REST API 키, 클라이언트 시크릿, Allow users without an email ON
- Authentication → URL Configuration: Site URL `http://localhost:5173`, Redirect URLs `http://localhost:5173/**` (배포 시 실제 도메인 추가)

## 9. 데이터 모델

```sql
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

-- 검색 기록
create table public.search_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  place_keys text[] not null,
  created_at timestamptz not null default now()
);
```

### RLS

| 테이블 | 읽기 | 쓰기 |
| --- | --- | --- |
| places | 로그인 사용자 | 백엔드(service role) |
| place_posts | 로그인 사용자, 24시간 이내 글만 | 백엔드(service role) |
| place_summaries | 로그인 사용자 | 백엔드(service role) |
| search_sessions | 본인만 | 본인만 |
| storage `place-photos` | 공개 (추측하기 어려운 uuid 경로) | 로그인 사용자, 본인 폴더만 |

anon 역할에는 테이블 권한을 주지 않는다. 마이그레이션은 `supabase/migrations/`에 둔다.

```sql
create policy "recent posts readable" on public.place_posts
  for select to authenticated
  using (created_at > now() - interval '24 hours');

create policy "upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'place-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

alter publication supabase_realtime add table public.place_posts;
```

## 10. API

모든 API는 `Authorization: Bearer <supabase access token>`이 필요하다. 없거나 만료되면 401을 반환한다.

### `POST /search`

요청

```json
{ "query": "우드톤 분위기 경기도 외곽 대형 카페" }
```

응답

```json
{
  "query": "우드톤 분위기 경기도 외곽 대형 카페",
  "places": [
    {
      "placeKey": "fa1ce1c05c6ca217",
      "name": "○○카페",
      "category": "카페,디저트>카페",
      "address": "경기도 양평군 ...",
      "roadAddress": "경기도 양평군 ...",
      "lat": 37.5,
      "lng": 127.4,
      "telephone": "",
      "link": "",
      "summary": "원목 인테리어, 통창 2층",
      "blogs": [
        {
          "title": "양평 우드톤 대형카페 다녀왔어요",
          "link": "https://blog.naver.com/...",
          "snippet": "...",
          "blogger": "블로거명",
          "postdate": "2026-10-28"
        }
      ]
    }
  ],
  "unmatched": [
    { "name": "△△카페", "area": "김포", "summary": "강 뷰 원목 카페", "blogs": [] }
  ]
}
```

| 상황 | 응답 |
| --- | --- |
| 검색어가 2~100자가 아님 | 400 |
| 24시간 검색 20회 초과 | 429 `{ "code": "USER_LIMIT" }` |
| 같은 사용자의 검색이 진행 중 | 429 `{ "code": "IN_PROGRESS" }` |
| 네이버 일·월 한도 차단 | 503 `{ "code": "NAVER_QUOTA" }` → "오늘 검색 한도를 다 썼어요" |

### `POST /places/:placeKey/posts`

```json
{
  "body": "창가 자리 두 개 비었어요",
  "tags": ["seat:free"],
  "imagePath": "{userId}/{uuid}.webp",
  "photoTakenAt": "2026-11-09T01:20:00.000Z"
}
```

| 상황 | 응답 |
| --- | --- |
| 300자 초과, 알 수 없는 태그, 남의 폴더 사진 경로, 내용 없음 | 400 |
| 로그인 없음 또는 만료 | 401 |
| 없는 장소 | 404 |
| 3초 안에 연속 전송 | 429 |

### `GET /places/:placeKey/summary`

```json
{ "summary": "2층은 여유, 주차는 30분 대기", "generatedAt": "2026-11-09T01:30:00.000Z" }
```

글이 없으면 `summary: null`.

## 11. 실시간

| 용도 | 방식 |
| --- | --- |
| 장소 게시판 새 글 | `postgres_changes` INSERT, `place_key=eq.{key}` |
| 실시간 게시판 탭 새 메모 | `postgres_changes` INSERT, `place_key=in.(k1,k2,...)`, 받은 뒤 `kind = 'memo'`만 표시 |
| 보는 사람 수 | Presence, 채널 `place:{key}` |

`in` 필터는 값 100개까지 받으므로 검색 3개 분량(보통 20~30곳)이면 충분하다. 새 검색을 하면 구독 대상 목록만 바꾼다.

## 12. 정리 작업 (백엔드 매시간)

1. 24시간 지난 글 조회 → 사진 경로 모아서 Storage에서 삭제 → 글 삭제
2. 6시간 지난 채팅(`kind = 'chat'`) 삭제
3. 24시간 지난 검색 기록 삭제

## 13. 환경 변수

### 백엔드

```
PORT=4000
WEB_ORIGIN=http://localhost:5173
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-sonnet-5-5
NAVER_CLIENT_ID=       # NAVER API HUB Client ID → X-NCP-APIGW-API-KEY-ID
NAVER_CLIENT_SECRET=   # NAVER API HUB Client Secret → X-NCP-APIGW-API-KEY
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### 프론트엔드

```
VITE_APP_API_URL=http://localhost:4000   # 개발 시 /api 프록시 대상
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## 14. 개발 순서

1. 카카오 로그인: 로그인 화면, 라우트 가드, 백엔드 토큰 검증 가드
2. 검색 파이프라인 (블로그 → Claude 추출 → 지역 검색 검증) + 검색 결과 탭, 지역 검색 캐시, 한도 초과 처리, 사용자별 검색 제한, 장소 키 생성, places 저장, 검색 기록 저장
3. 장소 게시판: 글쓰기, 빠른 태그, 실시간 구독
4. 실시간 게시판 탭: 검색어별 묶음
5. 사진 업로드 (EXIF 제거, 촬영 시각 확인) + 정리 작업
6. AI 현장 요약

앞 단계만으로도 서비스가 돌아가도록 이 순서로 붙인다.

## 15. 다음 단계

- 신고·차단: 메시지 단위 신고, 사용자 차단 목록. 실제 사용자가 생기면 가장 먼저 필요하다.
- 업주 홍보 글 규칙 또는 업주 공식 계정
- Claude 비전으로 사진 보고 태그 추천 + 부적절 이미지 1차 필터
- 장소 카드와 게시판에 네이버 지도 표시 (좌표는 이미 저장됨)
- 얼굴 자동 블러 (MediaPipe 등)
- 카카오톡 공유 미리보기: SPA는 장소별 OG 태그를 줄 수 없으므로, 백엔드 `GET /share/:placeKey`가 OG 메타가 담긴 HTML을 내려주고 프론트 장소 게시판으로 리다이렉트한다.
