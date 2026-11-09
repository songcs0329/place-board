import { clean, makePlaceKey, normalize, sameName } from './text.js';

describe('text', () => {
  it('clean: <b> 태그와 엔티티 제거', () => {
    expect(clean('<b>숲결</b> 카페 &amp; 베이커리 &quot;2층&quot;')).toBe('숲결 카페 & 베이커리 "2층"');
  });

  it('normalize: 공백·특수문자 제거, 소문자', () => {
    expect(normalize('<b>Oak</b> House · 남양주점!')).toBe('oakhouse남양주점');
  });

  it('makePlaceKey: 표기 차이에 상관없이 같은 키, 16자', () => {
    const a = makePlaceKey('<b>숲결</b> 카페', '경기도 양평군 서종면 1');
    const b = makePlaceKey('숲결카페', '경기도  양평군 서종면 1');
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });

  it('sameName: 포함 관계면 같은 가게, 너무 짧으면 아님', () => {
    expect(sameName('숲결 카페 양평점', '숲결카페')).toBe(true);
    expect(sameName('숲결카페', '나무온')).toBe(false);
    expect(sameName('A', 'A카페')).toBe(false);
  });
});
