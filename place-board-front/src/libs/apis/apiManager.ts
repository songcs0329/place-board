import restClient from '@/libs/apis/restClient';

// 백엔드(NestJS) 호출 함수
const apiManager = {
  search: (query: string) => restClient.post<ApiResponse.Search>('/search', { query }),
  createPost: (placeKey: string, input: ApiRequest.CreatePost) =>
    restClient.post<Db.Post>(`/places/${encodeURIComponent(placeKey)}/posts`, input),
  getSummary: (placeKey: string) =>
    restClient.get<ApiResponse.Summary>(`/places/${encodeURIComponent(placeKey)}/summary`),
};

export default apiManager;
