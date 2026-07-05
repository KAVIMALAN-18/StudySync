import { createContext, useEffect, useState, useContext } from 'react';
import { connectSocket, disconnectSocket } from '../services/socket';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
      return;
    }

    try {
      const sock = connectSocket();
      setSocket(sock);

      if (sock.connected) {
        setConnected(true);
        if (user) {
          sock.emit('user:online', { userId: user._id, username: user.username, avatar: user.avatar });
        }
      }

      const onConnect = () => {
        setConnected(true);
        setError(null);
        console.log('Socket connected');
        if (user) {
          sock.emit('user:online', { userId: user._id, username: user.username, avatar: user.avatar });
        }
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
  }, [user]);

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
