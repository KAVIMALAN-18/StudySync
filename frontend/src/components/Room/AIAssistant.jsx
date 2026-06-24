import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, MessageSquare, RefreshCw } from 'lucide-react';
import { ai as aiApi } from '../../services/api';

export const AIAssistant = ({ roomId }) => {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your StudySync Gemini AI Assistant. How can I help you study today? You can ask doubts, request summaries of your notes, or generate quizzes!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('doubt'); // doubt, summary, quiz, explain
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = {
      sender: 'user',
      text: input.trim(),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.chat(userMsg.text, selectedType);
      const aiMsg = {
        sender: 'ai',
        text: res.reply,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        sender: 'ai',
        text: `Error: ${err.message || 'Failed to connect to AI Assistant. Please try again.'}`,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleShortcut = (prompt, type) => {
    setSelectedType(type);
    setInput(prompt);
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 animate-pulse" />
          <div>
            <h3 className="font-semibold text-sm">Gemini AI Assistant</h3>
            <p className="text-[10px] text-blue-100">Collaborative Study Support</p>
          </div>
        </div>
        <Sparkles className="w-4 h-4 text-amber-300" />
      </div>

      {/* Mode / Type Selector Chips */}
      <div className="flex gap-1.5 p-2 bg-gray-50 border-b border-gray-100 overflow-x-auto scrollbar-thin">
        {[
          { id: 'doubt', label: '❓ Ask Doubt', prompt: 'Can you explain ' },
          { id: 'summary', label: '📝 Summarize', prompt: 'Please summarize: ' },
          { id: 'quiz', label: '🏆 Get Quiz', prompt: 'Generate a 3-question quiz about ' },
          { id: 'explain', label: '💡 Explain', prompt: 'Explain the concept of ' }
        ].map((type) => (
          <button
            key={type.id}
            onClick={() => handleShortcut(type.prompt, type.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedType === type.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Message Screen */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((msg, idx) => {
          const isAI = msg.sender === 'ai';
          return (
            <div key={idx} className={`flex gap-2.5 ${isAI ? 'justify-start' : 'justify-end'}`}>
              {isAI && (
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div className={`max-w-[80%] flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-sm font-sans ${
                    isAI
                      ? 'bg-white text-gray-800 rounded-tl-sm border border-gray-150 prose prose-xs max-w-none'
                      : 'bg-blue-600 text-white rounded-tr-sm'
                  }`}
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-gray-400 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {!isAI && (
                <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-white flex-shrink-0 text-xs font-bold">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-3 bg-white border border-gray-150 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-gray-200 bg-white flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Type to ${selectedType}...`}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 rounded-xl flex items-center justify-center transition-all"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
