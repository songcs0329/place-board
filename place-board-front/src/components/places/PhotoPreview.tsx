import { useEffect, useRef } from 'react';

export interface PreviewPhoto {
  src: string;
  alt: string;
  caption?: string;
}

interface Props {
  photo: PreviewPhoto | null;
  onClose: () => void;
}

// 현장 메모 사진 크게 보기. 네이티브 <dialog>라 Esc 닫기·포커스 가두기·배경 스크롤 막기가 기본 동작
function PhotoPreview({ photo, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (photo && !dialog.open) dialog.showModal();
    if (!photo && dialog.open) dialog.close();
  }, [photo]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // 사진 바깥(어두운 배경)을 누르면 닫는다
      onClick={(event) => event.target === event.currentTarget && onClose()}
      aria-label="사진 크게 보기"
      className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/85"
    >
      {photo && (
        <figure className="flex flex-col items-center gap-2">
          <img src={photo.src} alt={photo.alt} className="max-h-[80vh] max-w-[92vw] rounded-xl object-contain" />
          {photo.caption && <figcaption className="text-xs text-neutral-300">{photo.caption}</figcaption>}
        </figure>
      )}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="fixed top-3 right-3 flex size-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
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
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </dialog>
  );
}

export default PhotoPreview;
