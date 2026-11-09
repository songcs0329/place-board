import { readTakenAt } from '@/libs/exif';
import { supabase } from '@/libs/supabase';
import { HOUR } from '@/libs/utils/time';

export const BUCKET = 'place-photos';
const MAX_SIDE = 1280;

export class PhotoError extends Error {}

export interface ProcessedPhoto {
  blob: Blob;
  ext: 'webp' | 'jpg';
  takenAt: Date | null;
}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.8));

// 설계 7장: 촬영 시각만 읽고, canvas로 다시 그려 EXIF(GPS 포함)를 전부 지운 뒤 긴 변 1280px로 줄인다
export async function processPhoto(file: File, now = Date.now()): Promise<ProcessedPhoto> {
  const takenAt = await readTakenAt(file);
  if (takenAt && now - takenAt.getTime() > 3 * HOUR) {
    throw new PhotoError('3시간 넘게 지난 사진은 올릴 수 없어요. 지금 찍은 사진을 올려주세요.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new PhotoError('이 사진 형식은 올릴 수 없어요.');
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // WebP 인코딩을 못 하는 브라우저는 PNG를 돌려주므로 그때는 JPEG로
  const webp = await toBlob(canvas, 'image/webp');
  if (webp?.type === 'image/webp') return { blob: webp, ext: 'webp', takenAt };
  const jpeg = await toBlob(canvas, 'image/jpeg');
  if (!jpeg) throw new PhotoError('사진을 처리하지 못했어요.');
  return { blob: jpeg, ext: 'jpg', takenAt };
}

// 본인 폴더에만 올릴 수 있다 (Storage 정책). 경로를 돌려준다
export async function uploadPhoto(userId: string, photo: ProcessedPhoto) {
  const path = `${userId}/${crypto.randomUUID()}.${photo.ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, photo.blob, { contentType: photo.blob.type });
  if (error) throw new PhotoError('사진을 올리지 못했어요. 다시 시도해 주세요.');
  return path;
}

export const photoUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
