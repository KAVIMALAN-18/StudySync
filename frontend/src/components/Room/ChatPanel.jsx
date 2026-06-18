import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';

export const ChatPanel = ({ roomId }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('room:join', { roomId, userId: user._id });

    socket.on('chat:message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off('chat:message');
    };
  }, [socket, roomId, user._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket || !connected) return;

    socket.emit('chat:message', {
      roomId,
      userId: user._id,
      senderName: user.username,
      content: messageInput.trim()
    });

    setMessageInput('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg border border-gray-200">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`flex gap-3 ${msg.senderId === user._id ? 'justify-end' : ''}`}
            >
              {msg.senderId !== user._id && (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {msg.senderName[0].toUpperCase()}
                </div>
              )}

              <div className={`max-w-xs ${msg.senderId === user._id ? 'items-end' : ''}`}>
                {msg.senderId !== user._id && (
                  <p className="text-xs text-gray-600 mb-1">{msg.senderName}</p>
                )}
                <div
                  className={`px-4 py-2 rounded-lg ${
                    msg.senderId === user._id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={!connected}
            placeholder={connected ? 'Type a message...' : 'Connecting...'}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!connected || !messageInput.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        {!connected && (
          <p className="text-xs text-red-600 mt-2">Connecting to server...</p>
        )}
      </div>
    </div>
  );
};
