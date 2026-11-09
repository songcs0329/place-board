import axios from 'axios';
import { supabase } from '@/libs/supabase';

const api = axios.create({
  baseURL: '/api',
});

// 백엔드는 모든 API에서 Supabase access token을 검증한다
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session) config.headers.Authorization = `Bearer ${data.session.access_token}`;
  return config;
});

const restClient = {
  get: async <T>(url: string, params = {}, config = {}) => {
    const response = await api.get<T>(url, { params, ...config });
    return {
      status: response.status,
      data: response.data,
    };
  },
  post: async <T>(url: string, data = {}, config = {}) => {
    const response = await api.post<T>(url, data, config);
    return {
      status: response.status,
      data: response.data,
    };
  },
  put: async <T>(url: string, data = {}, config = {}) => {
    const response = await api.put<T>(url, data, config);
    return {
      status: response.status,
      data: response.data,
    };
  },
  patch: async <T>(url: string, data = {}, config = {}) => {
    const response = await api.patch<T>(url, data, config);
    return {
      status: response.status,
      data: response.data,
    };
  },
  delete: async <T>(url: string, data = {}) => {
    const response = await api.delete<T>(url, { data });
    return {
      status: response.status,
      data: response.data,
    };
  },
};

export default restClient;
