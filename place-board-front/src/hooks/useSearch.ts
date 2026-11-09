import { useMutation } from '@tanstack/react-query';
import apiManager from '@/libs/apis/apiManager';

export function useSearch() {
  return useMutation({ mutationFn: (query: string) => apiManager.search(query).then((res) => res.data) });
}
