import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiManager from '@/libs/apis/apiManager';
import { recentSearchesKey } from '@/hooks/useRecentSearches';

export function useSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (query: string) => apiManager.search(query).then((response) => response.data),
    // 새 검색이 실시간 게시판 탭 묶음에 바로 보이도록
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recentSearchesKey }),
  });
}
