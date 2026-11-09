import { BadRequestException } from '@nestjs/common';
import { makeNickname, parsePost } from './post-input.js';

describe('parsePost', () => {
  it('공백 글은 null, 태그 중복 제거', () => {
    expect(parsePost({ body: '  ', tags: ['seat:free', 'seat:free'] })).toEqual(
      { body: null, tags: ['seat:free'] },
    );
  });

  it('글만 있어도 됨 (채팅)', () => {
    expect(parsePost({ body: ' 창가 비었어요 ' })).toEqual({
      body: '창가 비었어요',
      tags: [],
    });
  });

  it.each<[unknown, string]>([
    [{}, '내용 없음'],
    [{ body: 'a'.repeat(301) }, '300자 초과'],
    [{ tags: ['seat:empty'] }, '알 수 없는 태그'],
    [{ body: 1 }, 'body 타입'],
    [{ tags: 'seat:free' }, 'tags 타입'],
    [null, 'body 없음'],
  ])('400: %j (%s)', (input) => {
    expect(() => parsePost(input)).toThrow(BadRequestException);
  });
});

describe('makeNickname', () => {
  it('같은 사람·같은 방이면 같고, 방이 바뀌면 달라진다', () => {
    const a = makeNickname('user-1', 'place-a');
    expect(makeNickname('user-1', 'place-a')).toBe(a);
    expect(makeNickname('user-1', 'place-b')).not.toBe(a);
    expect(a).toMatch(/^\S+ \S+ \d{1,2}$/);
  });
});
