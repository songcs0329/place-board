import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useBlockAuthor, useReportPost } from '@/hooks/useModeratePost';

const REASONS: { value: ApiRequest.ReportReason; label: string }[] = [
  { value: 'spam', label: '스팸·홍보' },
  { value: 'abuse', label: '욕설·혐오' },
  { value: 'privacy', label: '개인정보 노출' },
  { value: 'etc', label: '기타' },
];

const errorMessage = (error: unknown) => {
  const message = isAxiosError<ApiResponse.Error>(error) ? error.response?.data?.message : undefined;
  return typeof message === 'string' ? message : '처리하지 못했어요. 다시 시도해 주세요.';
};

const sheetButton =
  'block min-h-12 w-full rounded-xl px-4 text-left text-[15px] hover:bg-neutral-100 disabled:opacity-50';

interface Props {
  postId: number;
  placeKey: string;
  onNotice: (message: string) => void;
}

// 글마다 붙는 "⋯" 메뉴: 신고하기, 이 사람 글 숨기기(차단) (설계 15장)
// 아래에서 올라오는 시트(네이티브 <dialog>): 화면 맨 위 층에 그려져 Swiper 슬라이드에 잘리지 않는다
function PostActions({ postId, placeKey, onNotice }: Props) {
  const [step, setStep] = useState<'closed' | 'menu' | 'report'>('closed');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const report = useReportPost(placeKey);
  const block = useBlockAuthor(placeKey);
  const error = report.error ?? block.error;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (step !== 'closed' && !dialog.open) dialog.showModal();
    if (step === 'closed' && dialog.open) dialog.close();
  }, [step]);

  const close = () => {
    setStep('closed');
    report.reset();
    block.reset();
  };

  const finish = (message: string) => {
    close();
    onNotice(message);
  };

  return (
    <>
      <button
        type="button"
        aria-label="글 메뉴"
        aria-haspopup="dialog"
        onClick={() => setStep('menu')}
        className="-my-2 flex size-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        onClose={close}
        // 시트 바깥(어두운 배경)을 누르면 닫는다
        onClick={(event) => event.target === event.currentTarget && close()}
        aria-label={step === 'report' ? '신고 사유' : '글 메뉴'}
        className="mx-auto mt-auto mb-0 w-full max-w-xl rounded-t-2xl bg-white p-0 text-neutral-900 backdrop:bg-black/40"
      >
        <div className="flex flex-col gap-1 p-3 pb-6">
          {step === 'report' ? (
            <>
              <p className="px-4 pt-1 pb-2 text-sm font-bold">신고 사유를 골라주세요</p>
              {REASONS.map((reason) => (
                <button
                  key={reason.value}
                  type="button"
                  disabled={report.isPending}
                  onClick={() =>
                    report.mutate(
                      { postId, reason: reason.value },
                      { onSuccess: () => finish('신고했어요. 이 글은 이제 보이지 않아요.') },
                    )
                  }
                  className={sheetButton}
                >
                  {reason.label}
                </button>
              ))}
            </>
          ) : (
            <>
              <button type="button" onClick={() => setStep('report')} className={sheetButton}>
                신고하기
              </button>
              <button
                type="button"
                disabled={block.isPending}
                onClick={() =>
                  block.mutate(postId, {
                    onSuccess: () => finish('이 사람의 글은 이제 어느 장소에서도 보이지 않아요.'),
                  })
                }
                className={sheetButton}
              >
                이 사람 글 숨기기
                <span className="block text-xs text-neutral-500">모든 장소에서 이 사람의 글이 나에게 안 보여요</span>
              </button>
            </>
          )}
          {error && (
            <p role="alert" className="px-4 pt-1 text-sm text-red-700">
              {errorMessage(error)}
            </p>
          )}
          <button type="button" onClick={close} className={`${sheetButton} text-center text-neutral-500`}>
            취소
          </button>
        </div>
      </dialog>
    </>
  );
}

export default PostActions;
