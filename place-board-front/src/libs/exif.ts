// JPEG EXIF에서 촬영 시각(DateTimeOriginal, 0x9003)만 읽는다. 없거나 JPEG가 아니면 null
// 다른 EXIF(위치 등)는 읽지 않고, 업로드 전 canvas로 다시 그려 전부 지운다 (설계 7장)
// import 없는 순수 함수라 node로 바로 검증할 수 있다: node scripts/exif-check.ts
export async function readTakenAt(file: Blob): Promise<Date | null> {
  try {
    const view = new DataView(await file.slice(0, 128 * 1024).arrayBuffer());
    if (view.getUint16(0) !== 0xffd8) return null; // JPEG SOI
    let offset = 2;
    while (offset + 10 <= view.byteLength) {
      const marker = view.getUint16(offset);
      if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) return readTiff(view, offset + 10); // "Exif"
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null; // 손상 또는 이미지 데이터 시작
      offset += 2 + view.getUint16(offset + 2);
    }
    return null;
  } catch {
    return null; // 잘린 파일 등 범위 밖 접근
  }
}

function readTiff(view: DataView, tiffStart: number): Date | null {
  const littleEndian = view.getUint16(tiffStart) === 0x4949; // "II"
  const readUint16 = (offset: number) => view.getUint16(tiffStart + offset, littleEndian);
  const readUint32 = (offset: number) => view.getUint32(tiffStart + offset, littleEndian);
  const findEntry = (directory: number, tag: number) => {
    const entryCount = readUint16(directory);
    for (let index = 0; index < entryCount; index++) {
      const entry = directory + 2 + index * 12;
      if (readUint16(entry) === tag) return entry;
    }
    return -1;
  };

  const exifPointer = findEntry(readUint32(4), 0x8769); // IFD0 → Exif IFD
  if (exifPointer < 0) return null;
  const dateEntry = findEntry(readUint32(exifPointer + 8), 0x9003);
  if (dateEntry < 0) return null;

  // ASCII 20바이트 "YYYY:MM:DD HH:MM:SS\0"는 4바이트를 넘으므로 값 위치는 항상 오프셋
  const valueOffset = readUint32(dateEntry + 8);
  const text = Array.from({ length: 19 }, (_, index) =>
    String.fromCharCode(view.getUint8(tiffStart + valueOffset + index)),
  ).join('');
  const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
  if (!match || +match[1] < 1990 || +match[2] < 1) return null; // 카메라가 시각을 몰라 "0000:00:00 ..."로 채운 경우
  const [, year, month, day, hour, minute, second] = match.map(Number);
  // EXIF 시각에는 시간대가 없다: 찍은 기기와 지금 기기의 시간대가 같다고 본다
  const date = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(date.getTime()) ? null : date;
}
