import restClient from '@/libs/apis/restClient';

// 백엔드(NestJS) 호출 함수
const apiManager = {
  search: (query: string) => restClient.post<ApiResponse.Search>('/search', { query }),
};

export default apiManager;
