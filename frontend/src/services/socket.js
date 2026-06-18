import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const on = (event, callback) => {
  if (!socket) connectSocket();
  socket.on(event, callback);
};

export const off = (event, callback) => {
  if (socket) socket.off(event, callback);
};

export const emit = (event, data) => {
  if (!socket) connectSocket();
  socket.emit(event, data);
};
