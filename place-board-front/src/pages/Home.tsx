import { useGetMe } from '@/hooks/useGetMe';
import { supabase } from '@/libs/supabase';

// ponytail: 로그인 확인용 임시 화면, 2단계에서 검색 결과 탭으로 교체
function Home() {
  const me = useGetMe();

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-stone-50 px-4 py-8 text-zinc-900">
      <h1 className="text-2xl font-bold">장소 메모판</h1>
      <p className="text-sm text-zinc-600">
        {me.isPending && '서버 확인 중…'}
        {me.isError && '서버 인증 실패'}
        {me.isSuccess && `서버 인증 성공 · ${me.data.data.id}`}
      </p>
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="h-11 w-fit rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700"
      >
        로그아웃
      </button>
    </main>
  );
}

export default Home;
