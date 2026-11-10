import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import apiManager from '@/libs/apis/apiManager';
import { recentSearchesKey } from '@/hooks/useRecentSearches';
import storageUtils from '@/libs/utils/storageUtils';

const searchKey = ['search'];
export const LAST_SEARCH_KEY = 'lastSearch';

// 결과 저장은 화면이 아니라 여기서 한다: 검색 중 다른 탭으로 가서 검색 화면이 사라져도 결과가 남도록
export function useSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: searchKey,
    mutationFn: (query: string) => apiManager.search(query).then((response) => response.data),
    onSuccess: (data) => {
      storageUtils.setSessionStorage(LAST_SEARCH_KEY, data);
      // 새 검색이 실시간 게시판 탭 묶음에 바로 보이도록
      return queryClient.invalidateQueries({ queryKey: recentSearchesKey });
    },
  });
}

// 가장 최근 검색 요청의 상태. 화면을 떠났다 돌아와도 진행 중, 실패 상태를 이어서 보여준다
export function useLatestSearchState() {
  const states = useMutationState({
    filters: { mutationKey: searchKey },
    select: (mutation) =>
      mutation.state as { status: string; data?: ApiResponse.Search; error: unknown; variables?: string },
  });
  return states.at(-1);
}
