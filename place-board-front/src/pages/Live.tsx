import { Link } from 'react-router';
import { useLatestMemos, useMemoFeed, type LatestMemo } from '@/hooks/useLatestMemos';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import TagBadge from '@/components/commons/TagBadge';
import { timeAgo } from '@/libs/utils/time';

// 실시간 게시판 탭 (설계 4.2): 최근 검색 3개를 검색어별로 묶고,
// 현장 메모가 있는 장소만 최신 메모순으로 보여준다
function Live() {
  const searches = useRecentSearches();
  // 구독은 검색한 장소 전체: 메모가 없던 장소도 새 메모가 오면 바로 나타나도록
  const keys = [...new Set((searches.data ?? []).flatMap((search) => search.places.map((place) => place.place_key)))];
  const memos = useLatestMemos(keys);
  useMemoFeed(keys);

  const latest = memos.data ?? {};
  // 같은 장소가 여러 검색에 걸리면 가장 최근 검색 묶음에만 (searches는 최신순)
  const shown = new Set<string>();
  const groups = (searches.data ?? [])
    .map((search) => ({
      ...search,
      places: search.places
        .filter((place) => latest[place.place_key] && !shown.has(place.place_key) && shown.add(place.place_key))
        .sort((first, second) => latest[second.place_key].created_at.localeCompare(latest[first.place_key].created_at)),
    }))
    .filter((search) => search.places.length > 0);

  return (
    <>
      <header className="sticky top-0 z-10 flex flex-col gap-1 border-b border-neutral-200 bg-white px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold">실시간 게시판</h1>
        <p className="text-[13px] text-neutral-500">최근 검색 3개 · 현장 메모가 있는 장소만 모아 보여줘요</p>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-col gap-5 p-4">
        {(searches.isError || memos.isError) && (
          <p role="alert" className="text-sm text-red-700">
            불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        {searches.isSuccess && (keys.length === 0 || memos.isSuccess) && groups.length === 0 && (
          <p className="py-10 text-center text-sm text-neutral-600">
            {keys.length === 0 ? '최근 24시간 검색이 없어요.' : '검색한 장소에 아직 현장 소식이 없어요.'}
            <br />
            <Link to="/search" className="font-medium text-neutral-900 underline">
              검색 결과
            </Link>
            에서 장소 게시판에 첫 소식을 남겨보세요.
          </p>
        )}

        {groups.map((search) => (
          <section key={search.id} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-bold">“{search.query}”</h2>
              <span className="shrink-0 text-xs text-neutral-500">{timeAgo(search.createdAt)} 검색</span>
            </div>
            <ul className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              {search.places.map((place) => (
                <PlaceRow
                  key={place.place_key}
                  placeKey={place.place_key}
                  name={place.name}
                  memo={latest[place.place_key]}
                />
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}

function PlaceRow({ placeKey, name, memo }: { placeKey: string; name: string; memo: LatestMemo }) {
  return (
    <li className="border-b border-neutral-100 last:border-b-0">
      <Link to={`/places/${encodeURIComponent(placeKey)}`} className="flex flex-col gap-1 px-4 py-3.5">
        <div className="flex justify-between gap-2">
          <strong className="text-sm">{name}</strong>
          <span className="shrink-0 text-xs text-neutral-500">{timeAgo(memo.created_at)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {memo.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {memo.body && <span className="text-[13px] text-neutral-600">{memo.body}</span>}
        </div>
      </Link>
    </li>
  );
}

export default Live;
