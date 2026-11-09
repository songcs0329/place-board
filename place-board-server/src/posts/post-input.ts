import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

// 빠른 태그 (설계 6장). 프론트 src/libs/tags.ts와 같은 목록
export const TAGS = [
  'seat:free',
  'seat:normal',
  'seat:full',
  'parking:free',
  'parking:wait',
  'waiting:yes',
];

// 글 300자, 알 수 없는 태그 금지, 내용·태그 중 하나는 필수 (사진은 5단계)
export function parsePost(input: unknown): {
  body: string | null;
  tags: string[];
} {
  const raw = (input ?? {}) as { body?: unknown; tags?: unknown };
  if (raw.body != null && typeof raw.body !== 'string')
    throw new BadRequestException('body는 문자열');
  if (raw.tags != null && !Array.isArray(raw.tags))
    throw new BadRequestException('tags는 배열');

  const body = raw.body?.trim() || null;
  const tags = [...new Set((raw.tags ?? []) as unknown[])];

  if (body && body.length > 300)
    throw new BadRequestException('글은 300자까지');
  if (tags.some((t) => typeof t !== 'string' || !TAGS.includes(t)))
    throw new BadRequestException('알 수 없는 태그');
  if (!body && !tags.length)
    throw new BadRequestException('내용이나 태그 중 하나는 필요');

  return { body, tags: tags as string[] };
}

const ADJECTIVES = [
  '우드톤',
  '느긋한',
  '조용한',
  '바삭한',
  '단단한',
  '포근한',
  '상냥한',
  '씩씩한',
  '말랑한',
  '반짝이는',
  '수줍은',
  '든든한',
  '향긋한',
  '명랑한',
  '차분한',
  '엉뚱한',
];
const ANIMALS = [
  '고양이',
  '수달',
  '다람쥐',
  '참새',
  '여우',
  '곰',
  '토끼',
  '펭귄',
  '부엉이',
  '고슴도치',
  '너구리',
  '사슴',
  '오리',
  '판다',
  '햄스터',
  '거북이',
];

// 방마다 랜덤 닉네임: 같은 방에서는 항상 같고, 방이 바뀌면 달라진다
// ponytail: 16×16×99 조합이라 한 방에서 두 사람이 같은 닉네임이 될 수 있음. 문제 되면 숫자 범위를 늘릴 것
export function makeNickname(userId: string, placeKey: string) {
  const h = createHash('sha256').update(`${userId}|${placeKey}`).digest();
  return `${ADJECTIVES[h[0] % ADJECTIVES.length]} ${ANIMALS[h[1] % ANIMALS.length]} ${(h.readUInt16BE(2) % 99) + 1}`;
}
