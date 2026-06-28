import { createContext, useEffect, useState } from 'react';
import { connectSocket, disconnectSocket } from '../services/socket';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only connect if user is authenticated (token exists)
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    try {
      const sock = connectSocket();
      setSocket(sock);

      const onConnect = () => {
        setConnected(true);
        setError(null);
        console.log('Socket connected');
      };

      const onDisconnect = () => {
        setConnected(false);
        console.log('Socket disconnected');
      };

      const onConnectError = (err) => {
        console.error('Socket connection error:', err);
        setError(err?.message || 'Connection error');
      };

      sock.on('connect', onConnect);
      sock.on('disconnect', onDisconnect);
      sock.on('connect_error', onConnectError);

      return () => {
        sock.off('connect', onConnect);
        sock.off('disconnect', onDisconnect);
        sock.off('connect_error', onConnectError);
      };
    } catch (err) {
      console.error('Socket initialization error:', err);
      setError(err?.message || 'Socket initialization failed');
    }
  }, []);

  const value = {
    socket,
    connected,
    error,
    emit: (event, data) => {
      try {
        socket?.emit(event, data);
      } catch (err) {
        console.error('Socket emit error:', err);
      }
    },
    on: (event, callback) => {
      try {
        socket?.on(event, callback);
      } catch (err) {
        console.error('Socket on error:', err);
      }
    },
    off: (event, callback) => {
      try {
        socket?.off(event, callback);
      } catch (err) {
        console.error('Socket off error:', err);
      }
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
