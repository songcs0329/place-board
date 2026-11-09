import { tagClassName, tagLabel } from '@/libs/tags';
import { cn } from '@/libs/utils/cn';

// 빠른 태그 배지: 태그별 배경·글자색은 src/libs/tags.ts에서 관리 (Places, Live, Search 공통)
function TagBadge({ tag }: { tag: string }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tagClassName(tag))}>{tagLabel(tag)}</span>;
}

export default TagBadge;
