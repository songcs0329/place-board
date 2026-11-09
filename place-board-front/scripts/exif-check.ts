// node scripts/exif-check.ts : 최소 JPEG(EXIF DateTimeOriginal 포함)를 직접 만들어 readTakenAt 검증
import assert from 'node:assert/strict';
import { readTakenAt } from '../src/libs/exif.ts';

function makeJpeg(littleEndian: boolean, date: string | null, otherTagFirst = false) {
  const tiff: number[] = [];
  const write16 = (value: number) =>
    littleEndian ? tiff.push(value & 255, value >> 8) : tiff.push(value >> 8, value & 255);
  const write32 = (value: number) =>
    littleEndian
      ? tiff.push(value & 255, (value >> 8) & 255, (value >> 16) & 255, value >>> 24)
      : tiff.push(value >>> 24, (value >> 16) & 255, (value >> 8) & 255, value & 255);

  tiff.push(...(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d]));
  write16(42);
  write32(8); // IFD0 위치
  // IFD0: Exif 포인터(0x8769), 필요하면 앞에 GPS 포인터(0x8825)
  const tags = otherTagFirst ? [0x8825, 0x8769] : [0x8769];
  write16(tags.length);
  const exifDirectory = 8 + 2 + tags.length * 12 + 4;
  for (const tag of tags) {
    write16(tag);
    write16(4);
    write32(1);
    write32(exifDirectory);
  }
  write32(0);
  // Exif IFD
  write16(date ? 1 : 0);
  if (date) {
    write16(0x9003);
    write16(2);
    write32(20);
    write32(exifDirectory + 2 + 12 + 4);
  }
  write32(0);
  if (date) for (const character of date + '\0') tiff.push(character.charCodeAt(0));

  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]; // "Exif\0\0"
  const length = app1.length + 2;
  return new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 255, ...app1, 0xff, 0xda, 0, 2])]);
}

const expected = new Date(2026, 10, 9, 13, 5, 7).getTime();
const taken = '2026:11:09 13:05:07';
assert.equal((await readTakenAt(makeJpeg(true, taken)))?.getTime(), expected, 'little endian');
assert.equal((await readTakenAt(makeJpeg(false, taken)))?.getTime(), expected, 'big endian');
assert.equal((await readTakenAt(makeJpeg(true, taken, true)))?.getTime(), expected, '다른 태그가 앞에 있어도');
assert.equal(await readTakenAt(makeJpeg(true, null)), null, '촬영 시각 없음');
assert.equal(await readTakenAt(makeJpeg(true, '0000:00:00 00:00:00')), null, '빈 값');
assert.equal(await readTakenAt(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])])), null, 'PNG');
assert.equal(await readTakenAt(makeJpeg(true, taken).slice(0, 30)), null, '잘린 파일');
console.log('exif ok');
