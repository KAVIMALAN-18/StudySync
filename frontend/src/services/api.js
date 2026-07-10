import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global Error handling & session expiration resets
api.interceptors.response.use(
  (response) => {
    // Return standard body payload directly
    return response.data;
  },
  (error) => {
    const originalRequest = error.config;
    
    // Auto logout on 401 Unauthorized exceptions
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login';
      }
    }
    
    const errMsg = error.response?.data?.error || error.response?.data?.message || 'API request failed';
    return Promise.reject(new Error(errMsg));
  }
);

export const auth = {
  register: (username, email, password, extraFields = {}) =>
    api.post('/api/auth/register', { username, email, password, ...extraFields }),

  login: (email, password) =>
    api.post('/api/auth/login', { email, password }),

  logout: () =>
    api.post('/api/auth/logout'),
};

export const users = {
  getOnline: () => api.get('/api/users/online'),
  getProfile: (userId) => api.get(`/api/users/profile/${userId}`),
  updateProfile: (data) => api.patch('/api/users/profile', data),
  getFriends: () => api.get('/api/users/friends'),
  search: (query) => api.get(`/api/users/search?q=${encodeURIComponent(query)}`),
  updateSettings: (data) => api.patch('/api/users/settings', data),
  deleteAccount: () => api.delete('/api/users/account'),
};

export const rooms = {
  create: (data) => api.post('/api/rooms', data),
  getAll: () => api.get('/api/rooms'),
  getMyRooms: () => api.get('/api/rooms/my-rooms'),
  getDetail: (roomId) => api.get(`/api/rooms/${roomId}`),
  getById: (roomId) => api.get(`/api/rooms/${roomId}`),
  update: (roomId, data) => api.patch(`/api/rooms/${roomId}`, data),
  delete: (roomId) => api.delete(`/api/rooms/${roomId}`),
  join: (roomId) => api.post(`/api/rooms/${roomId}/join`),
  joinByCode: (code) => api.post('/api/rooms/join-by-code', { code }),
  leave: (roomId) => api.post(`/api/rooms/${roomId}/leave`),
  getMessages: (roomId) => api.get(`/api/rooms/${roomId}/messages`),
  promote: (roomId, targetUserId) => api.patch(`/api/rooms/${roomId}/promote`, { targetUserId }),
  kick: (roomId, targetUserId) => api.post(`/api/rooms/${roomId}/kick`, { targetUserId }),
  lock: (roomId) => api.patch(`/api/rooms/${roomId}/lock`),
  updateRole: (roomId, targetUserId, role) => api.patch(`/api/rooms/${roomId}/promote`, { targetUserId, role }),
  removeMember: (roomId, targetUserId) => api.post(`/api/rooms/${roomId}/kick`, { targetUserId }),
  toggleLock: (roomId) => api.patch(`/api/rooms/${roomId}/lock`),
  getByCode: (code) => api.get(`/api/rooms/code/${code}`),
  demote: (roomId, targetUserId) => api.patch(`/api/rooms/${roomId}/demote`, { targetUserId }),
  transferOwnership: (roomId, targetUserId) => api.patch(`/api/rooms/${roomId}/transfer-ownership`, { targetUserId }),
};

export const friends = {
  sendRequest: (recipientId) => api.post('/api/friends/request', { recipientId }),
  getRequests: () => api.get('/api/friends/requests'),
  accept: (requestId) => api.post(`/api/friends/accept/${requestId}`),
  decline: (requestId) => api.post(`/api/friends/decline/${requestId}`),
  remove: (friendId) => api.delete(`/api/friends/${friendId}`),
};

export const sessions = {
  getHistory: (userId) => api.get(userId ? `/api/sessions/history?userId=${userId}` : '/api/sessions/history'),
  getStats: (userId) => api.get(userId ? `/api/sessions/stats?userId=${userId}` : '/api/sessions/stats'),
  getWeekly: () => api.get('/api/sessions/weekly'),
  getRoomStats: (roomId) => api.get(`/api/sessions/room/${roomId}`),
  getRoomLeaderboard: (roomId) => api.get(`/api/sessions/room/${roomId}`),
};

export const ai = {
  chat: (prompt, type) => api.post('/api/ai/chat', { prompt, type }),
};

export const files = {
  upload: (roomId, fileData) => api.post(`/api/files/${roomId}/upload`, fileData),
  getRoomFiles: (roomId) => api.get(`/api/files/${roomId}`),
  download: (fileId) => api.get(`/api/files/download/${fileId}`),
};

export default api;
