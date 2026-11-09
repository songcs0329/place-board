import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useCreatePost } from '@/hooks/useCreatePost';
import { TAGS } from '@/libs/tags';
import { cn } from '@/libs/utils/cn';

const errorMessage = (e: unknown) => {
  if (!isAxiosError<ApiResponse.Error>(e)) return '보내지 못했어요. 다시 시도해 주세요.';
  if (e.response?.data?.code === 'TOO_FAST') return '조금 천천히요. 3초 뒤에 다시 보내주세요.';
  if (e.response?.status === 404) return '없는 장소예요.';
  if (e.response?.status === 400) return '보낼 수 없는 글이에요.';
  return '보내지 못했어요. 다시 시도해 주세요.';
};

// 채팅하듯 쓰다가 태그를 누르면 현장 메모가 된다 (설계 4.3)
// ponytail: 사진 첨부 버튼은 5단계에서
function Composer({ placeKey }: { placeKey: string }) {
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const create = useCreatePost(placeKey);
  const isMemo = tags.length > 0;

  const toggle = (value: string) =>
    setTags((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && !isMemo) return;
    create.mutate(
      { body: body.trim() || undefined, tags },
      {
        onSuccess: () => {
          setBody('');
          setTags([]);
        },
      },
    );
  };

  return (
    <form
      onSubmit={onSubmit}
      className="sticky bottom-0 flex flex-col gap-2 border-t border-stone-200 bg-white px-3 pt-2.5 pb-3.5"
    >
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TAGS.map((t) => {
          const on = tags.includes(t.value);
          return (
            <button
              key={t.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(t.value)}
              className={cn(
                'h-9 shrink-0 rounded-full border px-3 text-[13px]',
                on ? 'border-[#2F6B4F] bg-[#2F6B4F] text-white' : 'border-stone-300 bg-white text-zinc-900',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <label htmlFor="msg" className="sr-only">
          글 입력
        </label>
        <input
          id="msg"
          value={body}
          maxLength={300}
          onChange={(e) => setBody(e.target.value)}
          placeholder={isMemo ? '한마디 덧붙이기 (선택)' : '채팅하듯 써보세요'}
          className="h-11 min-w-0 flex-1 rounded-xl border border-stone-300 bg-[#FAFAF7] px-3 text-sm"
        />
        <button
          type="submit"
          disabled={create.isPending || (!body.trim() && !isMemo)}
          className="h-11 shrink-0 rounded-xl bg-[#2F6B4F] px-4 text-sm font-bold text-white disabled:bg-stone-300"
        >
          보내기
        </button>
      </div>
      <span className={cn('text-[11px]', create.isError ? 'text-red-700' : 'text-stone-500')} role="status">
        {create.isError
          ? errorMessage(create.error)
          : `${isMemo ? '현장 메모로 올라가요 · 24시간 보관' : '태그를 붙이면 현장 메모가 돼요 · 채팅은 6시간 보관'} · ${body.length}/300`}
      </span>
    </form>
  );
}

export default Composer;
