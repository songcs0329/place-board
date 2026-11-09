import { Link } from 'react-router';
import type { LatestMemo } from '@/hooks/useLatestMemos';
import BlogList from '@/components/BlogList';
import { photoUrl } from '@/libs/photo';
import { tagLabel } from '@/libs/tags';
import { timeAgo } from '@/libs/utils/time';

interface Props {
  place: ApiResponse.Place;
  memo?: LatestMemo;
}

function PlaceCard({ place, memo }: Props) {
  const area = (place.roadAddress || place.address).split(' ').slice(1, 3).join(' ');
  const category = place.category.split('>').pop();
  const to = `/places/${encodeURIComponent(place.placeKey)}`;
  // 배지: "2시간 전 · 자리 여유 · 사진" (설계 4.1)
  const badge = memo && [timeAgo(memo.created_at), ...memo.tags.map(tagLabel), ...(memo.images.length ? ['사진'] : [])];

  return (
    <article className="flex flex-col gap-2.5 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-base font-bold">
            <Link to={to} className="hover:underline">
              {place.name}
            </Link>
          </h2>
          <span className="text-xs text-stone-500">
            {area} · {category}
          </span>
          {badge ? (
            <span className="self-start rounded-full bg-[#EAF2EC] px-2 py-0.5 text-xs font-medium text-[#24543D]">
              {badge.join(' · ')}
            </span>
          ) : (
            <span className="text-xs text-stone-500">아직 현장 소식 없음</span>
          )}
        </div>
        {memo?.photo && (
          <img
            src={photoUrl(memo.photo)}
            alt={`${place.name} 최근 현장 사진`}
            loading="lazy"
            className="size-18 shrink-0 rounded-xl bg-stone-100 object-cover"
          />
        )}
      </div>
      <p className="text-sm">
        “{place.summary}” <span className="text-xs text-stone-500">블로그 후기 기준</span>
      </p>
      <BlogList blogs={place.blogs} />
      <Link
        to={to}
        className="flex h-11 items-center justify-center rounded-xl bg-[#2F6B4F] text-sm font-bold text-white hover:bg-[#24543D]"
      >
        게시판 보기
      </Link>
    </article>
  );
}

export default PlaceCard;
