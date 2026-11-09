-- 설계 7장 사진: 공개 버킷, 로그인 사용자는 본인 폴더({userId}/...)에만 업로드
-- 프론트가 긴 변 1280px WebP(브라우저가 WebP 인코딩을 못 하면 JPEG)로 줄여 올리므로 2MB면 충분하다
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-photos', 'place-photos', true, 2097152, array['image/webp', 'image/jpeg']);

create policy "upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'place-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
