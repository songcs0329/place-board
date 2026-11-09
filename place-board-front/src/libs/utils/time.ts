export const HOUR = 3600_000;

export const ageMs = (iso: string) => Date.now() - new Date(iso).getTime();

// ponytail: 렌더될 때만 갱신. 화면을 오래 켜두면 "n분 전"이 멈춰 보이는데, 필요하면 1분 타이머로
export function timeAgo(iso: string) {
  const min = Math.floor(ageMs(iso) / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
}
