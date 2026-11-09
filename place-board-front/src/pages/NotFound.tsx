import { Link } from 'react-router';

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5 py-8 text-zinc-900 sm:px-8">
      <section className="w-full max-w-xl rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-emerald-700">404 Not Found</p>
        <h1 className="mt-3 text-2xl font-bold tracking-normal text-zinc-950 sm:text-3xl">페이지를 찾을 수 없습니다</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          요청한 주소가 잘못되었거나, 아직 등록되지 않은 라우트입니다. 홈에서 사용 가능한 예제를 다시 선택해 주세요.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          홈으로 돌아가기
        </Link>
      </section>
    </main>
  );
}

export default NotFound;
