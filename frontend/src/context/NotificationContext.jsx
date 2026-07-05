import { createContext, useState, useEffect, useContext } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, FileText, Flame, ShieldAlert, Sparkles } from 'lucide-react';

export const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const { socket } = useSocket();
  const navigate = useNavigate();

  const addToast = (message, type = 'info', action = null) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, action }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!socket) return;

    // 1. Listen for room invitations
    const handleInviteReceived = (data) => {
      const { roomId, room, senderName } = data;
      const roomName = room?.name || 'Study Room';
      
      addToast(
        `✉️ ${senderName || 'A collaborator'} invited you to join "${roomName}"`,
        'success',
        {
          label: 'Join Space',
          onClick: () => {
            socket.emit('room:join', { roomId, userId: socket.userId });
            navigate(`/room/${roomId}`);
          }
        }
      );
    };

    // 2. Listen for shared files in active room
    const handleFileShared = (newFile) => {
      // Don't show toast if it's uploaded by this user
      if (newFile.uploadedBy === socket.userId || newFile.uploadedBy?._id === socket.userId) {
        return;
      }
      addToast(`📁 New file shared: "${newFile.originalName}" by ${newFile.uploadedBy?.username || 'member'}`, 'info');
    };

    // 3. Listen for timer triggers
    const handleTimerSync = (data) => {
      const { action, mode } = data;
      if (action === 'started') {
        addToast(`⏱️ Pomodoro started: ${mode === 'focus' ? 'Deep Work Focus Session!' : 'Rest Break Session!'}`, 'info');
      } else if (action === 'mode-switched') {
        addToast(`🔔 Time's up! Transitioned to ${mode === 'focus' ? 'Focus Session' : 'Break Time'}.`, 'success');
      } else if (action === 'paused') {
        addToast('⏱️ Pomodoro timer paused.', 'info');
      }
    };

    socket.on('room:invite-received', handleInviteReceived);
    socket.on('file:shared', handleFileShared);
    socket.on('timer:sync', handleTimerSync);

    return () => {
      socket.off('room:invite-received', handleInviteReceived);
      socket.off('file:shared', handleFileShared);
      socket.off('timer:sync', handleTimerSync);
    };
  }, [socket, navigate]);

  return (
    <NotificationContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Floating Toast Notification Portal */}
      <div 
        style={{ 
          position: 'fixed', 
          bottom: '2rem', 
          right: '2rem', 
          zIndex: 9999, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.75rem', 
          maxWidth: '380px', 
          width: '90%' 
        }}
      >
        {toasts.map((toast) => {
          let bg = 'rgba(15, 23, 42, 0.9)';
          let border = '1px solid rgba(255,255,255,0.08)';
          let icon = <Bell size={16} color="#818cf8" />;

          if (toast.type === 'success') {
            bg = 'rgba(16, 185, 129, 0.15)';
            border = '1px solid rgba(16, 185, 129, 0.3)';
            icon = <Check size={16} color="#10b981" />;
          } else if (toast.type === 'error') {
            bg = 'rgba(239, 68, 68, 0.15)';
            border = '1px solid rgba(239, 68, 68, 0.3)';
            icon = <ShieldAlert size={16} color="#ef4444" />;
          }

          return (
            <div 
              key={toast.id} 
              className="animate-slide-up"
              style={{ 
                background: bg, 
                border: border, 
                backdropFilter: 'blur(12px)', 
                borderRadius: '8px', 
                padding: '0.85rem 1.25rem', 
                color: 'white', 
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', 
                display: 'flex', 
                alignItems: 'flex-start', 
                justifyContent: 'space-between', 
                gap: '0.75rem' 
              }}
            >
              <div style={{ display: 'flex', gap: '0.75rem', flex: 1 }}>
                <div style={{ marginTop: '2px' }}>{icon}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.4', fontWeight: 500 }}>{toast.message}</div>
                  {toast.action && (
                    <button 
                      onClick={() => {
                        toast.action.onClick();
                        removeToast(toast.id);
                      }}
                      className="btn btn-primary" 
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', alignSelf: 'flex-start' }}
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={() => removeToast(toast.id)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};
