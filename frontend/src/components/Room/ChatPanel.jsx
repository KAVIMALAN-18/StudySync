import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageCircle, Wifi, WifiOff } from 'lucide-react';
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add a message, deduplicating by _id
  const addMessage = useCallback((msg) => {
    const idKey = msg._id ? String(msg._id) : null;
    if (idKey && seenIds.current.has(idKey)) return;
    if (idKey) seenIds.current.add(idKey);
    setMessages((prev) => [...prev, msg]);
  }, []);

  // Load chat history from REST API on mount
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
        if (!cancelled) setHistoryLoaded(true); // Don't retry forever
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [roomId, historyLoaded]);

  // Socket event listeners for real-time messages
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleIncoming = (message) => {
      addMessage(message);
    };

    // Chat history pushed on room:join (instant, no REST call needed)
    const handleHistory = ({ messages: historyMsgs }) => {
      if (!historyMsgs?.length) return;
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => String(m._id)));
        const fresh = historyMsgs.filter((m) => !existingIds.has(String(m._id)));
        // Track all ids
        historyMsgs.forEach((m) => { if (m._id) seenIds.current.add(String(m._id)); });
        if (fresh.length === 0) return prev;
        return [...historyMsgs.filter((m) => !existingIds.has(String(m._id))), ...prev].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
      });
      setLoading(false);
      setHistoryLoaded(true);
    };

    // Primary event: message:receive
    socket.on('message:receive', handleIncoming);
    // Legacy fallback: chat:message
    socket.on('chat:message', handleIncoming);
    // History pushed by server on room join
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
      handleKeyDown.handled = true;
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-800">Room Chat</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-xs font-medium ${connected ? 'text-green-600' : 'text-red-500'}`}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwnMessage = String(msg.senderId) === String(user._id);
            const isNotification = msg.type === 'notification' || msg.type === 'system';

            if (isNotification) {
              return (
                <div key={msg._id || idx} className="flex justify-center">
                  <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg._id || idx}
                className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                {!isOwnMessage && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(msg.senderName || '?')[0].toUpperCase()}
                  </div>
                )}

                <div className={`max-w-[75%] flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                  {!isOwnMessage && (
                    <p className="text-xs text-gray-500 mb-1 ml-1">{msg.senderName}</p>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm break-words shadow-sm ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{formatTime(msg.timestamp)}</p>
                </div>

                {isOwnMessage && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(user.username || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3 bg-white">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            id="chat-input"
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!connected}
            placeholder={connected ? 'Type a message...' : 'Reconnecting...'}
            autoComplete="off"
            className="flex-1 px-4 py-2.5 bg-gray-100 border border-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition disabled:opacity-50"
          />
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!connected || !messageInput.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
