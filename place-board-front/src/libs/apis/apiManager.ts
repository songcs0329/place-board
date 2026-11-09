import restClient from '@/libs/apis/restClient';

// 백엔드(NestJS) 호출 함수
const apiManager = {
  search: (query: string) => restClient.post<ApiResponse.Search>('/search', { query }),
  createPost: (placeKey: string, input: ApiRequest.CreatePost) =>
    restClient.post<Db.Post>(`/places/${encodeURIComponent(placeKey)}/posts`, input),
  getSummary: (placeKey: string) =>
    restClient.get<ApiResponse.Summary>(`/places/${encodeURIComponent(placeKey)}/summary`),
  reportPost: (postId: number, reason: ApiRequest.ReportReason) =>
    restClient.post<void>(`/posts/${postId}/report`, { reason }),
  blockAuthor: (postId: number) => restClient.post<void>(`/posts/${postId}/block-author`),
};

export default apiManager;
