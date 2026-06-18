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
