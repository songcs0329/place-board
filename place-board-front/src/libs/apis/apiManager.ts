import restClient from '@/libs/apis/restClient';

// 백엔드(NestJS) 호출 함수: search, createPost, getSummary 등을 여기에 추가
const apiManager = {
  getMe: () => restClient.get<ApiResponse.Me>('/me'),
};

export default apiManager;
