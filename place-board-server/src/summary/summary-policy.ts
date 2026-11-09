const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export interface CachedSummary {
  summary: string;
  last_post_at: string;
  generated_at: string;
}

// 설계 6장: 새 글이 3개 이상 쌓였거나, 10분이 지나고 새 글이 있을 때만 다시 만든다
// 6시간 넘은 요약은 그 사이 글이 만료됐을 수 있어 다시 만든다
export function shouldRegenerate(
  cached: CachedSummary | null,
  postTimes: string[],
  now = Date.now(),
): boolean {
  if (!cached) return true;
  const lastPostAt = new Date(cached.last_post_at).getTime();
  const generatedAt = new Date(cached.generated_at).getTime();
  const newCount = postTimes.filter(
    (time) => new Date(time).getTime() > lastPostAt,
  ).length;

  if (now - generatedAt >= 6 * HOUR) return true;
  if (newCount >= 3) return true;
  return newCount > 0 && now - generatedAt >= 10 * MINUTE;
}
