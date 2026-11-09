import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiManager from '@/libs/apis/apiManager';
import { postsKey, removePost } from '@/hooks/usePosts';

// 신고: 신고한 사람에게는 바로 숨긴다 (서버 RLS와 같은 결과를 화면에 먼저 반영)
export function useReportPost(placeKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, reason }: { postId: number; reason: ApiRequest.ReportReason }) =>
      apiManager.reportPost(postId, reason),
    onSuccess: (_, { postId }) => removePost(queryClient, placeKey, postId),
  });
}

// 차단: 그 작성자의 글이 모든 장소에서 사라지므로 이 방 글과 메모 배지를 다시 불러온다
export function useBlockAuthor(placeKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => apiManager.blockAuthor(postId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: postsKey(placeKey) }),
        queryClient.invalidateQueries({ queryKey: ['latestMemos'] }),
      ]),
  });
}
