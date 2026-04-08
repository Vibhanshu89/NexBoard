import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexboard_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong';

    if (error.response?.status === 401) {
      localStorage.removeItem('nexboard_token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (error.response?.status === 429) {
      toast.error('Too many requests. Please slow down.');
      return Promise.reject(error);
    }

    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.');
    }

    return Promise.reject({ ...error, message });
  }
);

// ─── Room API ──────────────────────────────────────────────────────────────────
export const roomAPI = {
  create: (data) => api.post('/rooms', data),
  getAll: (params) => api.get('/rooms', { params }),
  getMy: () => api.get('/rooms/my'),
  getOne: (roomId) => api.get(`/rooms/${roomId}`),
  join: (roomId, data) => api.post(`/rooms/${roomId}/join`, data),
  update: (roomId, data) => api.put(`/rooms/${roomId}`, data),
  delete: (roomId) => api.delete(`/rooms/${roomId}`),
  updateRole: (roomId, userId, role) =>
    api.patch(`/rooms/${roomId}/participants/${userId}/role`, { role }),
};

// ─── Whiteboard API ────────────────────────────────────────────────────────────
export const whiteboardAPI = {
  get: (roomId) => api.get(`/whiteboard/${roomId}`),
  save: (roomId, data) => api.post(`/whiteboard/${roomId}/save`, data),
  clear: (roomId) => api.delete(`/whiteboard/${roomId}/clear`),
  getChatHistory: (roomId) => api.get(`/whiteboard/${roomId}/chat`),
};

// ─── Upload API ────────────────────────────────────────────────────────────────
export const uploadAPI = {
  uploadImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
