import { Link } from 'react-router';
import BlogList from '@/components/BlogList';
import { tagLabel } from '@/libs/tags';
import { timeAgo } from '@/libs/utils/time';

interface Props {
  place: ApiResponse.Place;
  memo?: Pick<Db.Post, 'tags' | 'created_at'>;
}

// ponytail: 최근 사진 썸네일은 5단계(사진)에서
function PlaceCard({ place, memo }: Props) {
  const area = (place.roadAddress || place.address).split(' ').slice(1, 3).join(' ');
  const category = place.category.split('>').pop();
  const to = `/places/${encodeURIComponent(place.placeKey)}`;

  return (
    <article className="flex flex-col gap-2.5 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold">
          <Link to={to} className="hover:underline">
            {place.name}
          </Link>
        </h2>
        <span className="text-xs text-stone-500">
          {area} · {category}
        </span>
        {memo ? (
          <span className="self-start rounded-full bg-[#EAF2EC] px-2 py-0.5 text-xs font-medium text-[#24543D]">
            {[timeAgo(memo.created_at), ...memo.tags.map(tagLabel)].join(' · ')}
          </span>
        ) : (
          <span className="text-xs text-stone-500">아직 현장 소식 없음</span>
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
