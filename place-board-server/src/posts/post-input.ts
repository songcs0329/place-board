import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

// 빠른 태그 (설계 6장). 프론트 src/libs/tags.ts와 같은 목록
export const TAG_LABELS: Record<string, string> = {
  'seat:free': '자리 여유',
  'seat:normal': '자리 보통',
  'seat:full': '만석',
  'parking:free': '주차 여유',
  'parking:wait': '주차 대기',
  'waiting:yes': '웨이팅 있음',
};
export const TAGS = Object.keys(TAG_LABELS);

const HOUR = 3600_000;
// 프론트가 올리는 경로: {userId}/{uuid}.webp|jpg (설계 7장)
const IMAGE_PATH = /^([0-9a-f-]{36})\/[0-9a-f-]{36}\.(webp|jpg)$/;

// 글 300자, 알 수 없는 태그 금지, 남의 폴더 사진 금지, 내용·태그·사진 중 하나는 필수
export function parsePost(
  input: unknown,
  userId: string,
  now = Date.now(),
): {
  body: string | null;
  tags: string[];
  images: string[];
  photoTakenAt: string | null;
} {
  const raw = (input ?? {}) as {
    body?: unknown;
    tags?: unknown;
    imagePath?: unknown;
    photoTakenAt?: unknown;
  };
  if (raw.body != null && typeof raw.body !== 'string')
    throw new BadRequestException('body는 문자열');
  if (raw.tags != null && !Array.isArray(raw.tags))
    throw new BadRequestException('tags는 배열');
  if (raw.imagePath != null && typeof raw.imagePath !== 'string')
    throw new BadRequestException('imagePath는 문자열');
  if (raw.photoTakenAt != null && typeof raw.photoTakenAt !== 'string')
    throw new BadRequestException('photoTakenAt은 문자열');

  const body = raw.body?.trim() || null;
  const tags = [...new Set((raw.tags ?? []) as unknown[])];
  const images = raw.imagePath ? [raw.imagePath] : [];

  if (body && body.length > 300)
    throw new BadRequestException('글은 300자까지');
  if (tags.some((tag) => typeof tag !== 'string' || !TAGS.includes(tag)))
    throw new BadRequestException('알 수 없는 태그');
  if (images.length && IMAGE_PATH.exec(images[0])?.[1] !== userId)
    throw new BadRequestException('본인 폴더의 사진만');
  if (!body && !tags.length && !images.length)
    throw new BadRequestException('내용, 태그, 사진 중 하나는 필요');

  // 촬영 시각: 사진이 있을 때만 의미 있음. 3시간 넘은 사진은 막는다 (프론트도 막지만 서버에서 한 번 더)
  let photoTakenAt: string | null = null;
  if (images.length && raw.photoTakenAt) {
    const takenAt = new Date(raw.photoTakenAt).getTime();
    if (Number.isNaN(takenAt))
      throw new BadRequestException('photoTakenAt 형식');
    if (now - takenAt > 3 * HOUR)
      throw new BadRequestException('3시간 넘게 지난 사진');
    photoTakenAt = new Date(Math.min(takenAt, now)).toISOString();
  }

  return { body, tags: tags as string[], images, photoTakenAt };
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
  const hash = createHash('sha256').update(`${userId}|${placeKey}`).digest();
  return `${ADJECTIVES[hash[0] % ADJECTIVES.length]} ${ANIMALS[hash[1] % ANIMALS.length]} ${(hash.readUInt16BE(2) % 99) + 1}`;
}
