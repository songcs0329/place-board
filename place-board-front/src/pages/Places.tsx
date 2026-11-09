import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import Composer from '@/components/places/Composer';
import TagBadge from '@/components/commons/TagBadge';
import PhotoPreview, { type PreviewPhoto } from '@/components/places/PhotoPreview';
import PostActions from '@/components/places/PostActions';
import { useGetSummary } from '@/hooks/useGetSummary';
import { usePlace } from '@/hooks/usePlace';
import { usePlaceChannel, usePosts } from '@/hooks/usePosts';
import { photoUrl } from '@/libs/photo';
import { cn } from '@/libs/utils/cn';
import { ageMs, HOUR, timeAgo } from '@/libs/utils/time';

const sectionBadge =
  'ml-1 rounded-full bg-neutral-200 px-2 py-0.5 align-middle text-[11px] font-medium text-neutral-700';

// 장소 게시판 (설계 4.3): 현장 메모 + 채팅, 보는 사람 수
function Places() {
  const placeKey = useParams().placeKey!;
  const navigate = useNavigate();
  const location = useLocation();
  const place = usePlace(placeKey);
  const posts = usePosts(placeKey);
  const viewers = usePlaceChannel(placeKey);
  const summary = useGetSummary(placeKey, posts.data?.length ?? 0);
  const [previewPhoto, setPreviewPhoto] = useState<PreviewPhoto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (place.isPending) return null;
  if (!place.data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-4 text-sm">
        <p>{place.isError ? '장소를 불러오지 못했어요.' : '장소를 찾을 수 없어요.'}</p>
        <Link to="/search" className="font-medium text-[#111]">
          검색으로 돌아가기
        </Link>
      </main>
    );
  }

  const allPosts = posts.data ?? [];
  const memos = allPosts.filter((post) => post.kind === 'memo').reverse();
  // 채팅은 6시간 보관: 정리 작업 전이라도 화면에서는 숨긴다
  const chats = allPosts.filter((post) => post.kind === 'chat' && ageMs(post.created_at) < 6 * HOUR);
  const currentPlace = place.data;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-neutral-200 bg-white py-2 pr-3">
        <button
          type="button"
          aria-label="뒤로"
          // 앱 안에서 들어왔으면 그 탭으로, 공유 링크 등으로 바로 들어왔으면 검색으로
          onClick={() => (location.key === 'default' ? navigate('/search') : navigate(-1))}
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
          <h1 className="truncate text-[17px] font-bold">{currentPlace.name}</h1>
          <span className="truncate text-xs text-neutral-500">
            {currentPlace.road_address || currentPlace.address} · {currentPlace.category?.split('>').pop()}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 p-4">
        {posts.isError && (
          <p role="alert" className="text-sm text-red-700">
            글을 불러오지 못했어요.
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl bg-neutral-200 px-3.5 py-2.5 text-[13px] text-neutral-800">
            {notice}
          </p>
        )}

        {/* AI 현장 요약: 글이 없거나 요약 실패면 띄우지 않는다 (설계 6장) */}
        {summary.data?.summary && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-[#111] px-3.5 py-3 text-white" role="status">
            <span className="shrink-0 rounded-md bg-white px-1.5 py-px text-[11px] font-bold text-[#111]">AI 요약</span>
            <p className="text-sm">{summary.data.summary}</p>
          </div>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-[15px] font-bold">
            현장 메모 <span className={sectionBadge}>24시간</span>
          </h2>
          {memos.length === 0 ? (
            <p className="rounded-2xl border border-neutral-200 bg-white p-4 text-[13px] text-neutral-500">
              아직 소식이 없어요 · 태그 하나로 첫 소식을 남겨주세요
            </p>
          ) : (
            // 메모는 가로로 넘겨 본다. 다음 카드가 살짝 보이게 해서 넘길 수 있다는 걸 알린다
            <Swiper
              slidesPerView={memos.length > 1 ? 1.15 : 1}
              spaceBetween={12}
              className="w-full"
              aria-label="현장 메모 목록"
            >
              {memos.map((memo) => (
                <SwiperSlide key={memo.id} className="h-auto!">
                  <MemoCard
                    memo={memo}
                    onPhotoClick={setPreviewPhoto}
                    actions={<PostActions postId={memo.id} placeKey={placeKey} onNotice={setNotice} />}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-bold">
              채팅 <span className={sectionBadge}>6시간</span>
            </h2>
            {viewers >= 2 && (
              <span className="flex items-center gap-1.5 text-xs text-neutral-800">
                <span aria-hidden="true" className="size-2 rounded-full bg-neutral-900" />
                지금 {viewers}명이 보고 있어요
              </span>
            )}
          </div>
          {chats.length === 0 && <p className="text-[13px] text-neutral-500">아직 대화가 없어요</p>}
          {chats.map((chat) => (
            <div key={chat.id} className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-neutral-500">
                  {chat.nickname} · {timeAgo(chat.created_at)}
                </span>
                <PostActions postId={chat.id} placeKey={placeKey} onNotice={setNotice} />
              </div>
              <p className="max-w-[80%] rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm whitespace-pre-wrap">
                {chat.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <Composer placeKey={placeKey} />
      <PhotoPreview photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />
    </div>
  );
}

interface MemoCardProps {
  memo: Db.Post;
  onPhotoClick: (photo: PreviewPhoto) => void;
  actions: React.ReactNode;
}

function MemoCard({ memo, onPhotoClick, actions }: MemoCardProps) {
  const photo = memo.images[0] && {
    src: photoUrl(memo.images[0]),
    alt: `${memo.nickname}님이 올린 현장 사진`,
    caption: memo.photo_taken_at ? `촬영 ${timeAgo(memo.photo_taken_at)}` : undefined,
  };

  return (
    <article
      // 6시간 지난 글은 흐리게 (설계 4.3)
      className={cn(
        'flex h-full flex-col gap-1.5 rounded-2xl border border-neutral-200 bg-white px-3.5 py-3',
        ageMs(memo.created_at) > 6 * HOUR && 'opacity-50',
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
        <span>{memo.nickname}</span>
        <div className="flex items-center gap-1">
          <time dateTime={memo.created_at}>{timeAgo(memo.created_at)}</time>
          {actions}
        </div>
      </div>
      {memo.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {memo.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}
      {memo.body && <p className="text-sm whitespace-pre-wrap">{memo.body}</p>}
      {photo && (
        <figure className="flex flex-col gap-1">
          <button type="button" onClick={() => onPhotoClick(photo)} aria-label="사진 크게 보기" className="block">
            <img
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              className="h-40 w-full rounded-xl bg-neutral-100 object-cover"
            />
          </button>
          {/* 촬영 시각이 없으면 표시 생략 (설계 7장) */}
          {photo.caption && <figcaption className="text-[11px] text-neutral-500">{photo.caption}</figcaption>}
        </figure>
      )}
    </article>
  );
}

export default Places;
