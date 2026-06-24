const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API error');
  }

  return data;
};

export const auth = {
  register: (username, email, password) =>
    apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  login: (email, password) =>
    apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    apiCall('/api/auth/logout', { method: 'POST' }),
};

export const users = {
  getOnline: () => apiCall('/api/users/online'),
  getProfile: (userId) => apiCall(`/api/users/profile/${userId}`),
  updateProfile: (data) =>
    apiCall('/api/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getFriends: () => apiCall('/api/users/friends'),
};

export const rooms = {
  create: (data) =>
    apiCall('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAll: () => apiCall('/api/rooms'),
  getMyRooms: () => apiCall('/api/rooms/my-rooms'),
  getDetail: (roomId) => apiCall(`/api/rooms/${roomId}`),
  update: (roomId, data) =>
    apiCall(`/api/rooms/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (roomId) =>
    apiCall(`/api/rooms/${roomId}`, { method: 'DELETE' }),
  join: (roomId) =>
    apiCall(`/api/rooms/${roomId}/join`, { method: 'POST' }),
  leave: (roomId) =>
    apiCall(`/api/rooms/${roomId}/leave`, { method: 'POST' }),
  getMessages: (roomId) =>
    apiCall(`/api/rooms/${roomId}/messages`),
  promote: (roomId, targetUserId) =>
    apiCall(`/api/rooms/${roomId}/promote`, {
      method: 'PATCH',
      body: JSON.stringify({ targetUserId }),
    }),
  kick: (roomId, targetUserId) =>
    apiCall(`/api/rooms/${roomId}/kick`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    }),
  lock: (roomId) =>
    apiCall(`/api/rooms/${roomId}/lock`, { method: 'PATCH' }),
};

export const friends = {
  sendRequest: (recipientId) =>
    apiCall('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ recipientId }),
    }),
  getRequests: () => apiCall('/api/friends/requests'),
  accept: (requestId) =>
    apiCall(`/api/friends/accept/${requestId}`, { method: 'POST' }),
  decline: (requestId) =>
    apiCall(`/api/friends/decline/${requestId}`, { method: 'POST' }),
  remove: (friendId) =>
    apiCall(`/api/friends/${friendId}`, { method: 'DELETE' }),
};

export const sessions = {
  getHistory: () => apiCall('/api/sessions/history'),
  getStats: () => apiCall('/api/sessions/stats'),
  getRoomStats: (roomId) => apiCall(`/api/sessions/room/${roomId}`),
};

export const ai = {
  chat: (prompt, type) =>
    apiCall('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, type }),
    }),
};

export const files = {
  upload: (roomId, fileData) =>
    apiCall(`/api/files/${roomId}/upload`, {
      method: 'POST',
      body: JSON.stringify(fileData),
    }),
  getRoomFiles: (roomId) => apiCall(`/api/files/${roomId}`),
  download: (fileId) => apiCall(`/api/files/download/${fileId}`),
};
