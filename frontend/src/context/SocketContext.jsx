import { createContext, useEffect, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const sock = connectSocket();
      setSocket(sock);

      sock.on('connect', () => {
        setConnected(true);
        setError(null);
        console.log('Socket connected');
      });

      sock.on('disconnect', () => {
        setConnected(false);
        console.log('Socket disconnected');
      });

      sock.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        setError(err?.message || 'Connection error');
      });

      return () => {
        sock.off('connect');
        sock.off('disconnect');
        sock.off('connect_error');
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
