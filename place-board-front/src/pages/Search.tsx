import { useState } from 'react';
import { isAxiosError } from 'axios';
import BlogList from '@/components/BlogList';
import PlaceCard from '@/components/PlaceCard';
import { useLatestMemos } from '@/hooks/useLatestMemos';
import { useSearch } from '@/hooks/useSearch';
import { supabase } from '@/libs/supabase';
import storageUtils from '@/libs/utils/storageUtils';

const RESULT_KEY = 'lastSearch';

const errorMessage = (e: unknown) => {
  const data = isAxiosError<ApiResponse.Error>(e) ? e.response?.data : undefined;
  switch (data?.code) {
    case 'USER_LIMIT':
      return '오늘 검색 횟수를 다 썼어요. 내일 다시 검색해 주세요.';
    case 'NAVER_QUOTA':
      return '오늘 검색 한도를 다 썼어요.';
    case 'IN_PROGRESS':
      return '이전 검색이 아직 진행 중이에요.';
  }
  return '검색에 실패했어요. 잠시 후 다시 시도해 주세요.';
};

function Search() {
  // 탭을 오가도 마지막 결과 유지 (설계 4.1)
  const [result, setResult] = useState(() => storageUtils.getSessionStorage<ApiResponse.Search>(RESULT_KEY));
  const [query, setQuery] = useState(result?.query ?? '');
  const search = useSearch();
  const memos = useLatestMemos(result?.places.map((p) => p.placeKey) ?? []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search.mutate(query.trim(), {
      onSuccess: (data) => {
        setResult(data);
        storageUtils.setSessionStorage(RESULT_KEY, data);
      },
    });
  };

  return (
    <div className="flex flex-col text-zinc-900">
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-stone-200 bg-white px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">장소 메모판</h1>
          <button type="button" onClick={() => supabase.auth.signOut()} className="min-h-11 text-xs text-stone-500">
            로그아웃
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            분위기로 장소 검색
          </label>
          <input
            id="q"
            type="search"
            required
            minLength={2}
            maxLength={100}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="우드톤 분위기 경기도 외곽 대형 카페"
            className="h-11 min-w-0 flex-1 rounded-xl border border-stone-300 bg-[#FAFAF7] px-3 text-sm"
          />
          <button
            type="submit"
            disabled={search.isPending}
            className="h-11 shrink-0 rounded-xl bg-[#111] px-4 text-sm font-bold text-white disabled:bg-stone-300"
          >
            검색
          </button>
        </form>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-col gap-3 p-4">
        {search.isPending && (
          <p role="status" className="py-10 text-center text-sm text-stone-600">
            블로그 후기에서 장소를 찾고 있어요
            <br />
            <span className="text-xs text-stone-500">10초 정도 걸려요</span>
          </p>
        )}

        {search.isError && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {errorMessage(search.error)}
          </p>
        )}

        {!search.isPending && result && (
          <>
            {result.places.length === 0 && result.unmatched.length === 0 ? (
              <p className="py-10 text-center text-sm text-stone-600">
                찾은 장소가 없어요. 다른 표현으로 검색해 보세요.
              </p>
            ) : (
              <span className="text-xs text-stone-500">장소 {result.places.length}곳 · 관련 후기 많은 순</span>
            )}

            {result.places.map((p) => (
              <PlaceCard key={p.placeKey} place={p} memo={memos.data?.[p.placeKey]} />
            ))}

            {result.unmatched.length > 0 && (
              <details className="rounded-2xl border border-dashed border-stone-300 bg-stone-100">
                <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm text-stone-600">
                  장소 확인 안 된 후기 {result.unmatched.length}건
                </summary>
                <div className="flex flex-col gap-4 px-4 pb-4">
                  <p className="text-xs text-stone-500">
                    지도 검색으로 확인되지 않았어요. 새로 생겼거나 폐업했을 수 있어요.
                  </p>
                  {result.unmatched.map((u) => (
                    <div key={`${u.name}|${u.area}`} className="flex flex-col gap-1.5">
                      <span className="text-sm font-bold">
                        {u.name} <span className="text-xs font-normal text-stone-500">{u.area}</span>
                      </span>
                      <span className="text-[13px]">“{u.summary}”</span>
                      <BlogList blogs={u.blogs} />
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Search;
