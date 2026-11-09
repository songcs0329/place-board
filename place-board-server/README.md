# place-board-server

장소 메모판 API 서버. NestJS 12 (ESM), TypeScript, Vitest, oxlint.

외부 API 키(Anthropic, NAVER)와 Supabase service role 키를 갖고, 검색 파이프라인·글쓰기·AI 요약·신고·차단·만료 데이터 정리를 맡는다. 설계는 [`../PLACE_BOARD_DESIGN.md`](../PLACE_BOARD_DESIGN.md).

## 실행

```bash
cp .env.example .env   # 아래 환경 변수 채우기
npm install
npm run start:dev      # http://localhost:4000 (코드를 바꾸면 자동 재시작)
```

## 환경 변수

| 이름 | 값 |
| --- | --- |
| `PORT` | 기본 `4000` |
| `WEB_ORIGIN` | CORS 허용 출처 (프론트 주소, 예: `http://localhost:5173`) |
| `ANTHROPIC_API_KEY` | Claude API 키. 이 서비스 전용 워크스페이스와 지출 한도를 걸어두는 것을 권장 |
| `CLAUDE_MODEL` | 기본 `claude-sonnet-5-5` |
| `NAVER_CLIENT_ID` | NAVER API HUB Client ID → `X-NCP-APIGW-API-KEY-ID` 헤더 |
| `NAVER_CLIENT_SECRET` | NAVER API HUB Client Secret → `X-NCP-APIGW-API-KEY` 헤더 |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret 키 (`sb_secret_...`). RLS를 우회하므로 서버에만 둔다 |

## API

모든 API는 `Authorization: Bearer <Supabase access token>`이 필요하다 (전역 `AuthGuard`). 없거나 만료되면 401.

| 메서드·경로 | 내용 |
| --- | --- |
| `POST /search` | 검색어(2~100자) → 장소 카드 + 확인 안 된 후기. 24시간 20회 제한(429 `USER_LIMIT`), 진행 중 중복 검색 차단(429 `IN_PROGRESS`), 네이버 한도 초과 503 `NAVER_QUOTA` |
| `POST /places/:placeKey/posts` | 글쓰기 (300자, 정해진 태그, 본인 폴더 사진, 3시간 지난 사진 거부). 3초 연속 전송 429 `TOO_FAST`. 저장 후 비공개 채널 `place:{key}`로 알림 Broadcast |
| `GET /places/:placeKey/summary` | AI 현장 요약 (최근 6시간 글 → 40자 한 줄, `place_summaries` 캐시). 글이 없으면 `summary: null` |
| `POST /posts/:postId/report` | 신고 (`spam`·`abuse`·`privacy`·`etc`). 3명이 신고하면 모두에게 숨김. 204 |
| `POST /posts/:postId/block-author` | 그 글 작성자를 차단 (모든 장소에서 나에게 숨김). 204 |

응답과 Broadcast에 작성자 `user_id`는 절대 포함하지 않는다.

## 정리 작업

`CleanupService`가 매시간 정각에 돈다 (`@nestjs/schedule`).

1. 24시간 지난 글: Storage 사진을 먼저 지우고 글을 지운다.
2. 6시간 지난 채팅을 지운다.
3. 24시간 지난 검색 기록을 지운다.

## 명령어

| 명령 | 내용 |
| --- | --- |
| `npm run start:dev` | 개발 서버 (watch) |
| `npm run build` | `dist/`로 빌드 |
| `npm run start:prod` | `node dist/main` |
| `npm test` | 단위 테스트 (장소 키·텍스트 정규화, 글 입력 검증·닉네임, 요약 재생성 규칙, 인증 가드) |
| `npm run test:e2e` | 토큰 없이 요청하면 401인지 |
| `npm run lint` | oxlint |

## 구조

```
src/
├── main.ts                  CORS(WEB_ORIGIN), PORT
├── app.module.ts            전역 AuthGuard, 컨트롤러·서비스 등록
├── auth.guard.ts            Supabase 토큰 검증, @CurrentUser()
├── supabase.ts              service role 클라이언트
├── cleanup.service.ts       매시간 정리 작업
├── search/                  검색 파이프라인 (NaverService, ClaudeService, SearchService, 텍스트 정규화)
├── posts/                   글쓰기, 입력 검증, 방별 닉네임
├── summary/                 AI 현장 요약, 재생성 규칙
└── moderation/              신고·차단
```

## 알아 둘 점

- **서버는 한 대만 띄운다.** 초당 네이버 호출 제한, 같은 사용자 동시 검색 차단, 요약 동시 요청 합치기를 프로세스 메모리로 처리한다. 여러 대로 늘리려면 Redis 같은 공유 저장소로 바꿔야 한다 (코드의 `ponytail:` 주석 참고).
- **NestJS ESM:** 상대 import는 `.js`로 끝난다. Nest 관련 안내는 `AGENTS.md`.
