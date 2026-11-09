# place-board-front

장소 메모판 프론트엔드 (Vite + React SPA). 설계는 `../place-board-design.md` 참고.

```bash
cp .env.example .env   # Supabase URL / anon key 채우기
npm install
npm run dev            # http://localhost:5173, /api → VITE_APP_API_URL(NestJS) 프록시
```

배포 시 모든 경로를 `index.html`로 돌리는 SPA fallback을 설정한다.
