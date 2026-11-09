# 배포 계획

장소 메모판을 실제 도메인에 올리기 위한 계획. 아직 실행 전이며, 순서대로 체크하며 진행한다.

## 1. 목표 구성

```
사용자 브라우저
   │  https://<도메인>
   ▼
[Vercel] 프론트 SPA ──── /api/* rewrite ────▶ [Railway] NestJS 서버 (1대, 항상 켜짐)
   │                                              │
   │ 읽기·Realtime·로그인·사진 업로드               │ 쓰기·검색·요약·정리 작업
   ▼                                              ▼
[Supabase 운영 프로젝트] Postgres · Auth(카카오) · Realtime · Storage
                                                  │
                                       NAVER API HUB · Claude API
```

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 프론트 | **Vercel** | 외부 주소로 넘기는 rewrite(`/api/*` → 서버)와 SPA fallback을 설정 파일 하나로 처리한다. 같은 출처로 API를 부르므로 CORS 문제가 없다 |
| 서버 | **Railway** (대안: Fly.io) | 매시간 정리 작업(cron)이 돌려면 항상 켜져 있어야 한다. 잠자는 무료 플랜(예: Render 무료)은 cron이 멈추고 첫 요청이 느려서 맞지 않는다 |
| DB·인증·실시간·파일 | **Supabase 운영 프로젝트 새로 생성** | 개발 데이터·키와 분리한다. 개발용 프로젝트는 그대로 둔다 |

**서버는 반드시 1대로 운영한다.** 네이버 초당 호출 제한, 같은 사용자 동시 검색 차단, 요약 동시 요청 합치기가 프로세스 메모리에 있다. 자동 확장(autoscaling)은 끈다.

## 2. 배포 전에 필요한 코드 변경

| # | 변경 | 이유 |
| --- | --- | --- |
| 1 | `place-board-front/vercel.json` 추가: `/api/(.*)` → `https://<서버 주소>/$1` rewrite, 나머지 경로 → `/index.html` | 지금 `/api` 프록시는 Vite 개발 서버에서만 동작한다. SPA fallback이 없으면 카카오 로그인 후 돌아오는 경로와 공유 링크가 404 |
| 2 | 서버에 로그인 없이 부를 수 있는 `GET /health` 추가 (전역 AuthGuard 예외 데코레이터) | 호스팅의 헬스 체크용. 지금은 모든 경로가 401이라 헬스 체크가 실패한다 |
| 3 | Node 버전 고정 (`engines: { node: ">=24" }` 또는 `.nvmrc`) | 로컬(Node 24)과 호스팅의 런타임을 맞춘다. 서버 스크립트가 Node 기본 TS 실행 등에 기대지는 않지만 차이를 없앤다 |
| 4 | (선택) 서버 로그를 JSON 한 줄 형식으로 | 호스팅 로그 검색이 쉬워진다. 지금은 Nest 기본 로거 |

## 3. 외부 서비스 설정

### Supabase (운영 프로젝트)

- [ ] 새 프로젝트 생성: 리전 **Northeast Asia (Seoul)**, "Automatically expose new tables" 끄기, "Enable automatic RLS" 켜기
- [ ] SQL Editor에서 마이그레이션 4개를 이름 순서대로 실행
  - `20261109000000_init.sql` → `20261109010000_place_photos.sql` → `20261109020000_hide_post_user_id.sql` → `20261109030000_reports_and_blocks.sql`
- [ ] Authentication → Sign In / Providers → Kakao: REST API 키, 클라이언트 시크릿, **Allow users without an email** 켜기
- [ ] Authentication → URL Configuration: Site URL `https://<도메인>`, Redirect URLs `https://<도메인>/**` (Vercel 미리보기 주소를 쓸 거면 그 패턴도)
- [ ] Realtime → Settings: 공개 채널 접근(Allow public access) 끄기 — 앱은 비공개 채널만 쓴다
- [ ] 무료 플랜은 일주일 동안 요청이 없으면 프로젝트가 일시 중지된다. 실제 공개라면 유료 플랜 또는 백업 정책을 정한다

### 카카오 디벨로퍼스

- [ ] 운영 Supabase의 콜백 `https://<운영 프로젝트 id>.supabase.co/auth/v1/callback`을 카카오 로그인 리다이렉트 URI에 추가 (개발용은 남겨둠)
- [ ] 앱 이름·아이콘 정리 (동의 화면에 그대로 보임)
- [ ] 개인정보처리방침 URL 등록 (아래 5번)
- [ ] 동의항목 재확인: 닉네임 필수, 프로필 사진 선택, 이메일 선택

### NAVER API HUB

- [ ] **운영 전용 앱(키)** 을 따로 발급한다. 같은 키를 개발과 같이 쓰면 호출량이 합산되어, 개발 중 사용량 때문에 운영 검색이 막힐 수 있다
- [ ] 한도(일 25,000건 기준) 알림 메일 수신자 확인

### Anthropic (Claude API)

- [ ] Console에서 운영용 워크스페이스와 키 발급, 월 지출 한도 설정
- [ ] 잔여 크레딧 알림 설정

## 4. 환경 변수

| 변수 | 어디에 | 값 |
| --- | --- | --- |
| `VITE_APP_API_URL` | Vercel | 운영에서는 쓰지 않음 (rewrite가 처리). 비워둬도 된다 |
| `VITE_SUPABASE_URL` | Vercel | 운영 Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel | 운영 publishable 키 |
| `PORT` | Railway | 호스팅이 주는 값 사용 (보통 자동 주입) |
| `WEB_ORIGIN` | Railway | `https://<도메인>` |
| `ANTHROPIC_API_KEY` | Railway | 운영 키 |
| `CLAUDE_MODEL` | Railway | `claude-sonnet-5-5` |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | Railway | 운영 전용 키 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Railway | 운영 Project URL / secret 키 |

`VITE_*`는 빌드할 때 번들에 박히므로 값을 바꾸면 프론트를 다시 배포해야 한다. secret 키는 Vercel에 절대 넣지 않는다.

## 5. 공개 전에 남은 작업

| 작업 | 이유 |
| --- | --- |
| 개인정보처리방침 페이지 | 카카오 로그인(닉네임, 선택 이메일), 사진 업로드, 게시글 보관 기간을 고지해야 한다. 카카오 앱 설정에도 URL이 필요하다 |
| 카카오 연결 끊기 웹훅 | 사용자가 카카오에서 연결을 끊으면 계정과 글·신고·차단 기록을 지운다 (Supabase 사용자 삭제 시 cascade로 대부분 정리됨) |
| 차단 해제 화면 | 지금은 차단을 되돌릴 방법이 없다 |
| 업로드 고아 사진 정리 | 업로드 후 글쓰기가 실패한 사진이 Storage에 남는다 (설계 12장) |

## 6. 진행 순서

1. [ ] 2번 코드 변경 (vercel.json, `/health`, Node 버전) → 커밋
2. [ ] Supabase 운영 프로젝트 생성·마이그레이션·Auth·Realtime 설정
3. [ ] NAVER 운영 키, Anthropic 운영 키 발급
4. [ ] Railway에 서버 배포 (루트 디렉터리 `place-board-server`, 빌드 `npm run build`, 시작 `npm run start:prod`, 헬스 체크 `/health`, 인스턴스 1대) → 서버 주소 확인
5. [ ] `vercel.json`에 서버 주소 반영 → Vercel에 프론트 배포 (루트 디렉터리 `place-board-front`, 빌드 `npm run build`, 출력 `dist`)
6. [ ] 도메인 연결 (Vercel), Supabase URL Configuration·카카오·`WEB_ORIGIN`을 최종 도메인으로 갱신
7. [ ] 아래 7번 점검
8. [ ] 5번 남은 작업 처리 후 공개

## 7. 배포 후 점검

- [ ] `https://<도메인>/places/<아무 키>`로 바로 들어가면 로그인 화면 → 로그인 후 그 경로로 돌아온다 (SPA fallback·리다이렉트)
- [ ] 카카오 로그인 (이메일 동의 해제해도 가입되는지)
- [ ] 검색 1회: 10초 안팎, 장소 카드와 후기, 같은 검색 재실행 시 지역 검색 캐시
- [ ] 장소 게시판: 태그 메모·채팅·사진 업로드(EXIF 제거, 촬영 시각), 탭 두 개로 실시간 반영과 "N명이 보고 있어요"
- [ ] 실시간 게시판 탭에 새 메모 반영
- [ ] AI 요약 표시
- [ ] 다른 계정으로 신고·차단 → 글이 사라지는지
- [ ] 서버 로그에서 매시간 "정리: 글 n, 채팅 n, 검색 기록 n" 확인
- [ ] 토큰 없이 `/api/search` → 401, 로그인 안 한 상태로 비공개 채널 구독 거부

## 8. 문제가 생기면

- 프론트: Vercel에서 이전 배포로 즉시 되돌린다 (Instant Rollback).
- 서버: Railway에서 이전 배포로 되돌린다.
- DB: 마이그레이션은 앞으로만 진행한다. 되돌려야 하면 되돌리는 마이그레이션을 새로 만든다. 큰 변경 전에는 Supabase 백업을 확인한다.
- 비용 이상: Anthropic 지출 한도, NAVER 한도 알림, Supabase 사용량 화면을 먼저 본다. 급하면 서버만 내려도 검색·요약 호출이 멈춘다.
