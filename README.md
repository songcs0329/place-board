# 장소 메모판 (place-board)

"우드톤 분위기 경기도 외곽 대형 카페"처럼 분위기로 장소를 찾고, 찾은 장소마다 붙은 게시판에서 지금 상황(자리, 주차, 웨이팅)을 확인하는 모바일 웹 서비스.

- 검색: Claude가 네이버 블로그 후기에서 가게를 뽑고, 네이버 지역 검색으로 실제 있는 곳인지 확인한다.
- 게시판: 장소마다 현장 메모(태그·사진)와 채팅. 24시간 뒤 사라지고, 새 글은 실시간으로 뜬다.
- AI 현장 요약: 최근 글을 한 줄로 요약해 게시판 위에 띄운다.

설계 전체는 [`PLACE_BOARD_DESIGN.md`](./PLACE_BOARD_DESIGN.md), 배포 계획은 [`DEPLOY_PLAN.md`](./DEPLOY_PLAN.md).

## 구성

```
place-board/
├── place-board-front/     Vite + React SPA (Tailwind, TanStack Query, Supabase JS)
├── place-board-server/    NestJS API (검색 파이프라인, 글쓰기, 요약, 신고·차단, 정리 작업)
├── supabase/migrations/   DB 스키마·RLS·Storage·Realtime 정책 (순서대로 적용)
├── PLACE_BOARD_DESIGN.md  설계 문서
├── DEPLOY_PLAN.md         배포 계획
└── CLAUDE.md              코드 규칙 (이름 약어 금지 등)
```

| 역할 | 담당 |
| --- | --- |
| 검색, 글쓰기, AI 요약, 신고·차단, 만료 데이터 정리 | 서버 (외부 API 키와 Supabase service role 키는 서버에만) |
| 글 읽기, 실시간 구독, 보는 사람 수, 카카오 로그인, 사진 업로드 | 프론트 → Supabase 직접 |

외부 서비스: Supabase (Postgres, Auth, Realtime, Storage), 카카오 로그인, NAVER API HUB 검색, Claude API.

## 로컬 실행

필요한 것: Node.js 24, Supabase 프로젝트, 카카오 디벨로퍼스 앱, NAVER API HUB 검색 키, Anthropic API 키. 외부 서비스 설정 방법은 설계 문서 8장(인증)과 각 README를 참고한다.

1. **DB:** Supabase SQL Editor에서 `supabase/migrations/`의 파일을 이름 순서대로 실행한다.

   | 파일 | 내용 |
   | --- | --- |
   | `20261109000000_init.sql` | 테이블 4개, RLS, 권한 |
   | `20261109010000_place_photos.sql` | 사진 Storage 버킷과 업로드 정책 |
   | `20261109020000_hide_post_user_id.sql` | 작성자 user_id 숨김, 비공개 Realtime 채널 정책 |
   | `20261109030000_reports_and_blocks.sql` | 신고·차단 |

2. **서버:** [`place-board-server/README.md`](./place-board-server/README.md) → `http://localhost:4000`
3. **프론트:** [`place-board-front/README.md`](./place-board-front/README.md) → `http://localhost:5173`

## 개발 규칙

- git 저장소는 루트 하나(모노레포). 의존성은 폴더마다 따로 설치한다.
- 이름에 약어를 쓰지 않는다 (`CLAUDE.md`).
- DB를 바꿀 때는 `supabase/migrations/`에 새 파일을 추가하고, 설계 문서도 같이 고친다.
- 제출 전 확인: 프론트 `npm run lint && npm run build`, 서버 `npm run lint && npm test`.
