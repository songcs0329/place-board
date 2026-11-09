import { useState } from 'react';

const PREVIEW = 3;

// 후기는 제목·블로거·작성일·원문 링크만 (설계 4.1)
function BlogList({ blogs }: { blogs: ApiResponse.Blog[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? blogs : blogs.slice(0, PREVIEW);

  return (
    <div className="flex flex-col gap-1.5 border-t border-neutral-200 pt-2.5">
      <span className="text-xs font-bold text-neutral-600">관련 후기 {blogs.length}건</span>
      <ul className="flex flex-col gap-1">
        {shown.map((b) => (
          <li key={b.link} className="text-[13px] leading-snug">
            <a href={b.link} target="_blank" rel="noopener noreferrer" className="text-neutral-900 hover:underline">
              · {b.title}{' '}
              <span className="text-neutral-500">
                — {b.blogger} · {b.postdate}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {blogs.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="min-h-11 self-start text-[13px] font-medium text-[#111]"
        >
          {open ? '접기' : `더보기 (${blogs.length - PREVIEW}건)`}
        </button>
      )}
    </div>
  );
}

export default BlogList;
