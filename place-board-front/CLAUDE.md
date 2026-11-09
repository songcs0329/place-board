# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 명령어

```bash
npm run dev       # 개발 서버 실행
npm run build     # tsc -b && vite build
npm run lint      # eslint 검사
npm run preview   # 프로덕션 빌드 미리보기
```

제출 전 검증: `npm run lint && npm run build`

## 아키텍처

장소 메모판 프론트엔드 (Vite + React SPA). 설계는 `../PLACE_BOARD_DESIGN.md`를 따른다. 백엔드(NestJS) 호출은 `restClient`/`apiManager`, Supabase 읽기·Realtime·Presence·로그인·Storage는 `src/libs/supabase.ts` 클라이언트로 직접 한다.

### 진입점

- `src/main.tsx` — 앱 마운트, `QueryClientProvider` 래핑 (staleTime: 60s, retry: 1)
- `src/App.tsx` — `BrowserRouter` + `Routes`; 모든 라우트 정의

### 레이어 구조

| 레이어 | 경로 | 역할 |
|---|---|---|
| Pages | `src/pages/` | 라우트 단위 화면; 도메인 하위 폴더는 `index.tsx` 사용 |
| Components | `src/components/{페이지}/` | 한 페이지에서만 쓰는 UI. 폴더명은 페이지 이름 소문자 (예: `search/`, `places/`) |
| Layouts | `src/components/layouts/` | 라우트를 감싸는 컴포넌트 (라우트 가드, 탭 레이아웃) |
| Commons | `src/components/commons/` | 두 페이지 이상에서 쓰는 UI. 생기면 그때 만든다 |
| Hooks | `src/hooks/` | API 훅: `use` + apiManager 메소드명 (예: `getTodo` → `useGetTodo`); 로직 훅: 성격별 접미사 (예: 폼 → `useXxxForm`) |
| Stores | `src/stores/` | Zustand — 여러 페이지에서 공유되는 상태에만 사용 |
| API client | `src/libs/apis/restClient.ts` | Axios 인스턴스, `/api` → `VITE_APP_API_URL` 프록시 |
| API methods | `src/libs/apis/apiManager.ts` | `restClient` 호출 도메인 함수, `ApiResponse.*`로 타입 지정 |
| Types | `src/libs/types/` | 전역 타입 선언 (예: `ApiResponse` 네임스페이스) |
| Utils | `src/libs/utils/` | `cn()` (clsx + tailwind-merge), `storageUtils` |

### 데이터 흐름

```
Page/Component → useXxx hook → apiManager.getXxx() → restClient.get<ApiResponse.Xxx>()
```

`restClient`는 항상 `{ status, data }`를 반환한다. TanStack Query 훅은 `src/hooks/`에 위치하며, 리소스(목록/상세)나 mutation별로 분리한다.

### 스타일링

TailwindCSS v4 (`@tailwindcss/vite` 플러그인으로 로드). 조건부 클래스는 `src/libs/utils/cn.ts`의 `cn()`을 사용한다.

### 경로 별칭

`@`는 `src/`로 해석된다 — `vite.config.ts`와 `tsconfig.json` 양쪽에 설정되어 있다.

### 새 과제 시작 시

1. `App.tsx`의 예제 라우트를 도메인 라우트로 교체
2. `src/libs/types/`에 응답 타입 정의
3. `apiManager.ts`에 API 함수 추가
4. `src/hooks/`에 TanStack Query 훅 작성
5. 페이지 구현; 여러 화면에서 공유되는 경우에만 Zustand 사용
6. 로딩 / 에러 / 빈 데이터 / 잘못된 파라미터 상태 명시적으로 처리
7. 제출 전 과제와 무관한 예제 코드 제거
