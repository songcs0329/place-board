import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiManager from '@/libs/apis/apiManager';
import { addPost } from '@/hooks/usePosts';
import { uploadPhoto, type ProcessedPhoto } from '@/libs/photo';
import { supabase } from '@/libs/supabase';

interface Input {
  body?: string;
  tags: string[];
  photo?: ProcessedPhoto;
}

// 사진이 있으면 Storage(본인 폴더)에 먼저 올리고, 그 경로로 글을 쓴다
// ponytail: 업로드 후 글쓰기가 실패하면 파일이 남는다. 쌓이면 Storage 고아 파일 정리를 추가
export function useCreatePost(placeKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, tags, photo }: Input) => {
      let imagePath: string | undefined;
      if (photo) {
        const { data } = await supabase.auth.getSession();
        imagePath = await uploadPhoto(data.session!.user.id, photo);
      }
      const response = await apiManager.createPost(placeKey, {
        body,
        tags,
        imagePath,
        photoTakenAt: photo?.takenAt?.toISOString(),
      });
      return response.data;
    },
    // Realtime보다 응답이 먼저 오면 바로 반영 (id로 중복 제거)
    onSuccess: (post) => addPost(queryClient, placeKey, post),
  });
}
