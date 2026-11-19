import { cn } from '@/libs/utils/cn';

// 핀 안에 메모 줄이 들어간 로고. favicon(public/favicon.svg)과 같은 모양
function Logo({ className }: { className?: string }) {
  return (
    <h1 className={cn('flex items-center gap-2 font-bold', className)}>
      <svg width="1.4em" height="1.4em" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="16" className="fill-brand" />
        <path d="M16 27s-8-7.2-8-13a8 8 0 0 1 16 0c0 5.8-8 13-8 13z" fill="#fff" />
        <path d="M12.5 12.5h7M12.5 16h4.5" className="stroke-brand" strokeWidth="2" strokeLinecap="round" />
      </svg>
      LeMo
    </h1>
  );
}

export default Logo;
