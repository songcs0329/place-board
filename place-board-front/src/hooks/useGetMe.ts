import { useQuery } from '@tanstack/react-query';
import apiManager from '@/libs/apis/apiManager';

export function useGetMe() {
  return useQuery({ queryKey: ['me'], queryFn: apiManager.getMe });
}
