import restClient from '@/libs/apis/restClient';

// 백엔드(NestJS) 호출 함수
const apiManager = {
  search: (query: string) => restClient.post<ApiResponse.Search>('/search', { query }),
  createPost: (placeKey: string, input: ApiRequest.CreatePost) =>
    restClient.post<Db.Post>(`/places/${encodeURIComponent(placeKey)}/posts`, input),
};

export default apiManager;
