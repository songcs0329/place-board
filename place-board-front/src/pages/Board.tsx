import { Link, useLocation, useNavigate, useParams } from 'react-router';
import Composer from '@/components/Composer';
import { usePlace } from '@/hooks/usePlace';
import { usePlaceChannel, usePosts } from '@/hooks/usePosts';
import { tagLabel } from '@/libs/tags';
import { cn } from '@/libs/utils/cn';
import { ageMs, HOUR, timeAgo } from '@/libs/utils/time';

// 장소 게시판 (설계 4.3): 현장 메모 + 채팅, 보는 사람 수
function Board() {
  const placeKey = useParams().placeKey!;
  const navigate = useNavigate();
  const location = useLocation();
  const place = usePlace(placeKey);
  const posts = usePosts(placeKey);
  const viewers = usePlaceChannel(placeKey);

  if (place.isPending) return null;
  if (!place.data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAF7] px-4 text-sm">
        <p>{place.isError ? '장소를 불러오지 못했어요.' : '장소를 찾을 수 없어요.'}</p>
        <Link to="/" className="font-medium text-[#2F6B4F]">
          검색으로 돌아가기
        </Link>
      </main>
    );
  }

  const all = posts.data ?? [];
  const memos = all.filter((p) => p.kind === 'memo').reverse();
  // 채팅은 6시간 보관: 정리 작업 전이라도 화면에서는 숨긴다
  const chats = all.filter((p) => p.kind === 'chat' && ageMs(p.created_at) < 6 * HOUR);
  const p = place.data;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF7] text-zinc-900">
      <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-stone-200 bg-white py-2 pr-3">
        <button
          type="button"
          aria-label="뒤로"
          // 앱 안에서 들어왔으면 그 탭으로, 공유 링크 등으로 바로 들어왔으면 검색으로
          onClick={() => (location.key === 'default' ? navigate('/') : navigate(-1))}
          className="flex size-11 items-center justify-center"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-[17px] font-bold">{p.name}</h1>
          <span className="truncate text-xs text-stone-500">
            {p.road_address || p.address} · {p.category?.split('>').pop()}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 p-4">
        {posts.isError && (
          <p role="alert" className="text-sm text-red-700">
            글을 불러오지 못했어요.
          </p>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-[15px] font-bold">
            현장 메모 <span className="text-xs font-normal text-stone-500">24시간</span>
          </h2>
          {memos.length === 0 && (
            <p className="rounded-2xl border border-stone-200 bg-white p-4 text-[13px] text-stone-500">
              아직 소식이 없어요 · 태그 하나로 첫 소식을 남겨주세요
            </p>
          )}
          {memos.map((m) => (
            <article
              key={m.id}
              // 6시간 지난 글은 흐리게 (설계 4.3)
              className={cn(
                'flex flex-col gap-1.5 rounded-2xl border border-stone-200 bg-white px-3.5 py-3',
                ageMs(m.created_at) > 6 * HOUR && 'opacity-50',
              )}
            >
              <div className="flex justify-between text-xs text-stone-500">
                <span>{m.nickname}</span>
                <time dateTime={m.created_at}>{timeAgo(m.created_at)}</time>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.tags.map((t) => (
                  <span key={t} className="rounded-full bg-[#EAF2EC] px-2 py-0.5 text-xs font-medium text-[#24543D]">
                    {tagLabel(t)}
                  </span>
                ))}
              </div>
              {m.body && <p className="text-sm whitespace-pre-wrap">{m.body}</p>}
            </article>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-bold">
              채팅 <span className="text-xs font-normal text-stone-500">6시간</span>
            </h2>
            {viewers >= 2 && (
              <span className="flex items-center gap-1.5 text-xs text-[#24543D]">
                <span aria-hidden="true" className="size-2 rounded-full bg-[#2F8A5B]" />
                지금 {viewers}명이 보고 있어요
              </span>
            )}
          </div>
          {chats.length === 0 && <p className="text-[13px] text-stone-500">아직 대화가 없어요</p>}
          {chats.map((c) => (
            <div key={c.id} className="flex flex-col items-start gap-0.5">
              <span className="text-[11px] text-stone-500">
                {c.nickname} · {timeAgo(c.created_at)}
              </span>
              <p className="max-w-[80%] rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm whitespace-pre-wrap">
                {c.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <Composer placeKey={placeKey} />
    </div>
  );
}

export default Board;
