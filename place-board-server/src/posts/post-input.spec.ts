import { BadRequestException } from '@nestjs/common';
import { makeNickname, parsePost } from './post-input.js';

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const FILE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp';
const NOW = Date.parse('2026-11-09T05:00:00.000Z');
const HOUR = 3600_000;

describe('parsePost', () => {
  it('공백 글은 null, 태그 중복 제거', () => {
    expect(
      parsePost({ body: '  ', tags: ['seat:free', 'seat:free'] }, ME),
    ).toEqual({
      body: null,
      tags: ['seat:free'],
      images: [],
      photoTakenAt: null,
    });
  });

  it('글만 있어도 됨 (채팅)', () => {
    expect(parsePost({ body: ' 창가 비었어요 ' }, ME)).toMatchObject({
      body: '창가 비었어요',
      tags: [],
      images: [],
    });
  });

  it('사진만 있어도 됨, 촬영 시각 저장', () => {
    const taken = new Date(NOW - HOUR).toISOString();
    expect(
      parsePost({ imagePath: `${ME}/${FILE}`, photoTakenAt: taken }, ME, NOW),
    ).toEqual({
      body: null,
      tags: [],
      images: [`${ME}/${FILE}`],
      photoTakenAt: taken,
    });
  });

  it('사진 없이 온 촬영 시각은 버린다', () => {
    expect(
      parsePost({ body: 'a', photoTakenAt: new Date(NOW).toISOString() }, ME)
        .photoTakenAt,
    ).toBeNull();
  });

  it.each<[unknown, string]>([
    [{}, '내용 없음'],
    [{ body: 'a'.repeat(301) }, '300자 초과'],
    [{ tags: ['seat:empty'] }, '알 수 없는 태그'],
    [{ body: 1 }, 'body 타입'],
    [{ tags: 'seat:free' }, 'tags 타입'],
    [null, 'body 없음'],
    [{ imagePath: `${OTHER}/${FILE}` }, '남의 폴더'],
    [{ imagePath: `${ME}/../${OTHER}/${FILE}` }, '경로 조작'],
    [{ imagePath: `${ME}/${FILE}.png` }, '확장자'],
    [
      {
        imagePath: `${ME}/${FILE}`,
        photoTakenAt: new Date(NOW - 4 * HOUR).toISOString(),
      },
      '3시간 넘은 사진',
    ],
    [{ imagePath: `${ME}/${FILE}`, photoTakenAt: 'yesterday' }, '날짜 형식'],
  ])('400: %j (%s)', (input) => {
    expect(() => parsePost(input, ME, NOW)).toThrow(BadRequestException);
  });
});

describe('makeNickname', () => {
  it('같은 사람·같은 방이면 같고, 방이 바뀌면 달라진다', () => {
    const nickname = makeNickname('user-1', 'place-a');
    expect(makeNickname('user-1', 'place-a')).toBe(nickname);
    expect(makeNickname('user-1', 'place-b')).not.toBe(nickname);
    expect(nickname).toMatch(/^\S+ \S+ \d{1,2}$/);
  });
});
