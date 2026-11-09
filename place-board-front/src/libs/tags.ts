// 빠른 태그 (설계 6장). 서버 src/posts/post-input.ts와 같은 목록
export const TAGS = [
  { value: 'seat:free', label: '자리 여유' },
  { value: 'seat:normal', label: '자리 보통' },
  { value: 'seat:full', label: '만석' },
  { value: 'parking:free', label: '주차 여유' },
  { value: 'parking:wait', label: '주차 대기' },
  { value: 'waiting:yes', label: '웨이팅 있음' },
];

export const tagLabel = (value: string) => TAGS.find((t) => t.value === value)?.label ?? value;
