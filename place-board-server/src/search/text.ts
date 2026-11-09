import { createHash } from 'node:crypto';

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  apos: "'",
};

// 네이버 결과의 <b> 태그와 HTML 엔티티 제거
export const clean = (s = '') =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos);/g, (_, e: string) => ENTITIES[e])
    .trim();

// 태그·공백·특수문자 제거, 소문자
export const normalize = (s = '') =>
  clean(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');

// 설계 5장 장소 키: sha1(normalize(title) | normalize(roadAddress || address)) 앞 16자
export const makePlaceKey = (title: string, address: string) =>
  createHash('sha1')
    .update(`${normalize(title)}|${normalize(address)}`)
    .digest('hex')
    .slice(0, 16);

// 정규화한 이름이 한쪽에 포함되면 같은 가게 (2글자 미만은 오탐이 많아 제외)
export const sameName = (a: string, b: string) => {
  const x = normalize(a);
  const y = normalize(b);
  return x.length >= 2 && y.length >= 2 && (x.includes(y) || y.includes(x));
};
