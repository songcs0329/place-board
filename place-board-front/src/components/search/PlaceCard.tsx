import { Link } from 'react-router';
import type { LatestMemo } from '@/hooks/useLatestMemos';
import BlogList from '@/components/search/BlogList';
import { photoUrl } from '@/libs/photo';
import TagBadge from '@/components/commons/TagBadge';
import { timeAgo } from '@/libs/utils/time';

interface Props {
  place: ApiResponse.Place;
  memo?: LatestMemo;
}

function PlaceCard({ place, memo }: Props) {
  const area = (place.roadAddress || place.address).split(' ').slice(1, 3).join(' ');
  const category = place.category.split('>').pop();
  const to = `/places/${encodeURIComponent(place.placeKey)}`;

  return (
    <article className="flex flex-col gap-2.5 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-base font-bold">
            <Link to={to} className="hover:underline">
              {place.name}
            </Link>
          </h2>
          <span className="text-xs text-neutral-500">
            {area} · {category}
          </span>
          {memo ? (
            // 최근 메모: "2시간 전 [자리 여유] [사진]" (설계 4.1)
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-neutral-500">{timeAgo(memo.created_at)}</span>
              {memo.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
              {memo.images.length > 0 && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800">
                  사진
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-neutral-500">아직 현장 소식 없음</span>
          )}
        </div>
        {memo?.photo && (
          <img
            src={photoUrl(memo.photo)}
            alt={`${place.name} 최근 현장 사진`}
            loading="lazy"
            className="size-18 shrink-0 rounded-xl bg-neutral-100 object-cover"
          />
        )}
      </div>
      <p className="text-sm">
        “{place.summary}” <span className="text-xs text-neutral-500">블로그 후기 기준</span>
      </p>
      <BlogList blogs={place.blogs} />
      <Link
        to={to}
        className="flex h-11 items-center justify-center rounded-xl bg-neutral-200 text-sm font-bold text-neutral-900 hover:bg-neutral-300"
      >
        게시판 보기
      </Link>
    </article>
  );
}

export default PlaceCard;
