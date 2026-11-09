import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useCreatePost } from '@/hooks/useCreatePost';
import { PhotoError, processPhoto, type ProcessedPhoto } from '@/libs/photo';
import { TAGS } from '@/libs/tags';
import { cn } from '@/libs/utils/cn';

const errorMessage = (error: unknown) => {
  if (error instanceof PhotoError) return error.message;
  if (!isAxiosError<ApiResponse.Error>(error)) return '보내지 못했어요. 다시 시도해 주세요.';
  if (error.response?.data?.code === 'TOO_FAST') return '조금 천천히요. 3초 뒤에 다시 보내주세요.';
  if (error.response?.status === 404) return '없는 장소예요.';
  if (error.response?.status === 400) return '보낼 수 없는 글이에요.';
  return '보내지 못했어요. 다시 시도해 주세요.';
};

// 채팅하듯 쓰다가 태그를 누르거나 사진을 올리면 현장 메모가 된다 (설계 4.3)
function Composer({ placeKey }: { placeKey: string }) {
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [photo, setPhoto] = useState<ProcessedPhoto | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const create = useCreatePost(placeKey);
  const isMemo = tags.length > 0 || !!photo;
  const canSend = !!body.trim() || isMemo;

  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo.blob);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const toggle = (value: string) =>
    setTags((previous) => (previous.includes(value) ? previous.filter((tag) => tag !== value) : [...previous, value]));

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // 같은 사진을 다시 골라도 change가 오도록
    if (!file) return;
    setPhotoError(null);
    try {
      setPhoto(await processPhoto(file));
    } catch (photoProcessError) {
      setPhoto(null);
      setPhotoError(photoProcessError instanceof PhotoError ? photoProcessError.message : '사진을 처리하지 못했어요.');
    }
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    create.mutate(
      { body: body.trim() || undefined, tags, photo: photo ?? undefined },
      {
        onSuccess: () => {
          setBody('');
          setTags([]);
          setPhoto(null);
        },
      },
    );
  };

  const error = photoError ?? (create.isError ? errorMessage(create.error) : null);

  return (
    <form
      onSubmit={onSubmit}
      className="sticky bottom-0 flex flex-col gap-2 border-t border-neutral-200 bg-white px-3 pt-2.5 pb-3.5"
    >
      {preview && (
        <div className="flex items-center gap-3">
          <img src={preview} alt="올릴 사진 미리보기" className="size-16 rounded-lg object-cover" />
          <div className="flex flex-col gap-1 text-xs text-neutral-600">
            <span>
              {photo?.takenAt ? '촬영 시각 확인됨 · 위치 정보는 지웠어요' : '촬영 시각 없음 · 위치 정보는 지웠어요'}
            </span>
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="min-h-8 self-start text-neutral-600 underline"
            >
              사진 빼기
            </button>
          </div>
        </div>
      )}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TAGS.map((tag) => {
          const on = tags.includes(tag.value);
          return (
            <button
              key={tag.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(tag.value)}
              className={cn(
                'h-9 shrink-0 rounded-full border px-3 text-[13px]',
                // 선택하면 태그 색(TagBadge와 같은 색) + 글자색 테두리로 선택 상태를 분명히
                on ? cn(tag.className, 'border-current font-semibold') : 'border-neutral-300 bg-white text-neutral-900',
              )}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <label
          aria-label="사진 첨부"
          className={cn(
            'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border',
            photo ? 'border-[#111] bg-neutral-100 text-[#111]' : 'border-neutral-300 bg-white text-neutral-600',
          )}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {/* 설계 7장: 후면 카메라 바로 열기 (갤러리 선택도 가능) */}
          <input type="file" accept="image/*" capture="environment" onChange={onPick} className="sr-only" />
        </label>
        <label htmlFor="msg" className="sr-only">
          글 입력
        </label>
        <input
          id="msg"
          value={body}
          maxLength={300}
          onChange={(event) => setBody(event.target.value)}
          placeholder={isMemo ? '한마디 덧붙이기 (선택)' : '채팅하듯 써보세요'}
          className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-neutral-50 px-3 text-sm"
        />
        <button
          type="submit"
          disabled={create.isPending || !canSend}
          className="h-11 shrink-0 rounded-xl bg-[#111] px-4 text-sm font-bold text-white disabled:bg-neutral-300"
        >
          {create.isPending && photo ? '올리는 중' : '보내기'}
        </button>
      </div>
      <span className={cn('text-[11px]', error ? 'text-red-700' : 'text-neutral-500')} role="status">
        {error ??
          (photo
            ? '다른 사람 얼굴이 나오지 않게 찍어주세요 · 현장 메모로 올라가요'
            : `${isMemo ? '현장 메모로 올라가요 · 24시간 보관' : '태그나 사진을 붙이면 현장 메모가 돼요 · 채팅은 6시간 보관'} · ${body.length}/300`)}
      </span>
    </form>
  );
}

export default Composer;
