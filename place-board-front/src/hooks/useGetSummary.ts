import { useQuery } from '@tanstack/react-query';
import apiManager from '@/libs/apis/apiManager';

// AI 현장 요약 (설계 6장). 다시 만들지는 서버가 캐시 규칙으로 정하므로
// 글 수가 바뀔 때마다 물어봐도 Claude 호출은 늘지 않는다
export function useGetSummary(placeKey: string, postCount: number) {
  return useQuery({
    queryKey: ['summary', placeKey, postCount],
    queryFn: () => apiManager.getSummary(placeKey).then((response) => response.data),
    enabled: postCount > 0,
    placeholderData: (previous) => previous, // 새 글로 다시 물어보는 동안 이전 요약 유지
  });
}
