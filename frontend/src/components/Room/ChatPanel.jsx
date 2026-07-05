import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { rooms as roomsApi } from '../../services/api';

export const ChatPanel = ({ roomId }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const seenIds = useRef(new Set());

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = useCallback((msg) => {
    const idKey = msg._id ? String(msg._id) : null;
    if (idKey && seenIds.current.has(idKey)) return;
    if (idKey) seenIds.current.add(idKey);
    setMessages((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    if (!roomId || historyLoaded) return;
    let cancelled = false;
    const loadHistory = async () => {
      try {
        setLoading(true);
        const data = await roomsApi.getMessages(roomId);
        if (cancelled) return;
        const history = data.data || [];
        seenIds.current = new Set(history.map((m) => String(m._id)));
        setMessages(history);
        setHistoryLoaded(true);
      } catch (err) {
        console.error('[ChatPanel] Failed to load message history:', err);
        if (!cancelled) setHistoryLoaded(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadHistory();
    return () => { cancelled = true; };
  }, [roomId, historyLoaded]);

  useEffect(() => {
    if (!socket || !roomId) return;
    const handleIncoming = (message) => { addMessage(message); };
    const handleHistory = ({ messages: historyMsgs }) => {
      if (!historyMsgs?.length) return;
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => String(m._id)));
        const fresh = historyMsgs.filter((m) => !existingIds.has(String(m._id)));
        historyMsgs.forEach((m) => { if (m._id) seenIds.current.add(String(m._id)); });
        if (fresh.length === 0) return prev;
        return [...historyMsgs.filter((m) => !existingIds.has(String(m._id))), ...prev].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
      });
      setLoading(false);
      setHistoryLoaded(true);
    };

    socket.on('message:receive', handleIncoming);
    socket.on('chat:message', handleIncoming);
    socket.on('chat:history', handleHistory);

    return () => {
      socket.off('message:receive', handleIncoming);
      socket.off('chat:message', handleIncoming);
      socket.off('chat:history', handleHistory);
    };
  }, [socket, roomId, addMessage]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket || !connected) return;
    socket.emit('message:send', {
      roomId,
      userId: user._id,
      senderName: user.username,
      content: messageInput.trim(),
    });
    setMessageInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-header-title">
          <MessageCircle size={16} color="#818cf8" />
          Room Chat
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state" style={{ height: '100%' }}>
            <MessageCircle size={36} className="empty-state-icon" />
            <div className="empty-state-title">No messages yet</div>
            <div className="empty-state-sub">Say hello to the room!</div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwnMessage = String(msg.senderId) === String(user._id);
            const isNotification = msg.type === 'notification' || msg.type === 'system';

            if (isNotification) {
              return (
                <div key={msg._id || idx} style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                  <span className="chat-bubble-system">{msg.content}</span>
                </div>
              );
            }

            return (
              <div key={msg._id || idx} className={isOwnMessage ? 'chat-msg-own' : 'chat-msg-other'}>
                {!isOwnMessage && (
                  <div className="chat-avatar-sm">
                    {(msg.senderName || '?')[0].toUpperCase()}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwnMessage ? 'flex-end' : 'flex-start' }}>
                  {!isOwnMessage && (
                    <div className="chat-sender-name">{msg.senderName}</div>
                  )}
                  <div className={isOwnMessage ? 'chat-bubble-own' : 'chat-bubble-other'}>
                    {msg.content}
                  </div>
                  <div className="chat-timestamp" style={{ marginTop: '0.25rem' }}>{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          <input
            id="chat-input"
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!connected}
            placeholder={connected ? 'Type your message...' : 'Reconnecting...'}
            autoComplete="off"
            className="chat-input"
          />
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!connected || !messageInput.trim()}
            className="chat-send-btn"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
