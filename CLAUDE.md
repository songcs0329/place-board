# CLAUDE.md

장소 메모판 모노레포. 설계는 `place-board-design.md`, 프론트는 `place-board-front/`(CLAUDE.md 참고), 백엔드는 `place-board-server/`(AGENTS.md 참고).

## 코드 규칙 (front, server 공통)

### 이름에 약어를 쓰지 않는다

변수, 함수 인자, 콜백 인자, 프로퍼티, 함수 이름을 모두 풀어 쓴다. 읽는 사람이 뜻을 추측하지 않게 하기 위해서다.

| 쓰지 않음 | 씀 |
| --- | --- |
| `e`, `err` | `event`, `error` |
| `res`, `req` | `response`, `request` |
| `qc` | `queryClient` |
| `db` | `supabase` (클라이언트), `database` |
| `msg`, `btn`, `img`, `idx`, `cnt` | `message`, `button`, `image`, `index`, `count` |
| `p`, `s`, `t`, `b` 같은 한 글자 콜백 인자 | `place`, `search`, `tag`, `blog` |
| `cfg`, `ctx`, `bmp`, `env` | `config`, `context`, `bitmap`, `environment` |

예외: 그 자체로 표준 용어인 `id`, `url`, `api`, `uuid`, `html`, `json`, `exif`, `sql`, 외부 라이브러리·API가 정한 이름(네이버 응답의 `mapx`, `bloggername` 등), DB 컬럼명(`place_key` 등).
