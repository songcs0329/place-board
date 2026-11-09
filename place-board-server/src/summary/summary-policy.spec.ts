import { shouldRegenerate } from './summary-policy.js';

const NOW = Date.parse('2026-11-09T06:00:00.000Z');
const minutesAgo = (minutes: number) =>
  new Date(NOW - minutes * 60_000).toISOString();

const cached = (generatedMinutesAgo: number, lastPostMinutesAgo: number) => ({
  summary: '자리 여유',
  generated_at: minutesAgo(generatedMinutesAgo),
  last_post_at: minutesAgo(lastPostMinutesAgo),
});

describe('shouldRegenerate', () => {
  it('캐시가 없으면 만든다', () => {
    expect(shouldRegenerate(null, [minutesAgo(1)], NOW)).toBe(true);
  });

  it('새 글이 없으면 그대로', () => {
    expect(shouldRegenerate(cached(30, 40), [minutesAgo(40)], NOW)).toBe(false);
  });

  it('새 글 3개 이상이면 10분이 안 지나도 다시', () => {
    const times = [minutesAgo(1), minutesAgo(2), minutesAgo(3)];
    expect(shouldRegenerate(cached(5, 10), times, NOW)).toBe(true);
  });

  it('새 글 1~2개는 10분 지나야 다시', () => {
    expect(shouldRegenerate(cached(5, 10), [minutesAgo(1)], NOW)).toBe(false);
    expect(shouldRegenerate(cached(10, 15), [minutesAgo(1)], NOW)).toBe(true);
  });

  it('6시간 넘은 요약은 새 글이 없어도 다시', () => {
    expect(shouldRegenerate(cached(361, 400), [minutesAgo(300)], NOW)).toBe(
      true,
    );
  });
});
