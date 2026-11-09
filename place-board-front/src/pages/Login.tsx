import { Navigate, useLocation } from 'react-router';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/libs/supabase';

function Login() {
  const session = useSession();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';

  if (session === undefined) return null;
  if (session) return <Navigate to={from} replace />;

  const signIn = () =>
    supabase.auth.signInWithOAuth({
      provider: 'kakao',
      // 로그인 후 원래 가려던 경로로 (Supabase Redirect URLs에 허용돼 있어야 함)
      options: { redirectTo: window.location.origin + from },
    });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-stone-50 px-4 text-zinc-900">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-bold">장소 메모판</h1>
        <p className="text-sm text-zinc-600">분위기로 장소를 찾고, 지금 자리·주차·웨이팅을 확인하세요</p>
      </div>
      <button
        type="button"
        onClick={signIn}
        className="h-12 w-full max-w-xs rounded-xl bg-[#FEE500] text-[15px] font-semibold text-black/85 hover:brightness-95"
      >
        카카오로 시작하기
      </button>
    </main>
  );
}

export default Login;
