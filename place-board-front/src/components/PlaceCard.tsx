import BlogList from '@/components/BlogList';

// ponytail: 현장 메모 배지·최근 사진·게시판 버튼은 3단계(장소 게시판)에서 추가
function PlaceCard({ place }: { place: ApiResponse.Place }) {
  const area = (place.roadAddress || place.address).split(' ').slice(1, 3).join(' ');
  const category = place.category.split('>').pop();

  return (
    <article className="flex flex-col gap-2.5 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-bold">{place.name}</h2>
        <span className="text-xs text-stone-500">
          {area} · {category}
        </span>
      </div>
      <p className="text-sm">
        “{place.summary}” <span className="text-xs text-stone-500">블로그 후기 기준</span>
      </p>
      <BlogList blogs={place.blogs} />
    </article>
  );
}

export default PlaceCard;
