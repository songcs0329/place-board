// 빠른 태그 (설계 6장). 서버 src/posts/post-input.ts와 같은 목록
// className: 태그별 배경·글자색. 좋음=초록, 보통=노랑, 나쁨=빨강 계열, 주차는 파랑·주황, 웨이팅은 보라
export const TAGS = [
  { value: 'seat:free', label: '자리 여유', className: 'bg-emerald-100 text-emerald-800' },
  { value: 'seat:normal', label: '자리 보통', className: 'bg-amber-100 text-amber-800' },
  { value: 'seat:full', label: '만석', className: 'bg-rose-100 text-rose-800' },
  { value: 'parking:free', label: '주차 여유', className: 'bg-sky-100 text-sky-800' },
  { value: 'parking:wait', label: '주차 대기', className: 'bg-orange-100 text-orange-800' },
  { value: 'waiting:yes', label: '웨이팅 있음', className: 'bg-violet-100 text-violet-800' },
];

const findTag = (value: string) => TAGS.find((tag) => tag.value === value);

export const tagLabel = (value: string) => findTag(value)?.label ?? value;

export const tagClassName = (value: string) => findTag(value)?.className ?? 'bg-neutral-100 text-neutral-800';
