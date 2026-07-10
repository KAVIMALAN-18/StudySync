import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageCircle, Paperclip, Smile } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { rooms as roomsApi } from '../../services/api';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';

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

  // Grouping consecutive messages from same sender within 2 mins
  const groupedMessages = [];
  messages.forEach((msg, idx) => {
    const prevMsg = messages[idx - 1];
    const isNotification = msg.type === 'notification' || msg.type === 'system';
    
    if (isNotification) {
      groupedMessages.push({ type: 'notification', content: msg.content, _id: msg._id || idx });
      return;
    }

    const timeDiff = prevMsg ? new Date(msg.timestamp) - new Date(prevMsg.timestamp) : Infinity;
    const isConsecutive = prevMsg && 
                          !prevMsg.type &&
                          String(prevMsg.senderId) === String(msg.senderId) && 
                          timeDiff < 2 * 60 * 1000;

    if (isConsecutive && groupedMessages.length > 0 && groupedMessages[groupedMessages.length - 1].type !== 'notification') {
      groupedMessages[groupedMessages.length - 1].contents.push({
        text: msg.content,
        timestamp: msg.timestamp,
        _id: msg._id || idx
      });
    } else {
      groupedMessages.push({
        type: 'chat',
        senderId: msg.senderId,
        senderName: msg.senderName,
        timestamp: msg.timestamp,
        contents: [{ text: msg.content, timestamp: msg.timestamp, _id: msg._id || idx }]
      });
    }
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden select-text">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between shrink-0 bg-slate-950/40">
        <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
          <MessageCircle size={16} className="text-indigo-400" /> Room Chat
        </h3>
        <span className="text-[10px] text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
          Live Sync
        </span>
      </div>

      {/* Messages Scroll Area */}
      <ScrollArea className="flex-1 p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[250px] space-y-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
            <span className="text-xs text-slate-500">Loading chat logs...</span>
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 space-y-3 h-full min-h-[250px]">
            <MessageCircle size={32} className="text-slate-700" />
            <h4 className="text-xs font-bold text-slate-300">All Quiet Here</h4>
            <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed mx-auto">No messages sent yet. Say hello to start collaborating!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((group, gIdx) => {
              if (group.type === 'notification') {
                return (
                  <div key={group._id || gIdx} className="flex justify-center my-2 select-none animate-scale-up">
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded bg-slate-900 border border-border text-slate-400 select-none">
                      {group.content}
                    </span>
                  </div>
                );
              }

              const isOwn = String(group.senderId) === String(user._id);

              return (
                <div key={gIdx} className={cn(
                  "flex gap-3 items-start max-w-[85%] animate-scale-up",
                  isOwn ? "ml-auto flex-row-reverse" : "mr-auto"
                )}>
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-slate-300 font-extrabold text-xs flex items-center justify-center shrink-0 border border-border select-none">
                    {(group.senderName?.[0] || 'U').toUpperCase()}
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    {/* Header */}
                    <div className={cn(
                      "flex items-baseline gap-2 text-[10px] select-none",
                      isOwn ? "justify-end" : "justify-start"
                    )}>
                      <span className="font-bold text-white leading-none">{group.senderName}</span>
                      <span className="text-slate-500 font-medium leading-none">{formatTime(group.timestamp)}</span>
                    </div>

                    {/* Chat bubbles list */}
                    <div className={cn("space-y-1 flex flex-col", isOwn ? "items-end" : "items-start")}>
                      {group.contents.map((msg, mIdx) => (
                        <div 
                          key={msg._id || mIdx}
                          className={cn(
                            "px-3 py-2 text-xs leading-relaxed break-words max-w-full group relative transition-all",
                            isOwn 
                              ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm" 
                              : "bg-slate-900 border border-border text-slate-200 rounded-2xl rounded-tl-sm",
                          )}
                        >
                          {msg.text}
                          {/* Hover Timestamp */}
                          <span className={cn(
                            "opacity-0 group-hover:opacity-100 transition-all text-[8px] text-slate-500 absolute top-1/2 -translate-y-1/2 bg-slate-950 px-1 py-0.5 rounded border border-border select-none whitespace-nowrap",
                            isOwn ? "-left-10" : "-right-10"
                          )}>
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Form */}
      <div className="p-4 border-t border-border bg-slate-950/40 shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="chat-input"
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!connected}
              placeholder={connected ? 'Type your message...' : 'Reconnecting...'}
              autoComplete="off"
              className="w-full h-10 bg-slate-900 border border-border rounded-lg pl-3 pr-20 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
            />
            {/* Input Action Controls (Attachment, Emoji buttons) */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-500">
              <button type="button" className="p-1 hover:text-slate-300 rounded cursor-pointer" title="Add files">
                <Paperclip size={14} />
              </button>
              <button type="button" className="p-1 hover:text-slate-300 rounded cursor-pointer" title="Add emoji">
                <Smile size={14} />
              </button>
            </div>
          </div>
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!connected || !messageInput.trim()}
            className="inline-flex items-center justify-center rounded-lg text-xs font-semibold h-10 w-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-900 text-white disabled:text-slate-600 transition-all cursor-pointer shrink-0"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};
