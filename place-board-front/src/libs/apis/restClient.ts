import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
