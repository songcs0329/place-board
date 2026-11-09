# place-board-front

장소 메모판 프론트엔드. Vite + React 19 SPA, TypeScript, Tailwind CSS v4, TanStack Query, Supabase JS, Swiper.

설계는 [`../PLACE_BOARD_DESIGN.md`](../PLACE_BOARD_DESIGN.md), 코드 구조와 규칙은 [`CLAUDE.md`](./CLAUDE.md)를 따른다.

## 실행

```bash
cp .env.example .env   # 아래 환경 변수 채우기
npm install
npm run dev            # http://localhost:5173
```

서버(`../place-board-server`)를 먼저 띄워야 검색·글쓰기·요약이 동작한다.

## 환경 변수

| 이름 | 값 |
| --- | --- |
| `VITE_APP_API_URL` | NestJS 서버 주소. 개발 서버가 `/api/*` 요청을 이 주소로 프록시한다 (예: `http://localhost:4000`) |
| `VITE_SUPABASE_URL` | Supabase Project URL (`https://<id>.supabase.co`, 뒤에 `/rest/v1` 붙이지 않음) |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable 키 (`sb_publishable_...`). secret 키는 절대 넣지 않는다 |

Supabase **Authentication → URL Configuration**의 Redirect URLs에 `http://localhost:5173/**`가 있어야 카카오 로그인 후 돌아온다.

## 명령어

| 명령 | 내용 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 체크 + 프로덕션 빌드 (`dist/`) |
| `npm run lint` | ESLint + Prettier 검사 |
| `npm run preview` | 빌드 결과 미리보기 |
| `node scripts/exif-check.ts` | 사진 촬영 시각(EXIF) 읽기 검증 |

## 화면

| 경로 | 페이지 | 내용 |
| --- | --- | --- |
| `/login` | `Login` | 카카오로 시작하기. 그 밖의 모든 화면은 로그인이 필요하다 |
| `/search` | `Search` | 분위기 검색, 장소 카드(최근 메모 배지·사진), 관련 후기 (`/`는 여기로 이동) |
| `/live` | `Live` | 실시간 게시판: 최근 검색 3개 중 현장 메모가 있는 장소 |
| `/places/:placeKey` | `Places` | 장소 게시판: AI 요약, 현장 메모(가로 스와이프), 채팅, 글쓰기·사진·태그, 신고·차단 |

## 구조

```
src/
├── pages/                 라우트 단위 화면 (파일명 = 라우트 이름)
├── components/
│   ├── search/            Search 전용 (PlaceCard, BlogList)
│   ├── places/            Places 전용 (Composer, PhotoPreview, PostActions)
│   ├── layouts/           라우트 가드(RequireAuth), 하단 탭(TabLayout)
│   └── commons/           여러 페이지 공용 (TagBadge)
├── hooks/                 TanStack Query 훅, Realtime 구독
└── libs/
    ├── apis/              restClient(axios, /api, 토큰 자동 첨부), apiManager
    ├── types/             ApiRequest, ApiResponse, Db 전역 타입
    ├── utils/             cn, storageUtils, time
    ├── supabase.ts        Supabase 클라이언트 (publishable 키)
    ├── tags.ts            빠른 태그 목록·색 (서버와 같은 목록)
    ├── exif.ts            촬영 시각 읽기
    └── photo.ts           EXIF 제거·리사이즈·업로드
```

## 알아 둘 점

- **`/api` 프록시는 개발 서버에서만 동작한다.** 배포할 때는 호스팅에서 `/api/*`를 서버로 넘기는 rewrite를 설정해야 한다 (`../DEPLOY_PLAN.md`).
- **SPA fallback:** 배포할 때 모든 경로를 `index.html`로 돌려야 한다. 없으면 카카오 로그인 후 돌아오는 경로나 공유 링크가 404가 난다.
- **작성자 user_id는 읽지 않는다.** DB 권한상 읽을 수도 없다. 게시글은 컬럼을 적어서 조회한다 (`select('*')` 불가).
- **실시간:** 비공개 채널 `place:{key}`로 새 글 알림(`{ id, place_key, kind }`)을 받고, id로 다시 조회한다. 차단·신고한 글은 DB 정책이 걸러준다.
