import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiManager from '@/libs/apis/apiManager';
import { addPost } from '@/hooks/usePosts';

export function useCreatePost(placeKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ApiRequest.CreatePost) => apiManager.createPost(placeKey, input).then((res) => res.data),
    // Realtime보다 응답이 먼저 오면 바로 반영 (id로 중복 제거)
    onSuccess: (post) => addPost(qc, placeKey, post),
  });
}
